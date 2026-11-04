import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv, serverEnv } from '@/lib/env';
import type { Database } from './database.types';

const options = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/**
 * Cliente con la clave pública (rol `anon`). Solo puede lo que el público puede:
 * ver cursos activos, reglas de descuento y turnos libres. Usarlo para todo lo que
 * se muestra sin sesión; es el privilegio mínimo.
 */
export function createPublicClient() {
  const env = publicEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    options,
  );
}

/**
 * Cliente con `service_role`: ignora RLS y puede ejecutar las funciones de reserva.
 * SOLO servidor (Server Actions, Route Handlers, webhooks). Nunca exponerlo al navegador
 * ni devolver sus resultados sin filtrar.
 */
export function createAdminClient() {
  const env = serverEnv();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    options,
  );
}

export type PublicClient = ReturnType<typeof createPublicClient>;
export type AdminClient = ReturnType<typeof createAdminClient>;
