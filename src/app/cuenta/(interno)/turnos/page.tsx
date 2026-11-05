import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { exigirAlumno, fichaCompleta } from '@/lib/auth/alumno';
import { inscripcionPorAgendar, turnosLibres } from '@/lib/booking/turnos';
import { ElegirTurnos } from './ElegirTurnos';

export const metadata: Metadata = { title: 'Elegir mis turnos' };

export default function Turnos() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const alumno = await exigirAlumno();
  // Sin la ficha completa o sin un curso pago por agendar no hay nada para elegir acá.
  if (!fichaCompleta(alumno)) redirect('/cuenta');
  const inscripcion = await inscripcionPorAgendar(alumno.id);
  if (!inscripcion) redirect('/cuenta');

  const dias = await turnosLibres();
  return <ElegirTurnos curso={inscripcion.curso} clases={inscripcion.clases} dias={dias} />;
}
