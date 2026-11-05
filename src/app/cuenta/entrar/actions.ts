'use server';

import { pedirEnlace, type ResultadoEnlace } from '@/lib/auth/enlace';

export type EstadoEntrar = { estado: 'inicial' } | { estado: 'ok' | 'error'; mensaje: string; email: string };

const texto = (formData: FormData, nombre: string) => {
  const v = formData.get(nombre);
  return typeof v === 'string' ? v : '';
};

/** Server Action de "Entrar con un link por mail": lee el formulario y delega. */
export async function pedirLink(_anterior: EstadoEntrar, formData: FormData): Promise<EstadoEntrar> {
  const email = texto(formData, 'email');
  const r: ResultadoEnlace = await pedirEnlace(email);
  return { estado: r.ok ? 'ok' : 'error', mensaje: r.mensaje, email };
}
