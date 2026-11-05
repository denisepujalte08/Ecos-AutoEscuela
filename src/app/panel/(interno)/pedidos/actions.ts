'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exigirPersonal } from '@/lib/auth/personal';
import { confirmarPedido, darDeAlta, type ResultadoAlta } from '@/lib/booking/alta';

/**
 * El resultado se muestra en la misma pantalla con un aviso (`?aviso=código`). Los códigos y sus textos
 * están en `avisos.ts`: la URL nunca lleva texto libre.
 */
const texto = (formData: FormData, nombre: string) => {
  const v = formData.get(nombre);
  return typeof v === 'string' ? v : '';
};

function volver(aviso: string): never {
  revalidatePath('/panel/pedidos');
  revalidatePath('/panel');
  redirect(`/panel/pedidos?aviso=${aviso}`);
}

function avisoDeAlta(r: ResultadoAlta, avisoOk: string): string {
  return r.ok ? avisoOk : `pago-ok-${r.motivo}`;
}

/**
 * Confirmar el pago de un pedido y dar de alta al alumno.
 * Una Server Action se puede llamar con una petición directa: lo PRIMERO es verificar que sea personal.
 */
export async function confirmarPago(formData: FormData): Promise<void> {
  await exigirPersonal();

  const r = await confirmarPedido(texto(formData, 'enrollmentId'));
  if (r.estado === 'error') volver(r.motivo === 'no_pendiente' ? 'pedido-no-pendiente' : 'error');
  volver(avisoDeAlta(r.alta, 'confirmado'));
}

/** Reintentar el alta de un alumno cuyo pago ya está confirmado. */
export async function reintentarAlta(formData: FormData): Promise<void> {
  await exigirPersonal();

  let r: ResultadoAlta;
  try {
    r = await darDeAlta(texto(formData, 'studentId'));
  } catch (e) {
    console.error('reintentarAlta falló:', e);
    volver('error');
  }
  volver(r.ok ? 'alta-ok' : `alta-${r.motivo}`);
}
