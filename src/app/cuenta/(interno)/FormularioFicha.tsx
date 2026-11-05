'use client';

import { useActionState, useState } from 'react';
import { edadEn, esFechaValida, MAYORIA_DE_EDAD } from '@/lib/calendario/fechas';
import type { EstadoFicha } from '@/lib/auth/ficha';
import { guardarFichaAccion } from './fichaActions';

const INICIAL: EstadoFicha = { estado: 'inicial' };

const CAMPO =
  'w-full rounded-lg border border-border bg-white px-4 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-[invalid=true]:border-red-600';

function MensajeError({ id, texto }: { id: string; texto?: string }) {
  return texto ? (
    <p id={id} className="mt-1 text-sm font-medium text-red-700">
      {texto}
    </p>
  ) : null;
}

const CAMPOS_TUTOR = [
  { id: 'tutorNombre', etiqueta: 'Nombre y apellido', tipo: 'text', modo: undefined },
  { id: 'tutorDni', etiqueta: 'DNI', tipo: 'text', modo: 'numeric' },
  { id: 'tutorTelefono', etiqueta: 'Teléfono (con código de área)', tipo: 'tel', modo: 'tel' },
] as const;

/** Completar la ficha: fecha de nacimiento y, si es menor de 18 años, los datos de un adulto responsable. */
export function FormularioFicha({ hoy }: { hoy: string }) {
  const [estado, accion, enviando] = useActionState(guardarFichaAccion, INICIAL);
  const valores = estado.estado === 'error' ? estado.valores : { fechaNacimiento: '', tutorNombre: '', tutorDni: '', tutorTelefono: '' };
  const errores = estado.estado === 'error' ? estado.campos : {};
  const [nacimiento, setNacimiento] = useState(valores.fechaNacimiento);
  const esMenor = esFechaValida(nacimiento) && nacimiento <= hoy && edadEn(nacimiento, hoy) < MAYORIA_DE_EDAD;

  return (
    <form action={accion} noValidate className="space-y-4">
      {estado.estado === 'error' && (
        <p role="alert" className="rounded-lg border border-red-600/40 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {estado.mensaje}
        </p>
      )}

      <div>
        <label htmlFor="fechaNacimiento" className="mb-1 block text-sm font-medium">
          Fecha de nacimiento
        </label>
        <input
          id="fechaNacimiento"
          name="fechaNacimiento"
          type="date"
          required
          max={hoy}
          value={nacimiento}
          onChange={(e) => setNacimiento(e.target.value)}
          autoComplete="bday"
          aria-invalid={errores.fechaNacimiento ? true : undefined}
          aria-describedby={errores.fechaNacimiento ? 'error-fechaNacimiento' : undefined}
          className={CAMPO}
        />
        <MensajeError id="error-fechaNacimiento" texto={errores.fechaNacimiento} />
      </div>

      {esMenor && (
        <fieldset className="space-y-4 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Adulto responsable (sos menor de {MAYORIA_DE_EDAD} años)</legend>
          {CAMPOS_TUTOR.map(({ id, etiqueta, tipo, modo }) => (
            <div key={id}>
              <label htmlFor={id} className="mb-1 block text-sm font-medium">
                {etiqueta}
              </label>
              <input
                id={id}
                name={id}
                type={tipo}
                inputMode={modo}
                autoComplete="off"
                required
                defaultValue={valores[id]}
                aria-invalid={errores[id] ? true : undefined}
                aria-describedby={errores[id] ? `error-${id}` : undefined}
                className={CAMPO}
              />
              <MensajeError id={`error-${id}`} texto={errores[id]} />
            </div>
          ))}
        </fieldset>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-2.5 text-base font-semibold text-on-primary shadow-lg transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {enviando ? 'Guardando…' : 'Guardar mis datos'}
      </button>
    </form>
  );
}
