'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * Enlace al inicio de la landing (el logo). Desde otra página, navega a `/#inicio`. Desde la propia
 * landing sube a la sección de inicio aunque la URL ya diga `#inicio` (ahí `Link` no vuelve a desplazar).
 * Si la persona pidió menos movimiento, sube sin animación.
 */
export function EnlaceInicio({ onClick, ...props }: Omit<ComponentProps<typeof Link>, 'href'>) {
  return (
    <Link
      {...props}
      href="/#inicio"
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || window.location.pathname !== '/') return;
        const inicio = document.getElementById('inicio');
        if (!inicio) return;
        e.preventDefault();
        const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        inicio.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'start' });
        window.history.replaceState(null, '', '/#inicio');
      }}
    />
  );
}
