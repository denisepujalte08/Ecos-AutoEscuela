import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminClient } from '@/lib/db/server';
import { createCardCheckout, PaymentError } from './checkout';

const ID = '5f2c8d0e-1111-4222-8333-444455556666';

beforeEach(() => {
  vi.stubEnv('MP_ACCESS_TOKEN', 'TEST-token');
  vi.stubEnv('MP_WEBHOOK_SECRET', 'secret');
  vi.stubEnv('APP_URL', 'https://ecos.test/');
});
afterEach(() => vi.unstubAllEnvs());

function setup(opts: {
  enrollment?: Record<string, unknown> | null;
  holdExpiresAt?: string | null;
}) {
  const enrollment =
    opts.enrollment === undefined
      ? { id: ID, monto: '165000.00', estado: 'pending_payment', metodo: 'tarjeta', courses: { nombre: 'Curso de 5 clases' } }
      : opts.enrollment;

  const enrollments = {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: enrollment, error: null }) }) }),
  };
  const lessons = {
    select: () => ({
      eq: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({
              data: opts.holdExpiresAt === null ? [] : [{ hold_expires_at: opts.holdExpiresAt }],
              error: null,
            }),
          }),
        }),
      }),
    }),
  };
  const client = { from: (t: string) => (t === 'enrollments' ? enrollments : lessons) } as unknown as AdminClient;

  const fetchFn = vi.fn().mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ id: 'pref-1', init_point: 'https://mp/pay', sandbox_init_point: 'https://mp/sb' }),
  });
  return { client, fetchFn };
}

const future = () => new Date(Date.now() + 10 * 60_000).toISOString();

describe('createCardCheckout', () => {
  it('toma el monto de la base de datos y lo manda como número', async () => {
    const { client, fetchFn } = setup({ holdExpiresAt: future() });

    const pref = await createCardCheckout(ID, { client, fetchFn });

    const sent = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(sent.items[0].unit_price).toBe(165000);
    expect(sent.items[0].title).toBe('Curso de 5 clases');
    expect(sent.external_reference).toBe(ID);
    expect(sent.notification_url).toBe('https://ecos.test/api/webhooks/mercadopago');
    expect(sent.back_urls.success).toBe(`https://ecos.test/reserva/resultado?inscripcion=${ID}&estado=ok`);
    expect(pref.initPoint).toBe('https://mp/pay');
  });

  it('hace vencer el link de pago junto con la retención de turnos', async () => {
    const expires = future();
    const { client, fetchFn } = setup({ holdExpiresAt: expires });
    await createCardCheckout(ID, { client, fetchFn });
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(sent.expiration_date_to).toBe(new Date(expires).toISOString());
  });

  it('rechaza una inscripción inexistente', async () => {
    const { client, fetchFn } = setup({ enrollment: null, holdExpiresAt: future() });
    await expect(createCardCheckout(ID, { client, fetchFn })).rejects.toMatchObject({ code: 'enrollment_not_found' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    ['ya activa', { estado: 'active', metodo: 'tarjeta' }],
    ['cancelada', { estado: 'cancelled', metodo: 'tarjeta' }],
    ['por transferencia', { estado: 'pending_review', metodo: 'transferencia' }],
  ])('rechaza una inscripción %s', async (_label, patch) => {
    const { client, fetchFn } = setup({
      enrollment: { id: ID, monto: '1', courses: { nombre: 'x' }, ...patch },
      holdExpiresAt: future(),
    });
    await expect(createCardCheckout(ID, { client, fetchFn })).rejects.toBeInstanceOf(PaymentError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rechaza si la retención de turnos ya venció', async () => {
    const { client, fetchFn } = setup({ holdExpiresAt: new Date(Date.now() - 60_000).toISOString() });
    await expect(createCardCheckout(ID, { client, fetchFn })).rejects.toMatchObject({ code: 'enrollment_not_payable' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('valida que el id sea un uuid', async () => {
    const { client, fetchFn } = setup({ holdExpiresAt: future() });
    await expect(createCardCheckout('no-es-uuid', { client, fetchFn })).rejects.toThrow();
  });
});
