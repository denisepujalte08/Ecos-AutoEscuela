import 'server-only';
import { createSessionClient, type SessionClient } from '@/lib/auth/session';

/** Un pedido de compra tal como lo ve el personal. */
export type Pedido = {
  id: string;
  /** Código corto que la persona recibe al hacer el pedido (por WhatsApp). */
  codigo: string;
  creado: string;
  curso: string;
  metodo: string;
  monto: number;
  alumno: { id: string; nombre: string; dni: string; telefono: string; email: string };
};

export type Pedidos = {
  /** Pedidos esperando que el personal confirme el pago. */
  porConfirmar: Pedido[];
  /** Pago confirmado pero el alumno todavía no tiene usuario (el mail no salió o falta dar el alta). */
  sinAlta: Pedido[];
};

const CAMPOS =
  'id, created_at, metodo, monto, estado, courses(nombre), students!inner(id, nombre_completo, dni, telefono, email, user_id)';

/**
 * Pedidos que requieren una acción del personal. Se leen con la sesión de la persona (no con
 * `service_role`): la base (RLS) decide qué puede ver. Los más viejos primero: se atienden en orden.
 */
export async function listarPedidos(clientOpcional?: SessionClient): Promise<Pedidos> {
  const client = clientOpcional ?? (await createSessionClient());

  const [pendientes, activos] = await Promise.all([
    client.from('enrollments').select(CAMPOS).eq('estado', 'pending_review').order('created_at', { ascending: true }),
    client
      .from('enrollments')
      .select(CAMPOS)
      .eq('estado', 'active')
      .is('students.user_id', null)
      .order('created_at', { ascending: true }),
  ]);
  if (pendientes.error) throw new Error(`No se pudieron leer los pedidos: ${pendientes.error.message}`);
  if (activos.error) throw new Error(`No se pudieron leer los pedidos sin alta: ${activos.error.message}`);

  return { porConfirmar: (pendientes.data ?? []).map(aPedido), sinAlta: (activos.data ?? []).map(aPedido) };
}

// Forma de la fila que devuelve la consulta de arriba (inscripción + curso + alumno).
type Fila = {
  id: string;
  created_at: string;
  metodo: string;
  monto: number | string;
  courses: { nombre: string } | null;
  students: { id: string; nombre_completo: string; dni: string; telefono: string; email: string };
};

function aPedido(f: Fila): Pedido {
  return {
    id: f.id,
    codigo: f.id.slice(0, 8).toUpperCase(),
    creado: f.created_at,
    curso: f.courses?.nombre ?? 'Curso',
    metodo: f.metodo,
    monto: Number(f.monto),
    alumno: {
      id: f.students.id,
      nombre: f.students.nombre_completo,
      dni: f.students.dni,
      telefono: f.students.telefono,
      email: f.students.email,
    },
  };
}
