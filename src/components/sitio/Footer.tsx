import Image from 'next/image';
import Link from 'next/link';
import { ENLACES, MENSAJES, SITE, whatsappUrl } from '@/lib/site';
import { IconoWhatsApp } from './iconos';

export function Footer() {
  return (
    <footer className="border-t border-borde bg-crema">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3 lg:px-8">
        <div>
          <Image src="/logo-ecos.svg" alt="ECOS Escuela de Conducción Segura" width={128} height={40} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Clases prácticas de manejo, en turnos de 40 minutos y con instructores profesionales.
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Navegación</h2>
          <ul className="space-y-2.5 text-sm">
            {ENLACES.map((e) => (
              <li key={e.href}>
                <Link href={e.href} className="text-muted transition-colors hover:text-foreground">
                  {e.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Contacto</h2>
          <a
            href={whatsappUrl(MENSAJES.consulta)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary-dark"
          >
            <IconoWhatsApp className="h-5 w-5 text-primary-dark" />
            {SITE.whatsappVisible}
          </a>
        </div>
      </div>

      <div className="border-t border-borde py-6 text-center text-xs text-muted">
        © {SITE.nombreCompleto}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
