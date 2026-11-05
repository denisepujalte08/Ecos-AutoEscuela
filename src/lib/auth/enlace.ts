import 'server-only';
import { z } from 'zod';
import { createSessionClient, type SessionClient } from './session';

/**
 * "Entrar con un link por mail" (sin contraseña). La respuesta es SIEMPRE la misma haya o no una cuenta con
 * ese email, para no revelar quién es alumno. Supabase limita la cantidad de mails por persona y por hora.
 */
export const MENSAJE_ENLACE_ENVIADO = 'Si ese email está registrado, te enviamos un link para entrar. Revisá tu correo (y el spam).';
const MENSAJE_GENERICO = 'No pudimos enviar el link. Probá de nuevo en unos minutos.';

const emailSchema = z.string().trim().max(254).pipe(z.email('Escribí un email válido.'));

export type ResultadoEnlace = { ok: true; mensaje: string } | { ok: false; mensaje: string };

export async function pedirEnlace(email: string, clientOpcional?: SessionClient): Promise<ResultadoEnlace> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, mensaje: parsed.error.issues[0].message };

  try {
    const supabase = clientOpcional ?? (await createSessionClient());
    // `shouldCreateUser: false`: nunca crea una cuenta; solo manda el link a quien ya la tiene.
    const { error } = await supabase.auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: false } });
    if (error) {
      // Un email sin cuenta o con el límite de envíos superado: se registra pero no se le dice a la persona.
      console.error('pedirEnlace: signInWithOtp falló:', error.code ?? error.message);
      if (error.status === 429 || error.code === 'over_email_send_rate_limit') return { ok: false, mensaje: MENSAJE_GENERICO };
    }
    return { ok: true, mensaje: MENSAJE_ENLACE_ENVIADO };
  } catch (e) {
    console.error('pedirEnlace falló:', e);
    return { ok: false, mensaje: MENSAJE_GENERICO };
  }
}

/** Tipos de link que se aceptan: la invitación al dar de alta y el link para volver a entrar. */
export const TIPOS_DE_ENLACE = ['invite', 'email'] as const;
export type TipoDeEnlace = (typeof TIPOS_DE_ENLACE)[number];

export function esTipoDeEnlace(valor: unknown): valor is TipoDeEnlace {
  return typeof valor === 'string' && (TIPOS_DE_ENLACE as readonly string[]).includes(valor);
}

/**
 * Canjea el link de un mail por una sesión (queda en las cookies). Los links son de un solo uso y vencen,
 * así que cualquier falla se resume en "no válido".
 */
export async function verificarEnlace(tokenHash: string, tipo: string, clientOpcional?: SessionClient): Promise<{ ok: boolean }> {
  if (!tokenHash || tokenHash.length > 300 || !esTipoDeEnlace(tipo)) return { ok: false };
  try {
    const supabase = clientOpcional ?? (await createSessionClient());
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    return { ok: !error };
  } catch (e) {
    console.error('verificarEnlace falló:', e);
    return { ok: false };
  }
}
