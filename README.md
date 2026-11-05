# Tienda de perfumes

Tienda web de perfumería de nicho para público hispanohablante, con precios en soles (PEN). Su propuesta: que la persona **conozca el perfume antes de elegirlo** (sus notas y para qué ocasión usarlo).

## Estado

- ✅ **API del catálogo** (marcas y perfumes, solo lectura), base de datos PostgreSQL y contrato OpenAPI con tipos generados.
- 🔶 **La web, por ahora, solo muestra si la API está conectada.** La landing, el catálogo y la navegación por marcas son la Fase 6.
- Los datos son de **ejemplo**: 4 marcas reales de nicho (solo el nombre) y perfumes `[EJEMPLO]` sin precios ni notas reales.

Alcance y criterios de aceptación: [`docs/spec.md`](docs/spec.md).

## Requisitos

- **Node.js 24 o superior** (`node -v`).
- **pnpm**. Node 24 trae Corepack, que lo activa con `corepack enable pnpm`; el proyecto fija la versión exacta. **A partir de Node 25 Corepack ya no viene incluido**: instálalo con `npm install --global corepack` o usa el instalador de pnpm (<https://pnpm.io/installation>). Si `corepack enable` da un error de permisos, es que tu Node está instalado en una carpeta del sistema.
- **Docker** en marcha (Docker Desktop, o Docker Engine con Compose v2) para PostgreSQL.
- **git** y **bash** (los usa `pnpm db:test:prepare`).

Probado **solo en macOS (Intel)** con Node 24 y Docker Desktop 4.48. Linux y Windows no se han probado.

## Levántalo

```bash
git clone https://github.com/brajean-dev/tienda-perfumes.git
cd tienda-perfumes

pnpm install      # dependencias; también genera el cliente de Prisma
pnpm env:init     # crea .env con una contraseña aleatoria para PostgreSQL
pnpm db:up        # PostgreSQL en Docker (espera a que esté sano)
pnpm db:migrate   # crea las tablas
pnpm db:seed      # carga los datos de ejemplo
pnpm dev          # API en :3000 y web en :5173
```

Comprueba que funciona:

- Abre **http://localhost:5173**: debe decir **"Conectado a la API"**.
- `curl http://localhost:3000/health` → `{"status":"ok"}`
- `curl http://localhost:3000/brands` → las 4 marcas con su número de perfumes.
- `curl http://localhost:3000/brands/byredo/perfumes` → los perfumes de ejemplo de una marca.

> **Cuánto tarda:** en un clon con las cachés de pnpm y de Docker ya calientes, los pasos desde `pnpm install` hasta `pnpm db:seed` sumaron unos 20 segundos. La primera vez en una máquina nueva depende de tu conexión, sobre todo de la instalación de dependencias y de la descarga de la imagen de PostgreSQL.

> `pnpm env:init` no sobrescribe un `.env` que ya exista. No se llama `pnpm setup` porque esa es una orden de pnpm que modifica la configuración de tu shell.

## Comandos

Se ejecutan desde la raíz.

| Comando                             | Qué hace                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                          | API y web en paralelo                                                     |
| `pnpm test`                         | Pruebas de todo el proyecto, **sin Docker**                               |
| `pnpm db:test:prepare`              | Crea y migra la base `perfumeria_test` (hazlo antes de `pnpm test:db`)    |
| `pnpm test:db`                      | Pruebas de integración contra PostgreSQL (usan la base `perfumeria_test`) |
| `pnpm typecheck` / `pnpm build`     | Comprobación de tipos / compilación                                       |
| `pnpm format` / `pnpm format:check` | Formato con Prettier                                                      |
| `pnpm db:up` / `pnpm db:down`       | Inicia / detiene PostgreSQL                                               |
| `pnpm contracts:generate`           | Regenera los tipos de TypeScript desde `openapi.yaml`                     |

La lista completa y las reglas de cada parte están en [`CLAUDE.md`](CLAUDE.md), [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) y [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md).

## Estructura

```text
apps/web/            React + Vite + TypeScript
apps/api/            Fastify + TypeScript + Zod + Prisma
packages/contracts/  Contrato de la API (openapi.yaml) y los tipos generados desde él
scripts/             Utilidades: env:init y la preparación de la base de pruebas
docs/                Especificación, glosario, decisiones (ADR) y planes
.claude/             Agentes y skill de Claude Code (planificar, revisar, comprobar la documentación)
docker-compose.yml   PostgreSQL para desarrollo local
```

El contrato manda: para cambiar un endpoint se edita `packages/contracts/openapi.yaml`, se ejecuta `pnpm contracts:generate` y se adapta el código. `pnpm test` falla si API y contrato se separan.

## Si algo falla

| Síntoma                                                     | Qué hacer                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm: command not found`                                   | `corepack enable pnpm` (con Node 24). Con Node 25 o superior, instala Corepack o pnpm como se indica en Requisitos                                                                                                                                                                                                                 |
| `pnpm db:up` falla por el puerto 5432                       | Otro PostgreSQL local lo está usando: `lsof -nP -iTCP:5432 -sTCP:LISTEN` muestra cuál. Páralo, o cambia el servicio de otro proyecto. El puerto 5432 es el que usan `docker-compose.yml` y `pnpm db:test:prepare`                                                                                                                  |
| `Cannot connect to the Docker daemon`                       | Abre Docker Desktop y espera a que arranque                                                                                                                                                                                                                                                                                        |
| El puerto 3000 o 5173 está ocupado                          | `lsof -nP -iTCP:3000 -sTCP:LISTEN` muestra quién lo usa. Para la API puedes cambiar `API_PORT` y `VITE_API_URL` en `.env`; el puerto de la web (5173) es fijo                                                                                                                                                                      |
| La API dice que falta `DATABASE_URL`                        | No existe `.env`: ejecuta `pnpm env:init`                                                                                                                                                                                                                                                                                          |
| Autenticación fallida con PostgreSQL tras rehacer el `.env` | PostgreSQL solo usa la contraseña al crear su volumen. **Lo más simple: recupera el `.env` anterior.** Si no lo tienes, rehacer el volumen con `docker compose down -v` **borra todos los datos (la base de desarrollo y la de pruebas)**; después repite `pnpm db:up`, `pnpm db:migrate`, `pnpm db:seed` y `pnpm db:test:prepare` |
| `Cannot find module` sobre `generated/prisma`               | `pnpm db:generate`                                                                                                                                                                                                                                                                                                                 |

## Documentación

- [`docs/spec.md`](docs/spec.md): problema, usuarios, alcance y criterios de aceptación.
- [`docs/glossary.md`](docs/glossary.md): vocabulario del dominio.
- [`docs/decisions/`](docs/decisions/): decisiones técnicas (ADR), con sus alternativas.
- [`docs/plans/`](docs/plans/): planes de implementación.
- [`docs/guia-del-proyecto.md`](docs/guia-del-proyecto.md): la guía inicial con la que se planteó el proyecto, conservada tal cual (no describe el estado actual).

## Cómo se trabaja

El proyecto avanza por fases. Cada una empieza con un resumen y un miniplan que se aprueban antes de tocar código, y cada cambio llega a `main` por un pull request revisado. Hay agentes de Claude Code en `.claude/` para planificar, revisar el código y comprobar que esta documentación sigue siendo cierta.

## Licencia

Sin licencia por ahora: todos los derechos reservados.
