# CLAUDE.md — apps/api

Guía para trabajar en la API (`@tienda/api`). Las reglas transversales (flujo de trabajo, contrato primero, datos del dominio) están en el [`CLAUDE.md` raíz](../../CLAUDE.md).

## Qué es

API HTTP de solo lectura del catálogo de perfumes: Fastify 5 + TypeScript + Zod 4 + Prisma 7 sobre PostgreSQL. Expone `GET /health` y `/brands...`; su contrato es `packages/contracts/openapi.yaml` y sus convenciones están en `docs/decisions/0007-convenciones-http-de-la-api.md`.

## Estructura

```text
src/
  server.ts          Punto de entrada: configuración, Prisma, apagado ordenado (SIGINT/SIGTERM)
  app.ts             buildApp(config, { catalog }): CORS, errores y rutas. `onRoute` es solo para pruebas
  config.ts          Variables de entorno validadas con Zod (DATABASE_URL es obligatoria)
  errors.ts          NotFoundError y RequestValidationError (neutrales: no dependen de HTTP)
  zod-es.ts          Mensajes de Zod en español
  catalog/           Rutas → controlador → servicio → repositorio, DTO, esquemas y orden
  db/client.ts       Fábrica de PrismaClient con el adaptador pg
  http/              Manejo de errores, parseRequest y registro de peticiones
  routes/health.ts   GET /health
  test/              Ayudantes de prueba: contrato, datos falsos, base de pruebas y sus salvaguardas
  contract/          Pruebas que comparan la API con openapi.yaml
  generated/         Cliente de Prisma generado (ignorado por git)
prisma/              schema.prisma, migraciones, semilla y su prueba
```

## Cómo se ejecuta

- **Node ejecuta TypeScript directamente en desarrollo, sin `tsx`.** Reglas: imports con extensión `.ts`, `import type` para los tipos y sintaxis "borrable" (`erasableSyntaxOnly`: sin `enum`, `namespace` ni parameter properties). `pnpm build` compila a `dist/` con `tsc` y reescribe las extensiones.
- `pnpm --filter @tienda/api dev` usa `node --watch` y lee el `.env` raíz. Si el puerto 3000 está ocupado: `API_PORT=3005 pnpm --filter @tienda/api dev`.
- La API **exige `DATABASE_URL`** al arrancar. `GET /health` no consulta la base de datos.
- Variables: `API_PORT` (3000), `API_HOST` (127.0.0.1), `WEB_ORIGIN` (único origen aceptado por CORS), `DATABASE_URL` y `TEST_DATABASE_URL`. Ver `.env.example`.

## Cómo añadir o cambiar un endpoint (contrato primero)

1. Edita `packages/contracts/openapi.yaml`: operación, parámetros, respuestas (200, 400, 404, 500) y esquemas. El esquema de cada respuesta debe ser un `$ref` a `components/schemas`, y los objetos llevan `additionalProperties: false`.
2. `pnpm contracts:generate` (actualiza `packages/contracts/generated/schema.d.ts`, que se versiona).
3. Añade el esquema Zod de la entrada en `src/catalog/catalog.schemas.ts` (si repite una constante del yaml, como el patrón del slug, la prueba de paridad exige que coincidan).
4. Capas: repositorio (acceso a datos) → servicio (reglas y DTO) → controlador (`parseRequest` y llamada) → ruta.
5. Tipa el DTO con `components['schemas'][...]` de `@tienda/contracts` (ver `catalog.dto.ts`).
6. Pruebas: servicio, rutas (`inject`) y un caso por cada respuesta documentada en `src/contract/contract.test.ts`. Esa prueba falla si el yaml tiene una respuesta sin caso, o una ruta sin documentar.

## Capas y reglas

- **Ruta → controlador → servicio → repositorio.** El controlador valida con `parseRequest` y no tiene reglas; el servicio presenta los datos y lanza `NotFoundError`, sin saber de HTTP; solo el repositorio habla con Prisma. Los registros del repositorio son tipos propios (no los de Prisma).
- **Entrada del cliente:** solo `parseRequest` (Zod → `RequestValidationError` → 400). Un `ZodError` de cualquier otro origen es un fallo interno: 500 registrado.
- **Errores:** forma única `{ error: { code, message } }`. Un 500 no revela el motivo; ningún error repite lo que envió el cliente (salvo slugs ya validados). Los errores que Fastify resuelve antes de las rutas (`frameworkErrors`) también salen con esa forma y con CORS.
- **Registro:** no guarda `?q=` (`src/http/request-log.ts`).
- **Búsqueda `q`:** el recorte de espacios y "en blanco = sin búsqueda" viven **solo en el repositorio**. No se repiten en otras capas.
- Valida siempre en el backend; la validación del cliente solo mejora la experiencia.

## Base de datos y Prisma

- **Prisma fijado en la 7.10.1** (`prisma`, `@prisma/client`, `@prisma/adapter-pg`). La etiqueta `latest` de `prisma` apunta a una candidata 8.x: no la uses.
- `pnpm install` genera el cliente en `src/generated/` (script `postinstall`); `pnpm db:generate` lo regenera. pnpm solo permite scripts de instalación a `prisma` y `@prisma/engines` (`allowBuilds` en `pnpm-workspace.yaml`).
- Migraciones: `pnpm db:migrate`. Las que Prisma no puede generar solas (como `native_uuid`) se escriben a mano. **`prisma migrate reset` lo bloquea Prisma cuando lo lanza una IA:** lo debe ejecutar el usuario.
- Semilla: `pnpm db:seed` (idempotente, no borra). `prisma/seed-data.ts` lleva 4 marcas reales (solo el nombre) y perfumes `[EJEMPLO]` sin precio, tamaño ni datos reales. **El repositorio es público.** Las notas deben salir de una fuente fiable y los precios los define el dueño de la tienda. `prisma/seed-data.test.ts` vigila que no se mezcle relleno con datos reales.
- Modelo y decisiones (precio en céntimos de sol, UUID nativo, slug único por marca): `docs/decisions/0006-modelo-de-datos-del-catalogo.md`.
- **El orden alfabético se hace en el repositorio** con `Intl.Collator('es')` (`src/catalog/sorting.ts`), porque la base ordena por bytes. **La búsqueda distingue tildes**: limitación conocida. Prisma no escapa `%`, `_` ni `\` en `contains`: el repositorio los escapa.

## Pruebas

| Comando                                        | Qué hace                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm --filter @tienda/api test`               | Unitarias y de rutas, **sin Docker** (repositorio en memoria)                          |
| `pnpm --filter @tienda/api test -t "<nombre>"` | Una prueba por nombre. **Sin `--`**: con `--` ejecuta todas                            |
| `pnpm db:test:prepare` y `pnpm test:db`        | Crea y migra la base `perfumeria_test` / pruebas de integración contra PostgreSQL real |

- Las pruebas `*.db.test.ts` **borran datos**: usan `perfumeria_test`, nunca la de desarrollo. Se niegan a ejecutarse (igual que `pnpm db:test:prepare`) si la base de `TEST_DATABASE_URL` no está en esta máquina, si su nombre no cumple `^[a-z0-9_]+_test$`, si es la misma que la de `DATABASE_URL` o si la URL lleva parámetros fuera de una lista blanca (nunca `?host=` ni `?port=`: el cliente `pg` los usa para sustituir al servidor). Las reglas viven en `src/test/safety.ts`.
- `src/contract/contract.test.ts` compara las rutas, las respuestas reales y los parámetros con `openapi.yaml`. El ayudante `src/test/contract.ts` falla ante métodos HTTP o referencias que no sabe comprobar.
- Datos de prueba: `src/test/catalog-fixtures.ts` (inventados, no son del catálogo).

## No hagas esto

- No añadas `tsx`, `dotenv` ni `fastify-type-provider-zod`: el proyecto resuelve esas necesidades con Node y Zod.
- No uses `latest` de Prisma ni cambies los tipos del DTO a mano: salen del contrato.
- No pongas en la semilla datos que no quieras publicar, ni precios o notas que no hayas verificado.
- No registres ni devuelvas lo que escribe el cliente en las búsquedas.
