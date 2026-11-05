import { CURSOS, formatearPesos } from '@/lib/cursos';
import { MENSAJES, whatsappUrl } from '@/lib/site';
import { Aparecer } from './Aparecer';
import { Boton } from './Boton';
import { IconoCheck } from './iconos';

/**
 * Tarjetas de precios. `conTitulo` suma el encabezado (h2, en la home).
 * `comoPagina` lo hace el título principal (h1) de la página /cursos, con lugar para la barra fija.
 */
export function TarjetasCursos({ conTitulo = false, comoPagina = false }: { conTitulo?: boolean; comoPagina?: boolean }) {
  return (
    <section className={`pantalla py-3 ${comoPagina ? 'pt-24' : ''}`} style={{ background: 'var(--fondo-cursos)' }}>
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-8">
        {conTitulo || comoPagina ? (
          <Aparecer className="mb-6 text-center">
            {comoPagina ? (
              <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                Nuestros <span className="text-gradient-primary">cursos</span>
              </h1>
            ) : (
              <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
                Elegí tu <span className="text-gradient-primary">curso</span>
              </h2>
            )}
          </Aparecer>
        ) : null}

        <ul className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {CURSOS.map((curso, i) => (
            <li key={curso.nombre}>
              <Aparecer retardo={i * 0.15} className="h-full">
                <div
                  className={`relative flex h-full flex-col rounded-2xl bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover ${
                    curso.etiqueta ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {curso.etiqueta && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary">
                      {curso.etiqueta}
                    </span>
                  )}
                  <h3 className="mb-1 font-heading text-xl font-bold text-card-foreground">{curso.nombre}</h3>
                  <p className="mb-3 min-h-[2.5rem] text-sm leading-snug text-muted-foreground">{curso.paraQuien}</p>

                  {curso.precio === null ? (
                    <p className="mb-3 text-2xl font-bold text-primary">Consultá el precio</p>
                  ) : (
                    <p className="mb-3 text-3xl font-bold text-primary">{formatearPesos(curso.precio)}</p>
                  )}

                  <ul className="mb-4 space-y-1.5">
                    {curso.incluye.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm">
                        <IconoCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                        <span className="text-card-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  {curso.precio === null ? (
                    <Boton
                      href={whatsappUrl(MENSAJES.curso(curso.nombre))}
                      externo
                      className="mt-auto w-full !rounded-lg !py-3 !text-base"
                    >
                      Consultar este curso
                    </Boton>
                  ) : (
                    <Boton href={`/comprar?clases=${curso.clases}`} className="mt-auto w-full !rounded-lg !py-3 !text-base">
                      Comprar este curso
                    </Boton>
                  )}
                </div>
              </Aparecer>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}
