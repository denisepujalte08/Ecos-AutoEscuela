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
  { icono: IconoEscudo, texto: 'Perdé el miedo a manejar', posicion: '-right-6 top-8', retardo: '0s' },
  { icono: IconoCheck, texto: 'Sacá tu licencia', posicion: '-left-6 top-[34%] xl:-left-14', retardo: '1.2s' },
  { icono: IconoAuto, texto: 'Autos doble comando', posicion: '-bottom-4 right-10', retardo: '2.4s' },
];

/**
 * Portada (versión C): igual a la B, pero el lema va arriba en una sola línea y la foto queda debajo,
 * con los puntos y los botones al costado. La B (la principal, en `/`) no se toca.
 */
export function HeroC() {
  return (
    <div id="inicio">
      <section
        className="relative flex snap-start min-h-[min(100svh,52rem)] items-center overflow-hidden pb-12 pt-24"
        style={{
          background:
            'radial-gradient(circle at 85% 15%, #ffe0c2 0%, transparent 45%), linear-gradient(180deg, #fff1e3 0%, #fffaf5 100%)',
        }}
      >
        {/* Mancha de color detrás de la foto */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-32 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 lg:px-8">
          {/* Lema arriba, en una sola línea */}
          <div className="mb-8 lg:-translate-y-8">
            <p className="animate-fade-up mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">
              <span aria-hidden="true" className="h-4 w-0.5 bg-primary-dark" />
              Escuela de Conducción Segura
            </p>
            <h1
              className="animate-fade-up text-3xl font-bold leading-[1.15] text-foreground sm:text-4xl lg:whitespace-nowrap lg:text-5xl"
              style={{ animationDelay: '0.1s' }}
            >
              Aprendé seguro, <em className="font-medium italic text-primary-dark">llegá más lejos.</em>
            </h1>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div className="lg:order-2">
              <ul
                className="animate-fade-up mb-7 space-y-2.5 text-base font-medium text-foreground"
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

            <div className="animate-fade-up relative lg:order-1 lg:-translate-y-6" style={{ animationDelay: '0.25s' }}>
              {/* Marco de color desplazado: da profundidad a la foto */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -translate-x-3 translate-y-3 -rotate-2 rounded-3xl bg-primary/40"
              />
              <Image
                src="/auto-ecos.jpg"
                alt="Auto de ECOS Escuela de Conducción Segura"
                width={876}
                height={554}
                priority
                sizes="(min-width: 1024px) 520px, 100vw"
                className="relative aspect-[4/3] max-h-[46svh] w-full rotate-1 rounded-3xl border-4 border-white object-cover shadow-card-hover"
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
        </div>
      </section>
    </div>
  );
}
