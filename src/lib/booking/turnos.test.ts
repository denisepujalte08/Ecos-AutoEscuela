import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SessionClient } from '@/lib/auth/session';
import type { AdminClient } from '@/lib/db/server';

vi.mock('@/lib/auth/session', () => ({
  createSessionClient: () => {
    throw new Error('Variables de entorno inválidas o ausentes (públicas)');
  },
}));
vi.mock('@/lib/db/server', () => ({
  createAdminClient: () => {
    throw new Error('Variables de entorno inválidas o ausentes (servidor)');
  },
}));

import { agruparTurnos, clasesDelAlumno, inscripcionPorAgendar, reservarTurnos, turnosLibres } from './turnos';

afterEach(() => vi.restoreAllMocks());

const ALUMNO = 'a1000000-0000-4000-8000-000000000001';
const INSCRIPCION = 'e1000000-0000-4000-8000-000000000001';

describe('agruparTurnos', () => {
  it('agrupa por día de Argentina, ordena y descarta repetidos', () => {
    const dias = agruparTurnos([
      '2026-11-05T17:40:00Z', // 14:40 del 5
      '2026-11-05T11:00:00Z', // 08:00 del 5
      '2026-11-05T11:00:00Z', // repetido (otro profesor)
      '2026-11-06T02:40:00Z', // 23:40 del 5 en Argentina: sigue siendo el 5
      '2026-11-06T11:40:00Z', // 08:40 del 6
    ]);
    expect(dias.map((d) => d.fecha)).toEqual(['2026-11-05', '2026-11-06']);
    expect(dias[0].turnos.map((t) => t.hora)).toEqual(['08:00', '14:40', '23:40']);
    expect(dias[1].turnos).toEqual([{ iso: '2026-11-06T11:40:00.000Z', hora: '08:40' }]);
  });

  it('sin horarios devuelve una lista vacía', () => {
    expect(agruparTurnos([])).toEqual([]);
  });
});

describe('turnosLibres', () => {
  it('pide los horarios a la base desde hoy y los agrupa', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ starts_at: '2026-11-06T11:00:00+00:00' }], error: null });
    const client = { rpc } as unknown as SessionClient;
    const dias = await turnosLibres(client, '2026-11-05');
    expect(rpc).toHaveBeenCalledWith('get_free_slots', { p_from: '2026-11-05', p_to: '2027-01-04' });
    expect(dias).toEqual([{ fecha: '2026-11-06', turnos: [{ iso: '2026-11-06T11:00:00.000Z', hora: '08:00' }] }]);
  });

  it('si la base da error, falla con un mensaje claro', async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }) } as unknown as SessionClient;
    await expect(turnosLibres(client, '2026-11-05')).rejects.toThrow(/No se pudieron leer los turnos libres: boom/);
  });
});

function fakeInscripciones(data: unknown, error: { message: string } | null = null) {
  const eq2 = vi.fn().mockResolvedValue({ data, error });
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const from = vi.fn(() => ({ select: () => ({ eq: eq1 }) }));
  return { client: { from } as unknown as SessionClient, eq1, eq2 };
}

describe('inscripcionPorAgendar', () => {
  it('devuelve el curso pagado que todavía no tiene clases', async () => {
    const { client, eq1, eq2 } = fakeInscripciones([
      { id: 'viejo', courses: { nombre: 'Curso de 5 clases', cantidad_clases: 5 }, lessons: [{ id: 'l1' }] },
      { id: INSCRIPCION, courses: { nombre: 'Curso de 7 clases', cantidad_clases: 7 }, lessons: [] },
    ]);
    await expect(inscripcionPorAgendar(ALUMNO, client)).resolves.toEqual({ id: INSCRIPCION, curso: 'Curso de 7 clases', clases: 7 });
    expect(eq1).toHaveBeenCalledWith('student_id', ALUMNO);
    expect(eq2).toHaveBeenCalledWith('estado', 'active');
  });

  it('si ya agendó todo (o no pagó), devuelve null', async () => {
    const { client } = fakeInscripciones([{ id: 'x', courses: { nombre: 'C', cantidad_clases: 5 }, lessons: [{ id: 'l1' }] }]);
    await expect(inscripcionPorAgendar(ALUMNO, client)).resolves.toBeNull();
    const vacio = fakeInscripciones([]);
    await expect(inscripcionPorAgendar(ALUMNO, vacio.client)).resolves.toBeNull();
  });
});

describe('reservarTurnos', () => {
  const turnos = ['2026-11-09T11:00:00Z', '2026-11-11T11:00:00Z'];
  const sesion = () =>
    fakeInscripciones([{ id: INSCRIPCION, courses: { nombre: 'Curso', cantidad_clases: 2 }, lessons: [] }]).client;
  const admin = (error: { message: string } | null = null) => {
    const rpc = vi.fn().mockResolvedValue({ error });
    return { client: { rpc } as unknown as AdminClient, rpc };
  };

  it('agenda sobre la inscripción del alumno de la sesión, no sobre una que venga de afuera', async () => {
    const { client, rpc } = admin();
    await expect(reservarTurnos(ALUMNO, turnos, { sesion: sesion(), admin: client })).resolves.toEqual({ estado: 'ok' });
    expect(rpc).toHaveBeenCalledWith('schedule_enrollment', { p_enrollment_id: INSCRIPCION, p_starts: turnos });
  });

  it('sin inscripción pendiente de agendar no llama a la base', async () => {
    const { client, rpc } = admin();
    const vacia = fakeInscripciones([]).client;
    const r = await reservarTurnos(ALUMNO, turnos, { sesion: vacia, admin: client });
    expect(r.estado).toBe('error');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('un horario ocupado da un mensaje claro para elegir de nuevo', async () => {
    const { client } = admin({ message: 'slot_taken' });
    const r = await reservarTurnos(ALUMNO, turnos, { sesion: sesion(), admin: client });
    expect(r).toEqual({ estado: 'error', mensaje: expect.stringMatching(/ocupar/) });
  });

  it('dos clases el mismo día da un mensaje claro', async () => {
    const { client } = admin({ message: 'student_day_conflict' });
    const r = await reservarTurnos(ALUMNO, turnos, { sesion: sesion(), admin: client });
    expect(r).toEqual({ estado: 'error', mensaje: expect.stringMatching(/una clase por día/) });
  });

  it('un error inesperado se registra y la persona ve un mensaje genérico', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = admin({ message: 'connection reset' });
    const r = await reservarTurnos(ALUMNO, turnos, { sesion: sesion(), admin: client });
    expect(r.estado).toBe('error');
    expect(JSON.stringify(r)).not.toContain('connection reset');
    expect(log).toHaveBeenCalled();
  });

  it('rechaza fechas con formato inválido o listas vacías sin tocar la base', async () => {
    const { client, rpc } = admin();
    for (const malo of [[], ['mañana'], ['2026-11-09']]) {
      const r = await reservarTurnos(ALUMNO, malo, { sesion: sesion(), admin: client });
      expect(r.estado).toBe('error');
    }
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('clasesDelAlumno', () => {
  it('arma las clases con día y hora de Argentina y el total del curso', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 'l1', nro_clase: 2, status: 'scheduled', starts_at: '2026-11-09T11:40:00Z', enrollments: { courses: { nombre: 'Curso de 5 clases', cantidad_clases: 5 } } }],
      error: null,
    });
    const client = { from: () => ({ select: () => ({ in: () => ({ order }) }) }) } as unknown as SessionClient;
    await expect(clasesDelAlumno(client)).resolves.toEqual([
      { id: 'l1', fecha: '2026-11-09', hora: '08:40', nro: 2, total: 5, estado: 'scheduled', curso: 'Curso de 5 clases' },
    ]);
  });
});
