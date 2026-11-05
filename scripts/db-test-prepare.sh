#!/usr/bin/env bash
# Crea (si no existe) la base de pruebas y le aplica las migraciones.
#
# Nunca toca la base de desarrollo. Las reglas de seguridad (base local, nombre acabado en "_test",
# distinta de la de desarrollo) están en apps/api/src/test/safety.ts, las mismas que usan las pruebas.
# El .env NO se ejecuta como shell: lo lee Node (`--env-file`), que lo interpreta como datos.
# Requiere `pnpm db:up` y un .env con TEST_DATABASE_URL (ver .env.example).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Error: no existe .env. Copia .env.example a .env y ajusta los valores." >&2
  exit 1
fi

# Valida TEST_DATABASE_URL y devuelve el nombre de la base. Falla con un motivo claro si no es segura.
TEST_DB="$(node --env-file=.env apps/api/src/test/safety-cli.ts)"
TEST_DATABASE_URL="$(node --env-file=.env -p 'process.env.TEST_DATABASE_URL')"

# La base se crea dentro del contenedor de compose, que publica PostgreSQL en el puerto 5432. Si la URL
# apuntara a otro puerto, la base se crearía en un sitio y se migraría en otro: se rechaza antes.
TEST_PORT="$(node --env-file=.env -p 'new URL(process.env.TEST_DATABASE_URL).port || "5432"')"
if [[ "$TEST_PORT" != "5432" ]]; then
  echo "Error: este script crea la base en el contenedor de compose (puerto 5432), pero TEST_DATABASE_URL usa el puerto $TEST_PORT." >&2
  exit 1
fi

# TEST_DB ya pasó la lista blanca [a-z0-9_]+_test, así que es seguro usarlo dentro del SQL.
exists="$(docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d postgres -tA' <<SQL
SELECT 1 FROM pg_database WHERE datname = '$TEST_DB';
SQL
)"

if [[ "$exists" != "1" ]]; then
  echo "Creando la base \"$TEST_DB\"..."
  docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1' <<SQL
CREATE DATABASE "$TEST_DB";
SQL
else
  echo "La base \"$TEST_DB\" ya existe."
fi

echo "Aplicando migraciones a \"$TEST_DB\"..."
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @tienda/api exec prisma migrate deploy
