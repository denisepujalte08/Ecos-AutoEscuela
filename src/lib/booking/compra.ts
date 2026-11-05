import 'server-only';
import { z } from 'zod';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { toBookingError } from './errors';

/**
 * Compra de un curso desde la web, sin pago online (ver docs/08-compra-web.md).
 *
 * Flujo: 1) la persona hace el pedido (sin turnos) → 2) paga por fuera → 3) el personal confirma el
 * pago → 4) recién entonces se eligen los turnos. Nunca se retienen turnos sin pago.
 *
 * Todo pasa por el servidor con `service_role`: las funciones SQL no las puede ejecutar el público.
 * La base vuelve a validar cada dato; acá solo se corta lo evidente.
 */

// ---------------------------------------------------------------------------
// 1) Pedido de compra
// ---------------------------------------------------------------------------
const compraSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  telefono: z.string().trim().min(8).max(30),
  dni: z.string().trim().min(6).max(14),
  email: z.string().trim().min(3).max(254),
  courseId: z.uuid(),
  // La tarjeta se paga online, con otro flujo.
  metodo: z.enum(['transferencia', 'efectivo']),
});

export type CompraWebInput = z.input<typeof compraSchema>;

/**
 * Crea el pedido de compra (inscripción pendiente de revisión, sin turnos) y, si hace falta, al alumno.
 * Devuelve el id de la inscripción. El monto lo calcula la base desde el precio de lista y el medio de
 * pago: nunca viene del navegador.
 *
 * Lanza BookingError si la base rechaza algo (datos inválidos, curso inactivo, o la persona ya tiene
 * un curso pendiente o activo).
 */
export async function comprarCursoDesdeWeb(
  input: CompraWebInput,
  client: AdminClient = createAdminClient(),
): Promise<string> {
  const v = compraSchema.parse(input);

  const { data, error } = await client.rpc('create_web_purchase', {
    p_nombre: v.nombre,
    p_telefono: v.telefono,
    p_dni: v.dni,
    p_email: v.email,
    p_course_id: v.courseId,
    p_metodo: v.metodo,
  });

  if (error) throw toBookingError(error) ?? new Error(`create_web_purchase falló: ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------------
// 2) Confirmar el pago (lo hace el personal)
// ---------------------------------------------------------------------------
/**
 * Marca como pagada una inscripción pendiente de revisión. Solo para el personal: quien la llame
 * (Server Action del panel) debe verificar antes el rol del usuario.
 */
export async function confirmarPago(enrollmentId: string, client: AdminClient = createAdminClient()): Promise<void> {
  const id = z.uuid().parse(enrollmentId);

  const { error } = await client.rpc('confirm_payment', { p_enrollment_id: id });
  if (error) throw toBookingError(error) ?? new Error(`confirm_payment falló: ${error.message}`);
}

// ---------------------------------------------------------------------------
// 3) Elegir los turnos de una inscripción ya paga
// ---------------------------------------------------------------------------
const agendarSchema = z.object({
  enrollmentId: z.uuid(),
  startsAt: z.array(z.iso.datetime({ offset: true })).min(1).max(30),
});

export type AgendarInput = z.input<typeof agendarSchema>;

/**
 * Agenda todas las clases de una inscripción paga, o ninguna. Quien la llame (Server Action del
 * alumno o del personal) debe verificar antes que la inscripción sea de esa persona: esta función
 * corre con privilegios de servidor y no lo comprueba.
 */
export async function agendarClases(input: AgendarInput, client: AdminClient = createAdminClient()): Promise<void> {
  const v = agendarSchema.parse(input);

  const { error } = await client.rpc('schedule_enrollment', {
    p_enrollment_id: v.enrollmentId,
    p_starts: v.startsAt,
  });
  if (error) throw toBookingError(error) ?? new Error(`schedule_enrollment falló: ${error.message}`);
}
