import 'server-only';
import { z } from 'zod';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { mercadoPagoEnv } from '@/lib/env';
import { createPreference, type FetchLike, type Preference } from './mercadopago/api';

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
 * Crea el link de pago con tarjeta (Mercado Pago, Checkout Pro) para una inscripción.
 *
 * Seguridad: el monto SIEMPRE sale de la base (`enrollments.monto`, calculado por
 * create_enrollment); esta función solo recibe el id de la inscripción.
 * El link vence junto con la retención de turnos.
 */
export async function createCardCheckout(
  enrollmentId: string,
  deps: { client?: AdminClient; fetchFn?: FetchLike } = {},
): Promise<Preference> {
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

  const expiresAt = holds?.[0]?.hold_expires_at ?? undefined;
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    throw new PaymentError('enrollment_not_payable', 'La retención de turnos ya venció');
  }

  const base = APP_URL.replace(/\/$/, '');
  const result = (outcome: string) => `${base}/reserva/resultado?inscripcion=${id}&estado=${outcome}`;

  return createPreference(
    {
      title: enrollment.courses?.nombre ?? 'Curso de manejo',
      amount: Number(enrollment.monto),
      externalReference: id,
      notificationUrl: `${base}/api/webhooks/mercadopago`,
      backUrls: { success: result('ok'), failure: result('error'), pending: result('pendiente') },
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    },
    deps.fetchFn,
  );
}
