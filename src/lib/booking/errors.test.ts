import { describe, expect, it } from 'vitest';
import { BookingError, toBookingError } from './errors';

describe('toBookingError', () => {
  it('convierte un error de negocio de la base en BookingError con su detalle', () => {
    const err = toBookingError({ message: 'slot_taken', details: '2026-12-01 10:00:00+00' });
    expect(err).toBeInstanceOf(BookingError);
    expect(err?.code).toBe('slot_taken');
    expect(err?.detail).toBe('2026-12-01 10:00:00+00');
  });

  it('devuelve null para errores que no son de negocio', () => {
    expect(toBookingError({ message: 'connection refused' })).toBeNull();
  });

  it('marca como problema de horario los errores que se resuelven eligiendo otro turno', () => {
    expect(new BookingError('slot_taken').isSlotProblem).toBe(true);
    expect(new BookingError('slot_unavailable').isSlotProblem).toBe(true);
    expect(new BookingError('student_day_conflict').isSlotProblem).toBe(true);
    expect(new BookingError('course_not_found').isSlotProblem).toBe(false);
  });
});
