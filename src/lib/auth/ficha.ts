import 'server-only';
import { z } from 'zod';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { esFechaValida, esMenorDeEdad, hoyEnArgentina } from '@/lib/calendario/fechas';
import type { Tutor } from './alumno';

/**
 * Ficha del alumno: fecha de nacimiento y, si es menor de 18 años, los datos de su tutor.
 * Corre con privilegios de servidor: quien la llame debe pasar el id del alumno de la SESIÓN (`exigirAlumno`),
 * nunca uno que venga del formulario.
 */

export type CampoFicha = 'fechaNacimiento' | 'tutorNombre' | 'tutorDni' | 'tutorTelefono';
export type DatosFicha = Record<CampoFicha, string>;

export type EstadoFicha =
  | { estado: 'inicial' }
  | { estado: 'error'; mensaje: string; campos: Partial<Record<CampoFicha, string>>; valores: DatosFicha }
  | { estado: 'ok' };

const soloDigitos = (s: string) => s.replace(/\D/g, '');

const tutorSchema = z.object({
  nombre: z.string().trim().min(2, 'Escribí el nombre y apellido del tutor.').max(120, 'El nombre es demasiado largo.'),
  dni: z.string().trim().refine((s) => soloDigitos(s).length >= 6 && soloDigitos(s).length <= 10, 'Escribí el DNI del tutor, solo números.'),
  telefono: z.string().trim().refine((s) => soloDigitos(s).length >= 8 && soloDigitos(s).length <= 15, 'Escribí un teléfono válido, con código de área.'),
});

export async function guardarFicha(
  alumnoId: string,
  datos: DatosFicha,
  clientOpcional?: AdminClient,
  hoy: string = hoyEnArgentina(),
): Promise<EstadoFicha> {
  const error = (mensaje: string, campos: Partial<Record<CampoFicha, string>> = {}): EstadoFicha => ({ estado: 'error', mensaje, campos, valores: datos });
  const id = z.uuid().safeParse(alumnoId);
  if (!id.success) return error('No pudimos guardar tu ficha. Probá de nuevo.');

  const nacimiento = datos.fechaNacimiento.trim();
  if (!esFechaValida(nacimiento) || nacimiento > hoy || nacimiento < '1900-01-01') {
    return error('Revisá los datos marcados.', { fechaNacimiento: 'Escribí tu fecha de nacimiento.' });
  }

  let tutor: Tutor | null = null;
  if (esMenorDeEdad(nacimiento, hoy)) {
    const t = tutorSchema.safeParse({ nombre: datos.tutorNombre, dni: datos.tutorDni, telefono: datos.tutorTelefono });
    if (!t.success) {
      const campos: Partial<Record<CampoFicha, string>> = {};
      const mapa = { nombre: 'tutorNombre', dni: 'tutorDni', telefono: 'tutorTelefono' } as const;
      for (const issue of t.error.issues) {
        const campo = mapa[issue.path[0] as keyof typeof mapa];
        if (campo && !campos[campo]) campos[campo] = issue.message;
      }
      return error('Sos menor de 18 años: necesitamos los datos de un adulto responsable.', campos);
    }
    tutor = { nombre: t.data.nombre, dni: soloDigitos(t.data.dni), telefono: t.data.telefono };
  }

  try {
    const client = clientOpcional ?? createAdminClient();
    const { error: errBase } = await client.from('students').update({ fecha_nacimiento: nacimiento, tutor }).eq('id', id.data);
    if (errBase) throw new Error(errBase.message);
    return { estado: 'ok' };
  } catch (e) {
    console.error('guardarFicha falló:', e);
    return error('No pudimos guardar tu ficha. Probá de nuevo en unos minutos.');
  }
}
