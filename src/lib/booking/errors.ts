/**
 * Errores de negocio que lanzan las funciones SQL de reserva
 * (ver supabase/migrations/…_booking_functions.sql).
 * El mensaje de Postgres es el código; DETAIL trae el dato (por ejemplo, el turno).
 */
export const BOOKING_ERROR_CODES = [
  'course_not_found',
  'student_not_found',
  'wrong_lesson_count',
  'duplicate_slots',
  'slot_unavailable',
  'slot_taken',
  'student_day_conflict',
  'enrollment_not_confirmable',
  'enrollment_not_found_or_cancelled',
  'lesson_not_scheduled',
  'holds_lost',
] as const;

export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

export class BookingError extends Error {
  constructor(
    public readonly code: BookingErrorCode,
    public readonly detail?: string,
  ) {
    super(code);
    this.name = 'BookingError';
  }

  /** Errores que se resuelven pidiéndole al alumno que elija otro horario. */
  get isSlotProblem() {
    return (
      this.code === 'slot_taken' ||
      this.code === 'slot_unavailable' ||
      this.code === 'student_day_conflict'
    );
  }
}

type PostgrestLikeError = { message: string; details?: string | null };

/** Convierte un error de Supabase en BookingError si es uno de negocio; si no, devuelve null. */
export function toBookingError(error: PostgrestLikeError): BookingError | null {
  const code = BOOKING_ERROR_CODES.find((c) => c === error.message);
  return code ? new BookingError(code, error.details ?? undefined) : null;
}
