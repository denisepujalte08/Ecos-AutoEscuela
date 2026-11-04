import { MENSAJES, SITE, whatsappUrl } from '@/lib/site';
import { Boton } from './Boton';
import { IconoWhatsApp } from './iconos';

export function LlamadoFinal() {
  return (
    <section className="bg-background pb-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-ink p-12 text-center text-white md:p-16">
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary/20" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-primary/10" />
          <div className="relative">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">¿Listo para empezar a manejar?</h2>
            <p className="mx-auto mb-10 max-w-xl text-lg text-white/80">
              Escribinos y armamos tu plan de clases. Respondemos por WhatsApp al {SITE.whatsappVisible}.
            </p>
            <Boton href={whatsappUrl(MENSAJES.consulta)} externo>
              <IconoWhatsApp className="h-5 w-5" />
              Escribir por WhatsApp
            </Boton>
          </div>
        </div>
      </div>
    </section>
  );
}
