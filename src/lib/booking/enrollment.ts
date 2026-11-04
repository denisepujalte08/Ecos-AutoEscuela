import 'server-only';
import { z } from 'zod';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { BookingError, toBookingError } from './errors';
import type { FreeSlot } from './slots';

const createEnrollmentSchema = z.object({
  studentId: z.uuid(),
  courseId: z.uuid(),
  metodo: z.enum(['tarjeta', 'transferencia', 'efectivo']),
  startsAt: z.array(z.iso.datetime({ offset: true })).min(1).max(30),
});

export type CreateEnrollmentInput = z.input<typeof createEnrollmentSchema>;

/**
 * Reserva todas las clases de un curso o ninguna (una sola transacción en la base).
 * Devuelve el id de la inscripción. Lanza BookingError si algún turno no se pudo tomar;
 * en ese caso conviene llamar a `suggestSlots` con el turno problemático.
 *
 * El monto lo calcula la base desde el precio de lista y el método de pago: nunca se
 * recibe del navegador.
 */
export async function createEnrollment(
  input: CreateEnrollmentInput,
  client: AdminClient = createAdminClient(),
): Promise<string> {
  const v = createEnrollmentSchema.parse(input);

  const { data, error } = await client.rpc('create_enrollment', {
    p_student_id: v.studentId,
    p_course_id: v.courseId,
    p_metodo: v.metodo,
    p_starts: v.startsAt,
  });

  if (error) throw toBookingError(error) ?? new Error(`create_enrollment falló: ${error.message}`);
  return data;
}

const suggestSchema = z.object({
  studentId: z.uuid(),
  wanted: z.iso.datetime({ offset: true }),
  alreadyChosen: z.array(z.iso.datetime({ offset: true })).default([]),
  limit: z.number().int().min(1).max(20).default(5),
});

export type SuggestSlotsInput = z.input<typeof suggestSchema>;

export type SuggestedSlot = FreeSlot & { distanceMinutes: number };

/** Horarios libres más cercanos al deseado, respetando una clase por día. */
export async function suggestSlots(
  input: SuggestSlotsInput,
  client: AdminClient = createAdminClient(),
): Promise<SuggestedSlot[]> {
  const v = suggestSchema.parse(input);

  const { data, error } = await client.rpc('suggest_slots', {
    p_student_id: v.studentId,
    p_wanted: v.wanted,
    p_exclude: v.alreadyChosen,
    p_limit: v.limit,
  });
  if (error) throw new Error(`suggest_slots falló: ${error.message}`);

  return (data ?? []).map((row) => ({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    instructorId: row.instructor_id,
    distanceMinutes: row.distance_minutes,
  }));
}

export { BookingError };
