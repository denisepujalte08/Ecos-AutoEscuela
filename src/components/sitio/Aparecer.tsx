'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Estado = 'visible' | 'oculto' | 'animado';

/**
 * Hace aparecer su contenido con un fundido hacia arriba cuando entra en pantalla
 * (el efecto que la plantilla lograba con framer-motion, sin la dependencia).
 *
 * Es a prueba de fallas: el contenido nace VISIBLE (también para quien no tiene JavaScript).
 * Solo se oculta, ya montado, lo que está más abajo de la pantalla, y se muestra al llegar a él
 * o si ya se pasó de largo.
 */
export function Aparecer({
  children,
  retardo = 0,
  className = '',
}: {
  children: ReactNode;
  /** Segundos de espera antes de animar (para escalonar tarjetas). */
  retardo?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<Estado>('visible');

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // Lo que ya está a la vista (o por encima) se queda como está.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.8) return;

    setEstado('oculto');
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting || entrada.boundingClientRect.bottom < 0) {
          setEstado('animado');
          observer.disconnect();
        }
      },
      // Arranca cuando el elemento ya está bien adentro de la pantalla (no apenas asoma), para que se vea el movimiento.
      { threshold: 0.2, rootMargin: '0px 0px -20% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clase = estado === 'oculto' ? 'opacity-0' : estado === 'animado' ? 'animate-fade-up' : '';

  return (
    <div
      ref={ref}
      className={`${clase} ${className}`}
      style={estado === 'animado' && retardo ? { animationDelay: `${retardo}s` } : undefined}
    >
      {children}
    </div>
  );
}
