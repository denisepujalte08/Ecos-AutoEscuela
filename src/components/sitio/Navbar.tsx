'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ENLACES, MENSAJES, whatsappUrl } from '@/lib/site';
import { Boton } from './Boton';
import { IconoCerrar, IconoMenu, IconoWhatsApp } from './iconos';

export function Navbar() {
  const [abierto, setAbierto] = useState(false);
  const whatsapp = whatsappUrl(MENSAJES.consulta);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-borde/70 bg-background/95 backdrop-blur-lg">
      <nav aria-label="Principal" className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 lg:px-8">
        <Link href="/" aria-label="ECOS, ir al inicio" onClick={() => setAbierto(false)}>
          <Image src="/logo-ecos.svg" alt="ECOS Escuela de Conducción Segura" width={128} height={40} priority />
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {ENLACES.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="text-sm font-medium text-muted transition-colors hover:text-foreground">
                {e.etiqueta}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden lg:block">
          <Boton href={whatsapp} externo className="!py-2.5">
            <IconoWhatsApp className="h-5 w-5" />
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
        <div id="menu-movil" className="border-t border-borde bg-background lg:hidden">
          <ul className="mx-auto max-w-6xl space-y-1 px-4 py-4">
            {ENLACES.map((e) => (
              <li key={e.href}>
                <Link
                  href={e.href}
                  onClick={() => setAbierto(false)}
                  className="block py-2.5 text-base font-medium text-muted hover:text-foreground"
                >
                  {e.etiqueta}
                </Link>
              </li>
            ))}
            <li className="pt-3">
              <Boton href={whatsapp} externo className="w-full">
                <IconoWhatsApp className="h-5 w-5" />
                Reservar por WhatsApp
              </Boton>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
