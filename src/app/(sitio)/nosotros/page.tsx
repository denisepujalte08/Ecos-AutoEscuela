import type { Metadata } from 'next';
import { Aparecer } from '@/components/sitio/Aparecer';
import { EncabezadoPagina } from '@/components/sitio/EncabezadoPagina';
import { LlamadoFinal } from '@/components/sitio/LlamadoFinal';
import { Ventajas } from '@/components/sitio/Ventajas';

export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'Conocé cómo son las clases de ECOS: prácticas, de 40 minutos y con instructores profesionales.',
};

const DATOS = [
  { valor: '40 min', etiqueta: 'dura cada clase' },
  { valor: '1 por día', etiqueta: 'para practicar sin apuro' },
  { valor: '2 turnos', etiqueta: 'mañana y tarde, con instructor' },
];

export default function Nosotros() {
  return (
    <>
      <EncabezadoPagina titulo="Sobre" resaltado="ECOS">
        Somos una escuela de conducción: acá aprendés a manejar practicando de verdad, con clases cortas y frecuentes.
      </EncabezadoPagina>

      <section className="mx-auto max-w-7xl px-4 pb-20 lg:px-8">
        <ul className="grid gap-8 md:grid-cols-3">
          {DATOS.map((d, i) => (
            <li key={d.valor}>
              <Aparecer retardo={i * 0.1} className="h-full">
                <div className="h-full rounded-2xl bg-card p-8 text-center shadow-card">
                  <p className="mb-1 font-heading text-4xl font-bold text-primary">{d.valor}</p>
                  <p className="text-muted-foreground">{d.etiqueta}</p>
                </div>
              </Aparecer>
            </li>
          ))}
        </ul>
      </section>

      <section className="pantalla bg-section-alt py-10">
        <div className="mx-auto w-full max-w-3xl px-4 lg:px-8">
          <Aparecer>
            <h2 className="mb-6 text-center text-3xl font-bold text-foreground">Cómo son las clases</h2>
            <div className="space-y-4 leading-relaxed text-muted-foreground">
              <p>
                Todas las clases son prácticas y se dan en el auto de la escuela, acompañado por un instructor. Hay un
                instructor a la mañana y otro a la tarde.
              </p>
              <p>
                Cada clase dura 40 minutos y se puede tomar una sola por día, para que repases lo aprendido y avances a
                tu ritmo.
              </p>
            </div>
          </Aparecer>
        </div>
      </section>

      <Ventajas />
      <LlamadoFinal />
    </>
  );
}
