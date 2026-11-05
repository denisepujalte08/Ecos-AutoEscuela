import type { Metadata } from 'next';
import { ComoFunciona } from '@/components/sitio/ComoFunciona';
import { HeroC } from '@/components/sitio/HeroC';
import { LlamadoFinal } from '@/components/sitio/LlamadoFinal';
import { TarjetasCursos } from '@/components/sitio/TarjetasCursos';
import { Ventajas } from '@/components/sitio/Ventajas';

// Versión C de la página de inicio (lema arriba y foto debajo). la principal (`/`) queda como estaba, para poder comparar.
export const metadata: Metadata = { robots: { index: false } };

export default function InicioC() {
  return (
    <>
      <HeroC />
      <div id="cursos">
        <TarjetasCursos conTitulo />
        <ComoFunciona />
      </div>
      <div id="nosotros">
        <Ventajas conTitulo />
      </div>
      <div id="contacto">
        <LlamadoFinal />
      </div>
    </>
  );
}
