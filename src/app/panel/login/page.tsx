import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FormularioLogin } from './FormularioLogin';

export const metadata: Metadata = {
  title: 'Ingreso del personal',
  robots: { index: false, follow: false },
};

export default function LoginPersonal() {
  return (
    <div className="panel-raiz relative isolate flex min-h-screen flex-col overflow-hidden" style={{ background: 'var(--fondo-cursos)' }}>
      {/* Volante grande de fondo, con transparencia: es solo decoración. */}
      <Image
        src="/logo-ecos-emblema.svg"
        alt=""
        aria-hidden="true"
        width={900}
        height={900}
        loading="eager"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(90vw,56rem)] max-w-none -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.07] animate-volante"
      />
      {/* Barra flotante igual a la de la web, pero solo con el logo. */}
      <header className="animate-barra fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-lg">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4 lg:px-8">
            <Link href="/#inicio" aria-label="ECOS, volver al inicio" className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <Image src="/logo-ecos-solo.svg" alt="ECOS Escuela de Conducción Segura" width={147} height={44} loading="eager" className="h-auto w-[8.5rem]" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-10 pt-24">
        <div className="animate-fade-up w-full max-w-xs rounded-2xl bg-card p-6 shadow-card">
          <Image src="/logo-ecos-emblema.svg" alt="" width={56} height={56} loading="eager" className="mx-auto mb-3 h-auto w-14" />
          <h1 className="mb-5 text-center font-heading text-lg font-bold text-foreground">Ingreso del personal</h1>
          <FormularioLogin />
        </div>
      </main>
    </div>
  );
}
