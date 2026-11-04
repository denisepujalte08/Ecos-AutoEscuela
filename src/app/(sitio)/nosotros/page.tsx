import type { Metadata } from 'next';
import { LlamadoFinal } from '@/components/sitio/LlamadoFinal';
import { MarcoImagen } from '@/components/sitio/MarcoImagen';

export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'Conocé cómo son las clases de ECOS: prácticas, de 40 minutos y con instructores profesionales.',
};

const REGLAS = [
  'Todas las clases son prácticas, en el auto de la escuela.',
  'Cada clase dura 40 minutos.',
  'Se puede tomar una sola clase por día.',
  'Hay un instructor a la mañana y otro a la tarde.',
];

export default function Nosotros() {
  return (
    <>
      <section className="bg-background pb-24 pt-36">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:px-8">
          <div>
            <h1 className="mb-6 text-5xl font-bold">Escuela de Conducción Segura</h1>
            <p className="mb-8 text-lg leading-relaxed text-muted">
              En ECOS aprendés a manejar practicando de verdad. Las clases son cortas y frecuentes, para que ganes
              confianza sin presiones.
            </p>
            <ul className="space-y-4">
              {REGLAS.map((regla) => (
                <li key={regla} className="rounded-xl border-l-4 border-primary bg-card p-4 text-sm shadow-card">
                  {regla}
                </li>
              ))}
            </ul>
          </div>
          <MarcoImagen etiqueta="el equipo / la escuela" className="aspect-[4/3] w-full" />
        </div>
      </section>
      <LlamadoFinal />
    </>
  );
}
