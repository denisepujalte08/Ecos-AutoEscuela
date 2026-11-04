import type { ReactNode } from 'react';

/** Título centrado de las páginas interiores (mismo arranque que la plantilla). */
export function EncabezadoPagina({ titulo, resaltado, children }: { titulo: string; resaltado: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-28 text-center lg:px-8">
      <h1 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
        {titulo} <span className="text-gradient-primary">{resaltado}</span>
      </h1>
      <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{children}</p>
    </div>
  );
}
