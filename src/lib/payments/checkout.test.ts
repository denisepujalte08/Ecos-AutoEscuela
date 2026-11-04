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

function setup(opts: { enrollment?: Record<string, unknown> | null; holdExpiresAt?: string | null }) {
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
    json: async () => ({ id: 'ORD1', checkout_url: 'https://mp/checkout' }),
  });
  return { client, fetchFn };
}

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

describe('createCardCheckout', () => {
  it('toma el monto de la base de datos y devuelve la URL de pago', async () => {
    const { client, fetchFn } = setup({ holdExpiresAt: inMinutes(10) });

    const order = await createCardCheckout(ID, { client, fetchFn });

    const [, init] = fetchFn.mock.calls[0];
    const sent = JSON.parse(init.body);
    expect(sent.total_amount).toBe('165000.00');
    expect(sent.items[0].title).toBe('Curso de 5 clases');
    expect(sent.external_reference).toBe(ID);
    expect(sent.config.online.success_url).toBe(`https://ecos.test/reserva/resultado?inscripcion=${ID}&estado=ok`);
    expect(order).toEqual({ id: 'ORD1', checkoutUrl: 'https://mp/checkout' });
  });

  it('usa el id de la inscripción como clave de idempotencia (recargar no duplica la orden)', async () => {
    const { client, fetchFn } = setup({ holdExpiresAt: inMinutes(10) });
    await createCardCheckout(ID, { client, fetchFn });
    expect(fetchFn.mock.calls[0][1].headers['X-Idempotency-Key']).toBe(ID);
  });

  it('hace vencer la orden junto con la retención de turnos', async () => {
    const { client, fetchFn } = setup({ holdExpiresAt: inMinutes(10) });
    await createCardCheckout(ID, { client, fetchFn });
    const sent = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(['PT9M', 'PT10M']).toContain(sent.expiration_time);
  });

  it('rechaza una inscripción inexistente', async () => {
    const { client, fetchFn } = setup({ enrollment: null, holdExpiresAt: inMinutes(10) });
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
      holdExpiresAt: inMinutes(10),
    });
    await expect(createCardCheckout(ID, { client, fetchFn })).rejects.toBeInstanceOf(PaymentError);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('rechaza si la retención de turnos ya venció o está por vencer', async () => {
    for (const minutes of [-5, 0.5]) {
      const { client, fetchFn } = setup({ holdExpiresAt: inMinutes(minutes) });
      await expect(createCardCheckout(ID, { client, fetchFn })).rejects.toMatchObject({ code: 'enrollment_not_payable' });
      expect(fetchFn).not.toHaveBeenCalled();
    }
  });

  it('valida que el id sea un uuid', async () => {
    const { client, fetchFn } = setup({ holdExpiresAt: inMinutes(10) });
    await expect(createCardCheckout('no-es-uuid', { client, fetchFn })).rejects.toThrow();
  });
});
