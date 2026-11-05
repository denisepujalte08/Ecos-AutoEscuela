'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ENLACES, MENSAJES, whatsappUrl } from '@/lib/site';
import { Boton } from './Boton';
import { IconoCerrar, IconoMenu } from './iconos';

export function Navbar() {
  const [abierto, setAbierto] = useState(false);
  const [flotante, setFlotante] = useState(false);
  const [activo, setActivo] = useState<string>(ENLACES[0].id);
  const pathname = usePathname();
  // `false` en el servidor y durante la hidratación, `true` ya en el navegador: así el HTML coincide y
  // recién después se marca la sección activa y se ajustan los enlaces según la ruta.
  const enNavegador = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const enPruebas = enNavegador && (pathname === '/c' || pathname === '/d');
  const enInicio = enNavegador && (pathname === '/' || enPruebas);
  const resaltado = enInicio ? activo : null;
  // En las versiones de prueba de la portada (/c y /d) los enlaces se quedan en esa misma página.
  const destino = (id: string) => (enPruebas ? `${pathname}#${id}` : `/#${id}`);
  const progreso = useRef<HTMLDivElement>(null);
  const whatsapp = whatsappUrl(MENSAJES.consulta);

  // Al bajar, la barra pasa a ser una píldora flotante y una línea de color muestra cuánto se avanzó.
  useEffect(() => {
    let cuadro = 0;
    const alMover = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        setFlotante(window.scrollY > 24);
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const avance = total > 0 ? Math.min(1, window.scrollY / total) : 0;
        if (progreso.current) progreso.current.style.transform = `scaleX(${avance})`;

        // Sección en pantalla: la última cuyo borde superior ya pasó el 45% de la altura de la ventana.
        let actual: string = ENLACES[0].id;
        for (const e of ENLACES) {
          const seccion = document.getElementById(e.id);
          if (seccion && seccion.getBoundingClientRect().top <= window.innerHeight * 0.45) actual = e.id;
        }
        setActivo(actual);
      });
    };
    window.addEventListener('scroll', alMover, { passive: true });
    window.addEventListener('resize', alMover);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener('scroll', alMover);
      window.removeEventListener('resize', alMover);
    };
  }, []);

  return (
    <>
      <div
        ref={progreso}
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left scale-x-0 bg-primary"
      />

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[padding] duration-300 ${flotante ? 'px-3 pt-3 sm:px-6' : ''}`}
      >
        <div
          className={`mx-auto transition-all duration-300 ${
            flotante
              ? 'max-w-6xl rounded-2xl border border-border/60 bg-background/95 shadow-xl backdrop-blur-lg'
              : 'max-w-full border-b border-transparent bg-transparent'
          }`}
        >
          <nav
            aria-label="Principal"
            className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-[height] duration-300 lg:px-8 ${
              flotante ? 'h-14' : 'h-16'
            }`}
          >
            <Link href="/" aria-label="ECOS, ir al inicio" onClick={() => setAbierto(false)}>
              <Image src="/logo-ecos-solo.svg" alt="ECOS Escuela de Conducción Segura" width={147} height={44} priority />
            </Link>

            <ul className="hidden items-center gap-1 lg:flex">
              {ENLACES.map((e) => (
                <li key={e.href}>
                  <Link
                    href={destino(e.id)}
                    aria-current={resaltado === e.id ? 'location' : undefined}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      resaltado === e.id
                        ? 'bg-primary/15 text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {e.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden items-center gap-4 lg:flex">
              <Boton href={whatsapp} externo tamano="normal">
                Reservar por WhatsApp
              </Boton>
            </div>

            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              aria-controls="menu-movil"
              aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
              className="p-2 text-foreground lg:hidden"
            >
              {abierto ? <IconoCerrar className="h-6 w-6" /> : <IconoMenu className="h-6 w-6" />}
            </button>
          </nav>

          {abierto && (
            <div id="menu-movil" className="border-t border-border lg:hidden">
              <ul className="mx-auto max-w-7xl space-y-3 px-4 py-4">
                {ENLACES.map((e) => (
                  <li key={e.href}>
                    <Link
                      href={destino(e.id)}
                      onClick={() => setAbierto(false)}
                      aria-current={resaltado === e.id ? 'location' : undefined}
                      className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors ${
                        resaltado === e.id
                          ? 'bg-primary/15 text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {e.etiqueta}
                    </Link>
                  </li>
                ))}
                <li className="pt-2">
                  <Boton href={whatsapp} externo tamano="normal" className="w-full">
                    Reservar por WhatsApp
                  </Boton>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
