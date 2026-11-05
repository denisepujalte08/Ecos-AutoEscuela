import Link from 'next/link';
import { Suspense } from 'react';
import { exigirAlumno, fichaCompleta } from '@/lib/auth/alumno';
import { conMayuscula, hoyEnArgentina, rotuloFecha } from '@/lib/calendario/fechas';
import { clasesDelAlumno, inscripcionPorAgendar, type ClaseDelAlumno } from '@/lib/booking/turnos';
import { MENSAJES, whatsappUrl } from '@/lib/site';
import { FormularioFicha } from './FormularioFicha';

const AVISOS: Record<string, string> = {
  'turnos-ok': '¡Listo! Tus turnos quedaron reservados.',
};

export default function Cuenta({ searchParams }: PageProps<'/cuenta'>) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<'/cuenta'>['searchParams'] }) {
  const alumno = await exigirAlumno();
  const hoy = hoyEnArgentina();
  const { aviso } = await searchParams;
  const textoAviso = typeof aviso === 'string' && Object.hasOwn(AVISOS, aviso) ? AVISOS[aviso] : null;

  const completa = fichaCompleta(alumno, hoy);
  const [porAgendar, clases] = await Promise.all([inscripcionPorAgendar(alumno.id), clasesDelAlumno()]);
  const primerNombre = alumno.nombre.split(' ')[0];

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-bold text-foreground">Hola, {primerNombre}</h1>

      {textoAviso && (
        <p role="status" className="rounded-lg border border-success/40 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
          {textoAviso}
        </p>
      )}

      {!completa && (
        <section className="rounded-2xl bg-card p-6 shadow-card" aria-labelledby="h-ficha">
          <h2 id="h-ficha" className="font-heading text-lg font-bold">Completá tus datos</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Los necesitamos antes de que elijas tus turnos.</p>
          <FormularioFicha hoy={hoy} />
        </section>
      )}

      {completa && porAgendar && (
        <section className="rounded-2xl bg-card p-6 shadow-card" aria-labelledby="h-elegir">
          <h2 id="h-elegir" className="font-heading text-lg font-bold">Elegí tus turnos</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Tu {porAgendar.curso.toLowerCase()} ya está pago. Elegí tus {porAgendar.clases} clases, de una vez.
          </p>
          <Link
            href="/cuenta/turnos"
            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-2.5 text-base font-semibold text-on-primary shadow-lg transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Elegir mis turnos
          </Link>
        </section>
      )}

      {clases.length > 0 && <MisClases clases={clases} hoy={hoy} />}

      {completa && !porAgendar && clases.length === 0 && (
        <p className="rounded-2xl bg-card p-6 text-muted-foreground shadow-card">
          Todavía no tenés un curso activo. Si ya pagaste, escribinos por{' '}
          <a href={whatsappUrl(MENSAJES.consulta)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-dark underline">
            WhatsApp
          </a>
          .
        </p>
      )}
    </div>
  );
}

function MisClases({ clases, hoy }: { clases: ClaseDelAlumno[]; hoy: string }) {
  return (
    <section aria-labelledby="h-clases">
      <h2 id="h-clases" className="mb-3 font-heading text-lg font-bold">Tus clases</h2>
      <ul className="space-y-2">
        {clases.map((c) => {
          const pasada = c.estado === 'done' || c.estado === 'no_show' || c.fecha < hoy;
          return (
            <li key={c.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-4 py-3 shadow-card ${pasada ? 'opacity-70' : ''}`}>
              <div>
                <p className="font-semibold">{conMayuscula(rotuloFecha(c.fecha))}</p>
                <p className="text-sm text-muted-foreground">{c.hora} hs</p>
              </div>
              <p className="text-sm font-medium">
                {c.nro && c.total ? `Clase ${c.nro} de ${c.total}` : 'Clase'}
                {c.estado === 'done' && ' · dada'}
                {c.estado === 'no_show' && ' · ausente'}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
