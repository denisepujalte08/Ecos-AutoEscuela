import { CURSOS, formatearPesos } from '@/lib/cursos';
import { MENSAJES, whatsappUrl } from '@/lib/site';
import { Aparecer } from './Aparecer';
import { Boton } from './Boton';
import { IconoCheck } from './iconos';

const INCLUYE = ['Clases prácticas de 40 minutos', 'Una clase por día', 'Instructor profesional en el auto'];

const DESCUENTOS =
  'Pagás tu curso y coordinamos tus turnos por WhatsApp. Consultá por descuentos pagando en efectivo o por transferencia.';

/** Tarjetas de precios. Con `conTitulo` suma el encabezado grande (en la home). */
export function TarjetasCursos({ conTitulo = false }: { conTitulo?: boolean }) {
  return (
    <section className="py-24" style={{ background: 'var(--fondo-cursos)' }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {conTitulo ? (
          <Aparecer className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-foreground md:text-5xl">
              Elegí tu <span className="text-gradient-primary">curso</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{DESCUENTOS}</p>
          </Aparecer>
        ) : (
          <p className="mx-auto mb-16 max-w-2xl text-center text-lg text-muted-foreground">{DESCUENTOS}</p>
        )}

        <ul className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          {CURSOS.map((curso, i) => (
            <li key={curso.nombre}>
              <Aparecer retardo={i * 0.15} className="h-full">
                <div
                  className={`relative flex h-full flex-col rounded-2xl bg-card p-8 shadow-card transition-all duration-300 hover:shadow-card-hover ${
                    curso.destacado ? 'scale-[1.02] ring-2 ring-primary' : ''
                  }`}
                >
                  {curso.destacado && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary">
                      Más elegido
                    </span>
                  )}
                  <h3 className="mb-1 font-heading text-2xl font-bold text-card-foreground">{curso.nombre}</h3>
                  <p className="mb-6 text-sm text-muted-foreground">{curso.clases} clases prácticas</p>

                  <p className="mb-8 text-4xl font-bold text-primary">{formatearPesos(curso.precio)}</p>

                  <ul className="mb-8 space-y-3">
                    {INCLUYE.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm">
                        <IconoCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                        <span className="text-card-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Boton
                    href={whatsappUrl(MENSAJES.curso(curso.nombre))}
                    externo
                    className="mt-auto w-full !rounded-lg !text-base"
                  >
                    Reservar este curso
                  </Boton>
                </div>
              </Aparecer>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          El examen de manejo no está incluido en el precio.
        </p>
      </div>
    </section>
  );
}
