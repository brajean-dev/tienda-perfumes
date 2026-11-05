# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Tienda web de perfumería de nicho para público hispanohablante, con precios en soles (PEN). La propuesta de valor es que la persona conozca el perfume (notas olfativas y ocasión de uso) antes de elegirlo. Alcance, fuera de alcance y criterios de aceptación: `docs/spec.md`. Vocabulario: `docs/glossary.md`. Decisiones técnicas: `docs/decisions/`. Cómo levantarlo: `README.md`.

> **"La guía del proyecto"**, que citan varios ADR, es el documento inicial que escribió el dueño y está conservado tal cual en `docs/guia-del-proyecto.md`. No describe el estado actual (si contradice a `docs/spec.md`, a los ADR o a estos `CLAUDE.md`, mandan ellos): sus reglas están recogidas en este archivo, en los `CLAUDE.md` de cada app y en `docs/spec.md`.

## Estructura (monorepo pnpm workspaces)

```text
apps/web/            React + Vite + TypeScript          → ver apps/web/CLAUDE.md
apps/api/            Fastify + TypeScript + Zod + Prisma → ver apps/api/CLAUDE.md
packages/contracts/  Contratos compartidos; fuente OpenAPI en openapi.yaml y tipos generados
scripts/             env:init (crea el .env) y la preparación de la base de pruebas
docs/                Especificación, glosario, decisiones (ADR) y planes
.claude/             Agentes (planner, reviewer, docs-keeper) y skill plan-fase
docker-compose.yml   PostgreSQL para desarrollo local
```

Lo específico de cada app (estructura de carpetas, capas, pruebas, accesibilidad, qué no hacer) está en el `CLAUDE.md` de esa app: **léelo antes de tocar su código**. Este archivo solo contiene lo transversal.

No sustituyas estas tecnologías ni cambies la estructura sin una instrucción explícita. Antes de añadir una dependencia, comprueba si lo resuelve lo ya instalado; si no, justifícala y consúltala.

## Comandos

Usa siempre `pnpm` (versión fijada en `packageManager`; Node >= 24). Se ejecutan desde la raíz.

| Comando                                        | Qué hace                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm install`                                 | Instala dependencias de todo el workspace (y genera el cliente de Prisma)            |
| `pnpm env:init`                                | Crea `.env` desde `.env.example` con una contraseña aleatoria (no sobrescribe)       |
| `pnpm db:up` / `pnpm db:down`                  | Inicia (espera a que esté sana) / detiene PostgreSQL con Docker Compose              |
| `pnpm db:migrate` / `pnpm db:seed`             | Aplica migraciones de desarrollo (Prisma) / carga los datos semilla (idempotente)    |
| `pnpm db:generate`                             | Regenera el cliente de Prisma                                                        |
| `pnpm db:test:prepare` y `pnpm test:db`        | Crea y migra la base `perfumeria_test` / pruebas de integración contra PostgreSQL    |
| `pnpm contracts:generate` / `contracts:check`  | Regenera los tipos desde `openapi.yaml` / comprueba que están al día                 |
| `pnpm format` / `pnpm format:check`            | Aplica / comprueba formato con Prettier                                              |
| `pnpm dev`                                     | API en `:3000` y web en `:5173` en paralelo                                          |
| `pnpm test`, `pnpm build`, `pnpm typecheck`    | Pruebas (apps, contratos y scripts), compilación y `tsc --noEmit`; `test` sin Docker |
| `pnpm test:scripts`                            | Solo las pruebas de `scripts/` (`node --test`; `pnpm test` ya las incluye)           |
| `pnpm --filter @tienda/api test`               | Pruebas de una sola app (cambia el filtro por `@tienda/web`)                         |
| `pnpm --filter @tienda/api test -t "<nombre>"` | Una sola prueba por nombre (sin `--`: con `--` ejecuta todas)                        |

Otros scripts de cada app (`start`, `db:migrate:deploy`, `preview`...) están en su `CLAUDE.md` y en su `package.json`.

**No existe `pnpm setup` como script:** es una orden de pnpm que modifica la configuración del shell. Por eso el script del `.env` se llama `env:init`.

## Entorno y reglas transversales

- **`.env`:** se crea con `pnpm env:init` y está ignorado por git. Variables: `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` (las usa `docker-compose.yml`), `DATABASE_URL`, `TEST_DATABASE_URL`, `API_PORT`, `API_HOST`, `WEB_ORIGIN` y `VITE_API_URL`; ver `.env.example`. Qué se expone al navegador: `apps/web/CLAUDE.md`.
- **Contraseña de PostgreSQL:** solo se aplica al crear el volumen. Si rehaces el `.env` con otra y la base ya existe, falla la autenticación: lo más simple es recuperar el `.env` anterior. **`docker compose down -v` borra todos los datos (desarrollo y pruebas): solo lo ejecuta el usuario**, igual que `prisma migrate reset`.
- **Cambiar un endpoint = contrato primero:** edita `packages/contracts/openapi.yaml`, ejecuta `pnpm contracts:generate` (actualiza `packages/contracts/generated/schema.d.ts`, que se versiona) y adapta el código. `pnpm test` falla si las rutas, las respuestas o los tipos generados no coinciden con el yaml. Pasos detallados: `apps/api/CLAUDE.md`.
- **Dos versiones de TypeScript, a propósito:** `packages/contracts` usa la 5.9.3 y `apps/api` y `apps/web` la 7.0.2, porque `openapi-typescript` no funciona con la 7 (ADR 0003).
- **El repositorio es público.** No publiques secretos, datos personales ni datos de la semilla que no quieras compartir.
- **Scripts:** los `.ts` de `scripts/` se ejecutan con Node directamente y **no pasan por `typecheck`**: mantenlos pequeños y con pruebas (`node --test`). `packages/contracts/scripts/check-generated.ts` y `scripts/db-test-prepare.sh` no tienen pruebas propias: los ejercitan `pnpm test` (vía `contracts:check`) y `pnpm db:test:prepare`.

## Flujo de trabajo

- **Ninguna fase se ejecuta sin aprobación.** Cada fase empieza con la skill `plan-fase` (`/plan-fase N`, o al mencionarla): entrega un resumen y un miniplan y espera confirmación antes de tocar nada.
- **Fases grandes:** el subagente `planner` guarda un plan con pasos verificables en `docs/plans/`. No escribe código de la app. Si se usa, que termine antes de empezar a implementar: el plan de la 5a divergió porque se escribió mientras se ejecutaba.
- **Ramas y PR:** cada cambio va en una rama; subir la rama, abrir el PR y fusionarlo solo con orden explícita del usuario.
- **Commits:** **sin `Co-Authored-By` de Claude** (decisión del dueño). El correo de autor del repositorio es el `noreply` de GitHub, configurado con `git config --local user.email`: no lo cambies ni toques la configuración global. Los commits ya publicados con otro correo no se reescriben.
- **Revisión:** el subagente `reviewer` revisa solo el diff `main...HEAD` (necesita un repositorio git con rama `main` y trabajo en otra rama). Verifica sus hallazgos contra el código real antes de corregirlos: no todos se reproducen.
- **Documentación:** antes de abrir un PR que cambie comandos, estructura de carpetas o variables de entorno, pasa el subagente `docs-keeper`, que compara `README.md` y los `CLAUDE.md` con el código real. No edita y **no abre el `.env`**: solo informa. (Un agente nuevo no se carga hasta reiniciar Claude Code.)
- **Verificación honesta:** si una comprobación no se ejecutó o no existe, dilo. Nunca afirmes que algo pasó sin haberlo ejecutado. Las pruebas nuevas se validan rompiendo temporalmente el código y comprobando que fallan.

## Reglas del dominio y los datos

- Cada perfume pertenece a exactamente una marca.
- Las marcas son reales (nicho). Las notas olfativas deben salir de una fuente fiable, nunca de memoria ni de un modelo de lenguaje. Los precios los define el dueño de la tienda; no los inventes. Cualquier dato de la semilla se publica: no pongas en ella nada que no quieras compartir.
- Las imágenes son placeholders por ahora; el modelo debe permitir sustituirlas por fotos propias vía `imageUrl`.
- Valida las entradas en el backend; la validación del cliente solo mejora la experiencia.

## Decisiones pendientes

- Cualquier dependencia que no esté ya instalada (por ejemplo `react-router` en la Fase 6): consultar antes de instalar.
- Licencia: el repositorio es público pero no tiene `LICENSE`; decide el dueño.
