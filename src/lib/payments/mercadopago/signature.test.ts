import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyMercadoPagoSignature } from './signature';

const SECRET = 'secreto-de-prueba';

function header(opts: { id?: string; requestId?: string; ts?: string; secret?: string }) {
  const ts = opts.ts ?? '1704908010';
  let manifest = '';
  if (opts.id) manifest += `id:${opts.id};`;
  if (opts.requestId) manifest += `request-id:${opts.requestId};`;
  manifest += `ts:${ts};`;
  const v1 = createHmac('sha256', opts.secret ?? SECRET).update(manifest).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

const base = { secret: SECRET, requestId: 'req-1', dataId: '123456' };

describe('verifyMercadoPagoSignature', () => {
  it('acepta una firma válida', () => {
    const signatureHeader = header({ id: '123456', requestId: 'req-1' });
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader })).toBe(true);
  });

  it('rechaza una firma hecha con otra clave', () => {
    const signatureHeader = header({ id: '123456', requestId: 'req-1', secret: 'otra' });
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader })).toBe(false);
  });

  it('rechaza si cambia el id del pago (aviso adulterado)', () => {
    const signatureHeader = header({ id: '123456', requestId: 'req-1' });
    expect(verifyMercadoPagoSignature({ ...base, dataId: '999999', signatureHeader })).toBe(false);
  });

  it('rechaza si cambia el request-id', () => {
    const signatureHeader = header({ id: '123456', requestId: 'req-1' });
    expect(verifyMercadoPagoSignature({ ...base, requestId: 'req-2', signatureHeader })).toBe(false);
  });

  it('rechaza si falta la cabecera', () => {
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: null })).toBe(false);
  });

  it('rechaza cabeceras mal formadas', () => {
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: 'basura' })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: 'ts=1' })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: 'v1=abc' })).toBe(false);
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: 'ts=1,v1=' })).toBe(false);
  });

  it('rechaza una firma de distinto largo sin lanzar errores', () => {
    expect(verifyMercadoPagoSignature({ ...base, signatureHeader: 'ts=1,v1=abc' })).toBe(false);
  });

  it('normaliza a minúsculas los ids alfanuméricos', () => {
    const signatureHeader = header({ id: 'abc123', requestId: 'req-1' });
    expect(verifyMercadoPagoSignature({ ...base, dataId: 'ABC123', signatureHeader })).toBe(true);
  });

  it('arma el manifiesto sin request-id si no vino', () => {
    const signatureHeader = header({ id: '123456' });
    expect(verifyMercadoPagoSignature({ ...base, requestId: null, signatureHeader })).toBe(true);
  });
});
