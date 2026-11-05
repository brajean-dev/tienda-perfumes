# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Tienda web de perfumería de nicho para público hispanohablante, con precios en soles (PEN). La propuesta de valor es que la persona conozca el perfume (notas olfativas y ocasión de uso) antes de elegirlo. Alcance, fuera de alcance y criterios de aceptación: `docs/spec.md`. Vocabulario: `docs/glossary.md`. Decisiones técnicas: `docs/decisions/`.

## Estructura (monorepo pnpm workspaces)

```text
apps/web/            React + Vite + TypeScript
apps/api/            Fastify + TypeScript + Zod (Prisma llega en la Fase 5)
packages/contracts/  Contratos compartidos; fuente OpenAPI en openapi.yaml
docker-compose.yml   PostgreSQL para desarrollo local
```

No sustituyas estas tecnologías ni cambies la estructura sin una instrucción explícita. Antes de añadir una dependencia, comprueba si lo resuelve lo ya instalado; si no, justifícala y consúltala.

## Comandos

Usa siempre `pnpm` (versión fijada en `packageManager`; Node >= 24). Se ejecutan desde la raíz.

| Comando                                        | Qué hace                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm install`                                 | Instala dependencias de todo el workspace                                           |
| `pnpm db:up` / `pnpm db:down`                  | Inicia / detiene PostgreSQL con Docker Compose (requiere `.env` y Docker corriendo) |
| `pnpm format` / `pnpm format:check`            | Aplica / comprueba formato con Prettier                                             |
| `pnpm dev`                                     | API en `:3000` y web en `:5173` en paralelo                                         |
| `pnpm test`, `pnpm build`, `pnpm typecheck`    | Ejecutan Vitest, la compilación y `tsc --noEmit` en cada app                        |
| `pnpm --filter @tienda/api test`               | Pruebas de una sola app (cambia el filtro por `@tienda/web`)                        |
| `pnpm --filter @tienda/api test -t "<nombre>"` | Una sola prueba por nombre (sin `--`: con `--` ejecuta todas)                       |

Detalles del entorno:

- Copia `.env.example` a `.env`. `.env` está ignorado por git y nunca debe contener ni exponer secretos en código de cliente (todo lo `VITE_*` es público; la web lee el `.env` raíz con `envDir`).
- La API ejecuta TypeScript con Node directamente en desarrollo (sin `tsx`): usa imports con extensión `.ts` y sintaxis "borrable" (`erasableSyntaxOnly`; sin `enum` ni parameter properties). `pnpm build` compila a `dist/` con `tsc`.
- El puerto de la web es fijo (`strictPort`): la API solo acepta CORS desde `WEB_ORIGIN`.
- `GET /health` no consulta la base de datos; solo indica que la API responde.

## Flujo de trabajo

- **Ninguna fase se ejecuta sin aprobación.** Cada fase empieza con la skill `plan-fase` (`/plan-fase N`, o al mencionarla): entrega un resumen y un miniplan y espera confirmación antes de tocar nada.
- **Fases grandes (4 a 6):** el subagente `planner` guarda un plan con pasos verificables en `docs/plans/`. No escribe código de la app.
- **Revisión:** el subagente `reviewer` revisa solo el diff `main...HEAD`. Necesita un repositorio git con rama `main` y trabajo en otra rama.
- **Verificación honesta:** si una comprobación no se ejecutó o no existe, dilo. Nunca afirmes que algo pasó sin haberlo ejecutado.

## Reglas del dominio y los datos

- Cada perfume pertenece a exactamente una marca.
- Las marcas son reales (nicho). Las notas olfativas deben salir de una fuente fiable, nunca de memoria ni de un modelo de lenguaje. Los precios los define el dueño de la tienda; no los inventes.
- Las imágenes son placeholders por ahora; el modelo debe permitir sustituirlas por fotos propias vía `imageUrl`.
- Valida las entradas en el backend; la validación del cliente solo mejora la experiencia.
- Actualiza `packages/contracts/openapi.yaml` en el mismo cambio que cada endpoint.

## Decisiones pendientes

- ADR 0003 (`Propuesto`): test que valida respuestas contra el yaml y `openapi-typescript`. No añadas esas dependencias sin aprobación.
- Cualquier otra dependencia no listada en la guía (por ejemplo `react-router` en la Fase 6): consultar antes de instalar.
