import Link from 'next/link';
import type { ReactNode } from 'react';

type Variante = 'primario' | 'oscuro' | 'contorno' | 'contornoClaro';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

// Texto oscuro sobre el naranja: es lo que mejor contraste da y respeta el logo.
const VARIANTES: Record<Variante, string> = {
  primario: 'bg-primary text-ink hover:bg-primary-dark shadow-lg shadow-primary/20',
  oscuro: 'bg-ink text-white hover:bg-black',
  contorno: 'border-2 border-ink/20 text-foreground hover:bg-crema',
  contornoClaro: 'border-2 border-white/40 text-white hover:bg-white/10',
};

type Props = {
  href: string;
  children: ReactNode;
  variante?: Variante;
  className?: string;
  /** Enlaces a otros sitios (WhatsApp) se abren en otra pestaña. */
  externo?: boolean;
};

export function Boton({ href, children, variante = 'primario', className = '', externo = false }: Props) {
  const clases = `${BASE} ${VARIANTES[variante]} ${className}`;
  if (externo) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={clases}>
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
