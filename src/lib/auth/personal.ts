import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createSessionClient, type SessionClient } from './session';

export type RolPersonal = 'admin' | 'owner';
export type Personal = { id: string; email: string; rol: RolPersonal };

export const RUTA_LOGIN = '/panel/login';

/**
 * Quién es la persona de la sesión, SOLO si es del personal (administración o dueño).
 *
 * `getUser()` le pregunta a Supabase si la sesión es válida (no confía en lo que diga la cookie).
 * El rol sale de `profiles`, que la persona puede leer (RLS: solo el suyo) y nadie puede cambiarse a sí mismo.
 * Devuelve `null` si no hay sesión o si es un alumno: para el panel, es lo mismo.
 */
export async function obtenerPersonal(client?: SessionClient): Promise<Personal | null> {
  const supabase = client ?? (await createSessionClient());
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) return null;

  const { data: perfil } = await supabase.from('profiles').select('role').eq('user_id', auth.user.id).maybeSingle();
  if (perfil?.role !== 'admin' && perfil?.role !== 'owner') return null;

  return { id: auth.user.id, email: auth.user.email ?? '', rol: perfil.role };
}

/**
 * Exige personal logueado: si no lo es, va al login. Usar al principio de CADA página, acción y consulta
 * del panel (el proxy solo es un primer filtro y no alcanza). `cache` evita repetir la consulta en una misma carga.
 */
export const exigirPersonal = cache(async (): Promise<Personal> => {
  const personal = await obtenerPersonal();
  if (!personal) redirect(RUTA_LOGIN);
  return personal;
});
