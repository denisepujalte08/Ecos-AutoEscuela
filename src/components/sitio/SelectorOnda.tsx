'use client';

import { useEffect, useSyncExternalStore } from 'react';

type Onda = 'con' | 'sin';

const OPCIONES: { id: Onda; etiqueta: string }[] = [
  { id: 'sin', etiqueta: 'Sin onda' },
  { id: 'con', etiqueta: 'Con onda' },
];

/** La opción vigente vive en el atributo data-onda de <html> (CSS: `.onda-hero` en globals.css). */
function suscribir(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-onda'] });
  return () => observador.disconnect();
}

const leer = (): Onda => (document.documentElement.getAttribute('data-onda') === 'sin' ? 'sin' : 'con');
const leerEnServidor = (): Onda => 'con';

function elegir(o: Onda) {
  document.documentElement.setAttribute('data-onda', o);
}

/**
 * SOLO PARA ELEGIR CON EL CLIENTE (página principal): deslizador para ver la portada sin la onda o con la onda.
 * Cuando se decida, se borra este componente, su uso en `app/(sitio)/page.tsx`, la regla
 * `.onda-hero` de globals.css, y se deja (o se quita) la onda en HeroB.tsx.
 */
export function SelectorOnda() {
  const actual = useSyncExternalStore(suscribir, leer, leerEnServidor);

  // Al salir de la página se limpia, para que no afecte a otras.
  useEffect(() => () => document.documentElement.removeAttribute('data-onda'), []);

  return (
    <div
      role="radiogroup"
      aria-label="Elegir portada"
      className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 rounded-full bg-black/85 p-1 text-sm font-semibold text-white shadow-2xl backdrop-blur"
    >
      {/* Deslizador: la pastilla se mueve detrás de la opción elegida. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white transition-transform duration-300 ease-out"
        style={{ transform: actual === 'con' ? 'translateX(100%)' : 'translateX(0)' }}
      />
      {OPCIONES.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={actual === o.id}
          onClick={() => elegir(o.id)}
          className={`relative z-10 w-28 rounded-full px-4 py-2 transition-colors duration-300 ${
            actual === o.id ? 'text-black' : 'text-white/80 hover:text-white'
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
