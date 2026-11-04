const PASOS = [
  { titulo: 'Elegí tu curso', texto: 'De 5 o de 7 clases, según lo que necesites practicar.' },
  { titulo: 'Escribinos por WhatsApp', texto: 'Te respondemos y coordinamos los horarios que mejor te queden.' },
  { titulo: 'Confirmamos tus turnos', texto: 'Reservamos tus clases y te avisamos. Solo queda venir a manejar.' },
];

export function ComoFunciona() {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <h2 className="mb-16 text-center text-4xl font-bold md:text-5xl">Cómo reservar</h2>
        <ol className="grid gap-8 md:grid-cols-3">
          {PASOS.map((paso, i) => (
            <li key={paso.titulo} className="text-center">
              <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-ink">
                {i + 1}
              </span>
              <h3 className="mb-2 text-xl font-semibold">{paso.titulo}</h3>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
