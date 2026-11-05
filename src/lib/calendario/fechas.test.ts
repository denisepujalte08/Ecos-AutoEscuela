import { describe, expect, it } from 'vitest';
import {
  diasLaborables,
  esFechaValida,
  filasDeLaSemana,
  franjasPorDia,
  hayCorteEntre,
  hoyEnArgentina,
  horaLocal,
  lunesDe,
  rotuloDia,
  rotuloSemana,
  semanaDesdeParametro,
  sumarDias,
} from './fechas';

describe('fechas', () => {
  it('lunesDe: cualquier día de la semana lleva al lunes', () => {
    // 2026-11-02 es lunes
    for (const dia of ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06', '2026-11-07']) {
      expect(lunesDe(dia)).toBe('2026-11-02');
    }
  });

  it('lunesDe: el domingo pertenece a la semana que termina, no a la que empieza', () => {
    expect(lunesDe('2026-11-08')).toBe('2026-11-02');
    expect(lunesDe('2026-11-09')).toBe('2026-11-09');
  });

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('diasLaborables: de lunes a viernes', () => {
    expect(diasLaborables('2026-11-02')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']);
  });

  it('esFechaValida rechaza fechas imposibles y texto suelto', () => {
    expect(esFechaValida('2026-11-05')).toBe(true);
    for (const malo of ['2026-02-31', '2026-13-01', '05/11/2026', '', 'hoy', '2026-11-5', "2026-11-05'; drop table", '<script>']) {
      expect(esFechaValida(malo)).toBe(false);
    }
  });

  it('semanaDesdeParametro: usa el parámetro si es válido y si no, la semana de hoy', () => {
    expect(semanaDesdeParametro('2026-11-18', '2026-11-05')).toBe('2026-11-16');
    expect(semanaDesdeParametro('basura', '2026-11-05')).toBe('2026-11-02');
    expect(semanaDesdeParametro(undefined, '2026-11-05')).toBe('2026-11-02');
    expect(semanaDesdeParametro(['2026-11-18', '2026-11-25'], '2026-11-05')).toBe('2026-11-02');
  });

  it('hoyEnArgentina usa la fecha de Argentina, no la de UTC', () => {
    // 02:30 UTC del 6 de noviembre son las 23:30 del 5 en Argentina (UTC-3)
    expect(hoyEnArgentina(new Date('2026-11-06T02:30:00Z'))).toBe('2026-11-05');
    expect(hoyEnArgentina(new Date('2026-11-06T03:30:00Z'))).toBe('2026-11-06');
  });

  it('horaLocal convierte un instante a la hora de Argentina', () => {
    expect(horaLocal('2026-11-05T11:00:00Z')).toBe('08:00');
    expect(horaLocal('2026-11-05T17:40:00Z')).toBe('14:40');
    expect(horaLocal('2026-11-06T02:59:00Z')).toBe('23:59');
  });

  it('rotuloSemana: dentro de un mes, entre meses y entre años', () => {
    expect(rotuloSemana('2026-11-02')).toBe('2 al 6 de noviembre de 2026');
    expect(rotuloSemana('2026-11-30')).toBe('30 de noviembre al 4 de diciembre de 2026');
    expect(rotuloSemana('2026-12-28')).toBe('28 de diciembre de 2026 al 1 de enero de 2027');
  });

  it('rotuloDia', () => {
    expect(rotuloDia('2026-11-02')).toBe('Lunes 2');
    expect(rotuloDia('2026-11-06')).toBe('Viernes 6');
  });
});

describe('franjas', () => {
  const reglas = [
    ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_time: '08:00:00', end_time: '13:00:00' })),
    ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_time: '14:00:00', end_time: '19:00:00' })),
  ];

  it('arma los turnos de 40 minutos desde las 08:00 que entran en cada horario de atención', () => {
    const franjas = franjasPorDia(reglas);
    expect(franjas.get(1)).toEqual([
      '08:00', '08:40', '09:20', '10:00', '10:40', '11:20', '12:00', // 12:00-12:40; el siguiente terminaría a las 13:20
      '14:00', '14:40', '15:20', '16:00', '16:40', '17:20', '18:00', // 18:00-18:40
    ]);
  });

  it('un turno que no termina antes del cierre no entra', () => {
    const f = franjasPorDia([{ weekday: 1, start_time: '08:00', end_time: '09:00' }]);
    expect(f.get(1)).toEqual(['08:00']);
  });

  it('un horario que arranca fuera de la grilla toma el primer turno de la grilla que cae adentro', () => {
    const f = franjasPorDia([{ weekday: 2, start_time: '08:30', end_time: '10:00' }]);
    expect(f.get(2)).toEqual(['08:40', '09:20']);
  });

  it('filasDeLaSemana une los días y ordena', () => {
    const franjas = new Map([
      [1, ['08:00', '08:40']],
      [2, ['08:40', '09:20']],
    ]);
    expect(filasDeLaSemana(franjas)).toEqual(['08:00', '08:40', '09:20']);
  });

  it('detecta el corte del mediodía', () => {
    expect(hayCorteEntre('12:00', '14:00')).toBe(true);
    expect(hayCorteEntre('08:00', '08:40')).toBe(false);
  });
});
