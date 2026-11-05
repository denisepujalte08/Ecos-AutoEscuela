import Image from 'next/image';
import type { ComponentType, SVGProps } from 'react';
import { MENSAJES, whatsappUrl } from '@/lib/site';
import { Boton } from './Boton';
import { IconoAuto, IconoCheck, IconoEscudo, IconoFlecha } from './iconos';

const CONFIANZA = ['Sin experiencia previa', 'Instructores profesionales', 'Te acompañamos al examen'];

type Insignia = { icono: ComponentType<SVGProps<SVGSVGElement>>; texto: string; posicion: string; retardo: string };

// Tarjetitas que flotan alrededor de la foto (solo desde tablet, para no cargar el celular).
// Las frases son del propio cliente, de sus posteos de Instagram; no deben repetir lo de CONFIANZA.
const INSIGNIAS: Insignia[] = [
  { icono: IconoEscudo, texto: 'Perdé el miedo a manejar', posicion: '-left-6 top-8', retardo: '0s' },
  { icono: IconoCheck, texto: 'Sacá tu licencia', posicion: '-right-6 top-[34%] xl:-right-14', retardo: '1.2s' },
  { icono: IconoAuto, texto: 'Autos doble comando', posicion: '-bottom-4 left-10', retardo: '2.4s' },
];

/**
 * Portada (versión D): como la B pero sin degradé. Fondo liso crema, onda de color al pie y el emblema de
 * ECOS grande y muy tenue como marca de agua a la izquierda, detrás del texto.
 */
export function HeroD() {
  return (
    <div id="inicio">
      <section className="relative flex snap-start min-h-[min(100svh,52rem)] items-center overflow-hidden bg-background pb-12 pt-28">
        {/* Emblema de ECOS como marca de agua, muy tenue, a la izquierda, detrás del texto */}
        <Image
          src="/logo-ecos-emblema.svg"
          alt=""
          aria-hidden="true"
          width={600}
          height={600}
          className="pointer-events-none absolute -left-72 top-1/2 hidden w-[36rem] -translate-y-1/2 select-none opacity-[0.08] md:block"
        />

        {/* Onda al pie de la portada: el color de la sección de cursos sube siguiendo la curva */}
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
        >
          <path
            d="M0 120L60 105C120 90 240 60 360 52.5C480 45 600 60 720 67.5C840 75 960 75 1080 67.5C1200 60 1320 45 1380 37.5L1440 30V120H0Z"
            fill="var(--fondo-cursos)"
          />
        </svg>

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:px-8">
          <div>
            <p className="animate-fade-up mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark lg:-translate-y-[4.5rem]">
              <span aria-hidden="true" className="h-4 w-0.5 bg-primary-dark" />
              Escuela de Conducción Segura
            </p>
            <h1
              className="animate-fade-up mb-5 text-3xl font-bold leading-[1.15] text-foreground sm:text-4xl lg:-translate-y-[4.5rem] lg:text-5xl"
              style={{ animationDelay: '0.1s' }}
            >
              Aprendé seguro,
              <em className="block font-medium italic text-primary-dark">llegá más lejos.</em>
            </h1>
            <ul
              className="animate-fade-up mb-7 space-y-2.5 text-base font-medium text-foreground lg:-translate-y-14"
              style={{ animationDelay: '0.2s' }}
            >
              {CONFIANZA.map((c) => (
                <li key={c} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary-dark">
                    <IconoCheck className="h-3.5 w-3.5" />
                  </span>
                  {c}
                </li>
              ))}
            </ul>

            <div className="animate-fade-up flex flex-col gap-4 sm:flex-row" style={{ animationDelay: '0.3s' }}>
              <Boton href={whatsappUrl(MENSAJES.consulta)} externo tamano="normal">
                Reservar por WhatsApp
              </Boton>
              <Boton href="#cursos" variante="contorno" tamano="normal">
                Ver cursos
                <IconoFlecha className="h-5 w-5" />
              </Boton>
            </div>
          </div>

          <div className="animate-fade-up relative lg:-translate-y-6" style={{ animationDelay: '0.25s' }}>
            {/* Marco de color desplazado: da profundidad a la foto */}
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-3xl bg-primary/40"
            />
            <Image
              src="/auto-ecos.jpg"
              alt="Auto de ECOS Escuela de Conducción Segura"
              width={876}
              height={554}
              priority
              sizes="(min-width: 1024px) 520px, 100vw"
              className="relative aspect-[16/10] max-h-[50svh] w-full -rotate-1 rounded-3xl border-4 border-white object-cover object-bottom shadow-card-hover"
            />

            {INSIGNIAS.map(({ icono: Icono, texto, posicion, retardo }) => (
              <div
                key={texto}
                className={`animate-flotar absolute ${posicion} hidden items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-card-hover md:flex`}
                style={{ animationDelay: retardo }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary-dark">
                  <Icono className="h-4 w-4" />
                </span>
                {texto}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
