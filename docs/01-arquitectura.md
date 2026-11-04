# Arquitectura

## Visión general

Monolito en **Next.js** (Vercel) con **Supabase** (Postgres, Auth, RLS, Storage, pg_cron).

```
Alumno / Admin (navegador)
        │
   Next.js ── Server Actions y Route Handlers
        │        │              │
        │        │              └── Mercado Pago (Checkout Pro + webhook)
        │        └── Resend (emails)
        ▼
   Supabase: Postgres + Auth + RLS + pg_cron
```

Las reglas críticas viven **en la base de datos**, no en el front: es lo único que no se puede saltear.

## Entornos

| Entorno | Base | App | Pagos |
|---|---|---|---|
| Local | Supabase CLI en Docker | `npm run dev` | credenciales de prueba |
| Staging | Proyecto Supabase aparte | Preview de Vercel | credenciales de prueba |
| Producción | Proyecto Supabase del cliente | Vercel del cliente | credenciales reales |

Docker se usa **solo** para la base local. No hace falta para la app ni para producción.

## Modelo de datos

Definido en `supabase/migrations/20261103000001_core_schema.sql`.

| Tabla | Para qué |
|---|---|
| `settings` | Parámetros (duración de turno, retenciones, ventana de reserva) |
| `profiles` | Rol del usuario (`admin`, `owner`, `student`) |
| `instructors` | Profesores |
| `students` | Alumnos (con datos de tutor si es menor) |
| `availability_rules` | Bloques horarios por profesor y día de semana |
| `blackouts` | Feriados, vacaciones, auto en taller (global o por profesor) |
| `courses` | Cursos y precio de lista |
| `payment_method_rules` | Descuento por método (tarjeta 0%, transferencia 10%, efectivo 15%) |
| `enrollments` | Inscripción de un alumno a un curso |
| `lessons` | Cada clase (o examen) con su horario y estado |
| `payments` | Pagos y comprobantes |
| `audit_log` | Auditoría por triggers (quién cambió qué) |

Los precios con descuento **no se guardan**: se calculan al crear la inscripción desde el precio de lista y `payment_method_rules`.

### Estados

- **Inscripción:** `pending_payment` (tarjeta) / `pending_review` (transferencia, efectivo) → `active` → `completed`; o `cancelled`.
- **Clase:** `held` (retenida, con vencimiento) → `scheduled` → `done`; o `cancelled` / `no_show`.

## Reglas garantizadas por la base

1. **Un solo auto.** *Exclusion constraint* (`btree_gist`) sobre `tstzrange(starts_at, ends_at)` para clases `held`, `scheduled` y `done`. Dos reservas simultáneas no pueden superponerse, aunque lleguen a la vez.
2. **Una clase por día por alumno.** Índice único parcial sobre `(student_id, fecha_local)`. `fecha_local` es una columna generada en hora de Buenos Aires.
3. **Número de clase único** por inscripción.
4. **Todo o nada.** `create_enrollment` es una sola transacción: si un turno falla, no queda nada.
5. **RLS activado en todas las tablas.** Sin políticas, nadie accede salvo el servidor (service role) y las funciones `security definer`. Solo se exponen cursos activos y reglas de pago al público.

## Funciones SQL

Definidas en `supabase/migrations/20261103000002_booking_functions.sql`.

| Función | Acceso | Qué hace |
|---|---|---|
| `get_free_slots(desde, hasta)` | público | Turnos libres con el profesor que corresponde |
| `create_enrollment(alumno, curso, método, turnos[])` | servidor | Crea inscripción y retiene todos los turnos |
| `confirm_enrollment(id)` | servidor | Pago confirmado: retenidas → programadas |
| `cancel_enrollment(id)` | servidor | Cancela y libera los turnos |
| `mark_lesson_done(clase, usuario)` | servidor | Administración marca la clase como dictada |
| `release_expired_holds()` | servidor / cron | Libera retenciones vencidas |
| `slot_candidates(desde, hasta)` | interno | Turnos posibles antes de mirar ocupación |

### Cálculo de turnos libres

1. Por cada día y regla de disponibilidad, se genera la grilla de turnos pegados de `slot_minutes` (40) dentro del bloque. Un turno solo existe si **termina** antes del fin del bloque (con bloque 08:00–13:00 el último empieza 12:00 y termina 12:40; uno a las 12:40 terminaría 13:20 y no existe).
2. Se descartan los que están fuera de la ventana de reserva (`min_advance_hours`, `max_advance_days`).
3. Se descartan los que se superponen con un `blackout`.
4. Se descartan los ocupados (`scheduled`, `done`) o retenidos vigentes (`held` con `hold_expires_at > now()`).

El profesor **no se elige**: sale de la regla que genera el turno.

### Retención de turnos

Al reservar, los turnos quedan `held` hasta `hold_expires_at`:
- **Tarjeta:** `hold_minutes_card` (15 min).
- **Transferencia / efectivo:** `hold_minutes_manual` (24 h, supuesto pendiente de la pregunta 15).

Una retención vencida **deja de bloquear** el turno en `get_free_slots` aunque no se haya limpiado todavía. `create_enrollment` limpia las vencidas antes de reservar, y `release_expired_holds()` se puede programar con `pg_cron`.

### Errores

Las funciones lanzan errores con mensaje estable para que el servidor los traduzca:
`course_not_found`, `student_not_found`, `wrong_lesson_count`, `duplicate_slots`, `slot_unavailable`, `slot_taken`, `student_day_conflict`, `enrollment_not_confirmable`, `holds_lost`, `lesson_not_scheduled`.

## Pendiente de construir

Ver `docs/04-roadmap.md`.
