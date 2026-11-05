import { describe, expect, it, vi } from 'vitest';
import type { AdminClient, PublicClient } from '@/lib/db/server';
import { getActiveCourses } from './courses';
import { BookingError } from './errors';
import { reservarDesdeWeb } from './reserva';

const COURSE = 'c1000000-0000-4000-8000-000000000001';

function fakeAdmin(result: { data: unknown; error: { message: string; details?: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as AdminClient, rpc };
}

describe('reservarDesdeWeb', () => {
  const valida = {
    nombre: '  Ana Pérez ',
    telefono: ' +54 9 362 485-5645 ',
    courseId: COURSE,
    startsAt: ['2026-12-01T11:00:00Z', '2026-12-02T11:00:00Z'],
  };

  it('devuelve el id de la inscripción y manda los datos limpios', async () => {
    const { client, rpc } = fakeAdmin({ data: 'enrollment-id', error: null });

    await expect(reservarDesdeWeb(valida, client)).resolves.toBe('enrollment-id');
    expect(rpc).toHaveBeenCalledWith('create_web_reservation', {
      p_nombre: 'Ana Pérez',
      p_telefono: '+54 9 362 485-5645',
      p_email: '',
      p_course_id: COURSE,
      p_starts: ['2026-12-01T11:00:00Z', '2026-12-02T11:00:00Z'],
    });
  });

  it('manda el email si lo hay', async () => {
    const { client, rpc } = fakeAdmin({ data: 'x', error: null });
    await reservarDesdeWeb({ ...valida, email: ' ana@test.com ' }, client);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_email: 'ana@test.com' });
  });

  it('no manda ningún monto ni medio de pago: lo decide la base', async () => {
    const { client, rpc } = fakeAdmin({ data: 'x', error: null });
    await reservarDesdeWeb({ ...valida, ...({ monto: 1, metodo: 'efectivo' } as object) }, client);
    const campos = Object.keys(rpc.mock.calls[0][1]);
    expect(campos).not.toContain('p_monto');
    expect(campos).not.toContain('p_metodo');
  });

  it('convierte too_many_pending en un BookingError', async () => {
    const { client } = fakeAdmin({ data: null, error: { message: 'too_many_pending' } });
    await expect(reservarDesdeWeb(valida, client)).rejects.toMatchObject({ code: 'too_many_pending' });
  });

  it('marca como problema de datos los errores de nombre, teléfono y email', async () => {
    for (const code of ['invalid_name', 'invalid_phone', 'invalid_email']) {
      const { client } = fakeAdmin({ data: null, error: { message: code } });
      const err = await reservarDesdeWeb(valida, client).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BookingError);
      expect((err as BookingError).isDataProblem).toBe(true);
    }
  });

  it('un turno tomado se reconoce como problema de horario, no de datos', async () => {
    const { client } = fakeAdmin({ data: null, error: { message: 'slot_taken', details: '2026-12-01 11:00:00+00' } });
    const err = (await reservarDesdeWeb(valida, client).catch((e: unknown) => e)) as BookingError;
    expect(err.isSlotProblem).toBe(true);
    expect(err.isDataProblem).toBe(false);
    expect(err.detail).toBe('2026-12-01 11:00:00+00');
  });

  it('deja pasar los errores inesperados como errores comunes', async () => {
    const { client } = fakeAdmin({ data: null, error: { message: 'connection refused' } });
    const promise = reservarDesdeWeb(valida, client);
    await expect(promise).rejects.toThrow(/connection refused/);
    await expect(promise).rejects.not.toBeInstanceOf(BookingError);
  });

  it('valida la entrada antes de llamar a la base', async () => {
    const { client, rpc } = fakeAdmin({ data: 'x', error: null });
    await expect(reservarDesdeWeb({ ...valida, nombre: 'A' }, client)).rejects.toThrow();
    await expect(reservarDesdeWeb({ ...valida, telefono: '123' }, client)).rejects.toThrow();
    await expect(reservarDesdeWeb({ ...valida, courseId: 'no-es-un-uuid' }, client)).rejects.toThrow();
    await expect(reservarDesdeWeb({ ...valida, startsAt: [] }, client)).rejects.toThrow();
    await expect(reservarDesdeWeb({ ...valida, startsAt: ['mañana'] }, client)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('getActiveCourses', () => {
  function fakePublic(result: { data: unknown; error: { message: string } | null }) {
    const order = vi.fn().mockResolvedValue(result);
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    return { client: { from } as unknown as PublicClient, from, eq, order };
  }

  it('pide solo los cursos activos, ordenados por cantidad de clases, y convierte los datos', async () => {
    const { client, from, eq, order } = fakePublic({
      data: [
        { id: 'a', nombre: 'Curso de 5 clases', cantidad_clases: 5, precio_lista: '165000.00', incluye_examen: false },
        { id: 'b', nombre: 'Curso de 7 clases', cantidad_clases: 7, precio_lista: '230000.00', incluye_examen: false },
      ],
      error: null,
    });

    await expect(getActiveCourses(client)).resolves.toEqual([
      { id: 'a', nombre: 'Curso de 5 clases', clases: 5, precio: 165000, incluyeExamen: false },
      { id: 'b', nombre: 'Curso de 7 clases', clases: 7, precio: 230000, incluyeExamen: false },
    ]);
    expect(from).toHaveBeenCalledWith('courses');
    expect(eq).toHaveBeenCalledWith('activo', true);
    expect(order).toHaveBeenCalledWith('cantidad_clases', { ascending: true });
  });

  it('falla con un mensaje claro si la base da error', async () => {
    const { client } = fakePublic({ data: null, error: { message: 'boom' } });
    await expect(getActiveCourses(client)).rejects.toThrow(/No se pudieron leer los cursos: boom/);
  });
});
