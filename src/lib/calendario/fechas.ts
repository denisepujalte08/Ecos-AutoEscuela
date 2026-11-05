/**
 * Fechas y franjas del calendario del personal.
 *
 * Las fechas de calendario viajan como texto `AAAA-MM-DD` (día en Argentina), nunca como `Date` con hora:
 * así no hay corrimientos por zona horaria. Argentina no tiene horario de verano, pero igual toda hora se
 * calcula con la zona `America/Argentina/Buenos_Aires` (la del negocio), no con la de la máquina.
 */
export const ZONA = 'America/Argentina/Buenos_Aires';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Medio día UTC de una fecha `AAAA-MM-DD`: lejos de los bordes del día, sirve para sumar y comparar días. */
function aDate(fecha: string): Date {
  return new Date(`${fecha}T12:00:00Z`);
}

function aTexto(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** `true` si es una fecha real (rechaza 2026-02-31, texto suelto, etc.). */
export function esFechaValida(valor: string): boolean {
  if (!FECHA.test(valor)) return false;
  const d = aDate(valor);
  return !Number.isNaN(d.getTime()) && aTexto(d) === valor;
}

/** El día de hoy en Argentina, como `AAAA-MM-DD`. */
export function hoyEnArgentina(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = aDate(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return aTexto(d);
}

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export function diaIso(fecha: string): number {
  return aDate(fecha).getUTCDay() || 7;
}

/** El lunes de la semana de una fecha (los sábados y domingos pertenecen a la semana que termina). */
export function lunesDe(fecha: string): string {
  return sumarDias(fecha, -(diaIso(fecha) - 1));
}

/**
 * Semana a mostrar según el parámetro de la URL. Cualquier valor que no sea una fecha válida
 * (la URL es del navegador: puede traer cualquier cosa) cae en la semana de hoy.
 */
export function semanaDesdeParametro(param: string | string[] | undefined, hoy: string): string {
  return typeof param === 'string' && esFechaValida(param) ? lunesDe(param) : lunesDe(hoy);
}

/** Los cinco días laborables (lunes a viernes) de la semana que empieza en `lunes`. */
export function diasLaborables(lunes: string): string[] {
  return [0, 1, 2, 3, 4].map((n) => sumarDias(lunes, n));
}

/** Hora local `HH:MM` (Argentina) de un instante. */
export function horaLocal(instante: string | Date): string {
  const partes = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(
    new Date(instante),
  );
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '00';
  return `${get('hour')}:${get('minute')}`;
}

const aMinutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const aHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export type ReglaDisponibilidad = { weekday: number; start_time: string; end_time: string };

/** La grilla de turnos arranca a las 08:00 y avanza de a `slotMinutes` (igual que en la base). */
export const INICIO_GRILLA = '08:00';

/**
 * Horarios de inicio de los turnos posibles de cada día de la semana (1 = lunes), según los horarios de
 * atención de los profesores. Un turno entra si empieza en la grilla y termina antes del fin de atención.
 */
export function franjasPorDia(reglas: ReglaDisponibilidad[], slotMinutes = 40): Map<number, string[]> {
  const ancla = aMinutos(INICIO_GRILLA);
  const porDia = new Map<number, Set<number>>();

  for (const r of reglas) {
    const desde = aMinutos(r.start_time);
    const hasta = aMinutos(r.end_time);
    const set = porDia.get(r.weekday) ?? new Set<number>();
    for (let inicio = ancla; inicio + slotMinutes <= hasta; inicio += slotMinutes) {
      if (inicio >= desde) set.add(inicio);
    }
    porDia.set(r.weekday, set);
  }

  return new Map([...porDia].map(([dia, set]) => [dia, [...set].sort((a, b) => a - b).map(aHHMM)]));
}

/** Todas las filas de la grilla de la semana: la unión de las franjas de todos los días, en orden. */
export function filasDeLaSemana(franjas: Map<number, string[]>): string[] {
  return [...new Set([...franjas.values()].flat())].sort();
}

/** `true` si entre una fila y la siguiente hay un corte (por ejemplo, el mediodía): se dibuja un separador. */
export function hayCorteEntre(anterior: string, siguiente: string, slotMinutes = 40): boolean {
  return aMinutos(siguiente) - aMinutos(anterior) > slotMinutes;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2 al 6 de noviembre de 2026" (o "30 de noviembre al 4 de diciembre de 2026"). */
export function rotuloSemana(lunes: string): string {
  const viernes = sumarDias(lunes, 4);
  const [ya, ym, yd] = lunes.split('-').map(Number);
  const [fa, fm, fd] = viernes.split('-').map(Number);
  if (ya === fa && ym === fm) return `${yd} al ${fd} de ${MESES[fm - 1]} de ${fa}`;
  if (ya === fa) return `${yd} de ${MESES[ym - 1]} al ${fd} de ${MESES[fm - 1]} de ${fa}`;
  return `${yd} de ${MESES[ym - 1]} de ${ya} al ${fd} de ${MESES[fm - 1]} de ${fa}`;
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];

/** "Lunes 2" para el encabezado de cada columna. */
export function rotuloDia(fecha: string): string {
  const nombre = DIAS[diaIso(fecha) - 1] ?? '';
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${Number(fecha.slice(8, 10))}`;
}
