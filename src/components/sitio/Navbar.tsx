'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ENLACES, MENSAJES, SITE, whatsappUrl } from '@/lib/site';
import { Boton } from './Boton';
import { IconoCerrar, IconoMenu, IconoTelefono } from './iconos';

export function Navbar() {
  const [abierto, setAbierto] = useState(false);
  const [flotante, setFlotante] = useState(false);
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
              ? 'max-w-6xl rounded-2xl border border-border/60 bg-background/90 shadow-xl backdrop-blur-lg [[data-diseno=b]_&]:bg-background/95'
              : 'max-w-full border-b border-border/50 bg-background/80 backdrop-blur-lg [[data-diseno=b]_&]:bg-background/95'
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

            <ul className="hidden items-center gap-8 lg:flex">
              {ENLACES.map((e) => (
                <li key={e.href}>
                  <Link
                    href={e.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {e.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden items-center gap-4 lg:flex">
              <a
                href={`tel:+${SITE.whatsappNumero}`}
                className="solo-a flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <IconoTelefono className="h-4 w-4" />
                {SITE.whatsappVisible}
              </a>
              <Boton href={whatsapp} externo tamano="normal">
                <span className="solo-a">Reservar</span>
                <span className="solo-b">Reservar por WhatsApp</span>
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
                      href={e.href}
                      onClick={() => setAbierto(false)}
                      className="block py-2 text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
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
