# ECOS – Reservas y gestión para autoescuela

Sistema web para vender cursos de manejo, reservar turnos de 40 minutos (un solo auto, dos profesores) y gestionar alumnos, pagos y agenda desde un panel interno.

## Documentación

| Archivo | Contenido |
|---|---|
| [docs/00-analisis.md](docs/00-analisis.md) | Análisis inicial: contexto, requisitos y decisiones |
| [docs/01-arquitectura.md](docs/01-arquitectura.md) | Arquitectura, modelo de datos y reglas de reserva |
| [docs/02-pagos.md](docs/02-pagos.md) | Mercado Pago, transferencia, efectivo y Unicobros |
| [docs/03-preguntas-pendientes.md](docs/03-preguntas-pendientes.md) | Preguntas al cliente y respuestas |
| [docs/04-roadmap.md](docs/04-roadmap.md) | Qué está hecho y qué sigue |
| [docs/05-seguridad.md](docs/05-seguridad.md) | Medidas de seguridad hechas y pendientes |
| [docs/06-devops.md](docs/06-devops.md) | Flujo de trabajo, CI, entornos, migraciones y despliegue |

## Requisitos

- Node.js 20+
- Docker Desktop (solo para la base de datos local)

## Puesta en marcha

```bash
npm install
npm run db:start     # levanta Supabase local (Postgres, Auth) en Docker
npm run db:reset     # aplica migraciones y carga datos de ejemplo
npm run db:test      # corre los tests de la lógica de reserva (pgTAP)
npm run dev          # app en http://localhost:3000
npm run check        # lint + tipos + tests de base de datos (antes de abrir un PR)
```

Copiá `.env.example` a `.env.local` para las variables de entorno (nunca se commitea).

## Cómo contribuir

No se hace push a `main`: se trabaja en una rama y se abre un Pull Request. Ver [docs/06-devops.md](docs/06-devops.md).

`npm run db:stop` apaga la base local.

## Estructura

```
src/                       app Next.js (App Router)
supabase/migrations/       esquema y funciones SQL
supabase/tests/database/   tests pgTAP
supabase/seed.sql          datos de desarrollo
docs/                      documentación
```

## Convenciones

- Las reglas críticas (un solo auto, una clase por día, todo o nada) viven en la base de datos.
- Zona horaria del negocio: `America/Argentina/Buenos_Aires`; en la base todo es `timestamptz`.
- Los precios con descuento se calculan; solo se guarda el precio de lista.
- Los cambios de esquema se hacen con migraciones nuevas, nunca editando las ya aplicadas.
