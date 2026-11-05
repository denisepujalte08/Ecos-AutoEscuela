import type { ReactNode } from 'react';

/**
 * A diferencia del layout, el template se vuelve a montar en cada navegación: así cada pantalla del
 * panel entra con el mismo fundido hacia arriba que usa el resto del sitio.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
