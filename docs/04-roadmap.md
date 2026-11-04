# Roadmap

## Hecho
- [x] Proyecto Next.js (TypeScript, Tailwind, App Router) y Supabase CLI.
- [x] Esquema núcleo: cursos, profesores, disponibilidad, bloqueos, alumnos, inscripciones, clases, pagos, auditoría.
- [x] Restricciones: un solo auto, una clase por día por alumno, número de clase único.
- [x] `get_free_slots`, `create_enrollment`, `confirm_enrollment`, `cancel_enrollment`, `mark_lesson_done`, `release_expired_holds`.
- [x] Tests pgTAP de la lógica de reserva.
- [x] Seed de desarrollo con los cursos y precios del cartel.

- [x] Políticas RLS y GRANTs por rol, con 65 tests (`docs/05-seguridad.md`).
- [x] Flujo de trabajo: CI, PR obligatorio, `main` protegido (`docs/06-devops.md`).

- [x] Cliente de Supabase del lado servidor, tipos generados y módulos `booking` (turnos libres, reserva, sugerencias) con 16 tests unitarios.

- [x] Pagos con Mercado Pago (backend): `apply_payment` idempotente, webhook con firma, link de pago y bitácora, con 32 tests de base y 42 unitarios. Falta probarlo contra Mercado Pago de prueba (necesita credenciales).

## Próximo
1. ~~Políticas RLS por rol~~ (hecho).
2. ~~Cliente Supabase y tipos~~ (hecho).
3. **Avisar a Denise antes de empezar el front:** tiene una plantilla elegida.
4. **Cliente de Supabase en Next.js** (servidor y navegador) y tipos generados.
3. **Pantalla de reserva** (elegir curso → turnos libres → datos → método de pago).
4. **Mercado Pago:** ~~orden y webhook~~ (hecho con la API de Orders); falta probarlo con credenciales de prueba y armar la página de retorno `/reserva/resultado`.
5. **Panel admin:** agenda del día con número de clase, marcar clase dictada, pagos pendientes con comprobante, bloqueos, reservas manuales.
6. **Mi cuenta** del alumno y reprogramación (reglas según respuestas del cliente).
7. **Notificaciones:** mail de confirmación y recordatorio (Resend + cron).
8. **Importación del Excel** actual.
9. **Sitio público:** inicio, cursos, contacto, logos.
10. **Producción:** cuentas a nombre del cliente, dominio, planes Pro, `pg_cron` para `release_expired_holds`.

## Depende de respuestas del cliente
Ver `docs/03-preguntas-pendientes.md`. Las más bloqueantes: 2, 9, 10, 15, 23, 25, 26 y 60.
