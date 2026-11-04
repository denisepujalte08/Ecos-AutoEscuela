import 'server-only';
import { mercadoPagoEnv } from '@/lib/env';

const API = 'https://api.mercadopago.com';

export type FetchLike = typeof fetch;

/** Estados de pago que entiende apply_payment. */
export type PaymentStatus = 'approved' | 'pending' | 'rejected' | 'refunded';

export function mapPaymentStatus(mpStatus: string): PaymentStatus {
  switch (mpStatus) {
    case 'approved':
      return 'approved';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    case 'rejected':
    case 'cancelled':
      return 'rejected';
    default:
      // pending, in_process, in_mediation, authorized y cualquier estado desconocido
      // se tratan como "no acreditado": nunca confirman una inscripción.
      return 'pending';
  }
}

export type MercadoPagoPayment = {
  id: string;
  status: PaymentStatus;
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
  const { MP_ACCESS_TOKEN } = mercadoPagoEnv();
  const res = await fetchFn(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
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
 * Consulta el pago directamente a Mercado Pago. Es la ÚNICA fuente de verdad: el cuerpo
 * del webhook solo trae un id y nunca se confía en él.
 */
export async function getPayment(id: string, fetchFn: FetchLike = fetch): Promise<MercadoPagoPayment> {
  const p = await call(`/v1/payments/${encodeURIComponent(id)}`, { method: 'GET' }, fetchFn);
  return {
    id: String(p.id),
    status: mapPaymentStatus(String(p.status)),
    amount: Number(p.transaction_amount),
    currency: String(p.currency_id),
    externalReference: typeof p.external_reference === 'string' ? p.external_reference : null,
    raw: p,
  };
}

export type PreferenceInput = {
  title: string;
  /** Monto en pesos, calculado por la base de datos. */
  amount: number;
  externalReference: string;
  notificationUrl: string;
  backUrls: { success: string; failure: string; pending: string };
  /** Vencimiento del link de pago (igual al de la retención de turnos). */
  expiresAt?: string;
};

export type Preference = { id: string; initPoint: string; sandboxInitPoint: string | null };

export async function createPreference(input: PreferenceInput, fetchFn: FetchLike = fetch): Promise<Preference> {
  const body = {
    items: [
      {
        id: input.externalReference,
        title: input.title,
        quantity: 1,
        unit_price: input.amount,
        currency_id: 'ARS',
      },
    ],
    external_reference: input.externalReference,
    notification_url: input.notificationUrl,
    back_urls: input.backUrls,
    auto_return: 'approved',
    ...(input.expiresAt
      ? { expires: true, expiration_date_to: input.expiresAt }
      : {}),
  };

  const p = await call('/checkout/preferences', { method: 'POST', body: JSON.stringify(body) }, fetchFn);
  return {
    id: String(p.id),
    initPoint: String(p.init_point),
    sandboxInitPoint: typeof p.sandbox_init_point === 'string' ? p.sandbox_init_point : null,
  };
}
