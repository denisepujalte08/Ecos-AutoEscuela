import { processMercadoPagoWebhook } from '@/lib/payments/mercadopago/webhook';

// Un handler POST nunca se cachea ni se prerenderiza, así que no hace falta configurarlo.
export async function POST(request: Request) {
  const { status, body } = await processMercadoPagoWebhook(request);
  return Response.json(body, { status });
}
