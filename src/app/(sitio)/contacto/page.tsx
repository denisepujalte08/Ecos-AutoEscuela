import type { Metadata } from 'next';
import { Boton } from '@/components/sitio/Boton';
import { IconoWhatsApp } from '@/components/sitio/iconos';
import { MENSAJES, SITE, whatsappUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escribinos por WhatsApp para consultar o reservar tus clases de manejo.',
};

export default function Contacto() {
  return (
    <section className="bg-background pb-24 pt-36">
      <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
        <h1 className="mb-6 text-5xl font-bold">Contacto</h1>
        <p className="mb-10 text-lg leading-relaxed text-muted">
          Por ahora atendemos todas las consultas y reservas por WhatsApp. Escribinos y te respondemos a la brevedad.
        </p>

        <div className="rounded-2xl bg-card p-10 shadow-card">
          <p className="mb-2 text-sm font-medium text-muted">WhatsApp</p>
          <p className="mb-8 text-3xl font-bold">{SITE.whatsappVisible}</p>
          <Boton href={whatsappUrl(MENSAJES.consulta)} externo>
            <IconoWhatsApp className="h-5 w-5" />
            Escribir ahora
          </Boton>
        </div>
      </div>
    </section>
  );
}
