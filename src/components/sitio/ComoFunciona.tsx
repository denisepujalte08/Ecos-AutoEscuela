import { Aparecer } from './Aparecer';

const PASOS = [
  { titulo: 'Elegí tu curso', texto: 'De 5 o de 7 clases, según lo que necesites practicar.' },
  { titulo: 'Escribinos por WhatsApp', texto: 'Te respondemos y coordinamos los horarios que mejor te queden.' },
  { titulo: 'Confirmamos tus turnos', texto: 'Reservamos tus clases y te avisamos. Solo queda venir a manejar.' },
];

export function ComoFunciona() {
  return (
    <section className="bg-section-alt py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Aparecer className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-foreground md:text-5xl">
            Cómo <span className="text-gradient-primary">reservar</span>
          </h2>
        </Aparecer>
        <ol className="grid gap-8 md:grid-cols-3">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo}>
              <Aparecer retardo={i * 0.1} className="text-center">
                <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary font-heading text-2xl font-bold text-on-primary">
                  {i + 1}
                </span>
                <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">{paso.titulo}</h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">{paso.texto}</p>
              </Aparecer>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
