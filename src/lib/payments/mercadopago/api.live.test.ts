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
    console.log(`\n>>> URL DE PAGO DE PRUEBA: ${order.checkoutUrl}\n>>> ID DE ORDEN: ${order.id}\n`);
  });

  it('repetir la petición con la misma clave de idempotencia devuelve la misma orden', async () => {
    const again = await createOrder(input);
    expect(again.id).toBe(order.id);
  });

  it('la orden se consulta: pendiente, en pesos y con nuestra referencia', async () => {
    const o = await getOrder(order.id);
    console.log(`>>> Estado inicial de la orden: ${JSON.stringify({ status: (o.raw as Record<string, unknown>).status, status_detail: (o.raw as Record<string, unknown>).status_detail, currency: o.currency, amount: o.amount })}`);
    expect(o.status).toBe('pending');
    expect(o.currency).toBe('ARS');
    expect(o.amount).toBe(100);
    expect(o.externalReference).toBe(externalReference);
  });
});
