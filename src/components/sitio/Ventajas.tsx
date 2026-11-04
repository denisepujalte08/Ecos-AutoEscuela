import type { ComponentType, SVGProps } from 'react';
import { IconoAuto, IconoCalendario, IconoEscudo, IconoReloj } from './iconos';

type Ventaja = { icono: ComponentType<SVGProps<SVGSVGElement>>; titulo: string; texto: string };

const VENTAJAS: Ventaja[] = [
  {
    icono: IconoAuto,
    titulo: 'Clases prácticas',
    texto: 'Todas las clases son al volante, en el auto de la escuela.',
  },
  {
    icono: IconoReloj,
    titulo: 'Turnos de 40 minutos',
    texto: 'El tiempo justo para practicar sin cansarte.',
  },
  {
    icono: IconoCalendario,
    titulo: 'Una clase por día',
    texto: 'Elegís tus horarios y avanzás a tu ritmo, sin amontonar clases.',
  },
  {
    icono: IconoEscudo,
    titulo: 'Instructores profesionales',
    texto: 'Un instructor a la mañana y otro a la tarde, siempre con vos en el auto.',
  },
];

export function Ventajas() {
  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VENTAJAS.map(({ icono: Icono, titulo, texto }) => (
            <li
              key={titulo}
              className="flex flex-col items-center rounded-2xl bg-card p-6 text-center shadow-card transition-shadow hover:shadow-card-hover"
            >
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary-dark">
                <Icono className="h-7 w-7" />
              </span>
              <h2 className="mb-2 text-lg font-semibold">{titulo}</h2>
              <p className="text-sm leading-relaxed text-muted">{texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
