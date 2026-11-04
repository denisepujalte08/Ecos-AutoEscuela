import { MENSAJES, whatsappUrl } from '@/lib/site';
import { Boton } from './Boton';
import { IconoFlecha, IconoWhatsApp } from './iconos';
import { MarcoImagen } from './MarcoImagen';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink pb-24 pt-36 text-white md:pb-32 md:pt-44">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="mb-5 inline-block rounded-full bg-primary/15 px-4 py-1.5 text-sm font-semibold text-primary">
            Escuela de Conducción Segura
          </p>
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-6xl">
            Aprendé a manejar con <span className="text-primary">confianza</span>
          </h1>
          <p className="mb-10 max-w-lg text-lg leading-relaxed text-white/80">
            Clases prácticas en auto, de a una por día, con instructores que te acompañan paso a paso. Elegí tu
            curso y coordinamos tus turnos por WhatsApp.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Boton href={whatsappUrl(MENSAJES.consulta)} externo>
              <IconoWhatsApp className="h-5 w-5" />
              Reservar por WhatsApp
            </Boton>
            <Boton href="/cursos" variante="contornoClaro">
              Ver cursos
              <IconoFlecha className="h-5 w-5" />
            </Boton>
          </div>
        </div>

        <MarcoImagen etiqueta="auto de ECOS / alumno al volante" className="aspect-[4/3] w-full !border-white/20 !bg-white/5 !text-white/60" />
      </div>
    </section>
  );
}
