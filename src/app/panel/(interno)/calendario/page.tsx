import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { exigirPersonal } from '@/lib/auth/personal';
import {
  hayCorteEntre,
  hoyEnArgentina,
  rotuloDia,
  rotuloSemana,
  semanaDesdeParametro,
  sumarDias,
  diaIso,
} from '@/lib/calendario/fechas';
import { cargarSemana, claveCelda, type ClaseCalendario, type SemanaCalendario } from '@/lib/calendario/semana';

export const metadata: Metadata = { title: 'Calendario' };

/** Colores por profesor (en el orden en que vienen): borde, fondo y texto con buen contraste. */
const COLORES = [
  { borde: '#d96f26', fondo: '#fdeede', texto: '#5a2d0c' },
  { borde: '#2f7f86', fondo: '#e2f1f2', texto: '#143a3e' },
  { borde: '#6b5bb0', fondo: '#ebe8f6', texto: '#2b2352' },
];

export default function Calendario({ searchParams }: PageProps<'/panel/calendario'>) {
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-foreground">Calendario</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<'/panel/calendario'>['searchParams'] }) {
  await exigirPersonal();
  const hoy = hoyEnArgentina();
  const lunes = semanaDesdeParametro((await searchParams).semana, hoy);
  const semana = await cargarSemana(lunes);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <Navegacion lunes={lunes} hoy={hoy} />
        <Leyenda semana={semana} />
      </div>
      <Grilla semana={semana} hoy={hoy} />
    </div>
  );
}

function Navegacion({ lunes, hoy }: { lunes: string; hoy: string }) {
  const enEstaSemana = semanaDesdeParametro(hoy, hoy) === lunes;
  const base =
    'inline-flex items-center justify-center border border-border bg-card text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link href={`/panel/calendario?semana=${sumarDias(lunes, -7)}`} className={`${base} h-7 w-7 rounded-full`} aria-label="Semana anterior">
        <Flecha direccion="izquierda" />
      </Link>
      <Link
        href="/panel/calendario"
        className={`${base} rounded-md px-2.5 py-1 text-xs font-semibold ${enEstaSemana ? 'pointer-events-none opacity-50' : ''}`}
        aria-current={enEstaSemana ? 'date' : undefined}
      >
        Hoy
      </Link>
      <Link href={`/panel/calendario?semana=${sumarDias(lunes, 7)}`} className={`${base} h-7 w-7 rounded-full`} aria-label="Semana siguiente">
        <Flecha direccion="derecha" />
      </Link>
      <p className="ml-1.5 font-heading text-base font-bold text-foreground" aria-live="polite">
        {rotuloSemana(lunes)}
      </p>
    </div>
  );
}

function Flecha({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direccion === 'izquierda' ? 'M12 4l-6 6 6 6' : 'M8 4l6 6-6 6'} />
    </svg>
  );
}

function Leyenda({ semana }: { semana: SemanaCalendario }) {
  return (
    <ul className="flex flex-wrap gap-3 text-xs" aria-label="Profesores">
      {semana.instructores.map((p, i) => (
        <li key={p.id} className="flex items-center gap-2">
          <span aria-hidden="true" className="h-3 w-3 rounded-sm" style={{ background: COLORES[i % COLORES.length].borde }} />
          {p.nombre}
        </li>
      ))}
      <li className="flex items-center gap-2 text-muted-foreground">
        <span aria-hidden="true" className="h-3 w-3 rounded-sm border border-dashed border-foreground/40" />
        Sin pagar (reservado)
      </li>
    </ul>
  );
}

function Grilla({ semana, hoy }: { semana: SemanaCalendario; hoy: string }) {
  const { dias, filas, atencion, clases, instructores, slotMinutes } = semana;
  const colorDe = (id: string) => COLORES[Math.max(0, instructores.findIndex((p) => p.id === id)) % COLORES.length];

  if (filas.length === 0) {
    return <p className="rounded-xl bg-card p-5 text-muted-foreground shadow-card">No hay horarios de atención cargados.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-card shadow-card">
      <div className="grid min-w-[44rem]" style={{ gridTemplateColumns: '4rem repeat(5, minmax(0, 1fr))' }} role="table" aria-label="Calendario semanal">
        <div role="row" className="contents">
          <div role="columnheader" className="border-b border-border p-2" />
          {dias.map((dia) => (
            <div
              key={dia}
              role="columnheader"
              className={`border-b border-l border-border p-2 text-center text-sm font-semibold ${dia === hoy ? 'bg-primary/15' : ''}`}
            >
              {rotuloDia(dia)}
              {dia === hoy && <span className="ml-1 text-xs font-normal text-muted-foreground">(hoy)</span>}
            </div>
          ))}
        </div>

        {filas.map((hora, i) => (
          <div key={hora} role="row" className="contents">
            {i > 0 && hayCorteEntre(filas[i - 1], hora, slotMinutes) && (
              <div role="presentation" className="col-span-6 border-t border-border bg-foreground/[0.04] py-1 text-center text-xs text-muted-foreground">
                Descanso
              </div>
            )}
            <div role="rowheader" className="p-2 text-right text-xs text-muted-foreground">
              {hora}
            </div>
            {dias.map((dia) => {
              const clase = clases.get(claveCelda(dia, hora));
              const atiende = atencion.get(diaIso(dia))?.has(hora) ?? false;
              return (
                <div
                  key={dia}
                  role="cell"
                  className={`min-h-[3.5rem] border-l border-t border-border p-1 ${dia === hoy ? 'bg-primary/[0.06]' : ''} ${
                    !atiende && !clase ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,0.04)_6px,rgba(0,0,0,0.04)_12px)]' : ''
                  }`}
                >
                  {clase && <TarjetaClase clase={clase} color={colorDe(clase.instructor.id)} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TarjetaClase({ clase, color }: { clase: ClaseCalendario; color: { borde: string; fondo: string; texto: string } }) {
  const sinPagar = clase.estado === 'held';
  const hecha = clase.estado === 'done';
  const ausente = clase.estado === 'no_show';
  const etiqueta =
    clase.tipo === 'examen' ? 'Examen' : clase.nro && clase.total ? `Clase ${clase.nro} de ${clase.total}` : `Clase ${clase.nro ?? ''}`;

  return (
    <div
      className={`h-full rounded-md px-2 py-1 text-xs leading-tight ${sinPagar ? 'border border-dashed' : 'border-l-4'} ${hecha ? 'opacity-70' : ''}`}
      style={{ background: color.fondo, color: color.texto, borderColor: color.borde }}
      title={`${clase.alumno} · ${etiqueta} · ${clase.instructor.nombre}`}
    >
      <p className={`truncate font-semibold ${ausente ? 'line-through' : ''}`}>{clase.alumno}</p>
      <p className="truncate">
        {etiqueta}
        {hecha && ' · dada'}
        {ausente && ' · ausente'}
        {sinPagar && ' · sin pagar'}
      </p>
    </div>
  );
}
