import { MENSAJES, SITE, whatsappUrl } from '@/lib/site';
import { Aparecer } from './Aparecer';
import { Boton } from './Boton';
import { IconoFlecha } from './iconos';

export function LlamadoFinal() {
  return (
    <section className="pantalla bg-background py-10">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
        <Aparecer>
          <div
            className="relative overflow-hidden rounded-3xl p-10 text-center md:p-12"
            style={{ background: 'var(--cta-fondo)', color: 'var(--cta-texto)' }}
          >
            <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary-foreground/10" />
            <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary-foreground/5" />

            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                ¿Listo para empezar a manejar?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg opacity-85">
                Escribinos y armamos tu plan de clases. Respondemos por WhatsApp al {SITE.whatsappVisible}.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Boton href={whatsappUrl(MENSAJES.consulta)} externo variante="blanco">
                  Reservar por WhatsApp
                  <IconoFlecha className="h-5 w-5" />
                </Boton>
                <Boton href="/cursos" variante="contornoClaro">
                  Ver cursos
                </Boton>
              </div>
            </div>
          </div>
        </Aparecer>
      </div>
    </section>
  );
}
