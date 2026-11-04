import { ComoFunciona } from '@/components/sitio/ComoFunciona';
import { Hero } from '@/components/sitio/Hero';
import { LlamadoFinal } from '@/components/sitio/LlamadoFinal';
import { TarjetasCursos } from '@/components/sitio/TarjetasCursos';
import { Ventajas } from '@/components/sitio/Ventajas';

export default function Inicio() {
  return (
    <>
      <Hero />
      <Ventajas />
      <TarjetasCursos />
      <ComoFunciona />
      <LlamadoFinal />
    </>
  );
}
