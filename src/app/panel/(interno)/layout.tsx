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
    <div className="min-h-screen" style={{ background: 'var(--fondo-cursos)' }}>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/panel" aria-label="Inicio del panel">
              <Image src="/logo-ecos-solo.svg" alt="ECOS" width={104} height={31} loading="eager" className="h-auto w-24" />
            </Link>
            <nav aria-label="Panel" className="text-sm font-semibold">
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
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
