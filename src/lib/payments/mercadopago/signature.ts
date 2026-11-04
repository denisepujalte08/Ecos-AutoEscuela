import { createHmac, timingSafeEqual } from 'node:crypto';

type VerifyInput = {
  /** Clave secreta del webhook (panel de Mercado Pago). */
  secret: string;
  /** Cabecera `x-signature`: "ts=...,v1=...". */
  signatureHeader: string | null;
  /** Cabecera `x-request-id`. */
  requestId: string | null;
  /** Parámetro `data.id` de la URL. */
  dataId: string | null;
};

/**
 * Verifica que la notificación realmente viene de Mercado Pago.
 *
 * Mercado Pago firma "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" con HMAC-SHA256
 * y la clave secreta de la aplicación. Sin esta verificación, cualquiera podría mandar
 * un aviso de "pago aprobado" falso.
 *
 * No se valida la antigüedad de `ts`: los reintentos legítimos pueden llegar tarde y la
 * idempotencia de `apply_payment` ya neutraliza los avisos repetidos.
 */
export function verifyMercadoPagoSignature({ secret, signatureHeader, requestId, dataId }: VerifyInput): boolean {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const i = p.indexOf('=');
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const;
    }),
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  // Mercado Pago normaliza a minúsculas los ids alfanuméricos.
  const id = dataId && /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;

  let manifest = '';
  if (id) manifest += `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
