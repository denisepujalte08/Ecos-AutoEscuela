import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getActiveCourses, getDescuentos } from '@/lib/booking/courses';
import { EncabezadoPagina } from '@/components/sitio/EncabezadoPagina';
import { FormularioCompra } from './FormularioCompra';

export const metadata: Metadata = {
  title: 'Comprar curso',
  description: 'Elegí tu curso de manejo, dejá tus datos y coordiná el pago por WhatsApp.',
};

export default function Comprar({ searchParams }: PageProps<'/comprar'>) {
  return (
    <section className="pb-16" style={{ background: 'var(--fondo-cursos)' }}>
      <EncabezadoPagina titulo="Comprá tu" resaltado="curso">
        Elegí el curso, dejá tus datos y coordinamos el pago.
      </EncabezadoPagina>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <Suspense fallback={<p className="text-center text-muted-foreground">Cargando…</p>}>
          <Contenido searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<'/comprar'>['searchParams'] }) {
  const { clases } = await searchParams;
  let cursos, descuentos;
  try {
    [cursos, descuentos] = await Promise.all([getActiveCourses(), getDescuentos()]);
  } catch (e) {
    console.error('No se pudo cargar /comprar:', e);
    return (
      <p role="alert" className="text-center text-muted-foreground">
        No pudimos cargar los cursos. Probá de nuevo en unos minutos o escribinos por WhatsApp.
      </p>
    );
  }

  const pedido = typeof clases === 'string' ? Number(clases) : NaN;
  const inicial = cursos.find((c) => c.clases === pedido)?.id;

  return <FormularioCompra cursos={cursos} descuentos={descuentos} cursoInicial={inicial} />;
}
