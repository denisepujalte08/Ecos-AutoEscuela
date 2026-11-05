'use server';

import { redirect } from 'next/navigation';
import { createSessionClient } from '@/lib/auth/session';
import { RUTA_LOGIN } from '@/lib/auth/personal';

export async function cerrarSesion() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect(RUTA_LOGIN);
}
