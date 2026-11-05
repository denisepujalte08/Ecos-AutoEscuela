import 'server-only';
import { createSessionClient, type SessionClient } from '@/lib/auth/session';
import { diasLaborables, filasDeLaSemana, franjasPorDia, horaLocal, sumarDias } from './fechas';

/** Una clase tal como se dibuja en el calendario. */
export type ClaseCalendario = {
  id: string;
  /** Día (Argentina), `AAAA-MM-DD`. */
  fecha: string;
  /** Hora de inicio (Argentina), `HH:MM`. */
  hora: string;
  tipo: 'clase' | 'examen';
  estado: 'held' | 'scheduled' | 'done' | 'no_show';
  /** Número de clase dentro del curso y total de clases del curso (solo clases, no exámenes). */
  nro: number | null;
  total: number | null;
  alumno: string;
  instructor: { id: string; nombre: string };
};

export type SemanaCalendario = {
  lunes: string;
  dias: string[];
  /** Horarios de inicio de las filas de la grilla, en orden. */
  filas: string[];
  /** Por día de la semana ISO (1 = lunes): horarios en los que hay atención. */
  atencion: Map<number, Set<string>>;
  /** Clases por `fecha|hora`. */
  clases: Map<string, ClaseCalendario>;
  instructores: { id: string; nombre: string }[];
  slotMinutes: number;
};

export const claveCelda = (fecha: string, hora: string) => `${fecha}|${hora}`;

/**
 * Datos de una semana (lunes a viernes) para el calendario del personal. Se leen con la sesión de la
 * persona (RLS): la base decide qué puede ver. No incluye las clases canceladas.
 */
export async function cargarSemana(lunes: string, clientOpcional?: SessionClient): Promise<SemanaCalendario> {
  const client = clientOpcional ?? (await createSessionClient());
  const dias = diasLaborables(lunes);

  const [clases, reglas, ajustes, instructores] = await Promise.all([
    client
      .from('lessons')
      .select(
        'id, nro_clase, kind, status, starts_at, fecha_local, instructors(id, nombre), students(nombre_completo), enrollments(courses(cantidad_clases))',
      )
      .gte('fecha_local', dias[0])
      .lte('fecha_local', sumarDias(lunes, 4))
      .in('status', ['held', 'scheduled', 'done', 'no_show'])
      .order('starts_at', { ascending: true }),
    client.from('availability_rules').select('weekday, start_time, end_time'),
    client.from('settings').select('value').eq('key', 'slot_minutes').maybeSingle(),
    client.from('instructors').select('id, nombre').eq('activo', true).order('nombre', { ascending: true }),
  ]);

  if (clases.error) throw new Error(`No se pudieron leer las clases: ${clases.error.message}`);
  if (reglas.error) throw new Error(`No se pudieron leer los horarios de atención: ${reglas.error.message}`);
  if (instructores.error) throw new Error(`No se pudieron leer los profesores: ${instructores.error.message}`);

  const slotMinutes = Number(ajustes.data?.value) || 40;
  const franjas = franjasPorDia(reglas.data ?? [], slotMinutes);

  const mapa = new Map<string, ClaseCalendario>();
  for (const c of clases.data ?? []) {
    // `fecha_local` es una columna generada y nunca es nula; el tipo generado no lo sabe.
    if (!c.fecha_local) continue;
    const hora = horaLocal(c.starts_at);
    mapa.set(claveCelda(c.fecha_local, hora), {
      id: c.id,
      fecha: c.fecha_local,
      hora,
      tipo: c.kind,
      estado: c.status as ClaseCalendario['estado'],
      nro: c.nro_clase,
      total: c.enrollments?.courses?.cantidad_clases ?? null,
      alumno: c.students?.nombre_completo ?? 'Alumno',
      instructor: { id: c.instructors?.id ?? '', nombre: c.instructors?.nombre ?? 'Profesor' },
    });
  }

  // Si hay una clase en un horario que ya no figura como atención (cambió la disponibilidad), igual se muestra.
  const filas = filasDeLaSemana(franjas);
  for (const c of mapa.values()) if (!filas.includes(c.hora)) filas.push(c.hora);
  filas.sort();

  return {
    lunes,
    dias,
    filas,
    atencion: new Map([...franjas].map(([dia, horas]) => [dia, new Set(horas)])),
    clases: mapa,
    instructores: instructores.data ?? [],
    slotMinutes,
  };
}
