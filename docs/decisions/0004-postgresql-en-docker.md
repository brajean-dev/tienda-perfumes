# 0004. PostgreSQL en Docker para desarrollo local

- **Estado:** Aceptado (definido por la guía del proyecto)
- **Fecha:** 2026-11-04

## Contexto

La API necesita una base de datos relacional para marcas y perfumes. El desarrollo debe poder arrancar sin instalar PostgreSQL en el sistema.

## Decisión

Un servicio PostgreSQL en `docker-compose.yml` en la raíz. La API se conecta mediante variables de entorno; `.env.example` documenta cuáles hacen falta sin valores secretos.

## Alternativas consideradas

- **SQLite:** más simple, pero difiere de PostgreSQL y la guía fija PostgreSQL.
- **PostgreSQL instalado con Homebrew:** contamina el sistema; además Homebrew en este equipo (macOS 13) no ofrece binarios precompilados.
- **Base de datos en la nube:** innecesaria para desarrollo local.

## Consecuencias

- Docker debe estar corriendo para desarrollar con base de datos.
- **Docker Desktop 4.48.0** (Engine 28.5.1, Compose v2.40.2), instalado el 2026-11-04 sobre una 3.6.0 antigua. Es la **última versión compatible con macOS 13**: desde la 4.49.0 Docker exige macOS 14. Este equipo no recibirá más actualizaciones de Docker Desktop mientras siga en macOS 13, así que actualizar macOS (si el equipo lo permite) es la solución de fondo.
- **Comprobado el 2026-11-04:** con `postgres:17-alpine`, `docker compose up -d --wait db` llega a `healthy`, `pg_isready` responde, la autenticación por contraseña funciona (y falla con una incorrecta), el puerto queda publicado solo en `127.0.0.1:5432` y el volumen `db-data` sobrevive a `pnpm db:down` y `pnpm db:up`.
- Las credenciales de desarrollo viven en un `.env` no versionado, nunca en el cliente ni en el repositorio.
