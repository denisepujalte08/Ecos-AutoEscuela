/**
 * Cursos que se muestran en el sitio.
 *
 * SUPUESTO (PR de la landing): los precios son los del cartel y están acá escritos a mano
 * porque este PR no lee la base. El siguiente PR (reservas) los trae de la tabla `courses`
 * (`precio_lista`), que es la fuente de verdad. Hasta entonces, si cambian, actualizar
 * `supabase/seed.sql` y este archivo.
 *
 * El precio del curso de 10 clases ($350.000) es un SUPUESTO provisorio: el cliente todavía no lo pasó
 * (pregunta 1 de `docs/03-preguntas-pendientes.md`).
 *
 * Los textos de cada curso (para quién es y qué incluye) son del cliente: salen de su descripción de los
 * cursos y de su cartel de 7 clases.
 */
export type CursoPublico = {
  nombre: string;
  clases: number;
  /** Precio de lista en pesos. `null` = todavía no definido: se muestra "consultá el precio". */
  precio: number | null;
  /** Rótulo que resalta la tarjeta (solo si el cliente lo afirma en su material). */
  etiqueta?: string;
  /** Para quién es el curso. */
  paraQuien: string;
  incluye: string[];
};

/** Lo que incluyen los cursos para principiantes (cartel del cliente). */
const BASE_PRINCIPIANTES = [
  'Precisiones de comando',
  'Conducción en tránsito real',
  'Técnicas de giro',
  'Estacionamiento',
];

export const CURSOS: CursoPublico[] = [
  {
    nombre: 'Curso de 5 clases',
    clases: 5,
    precio: 165000,
    paraQuien: 'Si ya tenés licencia (vigente o no) y querés ganar práctica y seguridad.',
    incluye: [
      'Práctica en maniobras específicas',
      'Clases adaptadas a lo que necesitás reforzar',
      'Instructor profesional en el auto',
    ],
  },
  {
    nombre: 'Curso básico de 7 clases',
    clases: 7,
    precio: 230000,
    paraQuien: 'Si recién empezás: aprendés a conducir desde cero, clase a clase.',
    incluye: BASE_PRINCIPIANTES,
  },
  {
    nombre: 'Curso completo de 10 clases',
    clases: 10,
    // SUPUESTO: $350.000 es un valor provisorio hasta que el cliente pase el precio real (pregunta 1).
    precio: 350000,
    etiqueta: 'Curso completo',
    paraQuien: 'Si recién empezás: comenzás sin experiencia y finalizás con licencia.',
    incluye: [
      ...BASE_PRINCIPIANTES,
      'Preparación y acompañamiento para rendir el examen práctico en tu municipio, en la clase 10',
    ],
  },
];

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function formatearPesos(monto: number): string {
  return ars.format(monto);
}
