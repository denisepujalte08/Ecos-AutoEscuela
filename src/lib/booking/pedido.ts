import 'server-only';
import { z } from 'zod';
import { createAdminClient, type AdminClient } from '@/lib/db/server';
import { comprarCursoDesdeWeb } from './compra';
import { BookingError } from './errors';
import { MENSAJE_GENERICO, mensajeDeError } from './mensajes';

/**
 * Procesa el formulario público de compra: valida lo que escribió la persona, crea el pedido y devuelve
 * el estado que muestra la pantalla. Vive acá (y no en la Server Action) para poder probarlo.
 *
 * Una Server Action se puede llamar con una petición directa, sin pasar por el formulario: por eso se
 * valida todo de nuevo y la base vuelve a validar (`create_web_purchase`). Los errores que no son de
 * negocio nunca se muestran tal cual: se registran en el servidor y la persona ve un mensaje genérico.
 */

export const CAMPOS = ['nombre', 'telefono', 'dni', 'email', 'courseId', 'metodo'] as const;
export type Campo = (typeof CAMPOS)[number];

export type ValoresPedido = Record<Campo, string>;

export type PedidoCreado = {
  /** Código corto para nombrar el pedido por WhatsApp. */
  codigo: string;
  curso: string;
  metodo: 'efectivo' | 'transferencia';
  /** Monto calculado por la base. */
  monto: number;
  nombre: string;
  dni: string;
};

export type EstadoPedido =
  | { estado: 'inicial' }
  | { estado: 'error'; mensaje: string; campos: Partial<Record<Campo, string>>; valores: ValoresPedido }
  | { estado: 'ok'; pedido: PedidoCreado };

const soloDigitos = (s: string) => s.replace(/\D/g, '');

const schema = z.object({
  nombre: z.string().trim().min(2, 'Escribí tu nombre y apellido.').max(120, 'El nombre es demasiado largo.'),
  telefono: z
    .string()
    .trim()
    .refine((s) => soloDigitos(s).length >= 8 && soloDigitos(s).length <= 15, 'Escribí un teléfono válido, con código de área.'),
  dni: z
    .string()
    .trim()
    .refine((s) => soloDigitos(s).length >= 6 && soloDigitos(s).length <= 10, 'Escribí tu DNI, solo números.'),
  email: z.string().trim().max(254, 'El email es demasiado largo.').pipe(z.email('Escribí un email válido.')),
  courseId: z.uuid('Elegí un curso.'),
  metodo: z.enum(['efectivo', 'transferencia'], 'Elegí efectivo o transferencia.'),
});

export type DatosFormulario = ValoresPedido & {
  /** Campo trampa, invisible para las personas: si viene con algo, es un robot. */
  honeypot?: string;
};

function error(
  valores: ValoresPedido,
  mensaje: string,
  campos: Partial<Record<Campo, string>> = {},
): EstadoPedido {
  return { estado: 'error', mensaje, campos, valores };
}

export async function procesarPedido(
  datos: DatosFormulario,
  clientOpcional?: AdminClient,
): Promise<EstadoPedido> {
  const { honeypot, ...valores } = datos;

  // Un robot rellenó el campo trampa: se lo frena sin darle información.
  if (honeypot) return error(valores, MENSAJE_GENERICO);

  const parsed = schema.safeParse(valores);
  if (!parsed.success) {
    const campos: Partial<Record<Campo, string>> = {};
    for (const issue of parsed.error.issues) {
      const campo = issue.path[0] as Campo;
      if (CAMPOS.includes(campo) && !campos[campo]) campos[campo] = issue.message;
    }
    return error(valores, 'Revisá los datos marcados.', campos);
  }

  const v = parsed.data;
  try {
    // Se crea acá adentro: si falta configuración, la persona ve el mensaje genérico y no una pantalla de error.
    const client = clientOpcional ?? createAdminClient();
    const id = await comprarCursoDesdeWeb(
      { nombre: v.nombre, telefono: v.telefono, dni: v.dni, email: v.email, courseId: v.courseId, metodo: v.metodo },
      client,
    );

    // El monto y el curso se leen de la base: es lo que vale, no lo que mostró el navegador.
    const { data, error: errLectura } = await client
      .from('enrollments')
      .select('monto, courses(nombre)')
      .eq('id', id)
      .single();
    if (errLectura || !data) throw new Error(`No se pudo leer el pedido ${id}: ${errLectura?.message}`);

    return {
      estado: 'ok',
      pedido: {
        codigo: id.slice(0, 8).toUpperCase(),
        curso: data.courses?.nombre ?? 'Curso',
        metodo: v.metodo,
        monto: Number(data.monto),
        nombre: v.nombre,
        dni: soloDigitos(v.dni),
      },
    };
  } catch (e) {
    if (e instanceof BookingError) {
      // Un pedido que ya existe se puede tratar por WhatsApp; el resto, corregir el dato marcado.
      return error(valores, mensajeDeError(e.code));
    }
    console.error('procesarPedido falló:', e);
    return error(valores, MENSAJE_GENERICO);
  }
}
