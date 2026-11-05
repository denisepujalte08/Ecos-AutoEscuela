'use client';

import { useActionState, useState } from 'react';
import { calcularMonto } from '@/lib/booking/precios';
import type { EstadoPedido, ValoresPedido } from '@/lib/booking/pedido';
import { formatearPesos } from '@/lib/cursos';
import { MENSAJES, whatsappUrl } from '@/lib/site';
import { Boton } from '@/components/sitio/Boton';
import { crearPedido } from './actions';

export type CursoOpcion = { id: string; nombre: string; clases: number; precio: number };
type Descuentos = { transferencia: number; efectivo: number };

const INICIAL: EstadoPedido = { estado: 'inicial' };
const VACIOS: ValoresPedido = { nombre: '', telefono: '', dni: '', email: '', courseId: '', metodo: '' };

const ETIQUETA_METODO = { transferencia: 'Transferencia', efectivo: 'Efectivo' } as const;

const CAMPO =
  'w-full rounded-lg border border-border bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary aria-[invalid=true]:border-red-600';

export function FormularioCompra({
  cursos,
  descuentos,
  cursoInicial,
}: {
  cursos: CursoOpcion[];
  descuentos: Descuentos;
  cursoInicial?: string;
}) {
  const [estado, accion, enviando] = useActionState(crearPedido, INICIAL);
  const valores = estado.estado === 'error' ? estado.valores : VACIOS;
  const errores = estado.estado === 'error' ? estado.campos : {};

  const [courseId, setCourseId] = useState(
    valores.courseId || cursoInicial || (cursos.length === 1 ? cursos[0].id : ''),
  );
  const [metodo, setMetodo] = useState(valores.metodo);

  if (estado.estado === 'ok') return <Confirmacion pedido={estado.pedido} />;

  const curso = cursos.find((c) => c.id === courseId);
  const metodoElegido = metodo === 'efectivo' || metodo === 'transferencia' ? metodo : null;
  const total = curso && metodoElegido ? calcularMonto(curso.precio, descuentos[metodoElegido]) : null;

  return (
    <form action={accion} noValidate className="mx-auto w-full max-w-2xl space-y-8">
      {estado.estado === 'error' && (
        <p role="alert" className="rounded-lg border border-red-600/40 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {estado.mensaje}
        </p>
      )}

      <fieldset aria-describedby={errores.courseId ? 'error-courseId' : undefined}>
        <legend className="mb-3 font-heading text-lg font-bold text-foreground">1. Elegí tu curso</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {cursos.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer flex-col rounded-xl border-2 border-border bg-card p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            >
              <input
                type="radio"
                name="courseId"
                value={c.id}
                checked={courseId === c.id}
                onChange={() => setCourseId(c.id)}
                className="sr-only"
              />
              <span className="font-heading font-bold text-card-foreground">{c.nombre}</span>
              <span className="text-sm text-muted-foreground">Precio de lista {formatearPesos(c.precio)}</span>
            </label>
          ))}
        </div>
        <Error id="error-courseId" texto={errores.courseId} />
      </fieldset>

      <fieldset aria-describedby={errores.metodo ? 'error-metodo' : undefined}>
        <legend className="mb-3 font-heading text-lg font-bold text-foreground">2. ¿Cómo vas a pagar?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['transferencia', 'efectivo'] as const).map((m) => (
            <label
              key={m}
              className="flex cursor-pointer flex-col rounded-xl border-2 border-border bg-card p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            >
              <input
                type="radio"
                name="metodo"
                value={m}
                checked={metodo === m}
                onChange={() => setMetodo(m)}
                className="sr-only"
              />
              <span className="font-heading font-bold text-card-foreground">{ETIQUETA_METODO[m]}</span>
              <span className="text-sm text-muted-foreground">
                {descuentos[m] > 0 ? `${descuentos[m]} % de descuento` : 'Sin descuento'}
                {curso ? ` · ${formatearPesos(calcularMonto(curso.precio, descuentos[m]))}` : ''}
              </span>
            </label>
          ))}
        </div>
        <Error id="error-metodo" texto={errores.metodo} />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 font-heading text-lg font-bold text-foreground">3. Tus datos</legend>
        <Campo id="nombre" etiqueta="Nombre y apellido" valor={valores.nombre} error={errores.nombre} autoComplete="name" />
        <Campo id="telefono" etiqueta="Teléfono (con código de área)" valor={valores.telefono} error={errores.telefono} type="tel" inputMode="tel" autoComplete="tel" />
        <Campo id="dni" etiqueta="DNI" valor={valores.dni} error={errores.dni} inputMode="numeric" autoComplete="off" />
        <Campo id="email" etiqueta="Email" valor={valores.email} error={errores.email} type="email" autoComplete="email" />

        {/* Campo trampa: las personas no lo ven; los robots suelen completarlo. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            No completar
            <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
      </fieldset>

      <div className="rounded-xl bg-card p-5 shadow-card">
        <p className="text-sm text-muted-foreground">Total a pagar</p>
        <p className="font-heading text-3xl font-bold text-primary" aria-live="polite">
          {total === null ? '—' : formatearPesos(total)}
        </p>
        <button
          type="submit"
          disabled={enviando}
          className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-8 py-4 text-lg font-semibold text-on-primary shadow-lg transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {enviando ? 'Enviando…' : 'Hacer el pedido'}
        </button>
        <p className="mt-3 text-sm text-muted-foreground">
          Todavía no pagás nada: después coordinamos el pago por WhatsApp.
        </p>
      </div>
    </form>
  );
}

function Error({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-2 text-sm font-medium text-red-700">
      {texto}
    </p>
  );
}

function Campo({
  id,
  etiqueta,
  valor,
  error,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  error?: string;
  type?: string;
  inputMode?: 'tel' | 'numeric';
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground">
        {etiqueta}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        defaultValue={valor}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `error-${id}` : undefined}
        className={CAMPO}
      />
      <Error id={`error-${id}`} texto={error} />
    </div>
  );
}

function Confirmacion({ pedido }: { pedido: Extract<EstadoPedido, { estado: 'ok' }>['pedido'] }) {
  const monto = formatearPesos(pedido.monto);
  const mensaje = MENSAJES.pedido({
    codigo: pedido.codigo,
    curso: pedido.curso,
    metodo: pedido.metodo,
    monto,
    nombre: pedido.nombre,
    dni: pedido.dni,
  });
  return (
    <div role="status" className="mx-auto w-full max-w-2xl rounded-2xl bg-card p-6 text-center shadow-card sm:p-8">
      <h2 className="font-heading text-2xl font-bold text-foreground">¡Pedido recibido!</h2>
      <p className="mt-2 text-muted-foreground">
        Tu código es <strong className="text-foreground">{pedido.codigo}</strong>.
      </p>
      <dl className="mx-auto mt-5 max-w-sm space-y-1 text-left text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Curso</dt><dd className="font-medium">{pedido.curso}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Pago</dt><dd className="font-medium">{ETIQUETA_METODO[pedido.metodo]}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Total</dt><dd className="font-medium">{monto}</dd></div>
      </dl>
      <p className="mt-5 text-muted-foreground">
        Escribinos por WhatsApp para coordinar el pago. Cuando lo confirmemos, te damos de alta y elegís tus turnos.
      </p>
      <Boton href={whatsappUrl(mensaje)} externo className="mt-5 w-full sm:w-auto">
        Coordinar el pago por WhatsApp
      </Boton>
    </div>
  );
}
