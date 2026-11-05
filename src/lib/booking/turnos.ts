import 'server-only';
import { z } from 'zod';
import { createSessionClient, type SessionClient } from '@/lib/auth/session';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { fechaLocal, horaLocal, hoyEnArgentina, sumarDias } from '@/lib/calendario/fechas';
import { agendarClases } from './compra';
import { BookingError, type BookingErrorCode } from './errors';

/** Un horario libre. `iso` es el instante exacto que se manda a reservar; `hora` es `HH:MM` de Argentina. */
export type TurnoLibre = { iso: string; hora: string };
export type DiaConTurnos = { fecha: string; turnos: TurnoLibre[] };

/** Agrupa los horarios libres por día (Argentina), sin repetidos y en orden. */
export function agruparTurnos(instantes: string[]): DiaConTurnos[] {
  const porDia = new Map<string, Map<string, TurnoLibre>>();
  for (const iso of instantes) {
    const fecha = fechaLocal(iso);
    const hora = horaLocal(iso);
    const dia = porDia.get(fecha) ?? new Map<string, TurnoLibre>();
    dia.set(hora, { iso: new Date(iso).toISOString(), hora });
    porDia.set(fecha, dia);
  }
  return [...porDia]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, turnos]) => ({ fecha, turnos: [...turnos.values()].sort((a, b) => a.hora.localeCompare(b.hora)) }));
}

/** Días hacia adelante que se piden a la base; la base igual aplica la anticipación máxima configurada. */
const DIAS_A_CONSULTAR = 60;

/**
 * Horarios libres de los próximos días. Los calcula la base (`get_free_slots`): respeta la anticipación
 * mínima y máxima, los bloqueos y los turnos ya ocupados. Se lee con la sesión del alumno.
 */
export async function turnosLibres(clientOpcional?: SessionClient, hoy: string = hoyEnArgentina()): Promise<DiaConTurnos[]> {
  const client = clientOpcional ?? (await createSessionClient());
  const { data, error } = await client.rpc('get_free_slots', { p_from: hoy, p_to: sumarDias(hoy, DIAS_A_CONSULTAR) });
  if (error) throw new Error(`No se pudieron leer los turnos libres: ${error.message}`);
  return agruparTurnos((data ?? []).map((s) => s.starts_at));
}

/** Curso que el alumno ya pagó y todavía no agendó. `null` si no tiene. */
export type InscripcionPorAgendar = { id: string; curso: string; clases: number };

export async function inscripcionPorAgendar(alumnoId: string, clientOpcional?: SessionClient): Promise<InscripcionPorAgendar | null> {
  const client = clientOpcional ?? (await createSessionClient());
  const { data, error } = await client
    .from('enrollments')
    .select('id, courses(nombre, cantidad_clases), lessons(id)')
    .eq('student_id', alumnoId)
    .eq('estado', 'active');
  if (error) throw new Error(`No se pudo leer la inscripción: ${error.message}`);

  const fila = (data ?? []).find((e) => (e.lessons ?? []).length === 0);
  if (!fila || !fila.courses) return null;
  return { id: fila.id, curso: fila.courses.nombre, clases: fila.courses.cantidad_clases };
}

export type EstadoTurnos = { estado: 'inicial' } | { estado: 'error'; mensaje: string } | { estado: 'ok' };

const MENSAJES: Partial<Record<BookingErrorCode, string>> = {
  slot_taken: 'Alguno de los horarios que elegiste se acaba de ocupar. Elegí de nuevo.',
  slot_unavailable: 'Alguno de los horarios ya no está disponible. Elegí de nuevo.',
  student_day_conflict: 'Solo se puede tener una clase por día. Elegí días distintos.',
  duplicate_slots: 'Elegiste el mismo horario dos veces.',
  wrong_lesson_count: 'Tenés que elegir todas las clases de tu curso.',
  already_scheduled: 'Ya elegiste los turnos de este curso.',
  enrollment_not_active: 'Todavía no podés elegir turnos: falta la confirmación del pago.',
};
const GENERICO = 'No pudimos reservar tus turnos. Probá de nuevo en unos minutos.';

const turnosSchema = z.array(z.iso.datetime({ offset: true })).min(1).max(30);

/**
 * Reserva todos los turnos del alumno, o ninguno. La inscripción sale de la SESIÓN (la del alumno, ya pagada y
 * sin turnos), nunca del formulario: nadie puede agendar sobre el curso de otra persona.
 */
export async function reservarTurnos(
  alumnoId: string,
  turnos: string[],
  clientes: { sesion?: SessionClient; admin?: AdminClient } = {},
): Promise<EstadoTurnos> {
  const parsed = turnosSchema.safeParse(turnos);
  if (!parsed.success) return { estado: 'error', mensaje: MENSAJES.wrong_lesson_count ?? GENERICO };

  try {
    const inscripcion = await inscripcionPorAgendar(alumnoId, clientes.sesion);
    if (!inscripcion) return { estado: 'error', mensaje: MENSAJES.already_scheduled ?? GENERICO };

    await agendarClases({ enrollmentId: inscripcion.id, startsAt: parsed.data }, clientes.admin ?? createAdminClient());
    return { estado: 'ok' };
  } catch (e) {
    if (e instanceof BookingError) return { estado: 'error', mensaje: MENSAJES[e.code] ?? GENERICO };
    console.error('reservarTurnos falló:', e);
    return { estado: 'error', mensaje: GENERICO };
  }
}

/** Una clase ya agendada del alumno, para mostrarla en su cuenta. */
export type ClaseDelAlumno = {
  id: string;
  fecha: string;
  hora: string;
  nro: number | null;
  total: number | null;
  estado: 'held' | 'scheduled' | 'done' | 'no_show';
  curso: string | null;
};

export async function clasesDelAlumno(clientOpcional?: SessionClient): Promise<ClaseDelAlumno[]> {
  const client = clientOpcional ?? (await createSessionClient());
  const { data, error } = await client
    .from('lessons')
    .select('id, nro_clase, status, starts_at, enrollments(courses(nombre, cantidad_clases))')
    .in('status', ['held', 'scheduled', 'done', 'no_show'])
    .order('starts_at', { ascending: true });
  if (error) throw new Error(`No se pudieron leer las clases: ${error.message}`);

  return (data ?? []).map((l) => ({
    id: l.id,
    fecha: fechaLocal(l.starts_at),
    hora: horaLocal(l.starts_at),
    nro: l.nro_clase,
    total: l.enrollments?.courses?.cantidad_clases ?? null,
    estado: l.status as ClaseDelAlumno['estado'],
    curso: l.enrollments?.courses?.nombre ?? null,
  }));
}
