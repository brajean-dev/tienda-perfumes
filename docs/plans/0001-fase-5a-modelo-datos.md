# Plan 0001. Fase 5a: modelo de datos del catálogo (Prisma)

- **Estado:** ejecutado el 2026-11-05 con las diferencias indicadas en "Desviaciones respecto al plan"
- **Fecha:** 2026-11-05
- **Rama:** `fase-5a-modelo-datos` (commits autorizados en la rama; subir, abrir PR y fusionar solo con orden explícita del usuario)
- **Autor:** subagente `planner`. Plan escrito sin shell: ninguna verificación de este documento se ha ejecutado; todas son propuestas.

## Desviaciones respecto al plan

Se añadió tras la ejecución. **El cuerpo de este documento (desde "Objetivo") es el plan original y se conserva como registro histórico, no como guía de comandos.** Menciona cosas que no existen tal como se describen (`PRISMA_DB_TARGET`, `db:test:create`, `db:test:migrate`, `parseDatabaseUrl`, `client.test.ts`, `constraints.db.test.ts`, `seed.db.test.ts`, `TRUNCATE`, `$transaction`). Para los comandos vigentes, ver `CLAUDE.md`; para las decisiones del modelo, el ADR 0006. El plan se escribió mientras se ejecutaba el miniplan aprobado, así que varias piezas se resolvieron de otra forma.

| Plan                                                                                                      | Lo ejecutado                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Base de pruebas elegida con `PRISMA_DB_TARGET=test`; scripts `db:test:create` y `db:test:migrate`         | Variable `TEST_DATABASE_URL` en `.env` y `scripts/db-test-prepare.sh` (`pnpm db:test:prepare`). Las reglas de seguridad (servidor local, nombre `^[a-z0-9_]+_test$`, distinta de la base de desarrollo) están en `apps/api/src/test/safety.ts`, compartidas por las pruebas y por el script, y tienen pruebas unitarias. El script lee el `.env` con `node --env-file`, no lo ejecuta como shell |
| `db:seed` ejecuta `node --env-file-if-exists=... prisma/seed.ts`                                          | `db:seed` usa `prisma db seed`, con `migrations.seed` en `prisma.config.ts`                                                                                                                                                                                                                                                                                                                      |
| `id` con `@db.Uuid`                                                                                       | Se empezó con identificadores de texto (el valor por defecto de Prisma) y se pasó a UUID nativo con la migración `native_uuid`, escrita a mano porque Prisma no convierte texto a `uuid` solo. Coincide con el plan                                                                                                                                                                              |
| Decisión abierta 1: marcas de tiempo en `Perfume`                                                         | Se añadieron `createdAt` y `updatedAt`                                                                                                                                                                                                                                                                                                                                                           |
| Decisión abierta 2: restricciones `CHECK`                                                                 | **No** se añadieron (decisión del usuario, ADR 0006). Los rangos del precio y del tamaño se comprueban en `seed-data.test.ts` y se validarán en la API (5b)                                                                                                                                                                                                                                      |
| Decisiones abiertas 3 y 4                                                                                 | Nombres por defecto de Prisma y semilla que sobrescribe sus propios registros, como proponía el plan                                                                                                                                                                                                                                                                                             |
| Cliente con `parseDatabaseUrl` y `client.test.ts`                                                         | `createPrismaClient` simple, sin esa función ni su prueba                                                                                                                                                                                                                                                                                                                                        |
| Pruebas separadas `constraints.db.test.ts` y `seed.db.test.ts`; `TRUNCATE` y `$transaction` en la semilla | Un único `catalog.repository.db.test.ts`; se limpia con `deleteMany` y la semilla usa `upsert` sin transacción                                                                                                                                                                                                                                                                                   |
| Prueba unitaria `seed-data.test.ts`                                                                       | Existe en `apps/api/prisma/seed-data.test.ts` (estructura, rangos y datos de ejemplo frente a reales) y corre con `pnpm test`, sin Docker                                                                                                                                                                                                                                                        |
| Atajo raíz `db:migrate:deploy`                                                                            | No se añadió. Atajos raíz: `db:generate`, `db:migrate`, `db:seed`, `db:test:prepare` y `test:db`                                                                                                                                                                                                                                                                                                 |
| Documentación: ADR 0003, ADR 0006, `CLAUDE.md`, spec y glosario                                           | Hecho. Además, `pnpm db:up` ahora espera a que PostgreSQL esté sano (`--wait`)                                                                                                                                                                                                                                                                                                                   |

Hallazgos durante la ejecución y la revisión, no previstos en el plan:

- Prisma no escapa los comodines `%`, `_` y `\` en `contains`: la búsqueda los trataba como patrones. Corregido en el repositorio y cubierto por pruebas.
- La base de datos (`postgres:17-alpine`) ordena por bytes, así que "Zeta" iba antes que "alfa". El orden se hace ahora en `src/catalog/sorting.ts` con la colación del español.
- La búsqueda distingue tildes ("dia" no encuentra "Día Claro"). Limitación conocida registrada en el ADR 0006.
- El primer script de preparación de la base de pruebas ejecutaba el `.env` como shell y solo validaba el nombre de la base, no el servidor. Se rehízo tras la revisión.

## Objetivo

Dejar listo el modelo de datos del catálogo y su acceso desde la API, sin exponer nada por HTTP:

1. Comprobar primero que Prisma 7.10.1 funciona en este entorno (Node 24 ejecutando TypeScript de forma nativa, macOS 13 Intel, pnpm con los scripts de instalación bloqueados).
2. Schema Prisma `Brand 1—N Perfume`, migración inicial `init` versionada y semilla idempotente con datos de ejemplo sin contenido inventado.
3. Fábrica de `PrismaClient` (adaptador `@prisma/adapter-pg`) y repositorio del catálogo con interfaz propia, pensado para sustituirlo en las pruebas de 5b.
4. Pruebas de integración contra PostgreSQL real en una base aparte (`perfumeria_test`), sin que `pnpm test` necesite Docker.
5. ADR 0003 pasa a `Aceptado` y nuevo ADR 0006 con las decisiones del modelo.

## Fuera de alcance (Fase 5b o posterior)

- Endpoints HTTP del catálogo, rutas/controladores/servicios Fastify, esquemas Zod de entrada y salida.
- Cambios en `packages/contracts/openapi.yaml` (el contrato del catálogo es 5b).
- Implementar las medidas del ADR 0003 (prueba contra el yaml y `openapi-typescript`): en 5a solo se cambia el estado del ADR; sus dependencias se instalan y justifican en 5b.
- README y `CLAUDE.md` por app (fase 5 según `plan-fase`; se dejan para 5b, cuando haya endpoints que documentar).
- Datos reales de perfumes: notas, precios, tamaños, descripciones o imágenes reales. Pagos, inventario, cuentas, carrito y panel de administración (fuera de la spec).
- Comprobar la base de datos en `GET /health` (CLAUDE.md lo descarta explícitamente).

## Estado actual comprobado en el repo (lectura, 2026-11-05)

| Elemento                              | Estado                                                                                                                                                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/package.json`               | Dependencias: `fastify`, `@fastify/cors`, `zod`; dev: `typescript ^7.0.2`, `vitest ^5.1.0`, `@types/node`. **Sin Prisma.** Scripts: `dev` y `start` con `node --env-file-if-exists=../../.env`, `test: vitest run`, `typecheck: tsc --noEmit`, `build: tsc -p tsconfig.build.json`. |
| `apps/api/tsconfig.json`              | `include: ["src"]`, `NodeNext`, `allowImportingTsExtensions`, `rewriteRelativeImportExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noEmit`. Nada fuera de `src/` se comprueba hoy.                                                                                     |
| `apps/api/tsconfig.build.json`        | Hereda de `tsconfig.json`, `rootDir: "src"`, excluye `src/**/*.test.ts`. Hereda también `include`; si se amplía el `include` base habrá que fijarlo aquí a `["src"]` o `rootDir` fallará.                                                                                           |
| Configuración de Vitest en `apps/api` | **No existe** (`vitest.config.ts` ausente). Vitest usa el patrón por defecto, que **sí recogería** `*.db.test.ts`: hace falta una configuración que los excluya.                                                                                                                    |
| `apps/api/src`                        | `app.ts`, `server.ts`, `config.ts` (Zod para `API_PORT`, `API_HOST`, `WEB_ORIGIN`; no valida `DATABASE_URL`), `routes/health.ts` y pruebas. No existen `src/db/`, `src/catalog/` ni `prisma/`.                                                                                      |
| `package.json` raíz                   | `pnpm@12.16.1`, Node `>=24`. Scripts `dev`, `test`, `build`, `typecheck`, `format`, `format:check`, `db:up`, `db:down`.                                                                                                                                                             |
| `pnpm-workspace.yaml`                 | Solo `packages`. Sin configuración de scripts de instalación permitidos.                                                                                                                                                                                                            |
| `docker-compose.yml`                  | `postgres:17-alpine`, puerto `127.0.0.1:5432`, credenciales desde `.env`, volumen `db-data`. Sin script de inicialización para una segunda base.                                                                                                                                    |
| `.env.example`                        | `POSTGRES_*`, `DATABASE_URL`, `API_*`, `WEB_ORIGIN`, `VITE_API_URL`. **Falta `TEST_DATABASE_URL`.**                                                                                                                                                                                 |
| `.gitignore` / `.prettierignore`      | No ignoran `src/generated/`. Sin cambios, el cliente generado se versionaría y `pnpm format:check` lo revisaría.                                                                                                                                                                    |
| `packages/contracts/openapi.yaml`     | Solo `/health`. No se toca en 5a.                                                                                                                                                                                                                                                   |
| `docs/decisions/`                     | 0000 a 0005. ADR 0003 en `Propuesto`. No existe 0006.                                                                                                                                                                                                                               |
| `docs/plans/`                         | No existía; este es el plan 0001.                                                                                                                                                                                                                                                   |
| `CLAUDE.md`                           | Dice "Prisma llega en la Fase 5" y lista el ADR 0003 como `Propuesto` en "Decisiones pendientes": quedará desactualizado si no se toca.                                                                                                                                             |

No se pudo comprobar (sin shell): versión real de Node instalada, si existe `pnpm-lock.yaml`, si la rama `fase-5a-modelo-datos` ya existe, si Docker está corriendo, ni la sintaxis exacta con la que pnpm 12 aprueba scripts de instalación.

## Convenciones del plan

- Todos los comandos se ejecutan desde la raíz del repo salvo que se indique `cd apps/api`.
- `pnpm --filter @tienda/api <script> <args>`: los argumentos van **sin** `--` (como indica CLAUDE.md).
- Nunca mostrar ni copiar el contenido de `.env` en la salida, en commits ni en el plan.
- Cada grupo de pasos termina con un commit en la rama (mensaje sugerido). Nada de `git push`.

---

## Bloque A. Prueba de viabilidad (puerta de entrada)

Los pasos 0 a 3 son la prueba de viabilidad. **Si alguno cumple un criterio de parada (ver "Puerta de viabilidad" tras el paso 3), se detiene la fase y se consulta al usuario antes de seguir.**

### Paso 0. Comprobar el punto de partida

- **Acción:** confirmar rama, versión de Node y que el árbol está limpio y verde antes de cambiar nada.
- **Archivos:** ninguno.
- **Verificación:**
  - `git branch --show-current` imprime `fase-5a-modelo-datos` (si no existe: `git switch -c fase-5a-modelo-datos` desde `main`).
  - `git status --porcelain` no imprime nada (salvo este plan, si aún no está en un commit).
  - `node --version` imprime `v24.x.y`.
  - `uname -m` imprime `x86_64` (confirma Intel).
  - `pnpm test && pnpm typecheck && pnpm format:check` terminan con código 0 (línea base; si falla, se para: no es culpa de 5a).

### Paso 1. Instalar Prisma con versiones exactas

- **Acción:**
  - `pnpm --filter @tienda/api add -E @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1`
  - `pnpm --filter @tienda/api add -D -E prisma@7.10.1`
  - Nunca `prisma@latest` (apunta a `8.0.0-rc.30`). `-E` deja la versión sin `^`.
  - Leer la salida de pnpm: si avisa de scripts de instalación ignorados, anotar **exactamente** qué paquetes nombra (se esperan `prisma` y/o `@prisma/engines`; posiblemente otros).
- **Archivos:** `apps/api/package.json`, `pnpm-lock.yaml`.
- **Verificación:**
  - `apps/api/package.json` contiene `"@prisma/client": "7.10.1"`, `"@prisma/adapter-pg": "7.10.1"` en `dependencies` y `"prisma": "7.10.1"` en `devDependencies`, sin `^` ni `~`.
  - `pnpm --filter @tienda/api exec prisma --version` imprime `prisma 7.10.1` y `@prisma/client 7.10.1`, y muestra la plataforma `darwin` (x64) sin errores de motor.
  - `pnpm --filter @tienda/api why pg` muestra `pg` solo como dependencia transitiva de `@prisma/adapter-pg` (no directa).

### Paso 2. Aprobar solo los scripts de instalación imprescindibles

- **Acción:** si en el paso 1 pnpm bloqueó scripts, aprobar **solo** los paquetes de Prisma que lo necesiten, en `pnpm-workspace.yaml`. Antes de escribir la clave, comprobar en la documentación de pnpm 12 (o en el propio mensaje de aviso, que suele indicar el comando, p. ej. `pnpm approve-builds`) cuál es la sintaxis vigente; en pnpm 10 era `onlyBuiltDependencies: [...]` y versiones posteriores introdujeron otra forma. **No suponerla.** Si se usa `pnpm approve-builds`, seleccionar únicamente los paquetes de Prisma y revisar el diff que genera.
  - Si pnpm no bloqueó nada y Prisma funciona (paso 3), no se toca `pnpm-workspace.yaml`.
- **Archivos:** `pnpm-workspace.yaml` (solo si hace falta), `pnpm-lock.yaml`.
- **Verificación:**
  - `git diff pnpm-workspace.yaml` muestra únicamente la lista de paquetes de Prisma aprobados (ningún comodín, ningún paquete ajeno).
  - `pnpm install` termina sin avisos de scripts ignorados para paquetes de Prisma.
  - `pnpm --filter @tienda/api exec prisma --version` sigue mostrando el motor de esquema (`schema-engine`) para darwin sin errores de descarga.

### Paso 3. Configuración mínima, schema real y prueba de humo

Se usa ya el schema definitivo (paso 4) para no duplicar trabajo; lo que se prueba aquí es el entorno.

- **Acción:**
  1. Crear `apps/api/prisma.config.ts`:
     - Carga el `.env` de la raíz con `process.loadEnvFile(ruta)` **solo si el archivo existe** (`existsSync`), porque `loadEnvFile` lanza si falta y `postinstall` debe funcionar sin `.env`. La ruta se resuelve respecto al propio archivo (`fileURLToPath(new URL('../../.env', import.meta.url))`); si el cargador de configuración de Prisma no soporta `import.meta.url`, usar `path.resolve(process.cwd(), '../../.env')` (los scripts se ejecutan con `cwd = apps/api`) y documentarlo en un comentario.
     - Exporta `defineConfig` de `prisma/config` con `schema: 'prisma/schema.prisma'`, `migrations: { path: 'prisma/migrations', seed: 'node --env-file-if-exists=../../.env prisma/seed.ts' }` y `datasource: { url }`.
     - Selección de URL: `url = process.env.PRISMA_DB_TARGET === 'test' ? TEST_DATABASE_URL : DATABASE_URL`. Si `PRISMA_DB_TARGET=test` y falta `TEST_DATABASE_URL`, o su base no termina en `_test`, lanzar un error claro (evita migrar la base de desarrollo por error).
     - **No** usar el helper `env()` de `prisma/config` para `DATABASE_URL` si lanza cuando falta: usar `process.env.DATABASE_URL ?? ''` para que `prisma generate` funcione sin URL. Los comandos que sí necesitan base (migrate, seed) fallarán con un mensaje del propio Prisma si la URL está vacía.
     - Sin `dotenv`.
  2. Crear `apps/api/prisma/schema.prisma`:
     - `generator client { provider = "prisma-client", output = "../src/generated/prisma", moduleFormat = "esm", importFileExtension = "ts" }` (comprobar en la documentación de Prisma 7.10 si además conviene `runtime = "nodejs"` y `generatedFileExtension = "ts"`; solo añadirlos si la documentación lo indica para este caso).
     - `datasource db { provider = "postgresql" }` **sin `url`** (en Prisma 7 la URL va en `prisma.config.ts`).
     - Modelos tal como se detallan en el paso 4.
  3. Añadir `apps/api/src/generated/` a `.gitignore` y a `.prettierignore`.
  4. Prueba de humo temporal **no versionada**: `apps/api/spike-prisma.ts` que importa `PrismaClient` desde `./src/generated/prisma/client.ts` y `PrismaPg` desde `@prisma/adapter-pg`, crea el cliente con `new PrismaPg({ connectionString: process.env.DATABASE_URL })`, ejecuta ``await prisma.$queryRaw`SELECT 1 AS ok` ``, lo imprime y hace `$disconnect()`. Se borra al terminar el bloque A.
- **Archivos:** `apps/api/prisma.config.ts`, `apps/api/prisma/schema.prisma`, `.gitignore`, `.prettierignore`, `apps/api/spike-prisma.ts` (temporal, se borra).
- **Verificación (en este orden):**
  1. Generación sin base de datos y sin `.env`: `mv .env .env.bak && pnpm --filter @tienda/api exec prisma generate; mv .env.bak .env` termina con "Generated Prisma Client (7.10.1)" en `apps/api/src/generated/prisma` y código 0. (Restaurar `.env` aunque falle.)
  2. `git status --porcelain` no lista nada bajo `apps/api/src/generated/`.
  3. TypeScript nativo de Node sobre el cliente generado: `pnpm db:up` y luego `cd apps/api && node --env-file=../../.env spike-prisma.ts` imprime `[ { ok: 1 } ]` y termina con código 0, sin `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, `ERR_MODULE_NOT_FOUND` ni errores de import sin extensión.
  4. Motor de migraciones en macOS 13 Intel, sin tocar la base: `pnpm --filter @tienda/api exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` imprime SQL con `CREATE TABLE "Brand"`, `CREATE TABLE "Perfume"` y `ON DELETE RESTRICT`. (Comprobar en `prisma migrate diff --help` de 7.10.1 los nombres exactos de las opciones; en versiones anteriores era `--to-schema-datamodel`.)
  5. Validación del schema: `pnpm --filter @tienda/api exec prisma validate` indica que el schema es válido.
  6. Tipos del cliente generado con la configuración estricta del proyecto (TypeScript 7, `erasableSyntaxOnly`, `verbatimModuleSyntax`): copiar temporalmente el contenido de la prueba a `apps/api/src/spike.ts` (ajustando el import a `./generated/prisma/client.ts`), ejecutar `pnpm --filter @tienda/api typecheck` (código 0) y borrarlo. (`tsc --noEmit archivo.ts` no sirve: ignora el tsconfig.)
  7. Al terminar: borrar `spike-prisma.ts` y `src/spike.ts`; `git status --porcelain` solo muestra los archivos versionables del bloque.
- **Commit sugerido:** `chore(api): instala Prisma 7.10.1 y configura schema y prisma.config`

### Puerta de viabilidad: criterios de parada

Se detiene la fase y se informa al usuario (sin improvisar soluciones fuera del alcance) si ocurre cualquiera de estos casos tras **como máximo dos intentos razonables** por punto, siempre dentro de las opciones documentadas de Prisma 7.10.1:

| #   | Síntoma                                                                                                   | Qué se puede intentar sin consultar                                                                                      | Alternativas que requieren decisión del usuario                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | `pnpm add` de 7.10.1 falla o el motor de esquema no se descarga para darwin x64                           | Aprobar el script de instalación (paso 2); reintentar con red                                                            | Ejecutar el CLI de Prisma dentro de un contenedor Docker; otra versión 7.x estable (nunca 8.0.0-rc)                                                                                                     |
| P2  | Node no puede ejecutar el cliente generado (sintaxis no borrable, imports sin extensión, ESM/CJS)         | Ajustar opciones documentadas del generador (`importFileExtension`, `moduleFormat`, `generatedFileExtension`, `runtime`) | (a) compilar el cliente generado con `tsc` a JS dentro del flujo de `db:generate`; (b) ejecutar la API en desarrollo desde `dist/`; (c) **volver a `tsx`: dependencia nueva, prohibida sin aprobación** |
| P3  | `pnpm typecheck` falla por código generado (TypeScript 7, `erasableSyntaxOnly`, `verbatimModuleSyntax`)   | Ninguna fuera de las opciones del generador; no relajar el tsconfig por cuenta propia                                    | Relajar una opción concreta solo para el código generado (tsconfig aparte), u otras de P2                                                                                                               |
| P4  | `migrate diff` o `migrate dev` fallan por el motor de esquema en macOS 13 Intel                           | Revisar el script de instalación de `@prisma/engines` (paso 2)                                                           | CLI de Prisma en contenedor Docker para migraciones; otra versión 7.x estable                                                                                                                           |
| P5  | pnpm sigue bloqueando scripts aunque se aprueben, o la aprobación exige permitir paquetes ajenos a Prisma | Revisar la documentación de pnpm 12                                                                                      | Que el usuario acepte la lista ampliada de paquetes aprobados                                                                                                                                           |
| P6  | `prisma generate` exige `DATABASE_URL` aunque `prisma.config.ts` no lo use                                | Pasar `url` condicional o vacía según la documentación                                                                   | Separar `postinstall` en un script que defina una URL ficticia solo para generar                                                                                                                        |

Prohibido en cualquier caso: usar `prisma@8.0.0-rc.*` o `latest`, añadir `dotenv`, `tsx` o `pg` como dependencia directa, o cambiar la forma de ejecutar la API sin aprobación.

---

## Bloque B. Modelo y migración

### Paso 4. Schema definitivo del catálogo

- **Acción:** completar `apps/api/prisma/schema.prisma` con:
  - `Brand`: `id String @id @default(uuid()) @db.Uuid`, `slug String @unique`, `name String`, `description String?`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `perfumes Perfume[]`.
  - `Perfume`: `id String @id @default(uuid()) @db.Uuid`, `slug String`, `name String`, `description String?`, `sizeMl Int?`, `priceCents Int?` (comentario `///`: céntimos de sol PEN; `null` = precio por definir), `imageUrl String?`, `notesTop String[] @default([])`, `notesHeart String[] @default([])`, `notesBase String[] @default([])`, `occasions String[] @default([])` (comentario: texto libre), `brandId String @db.Uuid`, `brand Brand @relation(fields: [brandId], references: [id], onDelete: Restrict)`, `@@unique([brandId, slug])`, `@@index([brandId])`.
  - `@default([])` en las listas: evita `NULL` en columnas `TEXT[]` y simplifica el mapeo; no cambia ninguna decisión aprobada.
  - Nombres de tablas y columnas: los de Prisma por defecto (`"Brand"`, `"Perfume"`, `"brandId"`), sin `@@map` (ver decisiones abiertas).
  - Sin `createdAt`/`updatedAt` en `Perfume`, tal como se aprobó (ver decisiones abiertas).
- **Archivos:** `apps/api/prisma/schema.prisma`.
- **Verificación:**
  - `pnpm --filter @tienda/api exec prisma validate` indica que el schema es válido.
  - `pnpm --filter @tienda/api exec prisma format` no informa cambios ni modifica el archivo (comparar con `git diff` si el schema ya está en un commit).
  - `pnpm --filter @tienda/api exec prisma generate` termina con código 0.

### Paso 5. Scripts de base de datos

- **Acción:** añadir en `apps/api/package.json`:
  - `"db:generate": "prisma generate"`
  - `"db:migrate": "prisma migrate dev"`
  - `"db:migrate:deploy": "prisma migrate deploy"`
  - `"db:seed": "node --env-file-if-exists=../../.env prisma/seed.ts"` (ejecución directa con Node nativo; `migrations.seed` de `prisma.config.ts` usa el mismo comando para que `prisma migrate reset` también siembre)
  - `"db:test:migrate": "PRISMA_DB_TARGET=test prisma migrate deploy"` (sintaxis POSIX; válida en macOS/zsh, no en Windows `cmd`)
  - `"test:db": "vitest run --config vitest.db.config.ts"`
  - `"postinstall": "prisma generate"`

  Y en el `package.json` raíz (atajos):
  - `"db:generate": "pnpm --filter @tienda/api db:generate"`, `"db:migrate": "pnpm --filter @tienda/api db:migrate"`, `"db:migrate:deploy": "pnpm --filter @tienda/api db:migrate:deploy"`, `"db:seed": "pnpm --filter @tienda/api db:seed"`, `"db:test:migrate": "pnpm --filter @tienda/api db:test:migrate"`, `"test:db": "pnpm --filter @tienda/api test:db"`
  - `"db:test:create": "docker compose exec -T db sh -c 'createdb -U \"$POSTGRES_USER\" perfumeria_test'"` (crea la base de pruebas dentro del contenedor usando el usuario del propio contenedor; si ya existe, falla con `database "perfumeria_test" already exists`, que es inocuo).

- **Archivos:** `apps/api/package.json`, `package.json`.
- **Verificación:**
  - `mv .env .env.bak && pnpm install; mv .env.bak .env`: `pnpm install` termina con código 0 y la salida muestra que `@tienda/api` ejecutó `postinstall` (`prisma generate`) sin pedir `DATABASE_URL`.
  - `rm -rf apps/api/src/generated && pnpm db:generate` vuelve a crear `apps/api/src/generated/prisma/client.ts`.
  - `pnpm run` en la raíz lista los nuevos atajos.

### Paso 6. Migración inicial `init`

- **Acción:** resolver antes las decisiones abiertas 1 a 3 (cambian la migración). Con PostgreSQL arriba (`pnpm db:up`), `pnpm --filter @tienda/api db:migrate --name init`. Revisar el SQL generado antes de hacer commit.
- **Archivos:** `apps/api/prisma/migrations/<timestamp>_init/migration.sql`, `apps/api/prisma/migrations/migration_lock.toml`.
- **Verificación:**
  - Existe exactamente una carpeta `*_init` y `migration_lock.toml` con `provider = "postgresql"`.
  - `migration.sql` contiene `CREATE TABLE "Brand"`, `CREATE TABLE "Perfume"`, columnas `TEXT[]` para las cuatro listas, `"priceCents" INTEGER` sin `NOT NULL`, `CREATE UNIQUE INDEX "Brand_slug_key"`, `CREATE UNIQUE INDEX "Perfume_brandId_slug_key"`, `CREATE INDEX "Perfume_brandId_idx"` y la clave foránea con `ON DELETE RESTRICT`.
  - `pnpm --filter @tienda/api exec prisma migrate status` indica "Database schema is up to date".
  - Volver a ejecutar `pnpm --filter @tienda/api db:migrate` no crea una migración nueva ("Already in sync").
- **Commit sugerido:** `feat(api): modelo Brand/Perfume y migración init`

---

## Bloque C. Acceso a datos

### Paso 7. Fábrica del cliente y validación de `DATABASE_URL`

- **Acción:** crear `apps/api/src/db/client.ts`:
  - `parseDatabaseUrl(value: string | undefined, name = 'DATABASE_URL'): string`: Zod, `z.url({ protocol: /^postgres(ql)?$/ })`; si falla, lanza `Error` con el nombre de la variable y `z.prettifyError`, **sin incluir el valor** (puede llevar contraseña).
  - `createPrismaClient(databaseUrl: string): PrismaClient`: `new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })`.
  - Solo sintaxis borrable (sin `enum` ni parameter properties); imports con extensión `.ts` (`../generated/prisma/client.ts`) e `import type` donde corresponda.
  - No se cambia `config.ts` ni `server.ts`: la API todavía no usa la base en 5a (se conecta en 5b).
  - Prueba unitaria sin base de datos `apps/api/src/db/client.test.ts`: acepta `postgresql://` y `postgres://`; rechaza `undefined`, cadena vacía, `http://...` y texto libre; el mensaje de error no contiene la contraseña de la URL de entrada.
- **Archivos:** `apps/api/src/db/client.ts`, `apps/api/src/db/client.test.ts`.
- **Verificación:**
  - `pnpm --filter @tienda/api test -t "parseDatabaseUrl"` pasa.
  - `pnpm --filter @tienda/api typecheck` termina con código 0.

### Paso 8. Repositorio del catálogo

- **Acción:** crear `apps/api/src/catalog/catalog.repository.ts` con:
  - Tipos propios (no tipos de Prisma en la interfaz, para poder sustituir la implementación en 5b): `BrandSummary { id, slug, name, description, perfumeCount }`, `BrandDetail { id, slug, name, description }`, `PerfumeSummary { id, slug, name, sizeMl, priceCents, imageUrl }`, `PerfumeDetail` (todos los campos del perfume más `brand: { slug, name }`). Campos opcionales como `string | null` / `number | null`.
  - Interfaz `CatalogRepository`:
    - `listBrands(): Promise<BrandSummary[]>`: ordenadas por `name` ascendente; `perfumeCount` vía `_count`.
    - `getBrandBySlug(slug): Promise<BrandDetail | null>`.
    - `listPerfumesByBrand(brandSlug, options?: { q?: string }): Promise<PerfumeSummary[] | null>`: `null` si la marca no existe (para que 5b distinga 404 de lista vacía); `q` se recorta y, si queda vacía, no filtra; filtro `name contains q, mode: 'insensitive'`; orden por `name` ascendente.
    - `getPerfume(brandSlug, perfumeSlug): Promise<PerfumeDetail | null>`: `findFirst` con `slug` y `brand: { slug: brandSlug }`.
  - Implementación como **función fábrica** `createPrismaCatalogRepository(prisma: PrismaClient): CatalogRepository` que devuelve un objeto (no clase con parameter properties, prohibidas por `erasableSyntaxOnly`). Mapea explícitamente a los tipos propios con `select`, sin devolver objetos de Prisma tal cual.
  - La validación de `q` (longitud máxima, etc.) es responsabilidad de Zod en 5b; el repositorio no la duplica.
- **Archivos:** `apps/api/src/catalog/catalog.repository.ts`.
- **Verificación:**
  - `pnpm --filter @tienda/api typecheck` termina con código 0.
  - `grep -nE "constructor|enum " apps/api/src/catalog/catalog.repository.ts apps/api/src/db/client.ts` no devuelve nada.
  - El comportamiento se verifica con las pruebas de integración del paso 11.
- **Commit sugerido:** `feat(api): cliente Prisma con adaptador pg y repositorio del catálogo`

---

## Bloque D. Semilla

### Paso 9. Datos y lógica de la semilla

- **Acción:**
  - `apps/api/prisma/seed-data.ts`: tipos simples propios y una constante con 4 marcas reales **solo con nombre** (`description: null`):
    - `byredo` / `Byredo`, `le-labo` / `Le Labo`, `maison-francis-kurkdjian` / `Maison Francis Kurkdjian`, `xerjoff` / `Xerjoff`.
    - 2 perfumes por marca con slugs `ejemplo-1` y `ejemplo-2` (el mismo slug en todas las marcas demuestra la unicidad por marca), nombres `[EJEMPLO] Perfume 1` / `[EJEMPLO] Perfume 2`, `description: null`, `sizeMl: null`, `priceCents: null`, `imageUrl: null`, `notesTop: ['[Ejemplo] nota de salida']`, `notesHeart: ['[Ejemplo] nota de corazón']`, `notesBase: ['[Ejemplo] nota de fondo']`, `occasions: ['[Ejemplo] ocasión de uso']`.
    - Comentario al inicio del archivo: los datos de perfumes son ficticios; las notas reales deben venir de una fuente fiable y los precios los define Brajean (CLAUDE.md).
  - `apps/api/prisma/seed-catalog.ts` (archivo adicional a los dos previstos, para poder probar la lógica sin ejecutar el punto de entrada): `seedCatalog(prisma, data)` hace `upsert` de cada marca por `slug` y de cada perfume por `brandId_slug`; en `update` aplica los valores de `seed-data.ts` (la semilla es la fuente de verdad de esos registros); **nunca** elimina filas (ni `delete`, ni `deleteMany`, ni `TRUNCATE`). Todo dentro de una transacción interactiva (`$transaction`). Devuelve el número de marcas y perfumes procesados.
  - `apps/api/prisma/seed.ts`: punto de entrada mínimo: `parseDatabaseUrl(process.env.DATABASE_URL)`, `createPrismaClient`, `seedCatalog`, imprime `Semilla aplicada: 4 marcas, 8 perfumes (totales en BD: marcas=N, perfumes=M)`, `$disconnect()` en `finally`, `process.exitCode = 1` si falla.
  - Prueba unitaria sin base de datos `apps/api/prisma/seed-data.test.ts` (salvaguarda para el repo público; el `describe` debe contener la palabra `seed`): los slugs cumplen `^[a-z0-9]+(-[a-z0-9]+)*$`; no hay slugs de marca repetidos ni slugs de perfume repetidos dentro de una marca; todas las marcas tienen `description === null`; cada perfume empieza por `[EJEMPLO]`, tiene `priceCents`, `sizeMl`, `imageUrl` y `description` a `null`, y cada nota y ocasión empieza por `[Ejemplo]`.
  - Ampliar `apps/api/tsconfig.json` `include` a `["src", "prisma", "prisma.config.ts", "vitest.config.ts", "vitest.db.config.ts"]` y fijar en `tsconfig.build.json` `"include": ["src"]` para que `rootDir: "src"` siga siendo válido y la compilación no incluya la semilla.
- **Archivos:** `apps/api/prisma/seed-data.ts`, `apps/api/prisma/seed-catalog.ts`, `apps/api/prisma/seed.ts`, `apps/api/prisma/seed-data.test.ts`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`.
- **Verificación:**
  - `pnpm --filter @tienda/api test -t "seed"` pasa (pruebas de `seed-data.test.ts`).
  - `pnpm --filter @tienda/api typecheck` y `pnpm --filter @tienda/api build` terminan con código 0; `ls apps/api/dist` no contiene `prisma/` ni archivos de semilla.
  - `pnpm db:seed` imprime `Semilla aplicada: 4 marcas, 8 perfumes (totales en BD: marcas=4, perfumes=8)`.
  - Ejecutar `pnpm db:seed` una segunda vez imprime los mismos totales (4 y 8).
  - `grep -rniE "delete|truncate" apps/api/prisma/seed*.ts` no devuelve nada (redactar los comentarios sin esas palabras).
- **Commit sugerido:** `feat(api): semilla idempotente con marcas reales y perfumes de ejemplo`

---

## Bloque E. Pruebas de integración contra PostgreSQL real

### Paso 10. Separar pruebas unitarias e integración; base `perfumeria_test`

- **Acción:**
  - `apps/api/vitest.config.ts`: `defineConfig` de `vitest/config`, `test.exclude: [...configDefaults.exclude, '**/*.db.test.ts', 'src/generated/**']`. Así `pnpm test` no necesita Docker.
  - `apps/api/vitest.db.config.ts`: carga el `.env` raíz con `process.loadEnvFile` si existe (los workers heredan `process.env`); `test.include: ['src/**/*.db.test.ts', 'prisma/**/*.db.test.ts']`; `fileParallelism: false` (todas las pruebas comparten una base); `testTimeout` algo mayor (p. ej. 15 000 ms). Confirmar los nombres de opciones en la documentación de Vitest 5.
  - `apps/api/src/test/db.ts` (ayudante solo para pruebas): lee `TEST_DATABASE_URL`, la valida con `parseDatabaseUrl`, y **aborta** si falta, si el nombre de la base no termina en `_test` o si coincide con `DATABASE_URL`, con un mensaje que indica `pnpm db:test:create && pnpm db:test:migrate`. Expone `createTestClient()` y `resetCatalog(prisma)` que ejecuta `TRUNCATE "Perfume", "Brand"` (solo tras las comprobaciones anteriores; la regla "nunca borra" es de la semilla, no de las pruebas sobre la base aparte).
  - `.env.example`: añadir, con comentario, `TEST_DATABASE_URL=postgresql://perfumeria:change-me@localhost:5432/perfumeria_test` ("base aparte para `pnpm test:db`; nunca apuntes a la de desarrollo"). El usuario debe añadir esa línea a su `.env` a mano (el agente no lee ni escribe `.env`).
- **Archivos:** `apps/api/vitest.config.ts`, `apps/api/vitest.db.config.ts`, `apps/api/src/test/db.ts`, `.env.example`.
- **Verificación:**
  - `pnpm db:up && pnpm db:test:create` termina con código 0 la primera vez (la segunda: `already exists`, aceptable).
  - `pnpm db:test:migrate` aplica `init` sobre `perfumeria_test` ("All migrations have been successfully applied").
  - `PRISMA_DB_TARGET=test pnpm --filter @tienda/api exec prisma migrate status` indica "up to date" y la salida nombra la base `perfumeria_test`.
  - Con una `TEST_DATABASE_URL` temporal que apunte a `perfumeria` (sin `_test`), `pnpm test:db` falla inmediatamente con el mensaje del ayudante, sin borrar nada (comprobar después con `pnpm db:seed` que los totales siguen en 4 y 8).

### Paso 11. Pruebas de restricciones, repositorio y semilla

- **Acción:** crear:
  - `apps/api/src/db/constraints.db.test.ts` (con `resetCatalog` en `beforeEach`, `$disconnect` en `afterAll`):
    - Insertar un perfume con `brandId` de una marca inexistente falla (clave foránea) y el número de perfumes no cambia.
    - Insertar un perfume con `"brandId"` nulo vía `$executeRaw` falla (`NOT NULL`): la marca es obligatoria también en la base, no solo en los tipos.
    - Dos perfumes con el mismo `slug` en la misma marca: el segundo falla (comprobar `code: 'P2002'` si el adaptador lo conserva; si no, basta con que rechace y el conteo siga en 1; anotar cuál se observó).
    - El mismo `slug` en dos marcas distintas se permite.
    - Dos marcas con el mismo `slug` fallan.
    - Borrar una marca con perfumes falla (`onDelete: Restrict`); borrar una marca sin perfumes funciona.
    - `priceCents` y `sizeMl` aceptan `null`; las listas omitidas se guardan como `[]`.
  - `apps/api/src/catalog/catalog.repository.db.test.ts` (datos creados en cada prueba, no la semilla):
    - `listBrands` devuelve las marcas ordenadas por nombre con `perfumeCount` correcto, incluida una marca con 0.
    - `getBrandBySlug` devuelve la marca o `null`.
    - `listPerfumesByBrand` devuelve solo los perfumes de esa marca; `null` si la marca no existe; `[]` si existe sin perfumes; `q` insensible a mayúsculas (`"ejemplo"` encuentra `[EJEMPLO] ...`); `q` de solo espacios no filtra; `q` sin coincidencias devuelve `[]`; `q = "%"` no devuelve todo (comprobar que Prisma escapa comodines; si no lo hace, escapar en el repositorio y documentarlo).
    - `getPerfume` devuelve el detalle con `brand.slug`; `null` si el perfume existe pero en otra marca; `null` si no existe.
  - `apps/api/prisma/seed.db.test.ts`:
    - `seedCatalog` aplicado dos veces deja exactamente 4 marcas y 8 perfumes.
    - Una marca creada a mano antes de sembrar sigue existiendo después (la semilla no borra).
    - Tras modificar un perfume de ejemplo a mano, sembrar de nuevo restaura los valores de `seed-data.ts` sin duplicar filas.
- **Archivos:** `apps/api/src/db/constraints.db.test.ts`, `apps/api/src/catalog/catalog.repository.db.test.ts`, `apps/api/prisma/seed.db.test.ts`.
- **Verificación:**
  - `pnpm test:db` pasa todas las pruebas de los tres archivos.
  - `pnpm db:seed` después de `pnpm test:db` sigue mostrando totales 4 y 8 en la base de desarrollo (las pruebas no la tocaron).
  - `pnpm db:down && pnpm test` pasa sin Docker; la salida no lista ningún archivo `*.db.test.ts`. Después, `pnpm db:up`.
- **Commit sugerido:** `test(api): pruebas de integración del modelo, repositorio y semilla en perfumeria_test`

---

## Bloque F. Documentación

### Paso 12. ADR 0003, ADR 0006 y documentos que quedan desactualizados

- **Acción:**
  - `docs/decisions/0003-openapi-fuente-del-contrato.md`: `Estado: Aceptado`, fecha 2026-11-05. Decisión: se adoptan **ambas** medidas (prueba Vitest que valida respuestas reales contra `openapi.yaml` y tipos de `apps/web` generados con `openapi-typescript`), implementadas en la Fase 5b. Consecuencias: las dependencias concretas se fijan y justifican en el plan de 5b.
  - Nuevo `docs/decisions/0006-modelo-de-datos-del-catalogo.md` (formato de `0000-plantilla.md`, `Estado: Aceptado`, fecha 2026-11-05):
    - Contexto: spec v0.2 (preguntas abiertas sobre notas, ocasiones y precios), regla de marca única por perfume, repositorio público.
    - Decisiones y alternativas:
      - Notas en tres listas `String[]` (salida, corazón, fondo). Alternativas: lista simple (pierde la pirámide olfativa, que es la propuesta de valor); tabla `Note` normalizada N—M (permite filtrar por nota, pero más complejidad sin caso de uso en v1).
      - Ocasiones como texto libre `String[]`. Alternativas: `enum` de Prisma o lista cerrada (cada ocasión nueva exige una migración; prematuro sin una lista acordada); tabla de catálogo de ocasiones (útil si se filtra por ocasión; revisar entonces).
      - Precio `Int?` en céntimos de PEN; `null` = por definir. Alternativas: `Decimal` (exacto, pero se serializa como cadena y añade conversión); `Float` (errores de redondeo); obligatorio (obligaría a inventar precios).
      - Slug único por marca (`@@unique([brandId, slug])`) y perfume identificado por marca + perfume. Alternativa: slug global (obliga a prefijar la marca en el slug).
      - Además: `uuid` como id, `onDelete: Restrict`, sin moneda en la base (PEN implícito; revisar si hay multimoneda), listas con `@default([])`, Prisma 7.10.1 con `prisma-client` + `@prisma/adapter-pg`, URL en `prisma.config.ts`, cliente generado no versionado.
    - Consecuencias: el cliente se regenera en `postinstall`; la búsqueda `q` es `ILIKE` (sin normalizar tildes); los datos de perfumes son de ejemplo hasta tener una fuente fiable de notas.
  - `CLAUDE.md`: estructura ("Prisma 7 en `apps/api/prisma`"), tabla de comandos con `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:seed`, `db:test:create`, `db:test:migrate`, `test:db`; nota de que `pnpm test` no usa base y `pnpm test:db` sí (base `perfumeria_test`); retirar el ADR 0003 de "Decisiones pendientes".
  - `docs/spec.md` (v0.3): marcar como resueltas en "Preguntas abiertas" el modelado de notas y ocasiones (remitir al ADR 0006) y el mecanismo del ADR 0003; mantener abiertas la lista definitiva de perfumes y el origen de las notas.
  - `docs/glossary.md`: en "Ocasión de uso", sustituir "la lista de ocasiones está por definir" por "texto libre (ADR 0006)".
- **Archivos:** `docs/decisions/0003-openapi-fuente-del-contrato.md`, `docs/decisions/0006-modelo-de-datos-del-catalogo.md`, `CLAUDE.md`, `docs/spec.md`, `docs/glossary.md`.
- **Verificación:**
  - `grep -n "Estado" docs/decisions/0003-openapi-fuente-del-contrato.md docs/decisions/0006-modelo-de-datos-del-catalogo.md` muestra `Aceptado` en ambos.
  - `grep -n "Propuesto" CLAUDE.md` no devuelve nada.
  - `pnpm format:check` termina con código 0.
- **Commit sugerido:** `docs: acepta ADR 0003, añade ADR 0006 y actualiza CLAUDE.md, spec y glosario`

### Paso 13. Verificación final de la fase

- **Acción:** ejecutar la batería completa y una comprobación manual de que la API sigue arrancando (no usa la base en 5a).
- **Archivos:** ninguno.
- **Verificación:**
  - `pnpm install` (con `.env` presente) termina con código 0 y ejecuta `prisma generate`.
  - `pnpm test`, `pnpm typecheck`, `pnpm build` y `pnpm format:check` terminan con código 0.
  - `pnpm db:up && pnpm db:test:migrate && pnpm test:db` pasa.
  - `API_PORT=3005 pnpm --filter @tienda/api dev` y, en otra terminal, `curl -s http://127.0.0.1:3005/health` devuelve `{"status":"ok"}` (puerto 3005 porque el 3000 puede estar ocupado). Detener el proceso después.
  - `git status --porcelain` limpio tras el último commit; `git log --oneline main..HEAD` muestra los commits de la fase; nada subido al remoto.
  - Revisión con el subagente `reviewer` sobre `main...HEAD` (opcional, a criterio del usuario).

---

## Criterios de aceptación de la Fase 5a

1. `prisma`, `@prisma/client` y `@prisma/adapter-pg` fijados exactamente en `7.10.1`; sin `dotenv`, `tsx`, `pg` directo ni otras dependencias nuevas.
2. `pnpm-workspace.yaml` aprueba, como mucho, los scripts de instalación de los paquetes de Prisma que lo necesiten.
3. `prisma.config.ts` carga el `.env` raíz con `process.loadEnvFile` y `prisma generate` funciona sin `.env` ni `DATABASE_URL`.
4. El cliente generado vive en `apps/api/src/generated/prisma`, ignorado por git y Prettier, y Node 24 lo ejecuta sin `tsx`.
5. El schema cumple el modelo aprobado (`@@unique([brandId, slug])`, `@@index([brandId])`, `onDelete: Restrict`, `priceCents Int?`, cuatro listas `String[]`) y existe una única migración `init` versionada.
6. `pnpm db:seed` es idempotente (4 marcas, 8 perfumes tras ejecutarla dos veces), no borra nada y no contiene notas, precios, tamaños, imágenes ni descripciones reales.
7. `CatalogRepository` (interfaz con tipos propios) e implementación Prisma cubren las cuatro operaciones, con `q` insensible a mayúsculas.
8. `pnpm test` pasa sin Docker; `pnpm test:db` pasa contra `perfumeria_test` e incluye las pruebas de restricciones y de idempotencia de la semilla; el ayudante de pruebas se niega a operar sobre una base que no termine en `_test`.
9. `pnpm typecheck`, `pnpm build` y `pnpm format:check` pasan; `GET /health` sigue respondiendo.
10. ADR 0003 en `Aceptado`, ADR 0006 creado; `CLAUDE.md`, spec y glosario coherentes con lo anterior.
11. Commits solo en `fase-5a-modelo-datos`; nada subido ni fusionado.

## Dependencias nuevas

| Paquete                     | Tipo | Motivo                                                                                                             |
| --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| `prisma@7.10.1`             | dev  | CLI: generación del cliente, migraciones. Fijado por la guía (ADR 0002) y aprobado.                                |
| `@prisma/client@7.10.1`     | prod | Runtime que importa el cliente generado por `prisma-client`. Aprobado.                                             |
| `@prisma/adapter-pg@7.10.1` | prod | Adaptador de controlador obligatorio en Prisma 7 para PostgreSQL. Trae `pg` como dependencia transitiva. Aprobado. |

Ninguna otra. Si `typecheck` exigiera `@types/pg` (porque los tipos del adaptador lo referencien y no venga incluido), **es una dependencia nueva: parar y consultar**.

## Riesgos

- **Compatibilidad del entorno (bloque A):** Prisma 7 con TypeScript nativo de Node, TypeScript 7 y `erasableSyntaxOnly` es la combinación menos probada; motor de esquema para darwin x64 en macOS 13 sin garantías a largo plazo. Mitigado con la puerta de viabilidad.
- **Sintaxis de pnpm 12** para aprobar scripts de instalación: desconocida para el planificador; se comprueba en el momento.
- **`process.loadEnvFile` y precedencia:** si sobrescribe variables ya definidas en el entorno, una `DATABASE_URL` pasada por línea de comandos podría ignorarse. La selección por `PRISMA_DB_TARGET` (que no está en `.env`) evita depender de eso; se comprueba en el paso 10 con `migrate status` nombrando `perfumeria_test`.
- **Códigos de error con adaptador:** `P2002`/`P2003` podrían no conservarse igual con `@prisma/adapter-pg`; las pruebas aceptan "rechaza y el conteo no cambia" como mínimo y anotan lo observado.
- **`TRUNCATE` en pruebas:** protegido por la comprobación `_test`; aun así, un `.env` mal escrito es la principal amenaza a los datos de desarrollo (que hoy son solo semilla y se recrean con `pnpm db:seed`).
- **Búsqueda `q`:** `ILIKE` no ignora tildes (`"rosa"` no encuentra `"Rósa"`); comodines `%`/`_` dependen de que Prisma los escape.
- **Scripts `db:test:create` y `db:test:migrate`** usan sintaxis POSIX: no funcionan en Windows `cmd` (aceptable hoy: equipo macOS).
- **Migraciones versionadas:** editar `init` después del commit rompería otras bases ya migradas; cualquier cambio posterior va en una migración nueva. Por eso las decisiones abiertas 1 a 3 deben resolverse **antes** del paso 6.

## Decisiones abiertas para el usuario

1. **Timestamps en `Perfume`:** el modelo aprobado los pone solo en `Brand`. Recomendación: añadir `createdAt`/`updatedAt` también a `Perfume` antes de crear `init` (coste nulo ahora, migración extra después). El plan sigue lo aprobado salvo indicación.
2. **Restricciones `CHECK` en SQL** (`priceCents >= 0`, `sizeMl > 0`): Prisma no las expresa en el schema; se añadirían editando la migración con `--create-only`. Recomendación: sí, por coste bajo; el plan no las incluye sin aprobación.
3. **Nombres en la base:** se usan los de Prisma por defecto (`"Brand"`, `"brandId"`); la alternativa es `@@map`/`@map` a `snake_case` plural (más idiomático en PostgreSQL, más verboso). Decidir antes de `init`.
4. **`update` en la semilla:** el plan hace que la semilla sobrescriba los registros que ella misma define (fuente de verdad para los precios que cargará Brajean). Si se prefiere "solo crear si no existe", sería `update: {}`.
5. **Archivo extra `prisma/seed-catalog.ts`** (separa la lógica del punto de entrada para poder probarla) y scripts extra `db:test:create` / `db:test:migrate` no listados en el alcance original.

## Qué NO se puede verificar desde este plan

- Nada de lo anterior se ha ejecutado: el planificador no tiene shell. Las salidas esperadas son las previstas según la documentación conocida de Prisma, pnpm, Vitest y Node, no resultados observados.
- No se ha comprobado que Prisma 7.10.1 publique motor de esquema para darwin x64 ni que su cliente generado sea compatible con TypeScript 7 y con la eliminación de tipos de Node 24; eso es justamente el bloque A.
- No se conoce la sintaxis de pnpm 12.16.1 para aprobar scripts, el comportamiento exacto de `process.loadEnvFile` ante variables ya definidas, ni si el cargador de `prisma.config.ts` soporta `import.meta.url`.
- No se ha comprobado la existencia de `pnpm-lock.yaml`, de la rama `fase-5a-modelo-datos`, ni el estado de Docker en el equipo.
- Que las cuatro marcas existan es una decisión del usuario; el plan no añade sobre ellas ningún dato más allá del nombre.
