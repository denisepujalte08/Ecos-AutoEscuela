import Image from 'next/image';
import { MENSAJES, whatsappUrl } from '@/lib/site';
import { Boton } from './Boton';
import { IconoFlecha } from './iconos';
import { MarcoImagen } from './MarcoImagen';

/** Diseño A: como la plantilla (foto a pantalla completa, degradé y onda blanca). */
function HeroA() {
  return (
    <section className="solo-a relative flex min-h-[min(100svh,52rem)] items-center overflow-hidden pb-24 pt-20">
      <div className="absolute inset-0">
        {/* PROVISORIO: foto de la plantilla. Se reemplaza por una foto real de ECOS. */}
        <Image src="/plantilla/hero.jpg" alt="Foto de portada" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="animate-fade-up mb-5 text-4xl font-bold leading-tight text-primary-foreground sm:text-5xl lg:text-6xl">
            Aprendé a manejar con <span className="text-primary">confianza</span>
          </h1>

          <p
            className="animate-fade-up mb-8 max-w-lg text-lg leading-relaxed text-primary-foreground/80"
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

/** Diseño B: portada clara dividida en dos, con marco para la foto. */
function HeroB() {
  return (
    <section
      className="solo-b relative flex min-h-[min(100svh,52rem)] items-center overflow-hidden pb-12 pt-28"
      style={{ background: 'linear-gradient(180deg, #fff1e3 0%, #fffaf5 100%)' }}
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="mb-5 inline-block rounded-full bg-primary/15 px-4 py-1.5 text-sm font-semibold text-primary-dark">
            Escuela de Conducción Segura
          </p>
          <h1 className="mb-5 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            Aprendé a manejar con <span className="text-primary">confianza</span>
          </h1>
          <p className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Clases prácticas en auto, de a una por día, con instructores que te acompañan paso a paso. Elegí tu curso
            y coordinamos tus turnos por WhatsApp.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Boton href={whatsappUrl(MENSAJES.consulta)} externo>
              Reservar por WhatsApp
            </Boton>
            <Boton href="/cursos" variante="contorno">
              Ver cursos
              <IconoFlecha className="h-5 w-5" />
            </Boton>
          </div>
        </div>

        <MarcoImagen etiqueta="auto de ECOS / alumno al volante" className="aspect-[4/3] max-h-[55svh] w-full" />
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
