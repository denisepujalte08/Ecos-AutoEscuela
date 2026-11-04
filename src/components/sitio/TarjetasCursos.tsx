import { CURSOS, formatearPesos } from '@/lib/cursos';
import { MENSAJES, whatsappUrl } from '@/lib/site';
import { Boton } from './Boton';
import { IconoCheck, IconoWhatsApp } from './iconos';

const INCLUYE = ['Clases prácticas de 40 minutos', 'Una clase por día', 'Instructor profesional en el auto'];

export function TarjetasCursos({ titulo = 'Elegí tu curso' }: { titulo?: string }) {
  return (
    <section className="bg-crema py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">{titulo}</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted">
            Pagás tu curso y coordinamos tus turnos por WhatsApp. Consultá por descuentos pagando en efectivo o por
            transferencia.
          </p>
        </div>

        <ul className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {CURSOS.map((curso) => (
            <li
              key={curso.nombre}
              className={`relative flex flex-col rounded-2xl bg-card p-8 shadow-card transition-shadow hover:shadow-card-hover ${
                curso.destacado ? 'ring-2 ring-primary' : ''
              }`}
            >
              {curso.destacado && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-ink">
                  Más elegido
                </span>
              )}
              <h3 className="mb-1 text-2xl font-bold">{curso.nombre}</h3>
              <p className="mb-6 text-sm text-muted">{curso.clases} clases prácticas</p>
              <p className="mb-8 text-4xl font-bold">{formatearPesos(curso.precio)}</p>

              <ul className="mb-8 space-y-3">
                {INCLUYE.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <IconoCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Boton href={whatsappUrl(MENSAJES.curso(curso.nombre))} externo className="mt-auto w-full">
                <IconoWhatsApp className="h-5 w-5" />
                Reservar este curso
              </Boton>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-sm text-muted">El examen de manejo no está incluido en el precio.</p>
      </div>
    </section>
  );
}
