'use client';

import { useActionState } from 'react';
import type { EstadoLogin } from '@/lib/auth/login';
import { iniciarSesion } from './actions';

const INICIAL: EstadoLogin = { estado: 'inicial' };

const CAMPO =
  'w-full rounded-lg border border-border bg-white px-4 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary';

export function FormularioLogin() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, INICIAL);
  const error = estado.estado === 'error' ? estado.mensaje : null;

  return (
    <form action={accion} noValidate className="space-y-4">
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
          autoComplete="username"
          required
          defaultValue={estado.estado === 'error' ? estado.email : ''}
          className={CAMPO}
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={CAMPO} />
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-2.5 text-base font-semibold text-on-primary shadow-lg transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
