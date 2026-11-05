import type { Metadata } from 'next';
import { ComoFunciona } from '@/components/sitio/ComoFunciona';
import { HeroD } from '@/components/sitio/HeroD';
import { LlamadoFinal } from '@/components/sitio/LlamadoFinal';
import { TarjetasCursos } from '@/components/sitio/TarjetasCursos';
import { Ventajas } from '@/components/sitio/Ventajas';

// Versión D de la página de inicio (fondo liso, onda y emblema como marca de agua). Provisoria: se borra si
// no se elige. La principal (`/`) y la `/c` no se tocan.
export const metadata: Metadata = { robots: { index: false } };

export default function InicioD() {
  return (
    <>
      <HeroD />
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
