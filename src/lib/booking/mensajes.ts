import type { BookingErrorCode } from './errors';

const GENERICO =
  'No pudimos registrar tu pedido. Probá de nuevo en unos minutos o escribinos por WhatsApp.';

/** Textos para la persona que compra, según el error de negocio que devolvió la base. */
const MENSAJES: Partial<Record<BookingErrorCode, string>> = {
  invalid_name: 'Revisá tu nombre y apellido.',
  invalid_phone: 'Revisá tu teléfono: escribilo con el código de área.',
  invalid_dni: 'Revisá tu DNI: solo números, sin puntos.',
  invalid_email: 'Revisá tu email.',
  invalid_method: 'Elegí efectivo o transferencia.',
  course_not_found: 'Ese curso ya no está disponible. Elegí otro.',
  enrollment_in_progress:
    'Ya tenés un pedido o un curso en marcha con ese DNI. Escribinos por WhatsApp y lo resolvemos.',
};

export function mensajeDeError(code: BookingErrorCode | undefined): string {
  return (code && MENSAJES[code]) || GENERICO;
}

export { GENERICO as MENSAJE_GENERICO };
