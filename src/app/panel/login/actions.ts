'use server';

import { redirect } from 'next/navigation';
import { iniciarSesionPersonal, type EstadoLogin } from '@/lib/auth/login';

const texto = (formData: FormData, nombre: string) => {
  const v = formData.get(nombre);
  return typeof v === 'string' ? v : '';
};

/** Server Action del login: lee el formulario y delega (se puede llamar directo, todo se valida de nuevo). */
export async function iniciarSesion(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const resultado = await iniciarSesionPersonal({ email: texto(formData, 'email'), password: texto(formData, 'password') });
  if (resultado.ok) redirect('/panel');
  return { estado: 'error', mensaje: resultado.mensaje, email: resultado.email };
}
