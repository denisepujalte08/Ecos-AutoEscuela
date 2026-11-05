import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { exigirAlumno } from '@/lib/auth/alumno';
import { cerrarSesionAlumno } from './actions';

export const metadata: Metadata = {
  title: { default: 'Mi cuenta', template: '%s | ECOS' },
  robots: { index: false, follow: false },
};

/** Marco de la cuenta del alumno. La sesión se lee en tiempo de pedido, por eso va detrás de Suspense. */
export default function CuentaLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted-foreground">Cargando…</p>}>
      <Marco>{children}</Marco>
    </Suspense>
  );
}

async function Marco({ children }: { children: ReactNode }) {
  const alumno = await exigirAlumno();
  return (
    <div className="panel-raiz min-h-screen" style={{ background: 'var(--fondo-cursos)' }}>
      <header className="animate-barra fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/95 px-4 shadow-xl backdrop-blur-lg lg:px-8">
          <Link href="/cuenta" aria-label="Mi cuenta" className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Image src="/logo-ecos-solo.svg" alt="ECOS" width={147} height={44} loading="eager" className="h-auto w-[8.5rem]" />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{alumno.nombre}</span>
            <form action={cerrarSesionAlumno}>
              <button
                type="submit"
                className="rounded-full border-2 border-foreground/20 px-4 py-1.5 font-semibold hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-10 pt-24">{children}</main>
    </div>
  );
}
