import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminClient } from '@/lib/db/server';
import { processMercadoPagoWebhook } from './webhook';

const SECRET = 'secreto-de-prueba';
const ENROLLMENT = '5f2c8d0e-1111-4222-8333-444455556666';
const ORDER_ID = 'ORDTST01M4V4VSXCTN8ZN1FJ02KKMFGE';

beforeEach(() => {
  vi.stubEnv('MP_ACCESS_TOKEN', 'TEST-token');
  vi.stubEnv('MP_WEBHOOK_SECRET', SECRET);
  vi.stubEnv('APP_URL', 'https://ecos.test');
});
afterEach(() => vi.unstubAllEnvs());

function signedRequest(opts: { dataId?: string; type?: string; body?: unknown; signed?: boolean } = {}) {
  const dataId = opts.dataId ?? ORDER_ID;
  const ts = '1704908010';
  const requestId = 'req-1';
  // Mercado Pago normaliza a minúsculas los ids alfanuméricos al firmar.
  const v1 = createHmac('sha256', SECRET)
    .update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  const url = `https://ecos.test/api/webhooks/mercadopago?data.id=${dataId}&type=${opts.type ?? 'order'}`;
  return new Request(url, {
    method: 'POST',
    headers: {
      'x-request-id': requestId,
      ...(opts.signed === false ? {} : { 'x-signature': `ts=${ts},v1=${v1}` }),
    },
    body: JSON.stringify(opts.body ?? { action: 'order.processed', type: 'order', data: { id: dataId } }),
  });
}

const paidOrder = {
  id: ORDER_ID,
  status: 'processed',
  status_detail: 'accredited',
  total_amount: '100000.00',
  total_paid_amount: '100000.00',
  currency: 'ARS',
  external_reference: ENROLLMENT,
};

function setup(opts: { apiStatus?: number; apiBody?: unknown; rpcResult?: { data: unknown; error: unknown } } = {}) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue(opts.rpcResult ?? { data: 'confirmed', error: null });
  const client = { rpc, from: vi.fn(() => ({ insert })) } as unknown as AdminClient;
  const status = opts.apiStatus ?? 200;
  const fetchFn = vi.fn().mockResolvedValue({
    ok: status < 300,
    status,
    json: async () => opts.apiBody ?? paidOrder,
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

  it('confirma una orden acreditada usando los datos de la API, no los del aviso', async () => {
    const { client, rpc, fetchFn, insert } = setup();
    const req = signedRequest({
      body: { action: 'order.processed', type: 'order', data: { id: ORDER_ID, total_amount: '1', status: 'processed' } },
    });

    const res = await processMercadoPagoWebhook(req, { client, fetchFn });

    expect(res).toEqual({ status: 200, body: { ok: true, outcome: 'confirmed' } });
    expect(fetchFn.mock.calls[0][0]).toBe(`https://api.mercadopago.com/v1/orders/${ORDER_ID}`);
    expect(rpc).toHaveBeenCalledWith('apply_payment', {
      p_enrollment_id: ENROLLMENT,
      p_proveedor: 'mercadopago',
      p_provider_payment_id: ORDER_ID,
      p_monto: 100000,
      p_estado: 'approved',
      p_raw: expect.anything(),
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'confirmed', event_key: ORDER_ID }));
  });

  it('una orden creada (sin pagar) se registra como pendiente y no confirma', async () => {
    const { client, rpc, fetchFn } = setup({
      apiBody: { ...paidOrder, status: 'created', status_detail: 'created', total_paid_amount: '0.00' },
      rpcResult: { data: 'pending', error: null },
    });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res.body.outcome).toBe('pending');
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_estado: 'pending', p_monto: 100000 });
  });

  it('ignora avisos que no son de órdenes (con 200, para que no reintente)', async () => {
    const { client, rpc, fetchFn } = setup();
    for (const type of ['payment', 'merchant_order']) {
      const res = await processMercadoPagoWebhook(signedRequest({ type }), { client, fetchFn });
      expect(res).toEqual({ status: 200, body: { ok: true, outcome: 'ignored' } });
    }
    expect(fetchFn).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('ignora órdenes sin referencia a una inscripción', async () => {
    const { client, rpc, fetchFn } = setup({ apiBody: { ...paidOrder, external_reference: 'cualquier-cosa' } });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res.body.outcome).toBe('ignored_no_reference');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('no aplica órdenes en otra moneda: las deja para revisión', async () => {
    const { client, rpc, fetchFn, insert } = setup({ apiBody: { ...paidOrder, currency: 'USD' } });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res.body.outcome).toBe('needs_review');
    expect(rpc).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'needs_review' }));
  });

  it('devuelve 200 si la orden no existe en Mercado Pago (reintentar no lo arregla)', async () => {
    const { client, fetchFn } = setup({ apiStatus: 404, apiBody: {} });
    const res = await processMercadoPagoWebhook(signedRequest(), { client, fetchFn });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('ignored_unknown_order');
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
