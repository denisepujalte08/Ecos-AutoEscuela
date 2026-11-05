import type { ReactNode } from 'react';

/** Se vuelve a montar en cada navegación: cada pantalla entra con el mismo fundido que el resto del sitio. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
