# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Tienda web de perfumería de nicho para público hispanohablante, con precios en soles (PEN). La propuesta de valor es que la persona conozca el perfume (notas olfativas y ocasión de uso) antes de elegirlo. Alcance, fuera de alcance y criterios de aceptación: `docs/spec.md`. Vocabulario: `docs/glossary.md`. Decisiones técnicas: `docs/decisions/`. Cómo levantarlo: `README.md`.

## Estructura (monorepo pnpm workspaces)

```text
apps/web/            React + Vite + TypeScript          → ver apps/web/CLAUDE.md
apps/api/            Fastify + TypeScript + Zod + Prisma → ver apps/api/CLAUDE.md
packages/contracts/  Contratos compartidos; fuente OpenAPI en openapi.yaml y tipos generados
scripts/             env:init (crea el .env) y la preparación de la base de pruebas
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
| `pnpm --filter @tienda/api test`               | Pruebas de una sola app (cambia el filtro por `@tienda/web`)                         |
| `pnpm --filter @tienda/api test -t "<nombre>"` | Una sola prueba por nombre (sin `--`: con `--` ejecuta todas)                        |

**No existe `pnpm setup` como script:** es una orden de pnpm que modifica la configuración del shell. Por eso el script del `.env` se llama `env:init`.

## Entorno y reglas transversales

- **`.env`:** se crea con `pnpm env:init`. Está ignorado por git. La web lee el `.env` raíz con `envDir` y solo expone al navegador lo que empieza por `VITE_`: **todo `VITE_*` es público, nunca pongas secretos ahí.** Si rehaces el `.env` con una contraseña nueva pero el volumen de PostgreSQL ya existe, fallará la autenticación: `docker compose down -v` (borra los datos) y repite `db:up`, `db:migrate` y `db:seed`.
- **Cambiar un endpoint = contrato primero:** edita `packages/contracts/openapi.yaml`, ejecuta `pnpm contracts:generate` (actualiza `packages/contracts/generated/schema.d.ts`, que se versiona) y adapta el código. Los DTO de la API se tipan con `components` de `@tienda/contracts`; `pnpm test` falla si las rutas, las respuestas o los tipos generados no coinciden con el yaml. Pasos detallados: `apps/api/CLAUDE.md`.
- **Dos versiones de TypeScript, a propósito:** `packages/contracts` usa la 5.9.3 y `apps/api` y `apps/web` la 7.0.2, porque `openapi-typescript` no funciona con la 7 (ADR 0003).
- **El repositorio es público.** No publiques secretos, datos personales ni datos de la semilla que no quieras compartir.
- **Puerto 3000 ocupado:** pueden quedar procesos `node --watch` antiguos. Para probar a mano: `API_PORT=3005 pnpm --filter @tienda/api dev`.
- Los scripts de `scripts/` y de `packages/contracts/scripts/` se ejecutan con Node directamente y **no pasan por `typecheck`**: mantenlos pequeños y con pruebas (`node --test`).

## Flujo de trabajo

- **Ninguna fase se ejecuta sin aprobación.** Cada fase empieza con la skill `plan-fase` (`/plan-fase N`, o al mencionarla): entrega un resumen y un miniplan y espera confirmación antes de tocar nada.
- **Fases grandes:** el subagente `planner` guarda un plan con pasos verificables en `docs/plans/`. No escribe código de la app. Si se usa, que termine antes de empezar a implementar: el plan de la 5a divergió porque se escribió mientras se ejecutaba.
- **Ramas y PR:** cada cambio va en una rama; subir la rama, abrir el PR y fusionarlo solo con orden explícita del usuario.
- **Revisión:** el subagente `reviewer` revisa solo el diff `main...HEAD` (necesita un repositorio git con rama `main` y trabajo en otra rama). Verifica sus hallazgos contra el código real antes de corregirlos: no todos se reproducen.
- **Documentación:** antes de abrir un PR que cambie comandos, estructura de carpetas o variables de entorno, pasa el subagente `docs-keeper`, que compara `README.md` y los `CLAUDE.md` con el código real. No edita: solo informa.
- **Verificación honesta:** si una comprobación no se ejecutó o no existe, dilo. Nunca afirmes que algo pasó sin haberlo ejecutado. Las pruebas nuevas se validan rompiendo temporalmente el código y comprobando que fallan.

## Reglas del dominio y los datos

- Cada perfume pertenece a exactamente una marca.
- Las marcas son reales (nicho). Las notas olfativas deben salir de una fuente fiable, nunca de memoria ni de un modelo de lenguaje. Los precios los define el dueño de la tienda; no los inventes.
- Las imágenes son placeholders por ahora; el modelo debe permitir sustituirlas por fotos propias vía `imageUrl`.
- Valida las entradas en el backend; la validación del cliente solo mejora la experiencia.
- Actualiza `packages/contracts/openapi.yaml` en el mismo cambio que cada endpoint.

## Decisiones pendientes

- Cualquier otra dependencia no listada en la guía (por ejemplo `react-router` en la Fase 6): consultar antes de instalar.
- Licencia: el repositorio es público pero no tiene `LICENSE`; decide el dueño.
