import 'server-only';
import { z } from 'zod';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { mercadoPagoEnv } from '@/lib/env';
import { getOrder, MercadoPagoApiError, type FetchLike } from './api';
import { verifyMercadoPagoSignature } from './signature';

export type WebhookResponse = { status: number; body: { ok: boolean; outcome?: string; error?: string } };

type Deps = { client?: AdminClient; fetchFn?: FetchLike; secret?: string };

const uuid = z.uuid();

/**
 * Procesa una notificación de Mercado Pago (evento "Order" de la API de Orders).
 *
 * Reglas:
 *  1. La firma se verifica ANTES de hacer cualquier otra cosa (401 si falla).
 *  2. Solo se procesan avisos de tipo "order".
 *  3. El estado y el monto se consultan a la API de Mercado Pago; el cuerpo del aviso solo
 *     sirve para saber qué orden consultar (`data.id`).
 *  4. apply_payment es idempotente: un aviso repetido no confirma ni cobra dos veces.
 *  5. Cada aviso queda en `webhook_events`.
 *  6. Se responde 200 salvo que convenga que Mercado Pago reintente (error nuestro o suyo
 *     transitorio -> 500). Los casos de revisión manual responden 200: reintentar no los arregla.
 */
export async function processMercadoPagoWebhook(request: Request, deps: Deps = {}): Promise<WebhookResponse> {
  const url = new URL(request.url);
  const dataId = url.searchParams.get('data.id');

  const secret = deps.secret ?? mercadoPagoEnv().MP_WEBHOOK_SECRET;
  const valid = verifyMercadoPagoSignature({
    secret,
    signatureHeader: request.headers.get('x-signature'),
    requestId: request.headers.get('x-request-id'),
    dataId,
  });
  if (!valid) return { status: 401, body: { ok: false, error: 'invalid_signature' } };

  const client = deps.client ?? createAdminClient();
  const body = await request.json().catch(() => null);
  const type = url.searchParams.get('type') ?? (body as { type?: string } | null)?.type;

  const log = async (outcome: string, error?: string) => {
    await client.from('webhook_events').insert({
      proveedor: 'mercadopago',
      event_key: dataId,
      payload: body,
      outcome,
      error: error ?? null,
    });
  };

  if (type !== 'order' || !dataId) {
    await log('ignored');
    return { status: 200, body: { ok: true, outcome: 'ignored' } };
  }

  try {
    const order = await getOrder(dataId, deps.fetchFn);

    if (!order.externalReference || !uuid.safeParse(order.externalReference).success) {
      await log('ignored_no_reference');
      return { status: 200, body: { ok: true, outcome: 'ignored_no_reference' } };
    }
    if (order.currency !== 'ARS') {
      await log('needs_review', `Moneda inesperada: ${order.currency}`);
      return { status: 200, body: { ok: true, outcome: 'needs_review' } };
    }

    // Una orden agrupa sus pagos: se registra con el id de la orden como identificador.
    const { data: outcome, error } = await client.rpc('apply_payment', {
      p_enrollment_id: order.externalReference,
      p_proveedor: 'mercadopago',
      p_provider_payment_id: order.id,
      p_monto: order.amount,
      p_estado: order.status,
      p_raw: order.raw as never,
    });
    if (error) throw new Error(error.message);

    await log(outcome);
    return { status: 200, body: { ok: true, outcome } };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Una orden inexistente en Mercado Pago no se arregla reintentando.
    if (e instanceof MercadoPagoApiError && !e.retryable) {
      await log('ignored_unknown_order', message);
      return { status: 200, body: { ok: true, outcome: 'ignored_unknown_order' } };
    }
    await log('error', message).catch(() => undefined);
    return { status: 500, body: { ok: false, error: 'processing_failed' } };
  }
}
