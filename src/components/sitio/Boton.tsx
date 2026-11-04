import Link from 'next/link';
import type { ReactNode } from 'react';
import { IconoWhatsApp } from './iconos';

type Variante = 'primario' | 'vidrio' | 'blanco' | 'contornoClaro';
type Tamano = 'normal' | 'grande';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primary text-on-primary hover:bg-primary-dark shadow-lg',
  vidrio: 'border-2 border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20',
  blanco: 'bg-white text-primary-dark shadow-lg hover:bg-white/90',
  contornoClaro: 'border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10',
};

const TAMANOS: Record<Tamano, string> = {
  normal: 'px-6 py-2.5 text-base',
  grande: 'px-8 py-4 text-lg',
};

type Props = {
  href: string;
  children: ReactNode;
  variante?: Variante;
  tamano?: Tamano;
  className?: string;
  /** Enlaces a otros sitios (WhatsApp) se abren en otra pestaña. */
  externo?: boolean;
};

export function Boton({ href, children, variante = 'primario', tamano = 'grande', className = '', externo = false }: Props) {
  const clases = `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]} ${className}`;
  if (externo) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={clases}>
        {variante === 'primario' && <IconoWhatsApp className="solo-b h-5 w-5" />}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={clases}>
      {children}
    </Link>
  );
}
