import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { hoyEnArgentina, esMenorDeEdad } from '@/lib/calendario/fechas';
import { createSessionClient, type SessionClient } from './session';

export const RUTA_ENTRAR = '/cuenta/entrar';

export type Tutor = { nombre: string; dni: string; telefono: string };

export type Alumno = {
  id: string;
  nombre: string;
  dni: string;
  email: string;
  telefono: string;
  /** `AAAA-MM-DD` o `null` si todavía no completó su ficha. */
  fechaNacimiento: string | null;
  tutor: Tutor | null;
};

/** Lee un tutor guardado como JSON en la base, descartando lo que no tenga la forma esperada. */
export function leerTutor(valor: unknown): Tutor | null {
  if (!valor || typeof valor !== 'object') return null;
  const { nombre, dni, telefono } = valor as Record<string, unknown>;
  return typeof nombre === 'string' && typeof dni === 'string' && typeof telefono === 'string' ? { nombre, dni, telefono } : null;
}

/**
 * Quién es el alumno de la sesión. `getUser()` le pregunta a Supabase si la sesión es válida y la ficha se
 * lee con la sesión de la persona (RLS: un alumno solo ve la suya). Devuelve `null` si no hay sesión o si el
 * usuario no es un alumno (por ejemplo, una cuenta del personal).
 */
export async function obtenerAlumno(client?: SessionClient): Promise<Alumno | null> {
  const supabase = client ?? (await createSessionClient());
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) return null;

  const { data } = await supabase
    .from('students')
    .select('id, nombre_completo, dni, email, telefono, fecha_nacimiento, tutor')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    nombre: data.nombre_completo,
    dni: data.dni,
    email: data.email,
    telefono: data.telefono,
    fechaNacimiento: data.fecha_nacimiento,
    tutor: leerTutor(data.tutor),
  };
}

/** Exige alumno logueado: si no lo es, va a la pantalla de ingreso. Usar en CADA página y acción de /cuenta. */
export const exigirAlumno = cache(async (): Promise<Alumno> => {
  const alumno = await obtenerAlumno();
  if (!alumno) redirect(RUTA_ENTRAR);
  return alumno;
});

/**
 * La ficha está completa si tiene fecha de nacimiento y, siendo menor de 18 años, los datos de su tutor
 * (la autorización de un adulto es obligatoria).
 */
export function fichaCompleta(alumno: Pick<Alumno, 'fechaNacimiento' | 'tutor'>, hoy: string = hoyEnArgentina()): boolean {
  if (!alumno.fechaNacimiento) return false;
  return !esMenorDeEdad(alumno.fechaNacimiento, hoy) || alumno.tutor !== null;
}
