# Compra del curso desde la web (sin pago online)

Etapa actual: por pedido del cliente, **el pago se coordina por WhatsApp**. La web recibe el pedido de compra; el personal confirma el pago; recién entonces el alumno elige sus turnos. Los pagos online (Mercado Pago, ver `02-pagos.md`) vienen después.

> **Pendiente de confirmar con el cliente (pregunta 15, bloqueante):** este flujo ("pagar primero, elegir turnos después") es la opinión de Denise. El cliente todavía no respondió si en transferencia y efectivo el alumno elige el turno al reservar o después de que se confirme el pago. El diseño no retiene turnos sin pago; si el cliente prefiere lo contrario, hay que revisarlo.

## Flujo

1. **Pedido.** La persona elige un curso y el medio de pago (efectivo o transferencia) y deja nombre, teléfono, DNI y email. Se crea una inscripción `pending_review` **sin turnos**, y se la manda a WhatsApp con un resumen.
2. **Pago** por fuera, como se hace hoy a mano.
3. **Confirmación.** El personal confirma el pago (`confirm_payment`): la inscripción pasa a `active`. Se da de alta al alumno en el sistema (usuario) y se le avisa por mail.
4. **Turnos.** El alumno entra a su panel y elige todos los turnos del curso de una vez (`schedule_enrollment`). Las clases quedan `scheduled` directo: ya está pago, no hay retención.
5. **Reprogramación.** El alumno puede cambiar sus turnos desde su usuario, con reglas configurables en `settings` (supuestos, ver abajo).

```
pending_review ──confirm_payment──▶ active ──schedule_enrollment──▶ (clases scheduled) ──▶ completed
      └──────────────cancel_enrollment──────────────▶ cancelled
```

## Qué hay hecho (este PR) y qué falta

| Pieza | Estado |
|---|---|
| `create_web_purchase`, `confirm_payment`, `schedule_enrollment` + tests de base | ✅ (`supabase/migrations/20261105000006_compra_web.sql`) |
| `comprarCursoDesdeWeb`, `confirmarPago`, `agendarClases`, `getActiveCourses` | ✅ (`src/lib/booking/compra.ts`, `courses.ts`) |
| Pantalla "Comprar curso" → WhatsApp | PR siguiente |
| Panel del personal: pedidos pendientes, confirmar pago, dar de alta al alumno | PR siguiente |
| Panel del alumno: login, completar ficha, elegir y reprogramar turnos | PR siguiente |
| Mail automático al confirmar el pago | con el panel del personal (necesita un servicio de mails) |

## Decisiones

- **Datos al comprar:** nombre, teléfono, **DNI y email** (obligatorios). La **fecha de nacimiento** pasó a ser opcional en `students`: se completa en la ficha, al primer ingreso del alumno (también sirve para saber si es menor y pedir la autorización del tutor, supuesto 11).
- **Medio de pago:** efectivo o transferencia, que elige la persona. Aplican los descuentos de la base (10 % y 15 %), que son un **supuesto** hasta que el cliente defina las reglas. La tarjeta se paga online con otro flujo (retención de turnos de 15 minutos).
- **Un curso a la vez:** si la persona ya tiene una inscripción pendiente o activa, no se crea otra (`enrollment_in_progress`).
- **El DNI identifica al alumno.** Si ya existe se reutiliza y **no se pisan sus datos** desde la web (cualquiera podría escribir un DNI ajeno): el personal los corrige desde el panel.
- **El monto nunca viene del navegador**: lo calcula la base.
- **Las tres funciones solo las ejecuta `service_role`** (el servidor). `confirmarPago` y `agendarClases` no verifican quién las llama: el código que las use (Server Actions del panel) debe comprobar antes el rol o que la inscripción sea de esa persona.
- **Curso de 10 clases:** inactivo hasta que el cliente pase el precio.

## Supuestos y pendientes del cliente

| Tema | Supuesto actual | Pregunta |
|---|---|---|
| Orden: pagar primero, elegir turnos después | Sí | 15 (bloqueante) |
| Descuentos por medio de pago | 10 % transferencia, 15 % efectivo | — |
| Cuánto puede quedar un pedido sin pagar antes de cancelarse | Sin vencimiento por ahora | 63 (nueva) |
| Reprogramación por el alumno: anticipación mínima y cantidad de veces | Se configura en `settings` (a definir al armar el panel del alumno) | 9 y 10 (bloqueantes) |
| Cómo entra el alumno (usuario y contraseña o enlace por email) | A decidir con el cliente | 31 |
| Aviso automático por mail al confirmar el pago | Sí (lo pidió Denise) | 42, 43 |

## Más adelante: venta de productos

El cliente también vende **productos** y le gustaría venderlos por la web. **No está en esta etapa**; se agrega después (preguntas 64 a 68).

Hoy no hay carrito: cada compra es **un solo curso** y una persona no puede tener dos cursos a la vez (ver arriba). Para vender productos habrá que sumar, sin tocar lo de los cursos:

- Un catálogo de productos (nombre, precio, foto y, si corresponde, stock).
- Pedidos con varios ítems (ahí sí un carrito) y su propio estado: pendiente, pagado, entregado o enviado.
- Retiro en la oficina o envío, según lo que responda el cliente (pregunta 66).

Se puede reutilizar el mismo mecanismo de pago de esta etapa (efectivo o transferencia, que el personal confirma desde el panel) y, más adelante, Mercado Pago. Las inscripciones a cursos siguen en `enrollments`; los productos irían en tablas aparte.

## Protección contra abuso

- **Nunca se retienen turnos sin pago**, así que nadie puede bloquear la agenda con datos falsos.
- Sí es posible llenar de pedidos falsos la lista de pendientes del personal. Mitigación actual: DNI y email validados, un solo curso por persona. **Antes de publicar** hace falta un límite por IP o un control anti-robots (Vercel Firewall o Cloudflare Turnstile). Ver `05-seguridad.md`.

## Códigos de error (mensaje de Postgres)

`invalid_name`, `invalid_phone`, `invalid_dni`, `invalid_email`, `invalid_method`, `course_not_found`, `enrollment_in_progress` (pedido); `enrollment_not_confirmable`, `enrollment_has_lessons` (confirmar el pago); `enrollment_not_active`, `already_scheduled`, `wrong_lesson_count`, `duplicate_slots`, `slot_unavailable`, `slot_taken`, `student_day_conflict` (turnos). `BookingError` expone `isDataProblem` (corregir datos) e `isSlotProblem` (elegir otro horario).
