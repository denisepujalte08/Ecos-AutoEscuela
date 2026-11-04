# ECOS – Instrucciones para Claude

Sistema de reservas y gestión para una autoescuela: web pública, compra de cursos, turnos de 40 minutos con **un solo auto** y dos profesores, y panel interno. Contexto completo en `docs/` (empezar por `docs/01-arquitectura.md`).

@AGENTS.md

## Comandos

```bash
npm run dev          # app en http://localhost:3000
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # tests unitarios (Vitest)
npm run build        # build de producción
npm run db:start     # Supabase local (requiere Docker)
npm run db:reset     # aplica migraciones + seed
npm run db:test      # tests pgTAP
npm run db:types     # regenera src/lib/db/database.types.ts (con la base local encendida)
npm run check        # lint + typecheck + tests + db:test (correr antes de abrir un PR)
```

## Flujo de trabajo (obligatorio)

- **Nunca hacer push a `main`.** Trabajar en una rama (`feature/…`, `fix/…`, `chore/…`, `docs/…`) y abrir un Pull Request. El merge lo hace la persona dueña del repo.
- Un PR por tarea, chico y enfocado. Describir qué cambia y cómo se probó (plantilla en `.github/pull_request_template.md`).
- Mensajes de commit en español, formato *Conventional Commits*: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- **No agregar líneas de coautoría de Claude** (`Co-Authored-By`) ni textos de "generado con Claude" en commits ni PRs.
- No usar `git push --force`, no reescribir historia publicada, no saltear hooks (`--no-verify`).
- Antes de commitear: `npm run check` en verde. Si algo falla, arreglar la causa, no desactivar el chequeo.

## Base de datos

- Las reglas críticas viven **en la base de datos** (restricciones y funciones SQL), no en el front. Ver `docs/01-arquitectura.md`.
- **Nunca editar una migración ya aplicada o mergeada.** Cambios de esquema = migración nueva en `supabase/migrations/` con timestamp creciente.
- Todo cambio de lógica SQL lleva tests en `supabase/tests/database/` (pgTAP). Si se arregla un bug, primero un test que lo reproduzca.
- Toda tabla nueva: `enable row level security` y políticas explícitas. Cerrado por defecto.
- Funciones que modifican datos: `security definer`, `set search_path = public` y `revoke execute … from public, anon, authenticated` salvo que deban ser públicas.
- Zona horaria del negocio: `America/Argentina/Buenos_Aires`. Todo instante es `timestamptz`.
- Los precios con descuento **se calculan**; solo se guarda el precio de lista.

## Seguridad

- **Nunca** commitear ni pegar en chat claves, tokens ni `.env*`. Usar `.env.local` (ignorado) y `.env.example` como plantilla sin valores reales.
- La clave `service_role` de Supabase solo se usa en el servidor, nunca en código que llegue al navegador.
- Pagos: el monto se calcula en el servidor; el webhook valida la firma y consulta el pago por API; es idempotente. Ver `docs/02-pagos.md`.
- Validar toda entrada en el servidor (Zod). No confiar en el navegador.
- Checklist completo: `docs/05-seguridad.md`.

## Código

- **Cambió el esquema o una función SQL → correr `npm run db:types` y commitear `database.types.ts`.** El archivo es generado: no se edita a mano.
- Dos clientes de Supabase, siempre del lado servidor (`src/lib/db/server.ts`): `createPublicClient()` (rol `anon`, para lo que se ve sin sesión) y `createAdminClient()` (`service_role`, solo para reservas, pagos y webhooks). Usar el de menor privilegio que alcance.
- Los módulos de `src/lib/` que tocan datos importan `server-only` y reciben el cliente por parámetro (con valor por defecto) para poder testearse con un cliente simulado.

- TypeScript estricto. Sin `any` salvo justificación en un comentario.
- Lógica de negocio en `src/lib/` (booking, payments, notifications, db); las pantallas solo la llaman.
- Mantener el estilo del código existente; no agregar dependencias sin justificarlo en el PR.
- Documentar en `docs/` las decisiones de arquitectura o de negocio que no se deducen del código. Actualizar el doc en el mismo PR que cambia el comportamiento.

## Pendientes del cliente

Las reglas de reprogramación, examen y efectivo/transferencia **no están definidas** (ver `docs/03-preguntas-pendientes.md`). No inventar comportamiento: usar los supuestos documentados, marcarlos como supuesto y no hardcodearlos (van en `settings`).

## Seguimiento

El tablero de Trello "Ecos" refleja el avance: mover tarjetas al terminar (ver `docs/04-roadmap.md`).
