import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminClient } from '@/lib/db/server';
import { processMercadoPagoWebhook } from './webhook';

const SECRET = 'secreto-de-prueba';
const ENROLLMENT = '5f2c8d0e-1111-4222-8333-444455556666';

beforeEach(() => {
  vi.stubEnv('MP_ACCESS_TOKEN', 'TEST-token');
  vi.stubEnv('MP_WEBHOOK_SECRET', SECRET);
  vi.stubEnv('APP_URL', 'https://ecos.test');
});
afterEach(() => vi.unstubAllEnvs());

function signedRequest(opts: { dataId?: string; type?: string; body?: unknown; signed?: boolean } = {}) {
  const dataId = opts.dataId ?? '777';
  const ts = '1704908010';
  const requestId = 'req-1';
  const v1 = createHmac('sha256', SECRET).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');
  const url = `https://ecos.test/api/webhooks/mercadopago?data.id=${dataId}&type=${opts.type ?? 'payment'}`;
  return new Request(url, {
    method: 'POST',
    headers: {
      'x-request-id': requestId,
      ...(opts.signed === false ? {} : { 'x-signature': `ts=${ts},v1=${v1}` }),
    },
    body: JSON.stringify(opts.body ?? { type: 'payment', data: { id: dataId } }),
  });
}

function setup(opts: { apiStatus?: number; apiBody?: unknown; rpcResult?: { data: unknown; error: unknown } } = {}) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue(opts.rpcResult ?? { data: 'confirmed', error: null });
  const client = { rpc, from: vi.fn(() => ({ insert })) } as unknown as AdminClient;
  const status = opts.apiStatus ?? 200;
  const fetchFn = vi.fn().mockResolvedValue({
    ok: status < 300,
    status,
    json: async () =>
      opts.apiBody ?? {
        id: 777,
        status: 'approved',
        transaction_amount: 100000,
        currency_id: 'ARS',
        external_reference: ENROLLMENT,
      },
  });
  return { client, rpc, insert, fetchFn };
}

describe('processMercadoPagoWebhook', () => {
  it('rechaza con 401 una notificación sin firma válida y no toca nada', async () => {
    const { client, rpc, fetchFn, insert } = setup();
    const res = await processMercadoPagoWebhook(signedRequest({ signed: false }), { client, fetchFn });
    expect(res.status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it('confirma un pago aprobado usando los datos de la API, no los del aviso', async () => {
    const { client, rpc, fetchFn, insert } = setup();
    const req = signedRequest({ body: { type: 'payment', data: { id: '777' }, monto: 1, status: 'approved' } });

    const res = await processMercadoPagoWebhook(req, { client, fetchFn });

    expect(res).toEqual({ status: 200, body: { ok: true, outcome: 'confirmed' } });
    expect(rpc).toHaveBeenCalledWith('apply_payment', {
      p_enrollment_id: ENROLLMENT,
      p_proveedor: 'mercadopago',
      p_provider_payment_id: '777',
      p_monto: 100000,
      p_estado: 'approved',
      p_raw: expect.anything(),
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'confirmed', event_key: '777' }));
  });

  it('ignora avisos que no son de pagos (con 200, para que no reintente)', async () => {
    const { client, rpc, fetchFn } = setup();
    const res = await processMercadoPagoWebhook(signedRequest({ type: 'merchant_order' }), { client, fetchFn });
    expect(res).toEqual({ status: 200, body: { ok: true, outcome: 'ignored' } });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('ignora pagos sin referencia a una inscripción', async () => {
    const { client, rpc, fetchFn } = setup({
      apiBody: { id: 777, status: 'approved', transaction_amount: 1, currency_id: 'ARS', external_reference: 'cualquier-cosa' },
    });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res.body.outcome).toBe('ignored_no_reference');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('no aplica pagos en otra moneda: los deja para revisión', async () => {
    const { client, rpc, fetchFn, insert } = setup({
      apiBody: { id: 777, status: 'approved', transaction_amount: 100, currency_id: 'USD', external_reference: ENROLLMENT },
    });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res.body.outcome).toBe('needs_review');
    expect(rpc).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'needs_review' }));
  });

  it('devuelve 200 si el pago no existe en Mercado Pago (reintentar no lo arregla)', async () => {
    const { client, fetchFn } = setup({ apiStatus: 404, apiBody: {} });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('ignored_unknown_payment');
  });

  it('devuelve 500 si Mercado Pago falla, para que reintente', async () => {
    const { client, fetchFn } = setup({ apiStatus: 503, apiBody: {} });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res.status).toBe(500);
  });

  it('devuelve 500 si falla la base, para que Mercado Pago reintente', async () => {
    const { client, fetchFn, insert } = setup({ rpcResult: { data: null, error: { message: 'db caída' } } });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res.status).toBe(500);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'error', error: 'db caída' }));
  });

  it('responde 200 en los casos de revisión manual (reintentar no los arregla)', async () => {
    const { client, fetchFn } = setup({ rpcResult: { data: 'needs_review', error: null } });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res).toEqual({ status: 200, body: { ok: true, outcome: 'needs_review' } });
  });

  it('no expone detalles internos en los errores', async () => {
    const { client, fetchFn } = setup({ rpcResult: { data: null, error: { message: 'secreto interno' } } });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(JSON.stringify(res.body)).not.toContain('secreto interno');
  });
});
