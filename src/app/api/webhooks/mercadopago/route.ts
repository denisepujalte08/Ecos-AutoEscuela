import { processMercadoPagoWebhook } from '@/lib/payments/mercadopago/webhook';

// Los webhooks nunca deben cachearse ni prerenderizarse.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { status, body } = await processMercadoPagoWebhook(request);
  return Response.json(body, { status });
}
