# Reserva desde la web (sin pago online)

Etapa actual: por pedido del cliente, **el pago se coordina por WhatsApp**. La web permite reservar los turnos de un curso; el personal confirma y cobra por fuera. Los pagos online (Mercado Pago, ver `02-pagos.md`) vienen después.

## Flujo

1. La persona elige un curso (los activos de la base) y sus turnos (uno por día).
2. Deja **nombre y teléfono** (email opcional).
3. El servidor llama a `create_web_reservation`: crea (o reutiliza) al alumno y **retiene todos los turnos** en una sola transacción.
4. La reserva queda **pendiente de revisión** y los turnos retenidos **24 horas** (`hold_minutes_manual` en `settings`).
5. Se la deriva a WhatsApp con un mensaje armado. El personal confirma (`confirm_enrollment`) o la cancela; si no, los turnos se liberan solos al vencer.

## Piezas

| Pieza | Dónde |
|---|---|
| Medio de pago "a coordinar" (sin descuento) | migraciones `20261105000006` y `…07` |
| Función SQL `create_web_reservation` | `supabase/migrations/20261105000007_reserva_web.sql` |
| Tests de la base | `supabase/tests/database/reserva_web.test.sql` |
| Reserva desde el servidor | `src/lib/booking/reserva.ts` (`reservarDesdeWeb`) |
| Cursos activos desde la base | `src/lib/booking/courses.ts` (`getActiveCourses`) |
| Códigos de error de negocio | `src/lib/booking/errors.ts` |

## Decisiones y supuestos

- **Datos del alumno.** Se piden solo nombre y teléfono. DNI, fecha de nacimiento y email pasaron a ser **opcionales** en `students`; se completan después, en la escuela, en la ficha del alumno. El DNI sigue siendo único cuando existe.
- **Medio de pago.** "a coordinar" no aplica descuento: se cobra el precio de lista hasta que el personal defina el medio real. Los descuentos de transferencia (10 %) y efectivo (15 %) siguen siendo un **supuesto** (`03-preguntas-pendientes.md`). Cambiar el medio y recalcular el monto al confirmar queda para el PR del panel.
- **Retención.** 24 horas, también un **supuesto** (pregunta 15): se cambia en `settings`, sin tocar código.
- **El monto nunca viene del navegador**: lo calcula la base desde el precio de lista.
- **Curso de 10 clases.** Está inactivo (sin precio), por lo que no se puede reservar hasta que el cliente pase el precio y se active.

## Protección contra abuso

Una reserva retiene turnos que otras personas no pueden tomar, así que es un blanco fácil. Medidas actuales:

- **Una sola reserva pendiente por teléfono**: sin esto, cualquiera podría retener todos los turnos con datos falsos. Las retenciones vencen solas (24 h).
- La función solo se ejecuta con `service_role` (desde el servidor); el público y los usuarios con sesión no pueden llamarla directo (hay tests).
- Nombre, teléfono y email se validan en el servidor (Zod) y de nuevo en la base.

**Limitación conocida:** el teléfono se compara por sus dígitos; quien escriba el mismo número con otro formato (con o sin "+54 9", con o sin "15") se cuenta como otra persona. Para cerrarlo hace falta, antes de publicar, un límite por IP y/o un control anti-robots (Vercel Firewall o Cloudflare Turnstile). Ver `05-seguridad.md`.

## Códigos de error (mensaje de Postgres)

`invalid_name`, `invalid_phone`, `invalid_email`, `too_many_pending`, más los de `create_enrollment`: `course_not_found`, `wrong_lesson_count`, `duplicate_slots`, `slot_unavailable`, `slot_taken`, `student_day_conflict`. `BookingError` expone `isDataProblem` (corregir datos) e `isSlotProblem` (elegir otro horario).
