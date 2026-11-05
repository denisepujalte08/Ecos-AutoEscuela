# Pedidos y alta de alumnos (panel del personal)

Pantalla `/panel/pedidos` (solo personal). Cubre los pasos 2 y 3 del flujo de `docs/08-compra-web.md`.

## Qué hace

- **Por confirmar el pago:** pedidos hechos desde la web (`pending_review`), del más viejo al más nuevo. El botón **"Confirmar pago y dar de alta"** hace dos cosas en orden:
  1. Confirma el pago (`confirm_payment`): la inscripción pasa a `active`.
  2. Da de alta al alumno: crea su usuario, le manda el mail de acceso y lo vincula con su ficha (`students.user_id`).
- **Pendientes de alta:** pago ya confirmado pero sin usuario (el mail no salió, etc.). Botón **"Dar de alta"** para reintentar. El pago **nunca se deshace** si el alta falla.
- Pide confirmación antes de actuar y muestra el resultado con un aviso. Los avisos salen de una lista fija de textos (`avisos.ts`); la URL solo lleva un código.

## Seguridad

- Cada Server Action empieza con `exigirPersonal()`; las acciones se pueden llamar con una petición directa.
- La lista se lee con la sesión de la persona (RLS), no con `service_role`. Solo las acciones (ya autorizadas) usan `service_role`.
- Un alumno **nunca se vincula a una cuenta del personal**, aunque tengan el mismo email (probado). Cuentas de alumno ya existentes (alumno que vuelve) sí se reutilizan.
- Repetir el alta es seguro: si el alumno ya tiene usuario, no hace nada.

## Mail de acceso

- Plantilla en castellano: `supabase/templates/invite.html` (configurada en `supabase/config.toml`). Para verla en local hay que reiniciar Supabase (`npm run db:stop` y `npm run db:start`); si ya estaba encendida, `db:start` no recarga la configuración. Los mails locales se ven en `http://127.0.0.1:54324`.
- **Supuesto (a confirmar con el cliente, pregunta 31):** el alumno entra con un link por mail, **sin contraseña**. Por eso el mail dice "Entrar a mi cuenta" y no "Crear mi contraseña". Más adelante, para volver a entrar, pondrá su email y recibirá un link nuevo.
- El link del mail lleva a `/auth/confirmar` y de ahí a la cuenta del alumno (`docs/12-panel-alumno.md`).
- **Pendiente para publicar:** servicio de envío de mails propio (Resend u otro, configurado como SMTP de Supabase). El de prueba de Supabase tiene un límite muy bajo y no sirve para producción.

## No incluido todavía

- Cancelar o rechazar un pedido (hoy un pedido sin pagar queda en la lista; ver pregunta 63 de `03-preguntas-pendientes.md`).
- Reprogramar turnos desde la cuenta del alumno (`docs/12-panel-alumno.md`).
- Recordatorios de clases (`04-roadmap.md`, punto 7; pregunta 43: ¿mail o WhatsApp?).
