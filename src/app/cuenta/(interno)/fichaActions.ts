'use server';

import { revalidatePath } from 'next/cache';
import { exigirAlumno } from '@/lib/auth/alumno';
import { guardarFicha, type EstadoFicha } from '@/lib/auth/ficha';

const texto = (formData: FormData, nombre: string) => {
  const v = formData.get(nombre);
  return typeof v === 'string' ? v : '';
};

/**
 * Guardar la ficha. El alumno sale de la SESIÓN (`exigirAlumno`), nunca del formulario: nadie puede editar la
 * ficha de otra persona aunque llame a esta acción con una petición directa.
 */
export async function guardarFichaAccion(_anterior: EstadoFicha, formData: FormData): Promise<EstadoFicha> {
  const alumno = await exigirAlumno();
  const r = await guardarFicha(alumno.id, {
    fechaNacimiento: texto(formData, 'fechaNacimiento'),
    tutorNombre: texto(formData, 'tutorNombre'),
    tutorDni: texto(formData, 'tutorDni'),
    tutorTelefono: texto(formData, 'tutorTelefono'),
  });
  if (r.estado === 'ok') revalidatePath('/cuenta');
  return r;
}
