import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { publicEnv } from '@/lib/env';
import type { Database } from '@/lib/db/database.types';

/**
 * Cliente de Supabase que actúa COMO LA PERSONA que inició sesión (rol `authenticated`, con RLS).
 * Lee y renueva la sesión desde las cookies. Es distinto de `createAdminClient()`, que ignora RLS:
 * este solo puede lo que esa persona puede.
 */
export async function createSessionClient() {
  // La sesión es siempre de cada pedido: nunca se prerenderiza (el cliente de Supabase usa la hora actual).
  await connection();
  const env = publicEnv();
  const store = await cookies();
  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) store.set(name, value, options);
        } catch {
          // Desde un Server Component no se pueden escribir cookies: la renovación la hace el proxy.
        }
      },
    },
  });
}

export type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;
