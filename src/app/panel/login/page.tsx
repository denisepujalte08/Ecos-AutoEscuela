import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { EnlaceCruzado, MarcoIngreso } from '@/components/ingreso/MarcoIngreso';
import { obtenerPersonal } from '@/lib/auth/personal';
import { FormularioLogin } from './FormularioLogin';

export const metadata: Metadata = {
  title: 'Ingreso del personal',
  robots: { index: false, follow: false },
};

export default function LoginPersonal() {
  return (
    <MarcoIngreso titulo="Ingreso del personal">
      <Suspense>
        <SiYaEntro />
      </Suspense>
      <FormularioLogin />
      <EnlaceCruzado href="/cuenta/entrar">Ingreso de alumnos</EnlaceCruzado>
    </MarcoIngreso>
  );
}

/** Quien ya tiene sesión del personal no necesita el formulario: va directo al panel. */
async function SiYaEntro() {
  if (await obtenerPersonal()) redirect('/panel');
  return null;
}
