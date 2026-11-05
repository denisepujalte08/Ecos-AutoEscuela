import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { exigirPersonal } from '@/lib/auth/personal';
import { cerrarSesion } from './actions';

export const metadata: Metadata = {
  title: { default: 'Panel', template: '%s | Panel ECOS' },
  robots: { index: false, follow: false },
};

/** Marco del panel interno. La sesión se lee en tiempo de pedido, por eso va detrás de Suspense. */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-muted-foreground">Cargando…</p>}>
      <Marco>{children}</Marco>
    </Suspense>
  );
}

async function Marco({ children }: { children: ReactNode }) {
  const personal = await exigirPersonal();
  return (
    <div className="panel-raiz min-h-screen" style={{ background: 'var(--fondo-cursos)' }}>
      {/* Barra flotante igual a la de la web y a la del login. */}
      <header className="animate-barra fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/95 px-4 shadow-xl backdrop-blur-lg lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/panel" aria-label="Inicio del panel">
              <Image src="/logo-ecos-solo.svg" alt="ECOS" width={147} height={44} loading="eager" className="h-auto w-[8.5rem]" />
            </Link>
            <nav aria-label="Panel" className="flex gap-5 text-sm font-semibold">
              <Link href="/panel/calendario" className="hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Calendario
              </Link>
              <Link href="/panel/pedidos" className="hover:text-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Pedidos
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {personal.email} · {personal.rol === 'owner' ? 'Dueño' : 'Administración'}
            </span>
            <form action={cerrarSesion}>
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
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-24">{children}</main>
    </div>
  );
}
