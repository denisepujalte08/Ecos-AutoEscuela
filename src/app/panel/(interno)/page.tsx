import { exigirPersonal } from '@/lib/auth/personal';

export default async function Inicio() {
  await exigirPersonal();
  return (
    <section>
      <h1 className="mb-2 font-heading text-2xl font-bold text-foreground">Panel de ECOS</h1>
      <p className="text-muted-foreground">
        Acá van a estar los pedidos pendientes y los alumnos. Por ahora, el ingreso ya funciona.
      </p>
    </section>
  );
}
