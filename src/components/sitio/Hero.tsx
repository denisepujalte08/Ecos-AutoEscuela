import Image from 'next/image';
import { MENSAJES, whatsappUrl } from '@/lib/site';
import { Boton } from './Boton';
import { IconoFlecha } from './iconos';
import { MarcoImagen } from './MarcoImagen';

/** Diseño A: como la plantilla (foto a pantalla completa, degradé y onda blanca). */
function HeroA() {
  return (
    <section className="solo-a relative flex items-center overflow-hidden py-32 md:py-40 lg:py-48">
      <div className="absolute inset-0">
        {/* PROVISORIO: foto de la plantilla. Se reemplaza por una foto real de ECOS. */}
        <Image src="/plantilla/hero.jpg" alt="Foto de portada" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 pt-20 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="animate-fade-up mb-6 text-5xl font-bold leading-tight text-primary-foreground md:text-6xl lg:text-7xl">
            Aprendé a manejar con <span className="text-primary">confianza</span>
          </h1>

          <p
            className="animate-fade-up mb-10 max-w-lg text-lg leading-relaxed text-primary-foreground/80 md:text-xl"
            style={{ animationDelay: '0.15s' }}
          >
            Clases prácticas en auto, de a una por día, con instructores que te acompañan paso a paso. Elegí tu curso
            y coordinamos tus turnos por WhatsApp.
          </p>

          <div className="animate-fade-up flex flex-col gap-4 sm:flex-row" style={{ animationDelay: '0.3s' }}>
            <Boton href={whatsappUrl(MENSAJES.consulta)} externo>
              Reservar por WhatsApp
              <IconoFlecha className="h-5 w-5" />
            </Boton>
            <Boton href="/cursos" variante="vidrio">
              Ver cursos
            </Boton>
          </div>
        </div>
      </div>

      {/* Onda blanca que une la foto con el resto de la página */}
      <div className="absolute inset-x-0 bottom-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" aria-hidden="true">
          <path
            d="M0 120L60 105C120 90 240 60 360 52.5C480 45 600 60 720 67.5C840 75 960 75 1080 67.5C1200 60 1320 45 1380 37.5L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="var(--color-background)"
          />
        </svg>
      </div>
    </section>
  );
}

/** Diseño B: portada oscura dividida en dos, con marco para la foto. */
function HeroB() {
  return (
    <section className="solo-b relative overflow-hidden bg-secondary pb-24 pt-36 text-white md:pb-32 md:pt-44">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="mb-5 inline-block rounded-full bg-primary/15 px-4 py-1.5 text-sm font-semibold text-primary">
            Escuela de Conducción Segura
          </p>
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
            Aprendé a manejar con <span className="text-primary">confianza</span>
          </h1>
          <p className="mb-10 max-w-lg text-lg leading-relaxed text-white/80">
            Clases prácticas en auto, de a una por día, con instructores que te acompañan paso a paso. Elegí tu curso
            y coordinamos tus turnos por WhatsApp.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Boton href={whatsappUrl(MENSAJES.consulta)} externo>
              Reservar por WhatsApp
            </Boton>
            <Boton href="/cursos" variante="vidrio">
              Ver cursos
              <IconoFlecha className="h-5 w-5" />
            </Boton>
          </div>
        </div>

        <MarcoImagen
          etiqueta="auto de ECOS / alumno al volante"
          className="aspect-[4/3] w-full !border-white/20 !bg-white/5 !text-white/60"
        />
      </div>
    </section>
  );
}

export function Hero() {
  return (
    <>
      <HeroA />
      <HeroB />
    </>
  );
}
