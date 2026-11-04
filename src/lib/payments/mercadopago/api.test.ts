import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrder, formatAmount, getOrder, mapOrderStatus, MercadoPagoApiError } from './api';

beforeEach(() => {
  vi.stubEnv('MP_ACCESS_TOKEN', 'TEST-token');
  vi.stubEnv('MP_WEBHOOK_SECRET', 'secret');
  vi.stubEnv('APP_URL', 'https://ecos.test');
});
afterEach(() => vi.unstubAllEnvs());

function fakeFetch(status: number, json: unknown) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => json });
}

describe('mapOrderStatus', () => {
  it.each([
    ['processed', 'accredited', 'approved'],
    ['processed', 'partially_refunded', 'approved'],
    ['processed', 'otro_detalle', 'pending'],
    ['processed', null, 'pending'],
    ['refunded', 'refunded', 'refunded'],
    ['failed', 'rejected_by_issuer', 'rejected'],
    ['canceled', 'canceled', 'rejected'],
    ['created', 'created', 'pending'],
    ['processing', 'in_process', 'pending'],
    ['action_required', 'waiting_capture', 'pending'],
    ['algo_nuevo', 'x', 'pending'],
  ])('%s / %s -> %s', (status, detail, expected) => {
    expect(mapOrderStatus(status, detail)).toBe(expected);
  });

  it('un estado desconocido o una orden procesada sin acreditar nunca cuenta como aprobada', () => {
    expect(mapOrderStatus('lo-que-sea')).not.toBe('approved');
    expect(mapOrderStatus('processed', 'pending_review_manual')).not.toBe('approved');
  });
});

describe('formatAmount', () => {
  it('formatea con dos decimales como string', () => {
    expect(formatAmount(165000)).toBe('165000.00');
    expect(formatAmount(148500.5)).toBe('148500.50');
  });
});

describe('getOrder', () => {
  it('consulta la orden con el token y normaliza la respuesta (usa el monto cobrado)', async () => {
    const fetchFn = fakeFetch(200, {
      id: 'ORD123',
      status: 'processed',
      status_detail: 'accredited',
      total_amount: '165000.00',
      total_paid_amount: '165000.00',
      currency: 'ARS',
      external_reference: 'enr-1',
    });

    const o = await getOrder('ORD123', fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/orders/ORD123',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer TEST-token' }) }),
    );
    expect(o).toMatchObject({
      id: 'ORD123',
      status: 'approved',
      amount: 165000,
      currency: 'ARS',
      externalReference: 'enr-1',
    });
  });

  it('si la orden no está pagada, el monto es el total de la orden', async () => {
    const fetchFn = fakeFetch(200, {
      id: 'ORD1',
      status: 'created',
      status_detail: 'created',
      total_amount: '100.00',
      total_paid_amount: '0.00',
      currency: 'ARS',
    });
    const o = await getOrder('ORD1', fetchFn);
    expect(o).toMatchObject({ status: 'pending', amount: 100, externalReference: null });
  });

  it('marca como reintentable un error 5xx y como definitivo un 404', async () => {
    await expect(getOrder('1', fakeFetch(503, {}))).rejects.toMatchObject({ retryable: true });
    await expect(getOrder('1', fakeFetch(404, {}))).rejects.toMatchObject({ retryable: false });
    await expect(getOrder('1', fakeFetch(404, {}))).rejects.toBeInstanceOf(MercadoPagoApiError);
  });

  it('escapa el id para no alterar la ruta', async () => {
    const fetchFn = fakeFetch(200, { id: 1, status: 'created', total_amount: '1', currency: 'ARS' });
    await getOrder('../../otra-cosa', fetchFn);
    expect(fetchFn.mock.calls[0][0]).not.toContain('../');
  });
});

describe('createOrder', () => {
  const input = {
    title: 'Curso de 5 clases',
    amount: 165000,
    externalReference: 'enr-1',
    idempotencyKey: 'enr-1',
    expiresInMinutes: 14.7,
    returnUrls: { success: 'https://s', pending: 'https://p', failure: 'https://f' },
  };

  it('envía el monto como string, la referencia, la vigencia, las URLs y la clave de idempotencia', async () => {
    const fetchFn = fakeFetch(201, { id: 'ORD9', checkout_url: 'https://mp/checkout' });

    const order = await createOrder(input, fetchFn);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/v1/orders');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Idempotency-Key']).toBe('enr-1');

    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({
      type: 'online',
      processing_mode: 'manual',
      total_amount: '165000.00',
      external_reference: 'enr-1',
      expiration_time: 'PT14M',
    });
    expect(sent.items).toEqual([{ title: 'Curso de 5 clases', unit_price: '165000.00', quantity: 1 }]);
    expect(sent.config.online).toEqual({
      success_url: 'https://s',
      pending_url: 'https://p',
      failure_url: 'https://f',
      auto_return: 'approved',
    });
    expect(order).toEqual({ id: 'ORD9', checkoutUrl: 'https://mp/checkout' });
  });

  it('el total coincide con la suma de los ítems (lo exige la API)', async () => {
    const fetchFn = fakeFetch(201, { id: 'O', checkout_url: 'u' });
    await createOrder(input, fetchFn);
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(sent.total_amount).toBe(sent.items[0].unit_price);
  });

  it('no manda vigencia si no se indica', async () => {
    const fetchFn = fakeFetch(201, { id: 'O', checkout_url: 'u' });
    await createOrder({ ...input, expiresInMinutes: undefined }, fetchFn);
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).not.toHaveProperty('expiration_time');
  });

  it('propaga el error de Mercado Pago', async () => {
    await expect(createOrder(input, fakeFetch(400, {}))).rejects.toMatchObject({ status: 400 });
  });
});
