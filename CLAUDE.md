# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Tienda web de perfumería de nicho para público hispanohablante, con precios en soles (PEN). La propuesta de valor es que la persona conozca el perfume (notas olfativas y ocasión de uso) antes de elegirlo. Alcance, fuera de alcance y criterios de aceptación: `docs/spec.md`. Vocabulario: `docs/glossary.md`. Decisiones técnicas: `docs/decisions/`.

## Estructura (monorepo pnpm workspaces)

```text
apps/web/            React + Vite + TypeScript        (se crea en la Fase 4)
apps/api/            Fastify + TypeScript + Zod + Prisma  (se crea en la Fase 4)
packages/contracts/  Contratos compartidos; fuente OpenAPI en openapi.yaml
docker-compose.yml   PostgreSQL para desarrollo local
```

No sustituyas estas tecnologías ni cambies la estructura sin una instrucción explícita. Antes de añadir una dependencia, comprueba si lo resuelve lo ya instalado; si no, justifícala y consúltala.

## Comandos

Usa siempre `pnpm` (versión fijada en `packageManager`; Node >= 24). Se ejecutan desde la raíz.

| Comando                                                 | Qué hace                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm install`                                          | Instala dependencias de todo el workspace                                           |
| `pnpm db:up` / `pnpm db:down`                           | Inicia / detiene PostgreSQL con Docker Compose (requiere `.env` y Docker corriendo) |
| `pnpm format` / `pnpm format:check`                     | Aplica / comprueba formato con Prettier                                             |
| `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm typecheck` | Delegan en las apps con `pnpm -r --if-present`                                      |

**Aviso:** hasta que existan las apps (Fase 4), `dev`, `test`, `build` y `typecheck` terminan con éxito **sin ejecutar nada**. Un resultado verde antes de la Fase 4 no significa que algo haya pasado.

Entorno: copia `.env.example` a `.env`. `.env` está ignorado por git y nunca debe contener ni exponer secretos en código de cliente (todo lo `VITE_*` es público).

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
- Dependencias de prueba de la web (`jsdom`, `@testing-library/react`) y otras no listadas en la guía: consultar antes de instalar.
