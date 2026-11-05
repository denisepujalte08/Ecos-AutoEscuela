/** Datos públicos del sitio. Un solo lugar para cambiar nombre, teléfono y mensajes. */

export const SITE = {
  nombre: 'ECOS',
  nombreCompleto: 'ECOS – Escuela de Conducción Segura',
  /** Lema de la escuela, tal como lo usa el cliente. */
  lema: 'Aprendé seguro, llegá más lejos',
  descripcion:
    'Clases prácticas de manejo en auto, en turnos de 40 minutos con instructores profesionales. Reservá tu curso por WhatsApp.',
  /** Solo dígitos, con código de país (+54 9 = celular de Argentina). */
  whatsappNumero: '5493624855645',
  whatsappVisible: '+54 9 362 485-5645',
  instagramUrl: 'https://www.instagram.com/ecosautoescuela/',
  instagramUsuario: '@ecosautoescuela',
  direccion: 'Pueyrredón 186, Resistencia, Chaco',
} as const;

/** Enlace que abre Google Maps con la dirección de la escuela. */
export const MAPA_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.direccion)}`;

/** Arma el enlace de WhatsApp con un mensaje ya escrito. */
export function whatsappUrl(mensaje: string, numero: string = SITE.whatsappNumero): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export const MENSAJES = {
  consulta: 'Hola! Quiero consultar por los cursos de manejo de ECOS.',
  curso: (nombre: string) => `Hola! Quiero reservar el ${nombre} en ECOS.`,
} as const;

/** Enlaces del menú: cada uno lleva a una sección de la página de inicio (`id` es el de la sección). */
export const ENLACES = [
  { etiqueta: 'Inicio', href: '/#inicio', id: 'inicio' },
  { etiqueta: 'Cursos', href: '/#cursos', id: 'cursos' },
  { etiqueta: 'Nosotros', href: '/#nosotros', id: 'nosotros' },
  { etiqueta: 'Contacto', href: '/#contacto', id: 'contacto' },
] as const;
