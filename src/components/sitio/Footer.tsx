import Image from 'next/image';
import Link from 'next/link';
import { ENLACES, MAPA_URL, MENSAJES, SITE, whatsappUrl } from '@/lib/site';
import { IconoInstagram, IconoUbicacion, IconoWhatsApp } from './iconos';

export function Footer() {
  return (
    <footer className="snap-start border-t border-border bg-[#f6ede3]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3 lg:px-8">
        <div>
          <Image src="/logo-ecos-solo.svg" alt="ECOS Escuela de Conducción Segura" width={147} height={44} />
          <p className="mt-4 font-heading text-base font-semibold italic text-primary-dark">{SITE.lema}.</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Clases prácticas de manejo con instructores profesionales.
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Navegación</h2>
          <ul className="space-y-2.5 text-sm">
            {ENLACES.map((e) => (
              <li key={e.href}>
                <Link href={e.href} className="text-muted-foreground transition-colors hover:text-foreground">
                  {e.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Contacto</h2>
          <ul className="space-y-3">
            <li>
              <a
                href={whatsappUrl(MENSAJES.consulta)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary-dark"
              >
                <IconoWhatsApp className="h-5 w-5 text-primary-dark" />
                {SITE.whatsappVisible}
              </a>
            </li>
            <li>
              <a
                href={SITE.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary-dark"
              >
                <IconoInstagram className="h-5 w-5 text-primary-dark" />
                {SITE.instagramUsuario}
              </a>
            </li>
            <li>
              <a
                href={MAPA_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Cómo llegar a ${SITE.direccion} (abre Google Maps)`}
                className="inline-flex items-start gap-2 text-sm font-medium text-foreground hover:text-primary-dark"
              >
                <IconoUbicacion strokeWidth={1.7} className="-ml-0.5 h-6 w-6 flex-shrink-0 text-primary-dark" />
                <span>
                  {SITE.direccion}
                  <span className="block text-xs font-normal text-muted-foreground">Cómo llegar</span>
                </span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© {SITE.nombreCompleto}. Todos los derechos reservados.</p>
        <Link href="/panel/login" className="underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Acceso
        </Link>
      </div>
    </footer>
  );
}
