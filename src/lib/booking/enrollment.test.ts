import { describe, expect, it, vi } from 'vitest';
import type { AdminClient } from '@/lib/db/server';
import { createEnrollment, suggestSlots } from './enrollment';
import { BookingError } from './errors';

const STUDENT = '51000000-0000-4000-8000-000000000001';
const COURSE = 'c1000000-0000-4000-8000-000000000001';

function fakeClient(result: { data: unknown; error: { message: string; details?: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as AdminClient, rpc };
}

describe('createEnrollment', () => {
  const valid = {
    studentId: STUDENT,
    courseId: COURSE,
    metodo: 'tarjeta' as const,
    startsAt: ['2026-12-01T11:00:00Z'],
  };

  it('devuelve el id de la inscripción', async () => {
    const { client, rpc } = fakeClient({ data: 'enrollment-id', error: null });

    await expect(createEnrollment(valid, client)).resolves.toBe('enrollment-id');
    expect(rpc).toHaveBeenCalledWith('create_enrollment', {
      p_student_id: STUDENT,
      p_course_id: COURSE,
      p_metodo: 'tarjeta',
      p_starts: ['2026-12-01T11:00:00Z'],
    });
  });

  it('no manda ningún monto: lo calcula la base', async () => {
    const { client, rpc } = fakeClient({ data: 'x', error: null });
    await createEnrollment({ ...valid, ...({ monto: 1 } as object) }, client);
    expect(Object.keys(rpc.mock.calls[0][1])).not.toContain('p_monto');
  });

  it('convierte slot_taken en un BookingError con el turno conflictivo', async () => {
    const { client } = fakeClient({
      data: null,
      error: { message: 'slot_taken', details: '2026-12-01 11:00:00+00' },
    });

    const promise = createEnrollment(valid, client);
    await expect(promise).rejects.toBeInstanceOf(BookingError);
    await expect(promise).rejects.toMatchObject({ code: 'slot_taken', detail: '2026-12-01 11:00:00+00' });
  });

  it('deja pasar los errores inesperados como errores comunes', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'connection refused' } });
    const promise = createEnrollment(valid, client);
    await expect(promise).rejects.toThrow(/connection refused/);
    await expect(promise).rejects.not.toBeInstanceOf(BookingError);
  });

  it('valida la entrada antes de llamar a la base', async () => {
    const { client, rpc } = fakeClient({ data: 'x', error: null });
    await expect(createEnrollment({ ...valid, metodo: 'bitcoin' as never }, client)).rejects.toThrow();
    await expect(createEnrollment({ ...valid, studentId: 'no-es-uuid' }, client)).rejects.toThrow();
    await expect(createEnrollment({ ...valid, startsAt: [] }, client)).rejects.toThrow();
    await expect(createEnrollment({ ...valid, startsAt: ['mañana'] }, client)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('suggestSlots', () => {
  it('traduce las columnas y aplica los valores por defecto', async () => {
    const { client, rpc } = fakeClient({
      data: [
        {
          starts_at: '2026-12-01T11:40:00Z',
          ends_at: '2026-12-01T12:20:00Z',
          instructor_id: 'a',
          distance_minutes: 40,
        },
      ],
      error: null,
    });

    const out = await suggestSlots({ studentId: STUDENT, wanted: '2026-12-01T11:00:00Z' }, client);

    expect(rpc).toHaveBeenCalledWith('suggest_slots', {
      p_student_id: STUDENT,
      p_wanted: '2026-12-01T11:00:00Z',
      p_exclude: [],
      p_limit: 5,
    });
    expect(out).toEqual([
      {
        startsAt: '2026-12-01T11:40:00Z',
        endsAt: '2026-12-01T12:20:00Z',
        instructorId: 'a',
        distanceMinutes: 40,
      },
    ]);
  });

  it('limita la cantidad de sugerencias', async () => {
    const { client } = fakeClient({ data: [], error: null });
    await expect(
      suggestSlots({ studentId: STUDENT, wanted: '2026-12-01T11:00:00Z', limit: 500 }, client),
    ).rejects.toThrow();
  });
});
