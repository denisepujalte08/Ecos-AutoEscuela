import type { Metadata } from 'next';
import Image from 'next/image';
import { FormularioLogin } from './FormularioLogin';

export const metadata: Metadata = {
  title: 'Ingreso del personal',
  robots: { index: false, follow: false },
};

export default function LoginPersonal() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--fondo-cursos)' }}>
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-card sm:p-8">
        <Image src="/logo-ecos-solo.svg" alt="ECOS" width={130} height={39} loading="eager" className="mx-auto mb-6 h-auto w-32" />
        <h1 className="mb-6 text-center font-heading text-xl font-bold text-foreground">Ingreso del personal</h1>
        <FormularioLogin />
      </div>
    </main>
  );
}
