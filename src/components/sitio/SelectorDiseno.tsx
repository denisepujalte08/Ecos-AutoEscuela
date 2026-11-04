'use client';

import { useSyncExternalStore } from 'react';

type Diseno = 'a' | 'b';

const CLAVE = 'ecos-diseno';

const OPCIONES: { id: Diseno; etiqueta: string }[] = [
  { id: 'a', etiqueta: 'Diseño A' },
  { id: 'b', etiqueta: 'Diseño B' },
];

/** El diseño vigente vive en el atributo data-diseno de <html>: lo leemos de ahí. */
function suscribir(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-diseno'] });
  return () => observador.disconnect();
}

const leer = (): Diseno => (document.documentElement.getAttribute('data-diseno') === 'b' ? 'b' : 'a');
const leerEnServidor = (): Diseno => 'a';

function elegir(d: Diseno) {
  document.documentElement.setAttribute('data-diseno', d);
  try {
    localStorage.setItem(CLAVE, d);
  } catch {
    // Sin almacenamiento: el cambio vale igual hasta recargar.
  }
}

/**
 * SOLO PARA MOSTRAR AL CLIENTE: deslizador para pasar de un diseño al otro.
 * Cuando el cliente elija, se borra este componente, el diseño que no gane y el script de layout.tsx.
 */
export function SelectorDiseno() {
  const actual = useSyncExternalStore(suscribir, leer, leerEnServidor);

  return (
    <div
      role="radiogroup"
      aria-label="Elegir diseño"
      className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 rounded-full bg-black/85 p-1 text-sm font-semibold text-white shadow-2xl backdrop-blur"
    >
      {/* Deslizador: la pastilla se mueve detrás de la opción elegida. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white transition-transform duration-300 ease-out"
        style={{ transform: actual === 'b' ? 'translateX(100%)' : 'translateX(0)' }}
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
