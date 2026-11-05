'use server';

import { redirect } from 'next/navigation';
import { RUTA_ENTRAR } from '@/lib/auth/alumno';
import { createSessionClient } from '@/lib/auth/session';

export async function cerrarSesionAlumno() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect(RUTA_ENTRAR);
}
