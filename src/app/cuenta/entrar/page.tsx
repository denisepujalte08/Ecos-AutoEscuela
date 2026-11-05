import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { EnlaceCruzado, MarcoIngreso } from '@/components/ingreso/MarcoIngreso';
import { obtenerAlumno } from '@/lib/auth/alumno';
import { FormularioEntrar } from './FormularioEntrar';

export const metadata: Metadata = {
  title: 'Ingreso de alumnos',
  robots: { index: false, follow: false },
};

const AVISOS: Record<string, string> = {
  link: 'El link venció o ya se usó. Pedí uno nuevo con tu email.',
};

export default function EntrarAlumno({ searchParams }: PageProps<'/cuenta/entrar'>) {
  return (
    <MarcoIngreso titulo="Ingreso de alumnos">
      <Suspense>
        <Contenido searchParams={searchParams} />
      </Suspense>
      <EnlaceCruzado href="/panel/login">Ingreso del personal</EnlaceCruzado>
    </MarcoIngreso>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<'/cuenta/entrar'>['searchParams'] }) {
  // Quien ya tiene sesión de alumno no necesita el formulario: va directo a su cuenta.
  if (await obtenerAlumno()) redirect('/cuenta');
  const { error } = await searchParams;
  const aviso = typeof error === 'string' && Object.hasOwn(AVISOS, error) ? AVISOS[error] : undefined;
  return <FormularioEntrar aviso={aviso} />;
}
