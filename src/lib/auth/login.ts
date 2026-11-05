import 'server-only';
import { z } from 'zod';
import { createSessionClient, type SessionClient } from './session';
import { obtenerPersonal } from './personal';

/** Mensaje único para cualquier falla de credenciales: no revela si el email existe ni si es alumno. */
export const MENSAJE_CREDENCIALES = 'El email o la contraseña no son correctos.';
const MENSAJE_GENERICO = 'No pudimos iniciar la sesión. Probá de nuevo en unos minutos.';

const schema = z.object({
  email: z.string().trim().max(254).pipe(z.email('Escribí un email válido.')),
  password: z.string().min(1, 'Escribí tu contraseña.').max(200),
});

export type EstadoLogin = { estado: 'inicial' } | { estado: 'error'; mensaje: string; email: string };
export type ResultadoLogin = { ok: true } | { ok: false; mensaje: string; email: string };

/**
 * Inicia sesión del personal. Si las credenciales son de un alumno (o de nadie), responde lo mismo y
 * cierra la sesión que se haya abierto: el panel es solo para administración y dueño.
 */
export async function iniciarSesionPersonal(
  datos: { email: string; password: string },
  clientOpcional?: SessionClient,
): Promise<ResultadoLogin> {
  const parsed = schema.safeParse(datos);
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0].message, email: datos.email };
  }
  const { email, password } = parsed.data;

  try {
    const supabase = clientOpcional ?? (await createSessionClient());
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // 400 = credenciales; otro estado (red, límite de intentos) es un problema distinto.
      const credenciales = error.status === 400 || error.code === 'invalid_credentials';
      return { ok: false, mensaje: credenciales ? MENSAJE_CREDENCIALES : MENSAJE_GENERICO, email };
    }

    if (!(await obtenerPersonal(supabase))) {
      await supabase.auth.signOut();
      return { ok: false, mensaje: MENSAJE_CREDENCIALES, email };
    }
    return { ok: true };
  } catch (e) {
    console.error('iniciarSesionPersonal falló:', e);
    return { ok: false, mensaje: MENSAJE_GENERICO, email };
  }
}
