import 'server-only';
import { mercadoPagoAccessToken } from '@/lib/env';

const API = 'https://api.mercadopago.com';

export type FetchLike = typeof fetch;

/** Estados que entiende apply_payment (ver supabase/migrations/…_payments.sql). */
export type PaymentStatus = 'approved' | 'pending' | 'rejected' | 'refunded';

/**
 * Traduce el estado de una orden de Mercado Pago (API de Orders) al de apply_payment.
 *
 * Solo `processed` + `accredited` (o con devolución parcial) cuenta como pago aprobado.
 * Cualquier estado desconocido se trata como "pendiente": nunca confirma una inscripción.
 * Una orden vencida figura como `canceled`.
 */
export function mapOrderStatus(status: string, statusDetail?: string | null): PaymentStatus {
  switch (status) {
    case 'processed':
      return statusDetail === 'accredited' || statusDetail === 'partially_refunded' ? 'approved' : 'pending';
    case 'refunded':
      return 'refunded';
    case 'failed':
    case 'canceled':
    case 'cancelled':
      return 'rejected';
    default:
      // created, processing, action_required y cualquier estado nuevo
      return 'pending';
  }
}

export type MercadoPagoOrder = {
  id: string;
  status: PaymentStatus;
  /** Monto efectivamente cobrado si hay pago acreditado; si no, el monto de la orden. */
  amount: number;
  currency: string;
  externalReference: string | null;
  raw: unknown;
};

export class MercadoPagoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'MercadoPagoApiError';
  }
  /** Errores del lado de Mercado Pago o de red: conviene reintentar. */
  get retryable() {
    return this.status >= 500 || this.status === 429;
  }
}

async function call(path: string, init: RequestInit, fetchFn: FetchLike) {
  const res = await fetchFn(`${API}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${mercadoPagoAccessToken()}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new MercadoPagoApiError(`Mercado Pago ${path} respondió ${res.status}`, res.status);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Consulta la orden directamente a Mercado Pago. Es la ÚNICA fuente de verdad: el cuerpo
 * del webhook solo se usa para saber qué orden consultar.
 */
export async function getOrder(id: string, fetchFn: FetchLike = fetch): Promise<MercadoPagoOrder> {
  const o = await call(`/v1/orders/${encodeURIComponent(id)}`, { method: 'GET' }, fetchFn);
  const status = mapOrderStatus(String(o.status), typeof o.status_detail === 'string' ? o.status_detail : null);
  const total = Number(o.total_amount);
  const paid = Number(o.total_paid_amount);

  return {
    id: String(o.id),
    status,
    amount: status === 'approved' && Number.isFinite(paid) && paid > 0 ? paid : total,
    currency: String(o.currency),
    externalReference: typeof o.external_reference === 'string' ? o.external_reference : null,
    raw: o,
  };
}

export type CreateOrderInput = {
  title: string;
  /** Monto en pesos, calculado por la base de datos. */
  amount: number;
  externalReference: string;
  /** Clave de idempotencia (UUID): repetir la petición no crea una orden nueva. */
  idempotencyKey: string;
  /** Vigencia de la orden en minutos (igual a lo que queda de la retención de turnos). */
  expiresInMinutes?: number;
  returnUrls: { success: string; pending: string; failure: string };
};

export type CreatedOrder = { id: string; checkoutUrl: string };

/** Formato de dinero que pide la API: string con dos decimales. */
export function formatAmount(amount: number) {
  return amount.toFixed(2);
}

export async function createOrder(input: CreateOrderInput, fetchFn: FetchLike = fetch): Promise<CreatedOrder> {
  const amount = formatAmount(input.amount);
  const body = {
    type: 'online',
    processing_mode: 'manual',
    total_amount: amount,
    external_reference: input.externalReference,
    description: input.title,
    items: [{ title: input.title, unit_price: amount, quantity: 1 }],
    ...(input.expiresInMinutes ? { expiration_time: `PT${Math.max(1, Math.floor(input.expiresInMinutes))}M` } : {}),
    config: {
      online: {
        success_url: input.returnUrls.success,
        pending_url: input.returnUrls.pending,
        failure_url: input.returnUrls.failure,
        auto_return: 'approved',
      },
    },
  };

  const o = await call(
    '/v1/orders',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'X-Idempotency-Key': input.idempotencyKey },
    },
    fetchFn,
  );
  return { id: String(o.id), checkoutUrl: String(o.checkout_url) };
}
