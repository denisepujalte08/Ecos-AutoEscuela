import { describe, expect, it } from 'vitest';
import type { SessionClient } from '@/lib/auth/session';
import { cargarSemana, claveCelda } from './semana';

type Resultado = { data: unknown; error: { message: string } | null };

/** Cliente simulado: cada tabla responde con su resultado, sin importar los filtros encadenados. */
function fakeSession(tablas: Record<string, Resultado>) {
  const llamadas: string[] = [];
  const from = (tabla: string) => {
    llamadas.push(tabla);
    const respuesta = tablas[tabla] ?? { data: [], error: null };
    const cadena: Record<string, unknown> = {};
    for (const metodo of ['select', 'gte', 'lte', 'in', 'order', 'eq']) cadena[metodo] = () => cadena;
    cadena.maybeSingle = () => Promise.resolve(respuesta);
    cadena.then = (ok: (r: Resultado) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(respuesta).then(ok, ko);
    return cadena;
  };
  return { client: { from } as unknown as SessionClient, llamadas };
}

const REGLAS = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, start_time: '08:00:00', end_time: '13:00:00' },
  { weekday, start_time: '14:00:00', end_time: '19:00:00' },
]);

const clase = (id: string, startsAt: string, fecha: string, extra: Record<string, unknown> = {}) => ({
  id,
  nro_clase: 2,
  kind: 'clase',
  status: 'scheduled',
  starts_at: startsAt,
  fecha_local: fecha,
  instructors: { id: 'p1', nombre: 'Profesor mañana' },
  students: { nombre_completo: 'Ana Pérez' },
  enrollments: { courses: { cantidad_clases: 5 } },
  ...extra,
});

describe('cargarSemana', () => {
  it('arma la semana: días, filas de la grilla, atención y clases por celda (hora de Argentina)', async () => {
    const { client } = fakeSession({
      lessons: { data: [clase('l1', '2026-11-03T11:40:00Z', '2026-11-03')], error: null }, // 08:40 en Argentina
      availability_rules: { data: REGLAS, error: null },
      settings: { data: { value: '40' }, error: null },
      instructors: { data: [{ id: 'p1', nombre: 'Profesor mañana' }], error: null },
    });

    const s = await cargarSemana('2026-11-02', client);

    expect(s.dias).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
    expect(s.filas).toHaveLength(14);
    expect(s.filas[0]).toBe('08:00');
    expect(s.atencion.get(2)?.has('08:40')).toBe(true);

    const c = s.clases.get(claveCelda('2026-11-03', '08:40'));
    expect(c).toMatchObject({ alumno: 'Ana Pérez', nro: 2, total: 5, hora: '08:40', estado: 'scheduled' });
  });

  it('una clase en un horario sin atención igual se muestra, con su fila', async () => {
    const { client } = fakeSession({
      lessons: { data: [clase('l1', '2026-11-03T23:00:00Z', '2026-11-03')], error: null }, // 20:00
      availability_rules: { data: REGLAS, error: null },
    });
    const s = await cargarSemana('2026-11-02', client);
    expect(s.filas).toContain('20:00');
    expect(s.clases.has(claveCelda('2026-11-03', '20:00'))).toBe(true);
  });

  it('sin ajuste de duración usa 40 minutos', async () => {
    const { client } = fakeSession({ availability_rules: { data: REGLAS, error: null } });
    expect((await cargarSemana('2026-11-02', client)).slotMinutes).toBe(40);
  });

  it('si la base da error, falla con un mensaje claro', async () => {
    const { client } = fakeSession({ lessons: { data: null, error: { message: 'boom' } } });
    await expect(cargarSemana('2026-11-02', client)).rejects.toThrow(/No se pudieron leer las clases: boom/);
  });
});
