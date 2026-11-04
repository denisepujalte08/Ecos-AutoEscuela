# Seguridad

Qué se protege: **datos personales de alumnos** (DNI, fecha de nacimiento, teléfono, mail), **pagos** y la **integridad de la agenda** (que nadie bloquee o manipule turnos).

## Ya implementado

| Medida | Dónde |
|---|---|
| RLS activado en todas las tablas, cerradas por defecto | `20261103000001_core_schema.sql` |
| Funciones sensibles solo para el servidor (`revoke` a anon/authenticated) | `20261103000002_booking_functions.sql`, `…000003_suggest_slots.sql` |
| Reglas críticas en la base (un solo auto, una clase por día, todo o nada) | restricciones y funciones SQL |
| Auditoría de cambios por triggers | tabla `audit_log` |
| Sin datos de tarjeta en el sistema (pagos por redirección) | `docs/02-pagos.md` |
| `.env*` ignorado por git | `.gitignore` |

## Permisos por rol (implementado y probado)

Definido en `supabase/migrations/20261104000004_rls_policies.sql` y probado en `supabase/tests/database/rls.test.sql` (65 tests).

Dos capas: **GRANTs mínimos** (qué puede intentar cada rol de Postgres) y **RLS** (qué filas ve dentro de eso). Las escrituras sobre inscripciones, clases y pagos **no se hacen por tabla**: pasan por funciones SQL que solo ejecuta el servidor (`service_role`).

| Dato | Público | Alumno | Admin | Dueño |
|---|---|---|---|---|
| Cursos activos y reglas de descuento | leer | leer | leer / editar | leer / editar |
| Turnos libres (`get_free_slots`) | sí | sí | sí | sí |
| Su ficha, inscripciones, clases y pagos | – | solo lo propio | todo (lectura) | todo (lectura) |
| Alumnos | – | solo su ficha (lectura) | leer / crear / editar | leer / crear / editar |
| Profesores, horarios, bloqueos | – | – | leer / editar | leer / editar |
| Inscripciones, clases, pagos (escritura) | – | – | solo por funciones | solo por funciones |
| Configuración (`settings`) | – | – | leer | leer / editar |
| Descuentos por método de pago | leer | leer | leer | leer / editar |
| Roles de usuario (`profiles`) | – | solo el suyo (lectura) | leer | leer / cambiar |
| Auditoría | – | – | – | leer |

Garantías:
- **Todo usuario nuevo es alumno.** Un trigger crea su perfil con rol `student`; solo el dueño puede cambiarlo. Un alumno **no puede escalar privilegios** (probado).
- Un alumno no ve datos de otro alumno (probado con dos alumnos).
- Nadie puede modificar ni falsificar la auditoría, ni siquiera el dueño.
- Las funciones de reserva (`create_enrollment`, `confirm_enrollment`, …) no son ejecutables por usuarios finales.
- Las tablas que se creen en el futuro nacen **sin** privilegios para `anon` y `authenticated`.

Supuesto pendiente de confirmar (pregunta 38): administración gestiona cursos, horarios, bloqueos y alumnos; solo el dueño toca configuración, descuentos, roles y auditoría.

## Antes de lanzar (imprescindible)

### 1. Acceso y autenticación
- 2FA obligatoria para administración y dueño.
- Contraseñas largas, límite de intentos y bloqueo temporal.
- Roles mínimos: cada usuario ve solo lo que necesita.
- Sesiones con vencimiento; poder cerrar sesión en todos los dispositivos.

### 2. Políticas RLS por rol — **hecho** (ver tabla de permisos arriba)
- Tests que intentan leer y escribir datos ajenos y escalar privilegios.
- Pendiente: repetir estos tests cuando se agreguen tablas o vistas nuevas.

### 3. API pública
- Límite de peticiones (rate limiting) en reservas, login y consulta de turnos.
- CAPTCHA (Cloudflare Turnstile) en el formulario de reserva: evita que bots llenen la agenda con reservas falsas.
- Validación de entradas en el servidor (Zod).
- Tope de turnos retenidos sin pagar por persona o IP.

### 4. Pagos
- Monto calculado en el servidor, nunca desde el navegador.
- Verificar la firma del webhook y consultar el pago por API.
- Webhook idempotente.
- Credenciales de pago solo en variables de entorno del servidor.

### 5. Secretos
- Ninguna clave en el código ni en GitHub.
- La clave `service_role` de Supabase nunca llega al navegador.
- Rotar claves si se filtran; credenciales separadas para desarrollo y producción.
- Escaneo de secretos en el repo (por ejemplo `gitleaks`).

### 6. Comunicación y navegador
- Todo por HTTPS.
- Cabeceras de seguridad en Next.js: CSP, HSTS, X-Frame-Options, Referrer-Policy.
- Cookies con `HttpOnly`, `Secure` y `SameSite`.

### 7. Comprobantes de transferencia
- Bucket de Storage **privado**.
- Solo imágenes y PDF, con tamaño máximo.
- Acceso por enlaces temporales firmados.

## Datos personales (Argentina)

Aplica la **Ley 25.326 de Protección de Datos Personales**:
- Guardar solo los datos necesarios.
- Política de privacidad y consentimiento al inscribirse.
- Permitir corregir o borrar los datos de un alumno si lo pide.
- Consultar con un contador o abogado si corresponde inscribir la base en la AAIP.

## Operación

- Backups automáticos (Supabase Pro) y **probar la restauración**.
- Monitoreo de errores (Sentry) y logs; alertas de webhooks caídos.
- Dependabot y `npm audit` periódicos.
- Registrar logins fallidos y accesos del panel.
- Dar de baja el acceso de quien deje de trabajar en el negocio.

## No necesario por ahora
Pentesting externo, WAF pago, cifrado de columnas y certificaciones. Se reevalúan si el negocio crece mucho.

## Prioridad por impacto y esfuerzo
1. 2FA para admin y dueño.
2. RLS bien hecho y probado con tests.
3. CAPTCHA y límites de peticiones en el sitio público.
