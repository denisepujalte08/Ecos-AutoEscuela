/**
 * Cursos que se muestran en el sitio.
 *
 * SUPUESTO (PR de la landing): los precios son los del cartel y están acá escritos a mano
 * porque este PR no lee la base. El siguiente PR (reservas) los trae de la tabla `courses`
 * (`precio_lista`), que es la fuente de verdad. Hasta entonces, si cambian, actualizar
 * `supabase/seed.sql` y este archivo.
 */
export type CursoPublico = {
  nombre: string;
  clases: number;
  /** Precio de lista en pesos. */
  precio: number;
  destacado?: boolean;
};

export const CURSOS: CursoPublico[] = [
  { nombre: 'Curso de 5 clases', clases: 5, precio: 165000 },
  { nombre: 'Curso de 7 clases', clases: 7, precio: 230000, destacado: true },
];

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

export function formatearPesos(monto: number): string {
  return ars.format(monto);
}
