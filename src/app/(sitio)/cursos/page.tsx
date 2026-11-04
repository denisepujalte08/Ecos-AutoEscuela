import type { Metadata } from 'next';
import { ComoFunciona } from '@/components/sitio/ComoFunciona';
import { EncabezadoPagina } from '@/components/sitio/EncabezadoPagina';
import { LlamadoFinal } from '@/components/sitio/LlamadoFinal';
import { TarjetasCursos } from '@/components/sitio/TarjetasCursos';

export const metadata: Metadata = {
  title: 'Cursos',
  description: 'Cursos de manejo de 5 y 7 clases prácticas de 40 minutos. Reservá por WhatsApp.',
};

export default function Cursos() {
  return (
    <>
      <EncabezadoPagina titulo="Nuestros" resaltado="cursos">
        Clases prácticas de 40 minutos, de a una por día. Elegí cuántas necesitás.
      </EncabezadoPagina>
      <TarjetasCursos />
      <ComoFunciona />
      <LlamadoFinal />
    </>
  );
}
