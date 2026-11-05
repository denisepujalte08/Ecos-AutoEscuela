import 'server-only';
import { z } from 'zod';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { toBookingError } from './errors';

/**
 * Datos que llegan del formulario público. La base vuelve a validar todo (nombre, teléfono, email),
 * así que acá solo se corta lo evidente antes de molestarla.
 */
const reservaSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  telefono: z.string().trim().min(8).max(30),
  email: z.string().trim().max(254).optional(),
  courseId: z.uuid(),
  startsAt: z.array(z.iso.datetime({ offset: true })).min(1).max(30),
});

export type ReservaWebInput = z.input<typeof reservaSchema>;

/**
 * Reserva un curso completo desde la web, sin pago online: el pago se coordina por WhatsApp.
 * Crea (o reutiliza) al alumno y retiene todos los turnos en una sola transacción de la base.
 * Devuelve el id de la inscripción.
 *
 * Lanza BookingError si la base rechaza algo: datos inválidos, turno tomado, o más de una reserva
 * pendiente con el mismo teléfono. El monto lo calcula la base; nunca viene del navegador.
 */
export async function reservarDesdeWeb(
  input: ReservaWebInput,
  client: AdminClient = createAdminClient(),
): Promise<string> {
  const v = reservaSchema.parse(input);

  const { data, error } = await client.rpc('create_web_reservation', {
    p_nombre: v.nombre,
    p_telefono: v.telefono,
    p_email: v.email ?? '',
    p_course_id: v.courseId,
    p_starts: v.startsAt,
  });

  if (error) throw toBookingError(error) ?? new Error(`create_web_reservation falló: ${error.message}`);
  return data;
}
