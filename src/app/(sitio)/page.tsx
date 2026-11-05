import { ComoFunciona } from '@/components/sitio/ComoFunciona';
import { HeroB } from '@/components/sitio/HeroB';
import { LlamadoFinal } from '@/components/sitio/LlamadoFinal';
import { TarjetasCursos } from '@/components/sitio/TarjetasCursos';
import { Ventajas } from '@/components/sitio/Ventajas';

/** Los `id` de cada bloque son los destinos de los enlaces del menú (ver ENLACES en src/lib/site.ts). */
export default function Inicio() {
  return (
    <>
      <HeroB />
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
