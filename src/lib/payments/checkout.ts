import 'server-only';
import { z } from 'zod';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { mercadoPagoEnv } from '@/lib/env';
import { createOrder, type CreatedOrder, type FetchLike } from './mercadopago/api';

export class PaymentError extends Error {
  constructor(
    public readonly code: 'enrollment_not_found' | 'enrollment_not_payable',
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'PaymentError';
  }
}

/**
 * Crea la orden de pago con tarjeta (Mercado Pago, Checkout Pro vía API de Orders)
 * y devuelve la URL a la que hay que redirigir al alumno.
 *
 * Seguridad:
 *  - El monto SIEMPRE sale de la base (`enrollments.monto`, calculado por create_enrollment);
 *    esta función solo recibe el id de la inscripción.
 *  - La clave de idempotencia es el id de la inscripción: si el alumno recarga la página o
 *    la petición se repite, Mercado Pago no crea una segunda orden.
 *  - La orden vence junto con la retención de turnos.
 */
export async function createCardCheckout(
  enrollmentId: string,
  deps: { client?: AdminClient; fetchFn?: FetchLike } = {},
): Promise<CreatedOrder> {
  const id = z.uuid().parse(enrollmentId);
  const client = deps.client ?? createAdminClient();
  const { APP_URL } = mercadoPagoEnv();

  const { data: enrollment, error } = await client
    .from('enrollments')
    .select('id, monto, estado, metodo, courses(nombre)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer la inscripción: ${error.message}`);
  if (!enrollment) throw new PaymentError('enrollment_not_found');
  if (enrollment.estado !== 'pending_payment' || enrollment.metodo !== 'tarjeta') {
    throw new PaymentError(
      'enrollment_not_payable',
      `La inscripción está en estado ${enrollment.estado} con método ${enrollment.metodo}`,
    );
  }

  const { data: holds, error: holdsError } = await client
    .from('lessons')
    .select('hold_expires_at')
    .eq('enrollment_id', id)
    .eq('status', 'held')
    .order('hold_expires_at', { ascending: true })
    .limit(1);
  if (holdsError) throw new Error(`No se pudo leer la retención: ${holdsError.message}`);

  const expiresAt = holds?.[0]?.hold_expires_at;
  let expiresInMinutes: number | undefined;
  if (expiresAt) {
    expiresInMinutes = (new Date(expiresAt).getTime() - Date.now()) / 60_000;
    if (expiresInMinutes < 1) {
      throw new PaymentError('enrollment_not_payable', 'La retención de turnos ya venció o está por vencer');
    }
  }

  const base = APP_URL.replace(/\/$/, '');
  const result = (outcome: string) => `${base}/reserva/resultado?inscripcion=${id}&estado=${outcome}`;

  return createOrder(
    {
      title: enrollment.courses?.nombre ?? 'Curso de manejo',
      amount: Number(enrollment.monto),
      externalReference: id,
      idempotencyKey: id,
      expiresInMinutes,
      returnUrls: { success: result('ok'), pending: result('pendiente'), failure: result('error') },
    },
    deps.fetchFn,
  );
}
