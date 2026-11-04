import 'server-only';
import { z } from 'zod';
import { createPublicClient, type PublicClient } from '@/lib/db/server';

export type FreeSlot = {
  startsAt: string;
  endsAt: string;
  instructorId: string;
};

const MAX_RANGE_DAYS = 31;

const rangeSchema = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .refine((r) => r.from <= r.to, { message: 'La fecha inicial no puede ser posterior a la final' })
  .refine((r) => daysBetween(r.from, r.to) <= MAX_RANGE_DAYS, {
    message: `El rango no puede superar ${MAX_RANGE_DAYS} días`,
  });

function daysBetween(from: string, to: string) {
  return (Date.parse(to) - Date.parse(from)) / 86_400_000;
}

/**
 * Turnos libres entre dos fechas (YYYY-MM-DD, hora de Buenos Aires), ordenados.
 * Usa el cliente público: es una consulta que el público puede hacer.
 */
export async function getFreeSlots(
  from: string,
  to: string,
  client: PublicClient = createPublicClient(),
): Promise<FreeSlot[]> {
  const range = rangeSchema.parse({ from, to });

  const { data, error } = await client.rpc('get_free_slots', {
    p_from: range.from,
    p_to: range.to,
  });
  if (error) throw new Error(`get_free_slots falló: ${error.message}`);

  return (data ?? []).map((row) => ({
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    instructorId: row.instructor_id,
  }));
}
