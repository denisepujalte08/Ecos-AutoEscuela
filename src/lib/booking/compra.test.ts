import { describe, expect, it, vi } from 'vitest';
import type { AdminClient, PublicClient } from '@/lib/db/server';
import { agendarClases, comprarCursoDesdeWeb, confirmarPago } from './compra';
import { getActiveCourses } from './courses';
import { BookingError } from './errors';

const COURSE = 'c1000000-0000-4000-8000-000000000001';
const ENROLLMENT = 'e1000000-0000-4000-8000-000000000001';

function fakeAdmin(result: { data: unknown; error: { message: string; details?: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result);
  return { client: { rpc } as unknown as AdminClient, rpc };
}

describe('comprarCursoDesdeWeb', () => {
  const valida = {
    nombre: '  Ana Pérez ',
    telefono: ' +54 9 362 485-5645 ',
    dni: ' 30.123.456 ',
    email: ' ana@test.com ',
    courseId: COURSE,
    metodo: 'transferencia' as const,
  };

  it('devuelve el id de la inscripción y manda los datos limpios', async () => {
    const { client, rpc } = fakeAdmin({ data: 'enrollment-id', error: null });

    await expect(comprarCursoDesdeWeb(valida, client)).resolves.toBe('enrollment-id');
    expect(rpc).toHaveBeenCalledWith('create_web_purchase', {
      p_nombre: 'Ana Pérez',
      p_telefono: '+54 9 362 485-5645',
      p_dni: '30.123.456',
      p_email: 'ana@test.com',
      p_course_id: COURSE,
      p_metodo: 'transferencia',
    });
  });

  it('no manda ningún monto: lo calcula la base', async () => {
    const { client, rpc } = fakeAdmin({ data: 'x', error: null });
    await comprarCursoDesdeWeb({ ...valida, ...({ monto: 1 } as object) }, client);
    expect(Object.keys(rpc.mock.calls[0][1])).not.toContain('p_monto');
  });

  it('no deja comprar con tarjeta por este flujo', async () => {
    const { client, rpc } = fakeAdmin({ data: 'x', error: null });
    await expect(comprarCursoDesdeWeb({ ...valida, metodo: 'tarjeta' as never }, client)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('convierte enrollment_in_progress en un BookingError', async () => {
    const { client } = fakeAdmin({ data: null, error: { message: 'enrollment_in_progress' } });
    await expect(comprarCursoDesdeWeb(valida, client)).rejects.toMatchObject({ code: 'enrollment_in_progress' });
  });

  it('marca como problema de datos los errores de nombre, teléfono, DNI, email y medio de pago', async () => {
    for (const code of ['invalid_name', 'invalid_phone', 'invalid_dni', 'invalid_email', 'invalid_method']) {
      const { client } = fakeAdmin({ data: null, error: { message: code } });
      const err = await comprarCursoDesdeWeb(valida, client).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BookingError);
      expect((err as BookingError).isDataProblem).toBe(true);
    }
  });

  it('un curso inexistente no es un problema de datos', async () => {
    const { client } = fakeAdmin({ data: null, error: { message: 'course_not_found' } });
    const err = (await comprarCursoDesdeWeb(valida, client).catch((e: unknown) => e)) as BookingError;
    expect(err.code).toBe('course_not_found');
    expect(err.isDataProblem).toBe(false);
  });

  it('deja pasar los errores inesperados como errores comunes', async () => {
    const { client } = fakeAdmin({ data: null, error: { message: 'connection refused' } });
    const promise = comprarCursoDesdeWeb(valida, client);
    await expect(promise).rejects.toThrow(/connection refused/);
    await expect(promise).rejects.not.toBeInstanceOf(BookingError);
  });

  it('valida la entrada antes de llamar a la base', async () => {
    const { client, rpc } = fakeAdmin({ data: 'x', error: null });
    await expect(comprarCursoDesdeWeb({ ...valida, nombre: 'A' }, client)).rejects.toThrow();
    await expect(comprarCursoDesdeWeb({ ...valida, telefono: '123' }, client)).rejects.toThrow();
    await expect(comprarCursoDesdeWeb({ ...valida, dni: '12' }, client)).rejects.toThrow();
    await expect(comprarCursoDesdeWeb({ ...valida, email: '' }, client)).rejects.toThrow();
    await expect(comprarCursoDesdeWeb({ ...valida, courseId: 'no-es-un-uuid' }, client)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('confirmarPago', () => {
  it('confirma la inscripción con la función de la base', async () => {
    const { client, rpc } = fakeAdmin({ data: null, error: null });
    await expect(confirmarPago(ENROLLMENT, client)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('confirm_payment', { p_enrollment_id: ENROLLMENT });
  });

  it('convierte enrollment_not_confirmable en un BookingError', async () => {
    const { client } = fakeAdmin({ data: null, error: { message: 'enrollment_not_confirmable', details: 'cancelled' } });
    await expect(confirmarPago(ENROLLMENT, client)).rejects.toMatchObject({
      code: 'enrollment_not_confirmable',
      detail: 'cancelled',
    });
  });

  it('rechaza un id que no es un UUID sin llamar a la base', async () => {
    const { client, rpc } = fakeAdmin({ data: null, error: null });
    await expect(confirmarPago('1; drop table', client)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('agendarClases', () => {
  const valida = { enrollmentId: ENROLLMENT, startsAt: ['2026-12-01T11:00:00Z', '2026-12-02T11:00:00Z'] };

  it('agenda las clases con la función de la base', async () => {
    const { client, rpc } = fakeAdmin({ data: null, error: null });
    await expect(agendarClases(valida, client)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('schedule_enrollment', {
      p_enrollment_id: ENROLLMENT,
      p_starts: ['2026-12-01T11:00:00Z', '2026-12-02T11:00:00Z'],
    });
  });

  it('un turno tomado se reconoce como problema de horario', async () => {
    const { client } = fakeAdmin({ data: null, error: { message: 'slot_taken', details: '2026-12-01 11:00:00+00' } });
    const err = (await agendarClases(valida, client).catch((e: unknown) => e)) as BookingError;
    expect(err.isSlotProblem).toBe(true);
    expect(err.detail).toBe('2026-12-01 11:00:00+00');
  });

  it('convierte already_scheduled y enrollment_not_active en BookingError', async () => {
    for (const code of ['already_scheduled', 'enrollment_not_active']) {
      const { client } = fakeAdmin({ data: null, error: { message: code } });
      await expect(agendarClases(valida, client)).rejects.toMatchObject({ code });
    }
  });

  it('valida la entrada antes de llamar a la base', async () => {
    const { client, rpc } = fakeAdmin({ data: null, error: null });
    await expect(agendarClases({ ...valida, enrollmentId: 'x' }, client)).rejects.toThrow();
    await expect(agendarClases({ ...valida, startsAt: [] }, client)).rejects.toThrow();
    await expect(agendarClases({ ...valida, startsAt: ['mañana'] }, client)).rejects.toThrow();
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
