/** Textos de los avisos que se muestran después de una acción sobre un pedido. */
export type Aviso = { tipo: 'ok' | 'error'; texto: string };

const SIN_ALTA = {
  alumno_inexistente: 'No se encontró al alumno.',
  email_de_personal: 'Ese email es de una cuenta del personal: no se puede usar para un alumno. Corregí el email de la ficha.',
  no_se_pudo_invitar: 'No se pudo enviar la invitación.',
} as const;

const AVISOS: Record<string, Aviso> = {
  confirmado: { tipo: 'ok', texto: 'Pago confirmado y alumno dado de alta: le enviamos el mail de acceso.' },
  'alta-ok': { tipo: 'ok', texto: 'Alumno dado de alta: le enviamos el mail de acceso.' },
  'pedido-no-pendiente': { tipo: 'error', texto: 'Ese pedido ya no estaba pendiente. La lista está actualizada.' },
  error: { tipo: 'error', texto: 'No se pudo completar la acción. Probá de nuevo.' },
  // El pago quedó confirmado pero el alta falló: se reintenta desde "Pendientes de alta".
  ...Object.fromEntries(
    Object.entries(SIN_ALTA).map(([motivo, t]) => [
      `pago-ok-${motivo}`,
      { tipo: 'error', texto: `Pago confirmado, pero ${t[0].toLowerCase()}${t.slice(1)} Reintentá el alta desde "Pendientes de alta".` } satisfies Aviso,
    ]),
  ),
  ...Object.fromEntries(Object.entries(SIN_ALTA).map(([motivo, t]) => [`alta-${motivo}`, { tipo: 'error', texto: t } satisfies Aviso])),
};

/** Devuelve el aviso de un código, o `null` si no existe (la URL es del navegador: no se confía en ella). */
export function avisoDe(codigo: string | string[] | undefined): Aviso | null {
  return typeof codigo === 'string' && Object.hasOwn(AVISOS, codigo) ? AVISOS[codigo] : null;
}
