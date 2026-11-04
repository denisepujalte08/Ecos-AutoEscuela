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

## Antes de lanzar (imprescindible)

### 1. Acceso y autenticación
- 2FA obligatoria para administración y dueño.
- Contraseñas largas, límite de intentos y bloqueo temporal.
- Roles mínimos: cada usuario ve solo lo que necesita.
- Sesiones con vencimiento; poder cerrar sesión en todos los dispositivos.

### 2. Políticas RLS por rol
- Admin/owner ven todo; el alumno solo lo suyo; el público solo cursos activos y turnos libres.
- **Tests que intentan leer datos ajenos** (un alumno leyendo filas de otro debe fallar).

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
