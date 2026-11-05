'use server';

import { redirect } from 'next/navigation';
import { verificarEnlace } from '@/lib/auth/enlace';

const texto = (formData: FormData, nombre: string) => {
  const v = formData.get(nombre);
  return typeof v === 'string' ? v : '';
};

/** Canjea el link del mail por una sesión y lleva al alumno a su cuenta (destino fijo, no viene de la URL). */
export async function confirmarEnlace(formData: FormData): Promise<void> {
  const r = await verificarEnlace(texto(formData, 'token_hash'), texto(formData, 'type'));
  redirect(r.ok ? '/cuenta' : '/cuenta/entrar?error=link');
}
