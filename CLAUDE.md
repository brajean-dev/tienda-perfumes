# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

Tienda web de perfumería de nicho para público hispanohablante, con precios en soles (PEN). La propuesta de valor es que la persona conozca el perfume (notas olfativas y ocasión de uso) antes de elegirlo. Alcance, fuera de alcance y criterios de aceptación: `docs/spec.md`. Vocabulario: `docs/glossary.md`. Decisiones técnicas: `docs/decisions/`.

## Estructura (monorepo pnpm workspaces)

```text
apps/web/            React + Vite + TypeScript
apps/api/            Fastify + TypeScript + Zod + Prisma
packages/contracts/  Contratos compartidos; fuente OpenAPI en openapi.yaml y tipos generados
docker-compose.yml   PostgreSQL para desarrollo local
```

No sustituyas estas tecnologías ni cambies la estructura sin una instrucción explícita. Antes de añadir una dependencia, comprueba si lo resuelve lo ya instalado; si no, justifícala y consúltala.

## Comandos

Usa siempre `pnpm` (versión fijada en `packageManager`; Node >= 24). Se ejecutan desde la raíz.

| Comando                                        | Qué hace                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm install`                                 | Instala dependencias de todo el workspace                                         |
| `pnpm db:up` / `pnpm db:down`                  | Inicia (espera a que esté sana) / detiene PostgreSQL con Docker Compose           |
| `pnpm db:migrate` / `pnpm db:seed`             | Aplica migraciones de desarrollo (Prisma) / carga los datos semilla (idempotente) |
| `pnpm db:generate`                             | Regenera el cliente de Prisma (`pnpm install` también lo hace en un clon nuevo)   |
| `pnpm db:test:prepare` y `pnpm test:db`        | Crea y migra la base `perfumeria_test` / pruebas de integración contra PostgreSQL |
| `pnpm contracts:generate` / `contracts:check`  | Regenera los tipos desde `openapi.yaml` / comprueba que están al día              |
| `pnpm format` / `pnpm format:check`            | Aplica / comprueba formato con Prettier                                           |
| `pnpm dev`                                     | API en `:3000` y web en `:5173` en paralelo                                       |
| `pnpm test`, `pnpm build`, `pnpm typecheck`    | Ejecutan Vitest, la compilación y `tsc --noEmit` en cada app                      |
| `pnpm --filter @tienda/api test`               | Pruebas de una sola app (cambia el filtro por `@tienda/web`)                      |
| `pnpm --filter @tienda/api test -t "<nombre>"` | Una sola prueba por nombre (sin `--`: con `--` ejecuta todas)                     |

Detalles del entorno:

- Copia `.env.example` a `.env`. `.env` está ignorado por git y nunca debe contener ni exponer secretos en código de cliente (todo lo `VITE_*` es público; la web lee el `.env` raíz con `envDir`).
- La API ejecuta TypeScript con Node directamente en desarrollo (sin `tsx`): usa imports con extensión `.ts` y sintaxis "borrable" (`erasableSyntaxOnly`; sin `enum` ni parameter properties). `pnpm build` compila a `dist/` con `tsc`.
- El puerto de la web es fijo (`strictPort`): la API solo acepta CORS desde `WEB_ORIGIN`.
- `GET /health` no consulta la base de datos; solo indica que la API responde. La API exige `DATABASE_URL` al arrancar y sirve el catálogo en `/brands...` (convenciones: ADR 0007).
- **Cambiar un endpoint = contrato primero:** edita `packages/contracts/openapi.yaml`, ejecuta `pnpm contracts:generate` (actualiza `packages/contracts/generated/schema.d.ts`, que se versiona) y adapta el código. Los DTO de la API se tipan con `components` de `@tienda/contracts`; `pnpm test` falla si las rutas, las respuestas o los tipos generados no coinciden con el yaml. Los esquemas de respuesta del yaml deben ser `$ref` a `components/schemas`.
- `packages/contracts` usa `typescript@5.9.3` (propio); `apps/api` y `apps/web` usan la 7.0.2. Es deliberado: `openapi-typescript` no funciona con TypeScript 7 (ADR 0003).
- En la API, la entrada del cliente se valida en el controlador con `parseRequest` (Zod → `RequestValidationError` → 400); un `ZodError` de otro origen es un fallo interno (500). Los errores de la aplicación (`NotFoundError`, `RequestValidationError`) viven en `src/errors.ts`, sin depender de HTTP. El registro de peticiones no guarda `?q=` (`src/http/request-log.ts`). La opción `onRoute` de `buildApp` es solo para pruebas.
- El puerto 3000 puede estar ocupado por procesos `node --watch` antiguos: para probar a mano usa `API_PORT=3005 pnpm --filter @tienda/api dev`.
- `pnpm test` no necesita Docker. Las pruebas `*.db.test.ts` usan la base `perfumeria_test`, nunca la de desarrollo: se niegan a ejecutarse (igual que `pnpm db:test:prepare`) si la base de `TEST_DATABASE_URL` no está en esta máquina, si su nombre no cumple `^[a-z0-9_]+_test$`, si es la misma que la de `DATABASE_URL` o si la URL lleva parámetros fuera de una lista blanca (nunca `?host=` ni `?port=`: el cliente `pg` los usa para sustituir al servidor). Las reglas viven en `apps/api/src/test/safety.ts`.
- El orden alfabético se hace en el repositorio con `Intl.Collator('es')` (la base ordena por bytes). La búsqueda por nombre distingue tildes: limitación conocida (ADR 0006).
- Las migraciones de Prisma que no se pueden generar solas (como `native_uuid`) se escriben a mano. `prisma migrate reset` lo bloquea Prisma cuando lo lanza una IA: lo debe ejecutar el usuario.
- Prisma está fijado en la 7.10.1 (`latest` apunta a una candidata 8.x: no la uses). El cliente generado va en `apps/api/src/generated/` (ignorado por git). pnpm solo permite scripts de instalación a `prisma` y `@prisma/engines` (`allowBuilds`).
- La semilla (`apps/api/prisma/seed-data.ts`) lleva marcas reales y perfumes `[EJEMPLO]`. El repositorio es público: no pongas allí datos que no quieras publicar. Decisiones del modelo: `docs/decisions/0006-modelo-de-datos-del-catalogo.md`.

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

- Cualquier otra dependencia no listada en la guía (por ejemplo `react-router` en la Fase 6): consultar antes de instalar.
