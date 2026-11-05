import Link from 'next/link';
import { exigirPersonal } from '@/lib/auth/personal';
import { listarPedidos } from '@/lib/booking/pedidos';

export default async function Inicio() {
  await exigirPersonal();
  const { porConfirmar, sinAlta } = await listarPedidos();

  return (
    <section>
      <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">Panel de ECOS</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        <Tarjeta cantidad={porConfirmar.length} etiqueta="pedidos por confirmar el pago" />
        <Tarjeta cantidad={sinAlta.length} etiqueta="alumnos pendientes de alta" />
      </ul>
    </section>
  );
}

function Tarjeta({ cantidad, etiqueta }: { cantidad: number; etiqueta: string }) {
  return (
    <li>
      <Link
        href="/panel/pedidos"
        className="block rounded-xl bg-card p-5 shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="font-heading text-3xl font-bold text-primary">{cantidad}</span>
        <span className="block text-sm text-muted-foreground">{etiqueta}</span>
      </Link>
    </li>
  );
}
