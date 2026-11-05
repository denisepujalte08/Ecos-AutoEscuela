import 'server-only';
import { z } from 'zod';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { BookingError } from './errors';
import { confirmarPago } from './compra';

/**
 * Alta de alumnos (ver docs/10-pedidos-y-alta.md).
 *
 * "Dar de alta" = crear el usuario del alumno, mandarle un mail para que elija su contraseña y
 * vincularlo con su ficha (`students.user_id`). Corre con privilegios de servidor: quien la llame
 * (Server Action del panel) debe verificar antes que la persona sea del personal (`exigirPersonal`).
 */

export type ResultadoAlta =
  | { ok: true; yaTeniaUsuario: boolean }
  | { ok: false; motivo: 'alumno_inexistente' | 'email_de_personal' | 'no_se_pudo_invitar' };

type RespuestaAdmin = { data: { users: { id: string; email?: string }[] } | null; error: { message: string } | null };

/** Busca un usuario por email (la API de administración no tiene búsqueda directa). */
async function buscarUsuarioPorEmail(client: AdminClient, email: string): Promise<string | null> {
  const { data, error } = (await client.auth.admin.listUsers({ perPage: 1000 })) as RespuestaAdmin;
  if (error) throw new Error(`No se pudo buscar el usuario: ${error.message}`);
  const buscado = email.toLowerCase();
  return data?.users.find((u) => u.email?.toLowerCase() === buscado)?.id ?? null;
}

/**
 * Da de alta a un alumno. Se puede repetir sin problema: si ya tiene usuario, no hace nada.
 *
 * - Si el email no tiene usuario: lo crea y le manda la invitación (mail con link para elegir contraseña).
 * - Si el email ya tiene usuario (por ejemplo, fue alumno antes): lo vincula, salvo que sea del personal,
 *   para que nunca se mezcle un alumno con una cuenta de administración.
 */
export async function darDeAlta(
  studentId: string,
  opciones: { redirectTo?: string } = {},
  client: AdminClient = createAdminClient(),
): Promise<ResultadoAlta> {
  const id = z.uuid().parse(studentId);

  const { data: alumno, error } = await client
    .from('students')
    .select('id, nombre_completo, email, user_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo leer al alumno ${id}: ${error.message}`);
  if (!alumno) return { ok: false, motivo: 'alumno_inexistente' };
  if (alumno.user_id) return { ok: true, yaTeniaUsuario: true };

  let userId: string;
  let yaTeniaUsuario = false;

  const invitacion = await client.auth.admin.inviteUserByEmail(alumno.email, {
    data: { nombre: alumno.nombre_completo },
    redirectTo: opciones.redirectTo,
  });

  if (invitacion.error) {
    if (invitacion.error.code !== 'email_exists') {
      console.error('inviteUserByEmail falló:', invitacion.error);
      return { ok: false, motivo: 'no_se_pudo_invitar' };
    }
    const existente = await buscarUsuarioPorEmail(client, alumno.email);
    if (!existente) return { ok: false, motivo: 'no_se_pudo_invitar' };

    const { data: perfil } = await client.from('profiles').select('role').eq('user_id', existente).maybeSingle();
    if (perfil?.role && perfil.role !== 'student') return { ok: false, motivo: 'email_de_personal' };
    userId = existente;
    yaTeniaUsuario = true;
  } else {
    userId = invitacion.data.user.id;
  }

  const { error: errVincular } = await client.from('students').update({ user_id: userId }).eq('id', id);
  if (errVincular) {
    // Otro alumno ya usa ese usuario (user_id es único): no se puede vincular.
    console.error('No se pudo vincular al alumno con su usuario:', errVincular);
    return { ok: false, motivo: 'no_se_pudo_invitar' };
  }
  return { ok: true, yaTeniaUsuario };
}

export type ResultadoConfirmacion =
  | { estado: 'ok'; alta: ResultadoAlta }
  | { estado: 'error'; motivo: 'no_pendiente' | 'fallo' };

/**
 * Confirma el pago de un pedido y da de alta al alumno, en ese orden. Si el pago se confirma pero el alta
 * falla (por ejemplo, el mail no sale), el pago NO se deshace: el pedido pasa a "Pendientes de alta" y se
 * reintenta con `darDeAlta`.
 */
export async function confirmarPedido(
  enrollmentId: string,
  opciones: { redirectTo?: string } = {},
  client: AdminClient = createAdminClient(),
): Promise<ResultadoConfirmacion> {
  const parsed = z.uuid().safeParse(enrollmentId);
  if (!parsed.success) return { estado: 'error', motivo: 'fallo' };

  try {
    await confirmarPago(parsed.data, client);
  } catch (e) {
    if (e instanceof BookingError && (e.code === 'enrollment_not_confirmable' || e.code === 'enrollment_has_lessons')) {
      return { estado: 'error', motivo: 'no_pendiente' };
    }
    console.error('confirmarPedido falló:', e);
    return { estado: 'error', motivo: 'fallo' };
  }

  const { data: inscripcion } = await client.from('enrollments').select('student_id').eq('id', parsed.data).maybeSingle();
  if (!inscripcion) return { estado: 'ok', alta: { ok: false, motivo: 'alumno_inexistente' } };

  try {
    return { estado: 'ok', alta: await darDeAlta(inscripcion.student_id, opciones, client) };
  } catch (e) {
    console.error('darDeAlta falló después de confirmar el pago:', e);
    return { estado: 'ok', alta: { ok: false, motivo: 'no_se_pudo_invitar' } };
  }
}
