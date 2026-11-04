import type { Metadata } from 'next';
import { ComoFunciona } from '@/components/sitio/ComoFunciona';
import { LlamadoFinal } from '@/components/sitio/LlamadoFinal';
import { TarjetasCursos } from '@/components/sitio/TarjetasCursos';

export const metadata: Metadata = {
  title: 'Cursos',
  description: 'Cursos de manejo de 5 y 7 clases prácticas de 40 minutos. Reservá por WhatsApp.',
};

export default function Cursos() {
  return (
    <>
      <TarjetasCursos comoPagina />
      <ComoFunciona />
      <LlamadoFinal />
    </>
  );
}
