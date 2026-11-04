# DevOps y flujo de trabajo

## Flujo de trabajo

```
main  ←──── Pull Request ←──── feature/mi-tarea
(protegida)   (CI en verde + revisión)
```

1. Crear rama desde `main` actualizada: `feature/…`, `fix/…`, `chore/…` o `docs/…`.
2. Commits chicos, en español, con *Conventional Commits* (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
3. Antes de abrir el PR: `npm run check`.
4. Abrir el PR con la plantilla. El CI corre solo.
5. Merge a `main` cuando el CI está en verde y alguien revisó. Preferir *squash merge* para mantener la historia legible.
6. Borrar la rama después del merge.

**Nadie hace push directo a `main`** (incluido Claude: está bloqueado en `.claude/settings.json`).

### Proteger `main` en GitHub (una vez)
Settings → Branches → Add branch ruleset para `main`:
- Require a pull request before merging.
- Require status checks to pass: `Lint, tipos y build`, `Migraciones y tests de base de datos`, `Dependencias y secretos`.
- Block force pushes y deletions.
- Require branches to be up to date before merging.

## Integración continua

`.github/workflows/ci.yml` corre en cada PR y en cada push a `main`:

| Job | Qué verifica |
|---|---|
| `app` | `eslint`, `tsc --noEmit` y `next build` |
| `database` | Levanta Supabase local, aplica **todas** las migraciones desde cero y corre los tests pgTAP |
| `security` | `npm audit` de dependencias de producción y escaneo de secretos con gitleaks |

El job `database` es el más importante: prueba que las migraciones aplican limpias sobre una base vacía y que las reglas de reserva se cumplen.

Dependabot abre PRs semanales para actualizar dependencias y GitHub Actions.

## Entornos

| Entorno | Base | App | Pagos | Quién despliega |
|---|---|---|---|---|
| Local | Supabase CLI (Docker) | `npm run dev` | credenciales de prueba | cada desarrollador |
| Preview | Proyecto Supabase *staging* | Preview de Vercel por PR | credenciales de prueba | automático |
| Producción | Proyecto Supabase del cliente | Vercel del cliente (rama `main`) | credenciales reales | automático al mergear |

Reglas:
- Producción y staging usan **proyectos y credenciales distintos**. Nunca apuntar un entorno de prueba a la base real.
- Las credenciales de producción las carga el cliente (o se hace con él) como variables de entorno en Vercel. No pasan por chat, mail ni el repo.
- Variables nuevas: agregarlas a `.env.example` (sin valores) en el mismo PR.

## Base de datos y migraciones

- Cambio de esquema = **migración nueva** (`supabase migration new nombre`). Nunca editar una ya mergeada.
- Nombres con timestamp creciente; una migración, un propósito.
- Toda migración con lógica lleva tests en `supabase/tests/database/`.
- Probar siempre desde cero: `npm run db:reset && npm run db:test`.
- Aplicar a staging/producción con `supabase db push` (desde CI o a mano), **después** de que el PR esté mergeado.
- Cambios destructivos (borrar columnas o tablas) en dos pasos: primero dejar de usarlas, después borrarlas en otra migración.
- Antes de una migración riesgosa en producción: backup verificado.

## Despliegue y vuelta atrás

- Vercel despliega `main` automáticamente; cada PR tiene su preview.
- **Rollback de la app:** en Vercel, promover un despliegue anterior (instantáneo).
- **Rollback de la base:** las migraciones no se "deshacen" borrándolas; se escribe una migración correctiva. Por eso importan los backups.
- Despliegues de cambios con pagos: probar en staging con credenciales de prueba y un pago de ida y vuelta.

## Secretos

- Nunca en el repo. `.env*` está ignorado; solo `.env.example` (sin valores) se versiona.
- Gitleaks en CI frena los PRs que incluyan claves.
- Si una clave se filtra: **rotarla primero**, investigar después.
- La `service_role` de Supabase y los tokens de pago viven solo en el servidor.

## Observabilidad

Antes del primer pago real:
- Monitoreo de errores (Sentry o similar) en servidor y navegador.
- Logs de webhooks de pago y tabla `webhook_events` para reprocesar fallos.
- Alerta si el webhook de Mercado Pago falla o deja de recibir eventos.
- Registro de logins fallidos y accesos al panel.

## Backups y recuperación

- Supabase Pro: backups diarios automáticos.
- **Probar la restauración** al menos una vez antes de lanzar y luego cada tanto.
- Definir con el cliente cuánto dato pueden perder (RPO) y cuánto tiempo tolerar caído (RTO). Para este negocio, restaurar en horas es razonable.

## Calidad

- Los tests de base de datos son obligatorios para lógica SQL.
- Corregir un bug = primero un test que lo reproduzca.
- Mantener el CI en verde: un CI roto se arregla antes que cualquier tarea nueva.
- Revisar los PRs de Dependabot semanalmente; actualizaciones mayores, con cuidado y en PR aparte.

## Convenciones del repositorio

| Archivo | Para qué |
|---|---|
| `CLAUDE.md` | Reglas del proyecto que Claude sigue en cada sesión |
| `.claude/settings.json` | Permisos de Claude: bloquea push a `main`, force push y lectura de `.env`; sin líneas de coautoría |
| `.github/workflows/ci.yml` | Integración continua |
| `.github/dependabot.yml` | Actualizaciones automáticas de dependencias |
| `.github/pull_request_template.md` | Plantilla de PR con checklist |
| `.github/CODEOWNERS` | Quién debe revisar cada área |
| `.env.example` | Variables de entorno necesarias (sin valores) |
| `.editorconfig`, `.gitattributes` | Formato y saltos de línea consistentes |

## Versión de Node.js

`package.json` exige `node >=24.22.1` (campo `engines`). Motivo: CVE-2026-111497 (Brotli, ejecución remota de código, severidad alta) está corregido desde la 24.22.1. El CI usa `node-version: 24` (última 24.x). Node publicará más parches de seguridad el 11/11/2026: al salir, revisar las notas y subir el mínimo. En producción (Vercel) fijar una versión de Node 24 parcheada.
