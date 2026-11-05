'use client';

import { useActionState } from 'react';
import { pedirLink, type EstadoEntrar } from './actions';

const INICIAL: EstadoEntrar = { estado: 'inicial' };

export function FormularioEntrar({ aviso }: { aviso?: string }) {
  const [estado, accion, enviando] = useActionState(pedirLink, INICIAL);

  if (estado.estado === 'ok') {
    return (
      <p role="status" className="rounded-lg border border-success/40 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
        {estado.mensaje}
      </p>
    );
  }

  const error = estado.estado === 'error' ? estado.mensaje : aviso;
  return (
    <form action={accion} noValidate className="space-y-4">
      <p className="text-center text-sm text-muted-foreground">Escribí tu email y te enviamos un link para entrar. No hace falta contraseña.</p>
      {error && (
        <p role="alert" className="rounded-lg border border-red-600/40 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.estado === 'error' ? estado.email : ''}
          className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-2.5 text-base font-semibold text-on-primary shadow-lg transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {enviando ? 'Enviando…' : 'Enviarme el link'}
      </button>
    </form>
  );
}
