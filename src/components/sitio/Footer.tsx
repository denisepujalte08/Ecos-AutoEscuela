import Image from 'next/image';
import Link from 'next/link';
import { ENLACES, MENSAJES, SITE, whatsappUrl } from '@/lib/site';
import { IconoWhatsApp } from './iconos';

function Enlaces({ claseLink }: { claseLink: string }) {
  return (
    <ul className="space-y-2.5 text-sm">
      {ENLACES.map((e) => (
        <li key={e.href}>
          <Link href={e.href} className={claseLink}>
            {e.etiqueta}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Diseño A: pie oscuro como la plantilla. */
function FooterA() {
  return (
    <footer className="solo-a snap-start bg-foreground text-primary-foreground/80">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="mb-4 font-heading text-2xl font-bold text-primary-foreground">
              ECOS <span className="text-primary">Escuela de Conducción Segura</span>
            </p>
            <p className="max-w-sm text-sm leading-relaxed">
              Clases prácticas de manejo, en turnos de 40 minutos y con instructores profesionales.
            </p>
          </div>

          <div>
            <h2 className="mb-4 font-heading text-lg font-semibold text-primary-foreground">Navegación</h2>
            <Enlaces claseLink="transition-colors hover:text-primary" />
          </div>

          <div>
            <h2 className="mb-4 font-heading text-lg font-semibold text-primary-foreground">Contacto</h2>
            <a
              href={whatsappUrl(MENSAJES.consulta)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm transition-colors hover:text-primary"
            >
              <IconoWhatsApp className="h-5 w-5 flex-shrink-0 text-primary" />
              {SITE.whatsappVisible}
            </a>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/10 pt-8 text-center text-xs text-primary-foreground/50">
          © {SITE.nombreCompleto}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}

/** Diseño B: pie claro con el logo. */
function FooterB() {
  return (
    <footer className="solo-b snap-start border-t border-border bg-[#f6ede3]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-3 lg:px-8">
        <div>
          <Image src="/logo-ecos-solo.svg" alt="ECOS Escuela de Conducción Segura" width={147} height={44} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Clases prácticas de manejo, en turnos de 40 minutos y con instructores profesionales.
          </p>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold">Navegación</h2>
          <Enlaces claseLink="text-muted-foreground transition-colors hover:text-foreground" />
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

      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {SITE.nombreCompleto}. Todos los derechos reservados.
      </div>
    </footer>
  );
}

export function Footer() {
  return (
    <>
      <FooterA />
      <FooterB />
    </>
  );
}
