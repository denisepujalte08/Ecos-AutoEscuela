import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createOrder, getOrder, type CreatedOrder } from './api';

/**
 * Prueba contra el entorno de PRUEBAS REAL de Mercado Pago. Se saltea salvo que se pida:
 *
 *   PowerShell:  $env:MP_LIVE='1'; npx vitest run api.live
 *   bash:        MP_LIVE=1 npx vitest run api.live
 *
 * Necesita MP_ACCESS_TOKEN (credencial de PRUEBA) en .env.local. No imprime credenciales.
 * Crea una orden de $100 que nadie paga y que vence sola.
 */
describe.skipIf(process.env.MP_LIVE !== '1')('Mercado Pago (entorno de pruebas real)', () => {
  const externalReference = randomUUID();
  const idempotencyKey = randomUUID();
  const input = {
    title: 'Prueba ECOS',
    amount: 100,
    externalReference,
    idempotencyKey,
    expiresInMinutes: 15,
    returnUrls: {
      success: 'https://ecos.example/reserva/resultado?estado=ok',
      pending: 'https://ecos.example/reserva/resultado?estado=pendiente',
      failure: 'https://ecos.example/reserva/resultado?estado=error',
    },
  };

  let order: CreatedOrder;

  it('crea una orden y devuelve la URL de pago', async () => {
    order = await createOrder(input);
    expect(order.id).toBeTruthy();
    expect(order.checkoutUrl).toMatch(/^https:\/\//);
    // La URL no es secreta: sirve para pagar la orden de prueba con la cuenta compradora.
    process.stdout.write(`\n>>> URL DE PAGO DE PRUEBA: ${order.checkoutUrl}\n>>> ID DE ORDEN: ${order.id}\n`);
  });

  it('repetir la petición con la misma clave de idempotencia devuelve la misma orden', async () => {
    const again = await createOrder(input);
    expect(again.id).toBe(order.id);
  });

  it.skipIf(!process.env.MP_ORDER_ID)('consulta una orden existente (MP_ORDER_ID) y muestra su estado', async () => {
    const o = await getOrder(String(process.env.MP_ORDER_ID));
    const raw = o.raw as { status?: string; status_detail?: string; total_paid_amount?: string; transactions?: { payments?: { status?: string; status_detail?: string }[] } };
    process.stdout.write(
      `>>> Orden ${o.id}: ${JSON.stringify({
        status: raw.status,
        status_detail: raw.status_detail,
        total_paid_amount: raw.total_paid_amount,
        pagos: raw.transactions?.payments?.map((p) => ({ status: p.status, status_detail: p.status_detail })),
        traducido_a: o.status,
        monto_que_usariamos: o.amount,
      })}\n`,
    );
    expect(o.id).toBe(process.env.MP_ORDER_ID);
  });

  it('la orden se consulta: pendiente, en pesos y con nuestra referencia', async () => {
    const o = await getOrder(order.id);
    const raw = o.raw as Record<string, unknown>;
    process.stdout.write(
      `>>> Orden en Mercado Pago: ${JSON.stringify({
        status: raw.status,
        status_detail: raw.status_detail,
        currency: o.currency,
        amount: o.amount,
        expiration_time: raw.expiration_time,
      })}\n`,
    );
    expect(o.status).toBe('pending');
    expect(o.currency).toBe('ARS');
    expect(o.amount).toBe(100);
    expect(o.externalReference).toBe(externalReference);
  });
});
