import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPreference, getPayment, mapPaymentStatus, MercadoPagoApiError } from './api';

beforeEach(() => {
  vi.stubEnv('MP_ACCESS_TOKEN', 'TEST-token');
  vi.stubEnv('MP_WEBHOOK_SECRET', 'secret');
  vi.stubEnv('APP_URL', 'https://ecos.test');
});
afterEach(() => vi.unstubAllEnvs());

function fakeFetch(status: number, json: unknown) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => json });
}

describe('mapPaymentStatus', () => {
  it.each([
    ['approved', 'approved'],
    ['refunded', 'refunded'],
    ['charged_back', 'refunded'],
    ['rejected', 'rejected'],
    ['cancelled', 'rejected'],
    ['pending', 'pending'],
    ['in_process', 'pending'],
    ['in_mediation', 'pending'],
    ['authorized', 'pending'],
    ['algo_nuevo', 'pending'],
  ])('%s -> %s', (mp, expected) => {
    expect(mapPaymentStatus(mp)).toBe(expected);
  });

  it('un estado desconocido nunca cuenta como aprobado', () => {
    expect(mapPaymentStatus('lo-que-sea')).not.toBe('approved');
  });
});

describe('getPayment', () => {
  it('consulta el pago con el token y normaliza la respuesta', async () => {
    const fetchFn = fakeFetch(200, {
      id: 777,
      status: 'approved',
      transaction_amount: 100000,
      currency_id: 'ARS',
      external_reference: 'enr-1',
    });

    const p = await getPayment('777', fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/payments/777',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer TEST-token' }) }),
    );
    expect(p).toMatchObject({ id: '777', status: 'approved', amount: 100000, currency: 'ARS', externalReference: 'enr-1' });
  });

  it('marca como reintentable un error 5xx y como definitivo un 404', async () => {
    await expect(getPayment('1', fakeFetch(503, {}))).rejects.toMatchObject({ retryable: true });
    await expect(getPayment('1', fakeFetch(404, {}))).rejects.toMatchObject({ retryable: false });
    await expect(getPayment('1', fakeFetch(404, {}))).rejects.toBeInstanceOf(MercadoPagoApiError);
  });

  it('escapa el id para no alterar la ruta', async () => {
    const fetchFn = fakeFetch(200, { id: 1, status: 'approved', transaction_amount: 1, currency_id: 'ARS' });
    await getPayment('../../otra-cosa', fetchFn);
    expect(fetchFn.mock.calls[0][0]).not.toContain('../');
  });
});

describe('createPreference', () => {
  it('envía el monto, la referencia, las URLs y el vencimiento', async () => {
    const fetchFn = fakeFetch(201, { id: 'pref-1', init_point: 'https://mp/pay', sandbox_init_point: 'https://mp/sandbox' });

    const pref = await createPreference(
      {
        title: 'Curso de 5 clases',
        amount: 165000,
        externalReference: 'enr-1',
        notificationUrl: 'https://ecos.test/api/webhooks/mercadopago',
        backUrls: { success: 'https://s', failure: 'https://f', pending: 'https://p' },
        expiresAt: '2026-12-01T10:15:00.000Z',
      },
      fetchFn,
    );

    const sent = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(sent.items[0]).toMatchObject({ unit_price: 165000, currency_id: 'ARS', quantity: 1 });
    expect(sent.external_reference).toBe('enr-1');
    expect(sent.notification_url).toBe('https://ecos.test/api/webhooks/mercadopago');
    expect(sent.expires).toBe(true);
    expect(sent.expiration_date_to).toBe('2026-12-01T10:15:00.000Z');
    expect(pref).toEqual({ id: 'pref-1', initPoint: 'https://mp/pay', sandboxInitPoint: 'https://mp/sandbox' });
  });
});
