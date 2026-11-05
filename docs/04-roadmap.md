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

- [x] Compra desde la web sin pago online, parte de base y servidor: `create_web_purchase`, `confirm_payment` y `schedule_enrollment`, con 45 tests de base nuevos (181 en total) y 17 unitarios (`docs/08-compra-web.md`).

## Próximo
1. ~~Políticas RLS por rol~~ (hecho).
2. ~~Cliente Supabase y tipos~~ (hecho).
3. **Avisar a Denise antes de empezar el front:** tiene una plantilla elegida.
4. **Cliente de Supabase en Next.js** (servidor y navegador) y tipos generados.
3. **Compra desde la web** (pagar primero, elegir turnos después; ver `docs/08-compra-web.md`), en PRs chicos:
   1. ~~Pantalla "Comprar curso" → WhatsApp~~ (hecho).
   2. Panel del personal. a) ~~Login y permisos~~ (hecho, ver `docs/09-panel-personal.md`). b) ~~Pedidos pendientes, confirmar pago, dar de alta al alumno con aviso por mail~~ (hecho, ver `docs/10-pedidos-y-alta.md`).
   3. Panel del alumno: a) ~~entrar con link por mail, completar ficha y elegir turnos~~ (hecho, ver `docs/12-panel-alumno.md`). b) Ver y reprogramar turnos.
4. **Mercado Pago:** ~~orden y webhook~~ (hecho con la API de Orders); falta probarlo con credenciales de prueba y armar la página de retorno `/reserva/resultado`.
5. **Panel admin:** ~~calendario semanal de solo lectura~~ (hecho, ver `docs/11-calendario.md`); falta marcar clase dictada, pagos pendientes con comprobante, bloqueos, reservas manuales.
6. **Mi cuenta** del alumno y reprogramación (reglas según respuestas del cliente).
7. **Notificaciones:** mail de confirmación y recordatorio (Resend + cron).
8. **Importación del Excel** actual.
9. **Sitio público:** inicio, cursos, contacto, logos.
10. **Producción:** cuentas a nombre del cliente, dominio, planes Pro, `pg_cron` para `release_expired_holds`.

## Más adelante
- **Venta de productos por la web** (catálogo, carrito, stock, retiro o envío). Lo pidió el cliente; no está en esta etapa. Ver `docs/08-compra-web.md` y las preguntas 64 a 68.

## Depende de respuestas del cliente
Ver `docs/03-preguntas-pendientes.md`. Las más bloqueantes: 2, 9, 10, 15, 23, 25, 26 y 60.
