# Panel del personal

Zona interna (`/panel`) para administración y dueño. Este documento cubre la **base** (ingreso y permisos). Los pedidos pendientes, confirmar pagos y dar de alta alumnos van en el PR siguiente.

## Cómo se entra

- Ingreso en `/panel/login` con email y contraseña (Supabase Auth). No hay registro público: **solo existen las cuentas que crea el equipo**.
- Una persona entra al panel solo si su rol en `profiles` es `admin` (administración) o `owner` (dueño). Un alumno con contraseña correcta **no entra**, y recibe el mismo mensaje que una contraseña equivocada (no se revela si un email existe).
- Para crear o actualizar una cuenta del personal (genera una contraseña larga y la muestra una sola vez en la terminal):

```bash
npm run personal:crear -- persona@ejemplo.com admin
npm run personal:crear -- persona@ejemplo.com owner
```

Usa `SUPABASE_SERVICE_ROLE_KEY` de `.env.local`. En producción se corre apuntando a las variables de producción, desde una máquina de confianza. Alternativa: crear el usuario en el panel de Supabase y cambiarle el rol en `profiles`.

## Cómo se protege (capas)

1. **Proxy** (`src/proxy.ts`): renueva la sesión y manda al login a quien no tiene una. Es solo un primer filtro y **no decide permisos**.
2. **Cada página y acción del panel** llama a `exigirPersonal()` (`src/lib/auth/personal.ts`): le pregunta a Supabase si la sesión es válida (`getUser`, no confía en la cookie) y lee el rol de `profiles`. Obligatorio al principio de toda página, Server Action o consulta nueva del panel.
3. **La base**: RLS y funciones solo para `service_role` (ver `05-seguridad.md`). Ni un alumno logueado puede cambiarse el rol.

Se usan dos clientes distintos: `createSessionClient()` (actúa como la persona logueada, con RLS) y `createAdminClient()` (ignora RLS, solo para operaciones de servidor ya autorizadas con `exigirPersonal()`).

## Decisiones

- **`@supabase/ssr`** (dependencia nueva): librería oficial de Supabase para guardar la sesión en cookies con Next. Hacerlo a mano implica manejar renovación de tokens y cookies, justo lo que no conviene improvisar.
- La sesión se lee siempre en cada pedido (`connection()`), nunca se prerenderiza, y las respuestas del panel van con `Cache-Control: private, no-store`.
- El panel no se indexa (`robots: noindex`).

## Pendiente antes de publicar

- 2FA para administración y dueño (ver `05-seguridad.md`).
- Límite de intentos de ingreso: Supabase Auth ya limita por IP; revisar los valores en el proyecto de producción.
- Recuperar contraseña (hoy la restablece el equipo desde Supabase).
