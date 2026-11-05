import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MarcoIngreso } from '@/components/ingreso/MarcoIngreso';
import { esTipoDeEnlace } from '@/lib/auth/enlace';
import { confirmarEnlace } from './actions';

export const metadata: Metadata = {
  title: 'Entrar a mi cuenta',
  robots: { index: false, follow: false },
};

/**
 * Pantalla a la que lleva el botón de los mails (invitación y link de ingreso). El link NO se canjea al abrir
 * la página sino al apretar el botón: así los programas de correo que "visitan" los links para revisarlos no
 * gastan el link de un solo uso antes de que lo use la persona.
 */
export default function Confirmar({ searchParams }: PageProps<'/auth/confirmar'>) {
  return (
    <MarcoIngreso titulo="Entrar a mi cuenta">
      <Suspense>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </MarcoIngreso>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<'/auth/confirmar'>['searchParams'] }) {
  const { token_hash: tokenHash, type } = await searchParams;

  if (typeof tokenHash !== 'string' || !tokenHash || !esTipoDeEnlace(type)) {
    return (
      <p role="alert" className="rounded-lg border border-red-600/40 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
        El link no es válido. Pedí uno nuevo desde la pantalla de ingreso.
      </p>
    );
  }

  return (
    <form action={confirmarEnlace} className="space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <p className="text-center text-sm text-muted-foreground">Tocá el botón para entrar a tu cuenta.</p>
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-2.5 text-base font-semibold text-on-primary shadow-lg transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Entrar
      </button>
    </form>
  );
}
