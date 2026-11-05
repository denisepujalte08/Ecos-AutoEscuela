'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exigirAlumno, fichaCompleta } from '@/lib/auth/alumno';
import { reservarTurnos, type EstadoTurnos } from '@/lib/booking/turnos';

/**
 * Reservar todos los turnos del curso, o ninguno. El alumno y su inscripción salen de la SESIÓN, nunca del
 * formulario: de afuera solo vienen los horarios elegidos, y la base vuelve a validarlos uno por uno.
 */
export async function reservar(_anterior: EstadoTurnos, formData: FormData): Promise<EstadoTurnos> {
  const alumno = await exigirAlumno();
  if (!fichaCompleta(alumno)) return { estado: 'error', mensaje: 'Completá tus datos antes de elegir los turnos.' };

  const turnos = formData.getAll('turno').filter((v): v is string => typeof v === 'string');
  const r = await reservarTurnos(alumno.id, turnos);
  if (r.estado === 'ok') {
    revalidatePath('/cuenta');
    redirect('/cuenta?aviso=turnos-ok');
  }
  return r;
}
