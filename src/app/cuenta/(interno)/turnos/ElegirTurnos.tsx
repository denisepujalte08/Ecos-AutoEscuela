'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { conMayuscula, lunesDe, rotuloDia, rotuloFecha, rotuloSemana } from '@/lib/calendario/fechas';
import type { DiaConTurnos, EstadoTurnos } from '@/lib/booking/turnos';
import { reservar } from './actions';

const INICIAL: EstadoTurnos = { estado: 'inicial' };

/**
 * Elegir todos los turnos de un curso de una vez: un horario por día (la base no admite dos clases el mismo día),
 * navegando por semanas. Se confirma cuando están todos elegidos. Solo se ofrecen horarios que la base marca libres.
 */
export function ElegirTurnos({ curso, clases, dias }: { curso: string; clases: number; dias: DiaConTurnos[] }) {
  const [estado, accion, enviando] = useActionState(reservar, INICIAL);
  const [elegidos, setElegidos] = useState<Record<string, string>>({});
  const semanas = useMemo(() => [...new Set(dias.map((d) => lunesDe(d.fecha)))].sort(), [dias]);
  const [indice, setIndice] = useState(0);

  const cantidad = Object.keys(elegidos).length;
  const completo = cantidad === clases;
  const semana = semanas[indice];
  const diasDeLaSemana = dias.filter((d) => lunesDe(d.fecha) === semana);
  const resumen = Object.entries(elegidos).sort(([a], [b]) => a.localeCompare(b));
  const horaDe = (fecha: string, iso: string) => dias.find((d) => d.fecha === fecha)?.turnos.find((t) => t.iso === iso)?.hora ?? '';

  function alternar(fecha: string, iso: string) {
    setElegidos((actual) => {
      const siguiente = { ...actual };
      if (siguiente[fecha] === iso) delete siguiente[fecha];
      else if (fecha in siguiente || Object.keys(siguiente).length < clases) siguiente[fecha] = iso;
      return siguiente;
    });
  }

  if (dias.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-bold">Elegir mis turnos</h1>
        <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-card">
          Por ahora no hay horarios libres. Escribinos por WhatsApp y lo resolvemos.
        </p>
        <Link href="/cuenta" className="font-semibold text-primary-dark underline">Volver</Link>
      </div>
    );
  }

  const boton =
    'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40';

  return (
    <form action={accion} className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Elegí tus turnos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {curso}: elegí {clases} clases, una por día. Cuando las tengas todas, confirmá.
        </p>
      </div>

      {estado.estado === 'error' && (
        <p role="alert" className="rounded-lg border border-red-600/40 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {estado.mensaje}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={boton} disabled={indice === 0} onClick={() => setIndice(indice - 1)} aria-label="Semana anterior">
          ‹
        </button>
        <button type="button" className={boton} disabled={indice === semanas.length - 1} onClick={() => setIndice(indice + 1)} aria-label="Semana siguiente">
          ›
        </button>
        <p className="ml-1.5 font-heading text-base font-bold" aria-live="polite">
          {rotuloSemana(semana)}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {diasDeLaSemana.map((dia) => (
          <li key={dia.fecha} className="rounded-xl bg-card p-4 shadow-card">
            <p className="mb-2 font-semibold">{rotuloDia(dia.fecha)}</p>
            <div className="flex flex-wrap gap-2">
              {dia.turnos.map((t) => {
                const activo = elegidos[dia.fecha] === t.iso;
                return (
                  <button
                    key={t.iso}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => alternar(dia.fecha, t.iso)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      activo ? 'border-primary bg-primary text-on-primary' : 'border-border bg-white hover:bg-primary/10'
                    }`}
                  >
                    {t.hora}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <section className="rounded-2xl bg-card p-5 shadow-card" aria-labelledby="h-resumen">
        <h2 id="h-resumen" className="font-heading text-lg font-bold">
          Elegiste {cantidad} de {clases}
        </h2>
        {resumen.length > 0 && (
          <ol className="mt-3 space-y-1.5 text-sm">
            {resumen.map(([fecha, iso], i) => (
              <li key={fecha} className="flex items-center justify-between gap-3">
                <span>
                  <strong>Clase {i + 1}:</strong> <span>{conMayuscula(rotuloFecha(fecha))}</span>, {horaDe(fecha, iso)} hs
                </span>
                <button type="button" onClick={() => alternar(fecha, iso)} className="text-muted-foreground underline hover:text-foreground">
                  Quitar
                </button>
              </li>
            ))}
          </ol>
        )}
        {resumen.map(([fecha, iso]) => (
          <input key={fecha} type="hidden" name="turno" value={iso} />
        ))}
        <button
          type="submit"
          disabled={!completo || enviando}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-8 py-2.5 text-base font-semibold text-on-primary shadow-lg transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
        >
          {enviando ? 'Reservando…' : 'Confirmar mis turnos'}
        </button>
        {!completo && <p className="mt-2 text-sm text-muted-foreground">Faltan {clases - cantidad} para confirmar.</p>}
      </section>
    </form>
  );
}
