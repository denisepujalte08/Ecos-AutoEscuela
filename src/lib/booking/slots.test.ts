import { describe, expect, it, vi } from 'vitest';
import type { PublicClient } from '@/lib/db/server';
import { getFreeSlots } from './slots';

function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as PublicClient, rpc };
}

describe('getFreeSlots', () => {
  it('llama a get_free_slots y traduce las columnas a camelCase', async () => {
    const { client, rpc } = fakeClient({
      data: [{ starts_at: '2026-12-01T11:00:00Z', ends_at: '2026-12-01T11:40:00Z', instructor_id: 'a' }],
      error: null,
    });

    const slots = await getFreeSlots('2026-12-01', '2026-12-03', client);

    expect(rpc).toHaveBeenCalledWith('get_free_slots', { p_from: '2026-12-01', p_to: '2026-12-03' });
    expect(slots).toEqual([
      { startsAt: '2026-12-01T11:00:00Z', endsAt: '2026-12-01T11:40:00Z', instructorId: 'a' },
    ]);
  });

  it('devuelve una lista vacía si no hay turnos', async () => {
    const { client } = fakeClient({ data: null, error: null });
    expect(await getFreeSlots('2026-12-01', '2026-12-01', client)).toEqual([]);
  });

  it('rechaza fechas con formato inválido sin tocar la base', async () => {
    const { client, rpc } = fakeClient({ data: [], error: null });
    await expect(getFreeSlots('01/12/2026', '2026-12-03', client)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rechaza un rango invertido', async () => {
    const { client } = fakeClient({ data: [], error: null });
    await expect(getFreeSlots('2026-12-10', '2026-12-01', client)).rejects.toThrow(/posterior/);
  });

  it('rechaza un rango de más de 31 días (protege la base de consultas pesadas)', async () => {
    const { client, rpc } = fakeClient({ data: [], error: null });
    await expect(getFreeSlots('2026-12-01', '2027-02-01', client)).rejects.toThrow(/31 días/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('propaga el error de la base', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'boom' } });
    await expect(getFreeSlots('2026-12-01', '2026-12-02', client)).rejects.toThrow(/boom/);
  });
});
