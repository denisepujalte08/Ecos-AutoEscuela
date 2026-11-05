import 'server-only';
import { createPublicClient, type PublicClient } from '@/lib/db/server';

export type CursoActivo = {
  id: string;
  nombre: string;
  clases: number;
  /** Precio de lista en pesos. */
  precio: number;
  incluyeExamen: boolean;
};

/**
 * Cursos que se pueden reservar hoy (los activos), del más corto al más largo.
 * Usa el cliente público: el público puede ver los cursos activos (RLS).
 */
export async function getActiveCourses(client: PublicClient = createPublicClient()): Promise<CursoActivo[]> {
  const { data, error } = await client
    .from('courses')
    .select('id, nombre, cantidad_clases, precio_lista, incluye_examen')
    .eq('activo', true)
    .order('cantidad_clases', { ascending: true });
  if (error) throw new Error(`No se pudieron leer los cursos: ${error.message}`);

  return (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    clases: c.cantidad_clases,
    precio: Number(c.precio_lista),
    incluyeExamen: c.incluye_examen,
  }));
}
