import type { Metadata } from 'next';
import { Suspense } from 'react';
import { exigirPersonal } from '@/lib/auth/personal';
import { listarPedidos, type Pedido } from '@/lib/booking/pedidos';
import { formatearPesos } from '@/lib/cursos';
import { confirmarPago, reintentarAlta } from './actions';
import { avisoDe } from './avisos';
import { BotonAccion } from './BotonAccion';

export const metadata: Metadata = { title: 'Pedidos' };

const fecha = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
});

export default function Pedidos({ searchParams }: PageProps<'/panel/pedidos'>) {
  return (
    <div className="space-y-10">
      <h1 className="font-heading text-2xl font-bold text-foreground">Pedidos</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<'/panel/pedidos'>['searchParams'] }) {
  await exigirPersonal();
  const aviso = avisoDe((await searchParams).aviso);
  const { porConfirmar, sinAlta } = await listarPedidos();

  return (
    <>
      {aviso && (
        <p
          role={aviso.tipo === 'error' ? 'alert' : 'status'}
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            aviso.tipo === 'error' ? 'border-red-600/40 bg-red-50 text-red-800' : 'border-success/40 bg-green-50 text-green-900'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      <Seccion
        titulo="Por confirmar el pago"
        vacio="No hay pedidos esperando confirmación."
        pedidos={porConfirmar}
        accion={(p) => (
          <BotonAccion
            accion={confirmarPago}
            campo="enrollmentId"
            valor={p.id}
            etiqueta="Confirmar pago y dar de alta"
            confirmacion={`¿Confirmar que ${p.alumno.nombre} pagó ${formatearPesos(p.monto)}? Se le va a enviar el mail de acceso.`}
          />
        )}
      />

      <Seccion
        titulo="Pendientes de alta"
        ayuda="El pago está confirmado pero el alumno todavía no tiene usuario."
        vacio="No hay altas pendientes."
        pedidos={sinAlta}
        accion={(p) => (
          <BotonAccion
            accion={reintentarAlta}
            campo="studentId"
            valor={p.alumno.id}
            etiqueta="Dar de alta"
            confirmacion={`¿Dar de alta a ${p.alumno.nombre} y enviarle el mail de acceso?`}
          />
        )}
      />
    </>
  );
}

function Seccion({
  titulo,
  ayuda,
  vacio,
  pedidos,
  accion,
}: {
  titulo: string;
  ayuda?: string;
  vacio: string;
  pedidos: Pedido[];
  accion: (p: Pedido) => React.ReactNode;
}) {
  return (
    <section aria-labelledby={`h-${titulo}`}>
      <h2 id={`h-${titulo}`} className="font-heading text-lg font-bold text-foreground">
        {titulo} <span className="text-muted-foreground">({pedidos.length})</span>
      </h2>
      {ayuda && <p className="mb-3 text-sm text-muted-foreground">{ayuda}</p>}
      {pedidos.length === 0 ? (
        <p className="mt-3 rounded-xl bg-card p-5 text-muted-foreground shadow-card">{vacio}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {pedidos.map((p) => (
            <li key={p.id} className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-card sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1 text-sm">
                <p className="font-heading text-base font-bold text-card-foreground">
                  {p.alumno.nombre} <span className="font-normal text-muted-foreground">· Pedido {p.codigo}</span>
                </p>
                <p>
                  {p.curso} · {p.metodo === 'efectivo' ? 'Efectivo' : 'Transferencia'} ·{' '}
                  <strong>{formatearPesos(p.monto)}</strong>
                </p>
                <p className="text-muted-foreground">
                  DNI {p.alumno.dni} · {p.alumno.telefono} · {p.alumno.email}
                </p>
                <p className="text-muted-foreground">Pedido del {fecha.format(new Date(p.creado))}</p>
              </div>
              {accion(p)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
