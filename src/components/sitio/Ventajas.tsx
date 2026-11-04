import type { ComponentType, SVGProps } from 'react';
import { Aparecer } from './Aparecer';
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
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {VENTAJAS.map(({ icono: Icono, titulo, texto }, i) => (
            <li key={titulo}>
              <Aparecer retardo={i * 0.1} className="h-full">
                <div className="flex h-full flex-col items-center rounded-2xl bg-card p-6 text-center shadow-card transition-shadow hover:shadow-card-hover">
                  <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Icono className="h-7 w-7 text-primary" />
                  </span>
                  <h2 className="mb-2 font-heading text-lg font-semibold text-card-foreground">{titulo}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{texto}</p>
                </div>
              </Aparecer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
