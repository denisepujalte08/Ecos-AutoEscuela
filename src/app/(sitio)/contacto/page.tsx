import type { Metadata } from 'next';
import { Aparecer } from '@/components/sitio/Aparecer';
import { Boton } from '@/components/sitio/Boton';
import { EncabezadoPagina } from '@/components/sitio/EncabezadoPagina';
import { IconoWhatsApp } from '@/components/sitio/iconos';
import { MENSAJES, SITE, whatsappUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escribinos por WhatsApp para consultar o reservar tus clases de manejo.',
};

export default function Contacto() {
  return (
    <>
      <EncabezadoPagina titulo="Hablemos por" resaltado="WhatsApp">
        Por ahora atendemos todas las consultas y reservas por WhatsApp. Escribinos y te respondemos a la brevedad.
      </EncabezadoPagina>

      <section className="mx-auto max-w-3xl px-4 pb-24 lg:px-8">
        <Aparecer>
          <div className="rounded-2xl bg-card p-10 text-center shadow-card">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <IconoWhatsApp className="h-7 w-7 text-primary" />
            </span>
            <p className="mb-8 font-heading text-3xl font-bold text-foreground">{SITE.whatsappVisible}</p>
            <Boton href={whatsappUrl(MENSAJES.consulta)} externo>
              Escribir ahora
            </Boton>
          </div>
        </Aparecer>
      </section>
    </>
  );
}
