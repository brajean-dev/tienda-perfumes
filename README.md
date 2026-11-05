# Tienda de perfumes

Tienda web de perfumería de nicho para público hispanohablante, con precios en soles (PEN). Su propuesta: que la persona **conozca el perfume antes de elegirlo** (sus notas y para qué ocasión usarlo).

## Estado

- ✅ **API del catálogo** (marcas y perfumes, solo lectura), base de datos PostgreSQL y contrato OpenAPI con tipos generados.
- 🔶 **La web, por ahora, solo muestra si la API está conectada.** La landing, el catálogo y la navegación por marcas son la Fase 6.
- Los datos son de **ejemplo**: 4 marcas reales de nicho (solo el nombre) y perfumes `[EJEMPLO]` sin precios ni notas reales.

Alcance y criterios de aceptación: [`docs/spec.md`](docs/spec.md).

## Requisitos

- **Node.js 24 o superior** (`node -v`).
- **pnpm**, que viene con Node mediante Corepack: `corepack enable pnpm`. El proyecto fija la versión exacta.
- **Docker** en marcha (Docker Desktop, o Docker Engine con Compose v2) para PostgreSQL.
- **git**.

Probado en macOS (Intel) con Node 24 y Docker Desktop 4.48.

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

> `pnpm env:init` no sobrescribe un `.env` que ya exista. No se llama `pnpm setup` porque esa es una orden de pnpm que modifica la configuración de tu shell.

## Comandos

Se ejecutan desde la raíz.

| Comando                             | Qué hace                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                          | API y web en paralelo                                                     |
| `pnpm test`                         | Pruebas de todo el proyecto, **sin Docker**                               |
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
docker-compose.yml   PostgreSQL para desarrollo local
```

El contrato manda: para cambiar un endpoint se edita `packages/contracts/openapi.yaml`, se ejecuta `pnpm contracts:generate` y se adapta el código. `pnpm test` falla si API y contrato se separan.

## Si algo falla

| Síntoma                                                     | Qué hacer                                                                                                                                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm: command not found`                                   | `corepack enable pnpm`                                                                                                                                                                                               |
| `Cannot connect to the Docker daemon`                       | Abre Docker Desktop y espera a que arranque                                                                                                                                                                          |
| El puerto 3000 o 5173 está ocupado                          | `lsof -nP -iTCP:3000 -sTCP:LISTEN` muestra quién lo usa. Para la API puedes cambiar `API_PORT` y `VITE_API_URL` en `.env`; el puerto de la web (5173) es fijo                                                        |
| La API dice que falta `DATABASE_URL`                        | No existe `.env`: ejecuta `pnpm env:init`                                                                                                                                                                            |
| Autenticación fallida con PostgreSQL tras rehacer el `.env` | PostgreSQL solo usa la contraseña al crear su volumen. Si cambiaste `.env`, borra el volumen con `docker compose down -v` (**borra los datos de la base**) y repite `pnpm db:up`, `pnpm db:migrate` y `pnpm db:seed` |
| `Cannot find module` sobre `generated/prisma`               | `pnpm db:generate`                                                                                                                                                                                                   |

## Documentación

- [`docs/spec.md`](docs/spec.md): problema, usuarios, alcance y criterios de aceptación.
- [`docs/glossary.md`](docs/glossary.md): vocabulario del dominio.
- [`docs/decisions/`](docs/decisions/): decisiones técnicas (ADR), con sus alternativas.
- [`docs/plans/`](docs/plans/): planes de implementación.

## Cómo se trabaja

El proyecto avanza por fases. Cada una empieza con un resumen y un miniplan que se aprueban antes de tocar código, y cada cambio llega a `main` por un pull request revisado. Hay agentes de Claude Code en `.claude/` para planificar, revisar el código y comprobar que esta documentación sigue siendo cierta.

## Licencia

Sin licencia por ahora: todos los derechos reservados.
