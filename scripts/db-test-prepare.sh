#!/usr/bin/env bash
# Crea (si no existe) la base de pruebas y le aplica las migraciones.
# Nunca toca la base de desarrollo: se niega a continuar si los nombres coinciden o si
# la base de pruebas no termina en "_test". Requiere `pnpm db:up` y un .env con TEST_DATABASE_URL.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
. ./.env
set +a

: "${TEST_DATABASE_URL:?Define TEST_DATABASE_URL en .env (ver .env.example)}"
: "${POSTGRES_USER:?Define POSTGRES_USER en .env}"
: "${POSTGRES_DB:?Define POSTGRES_DB en .env}"

# Nombre de la base de pruebas: lo que hay tras la última "/" y antes de un posible "?".
TEST_DB="${TEST_DATABASE_URL##*/}"
TEST_DB="${TEST_DB%%\?*}"

if [[ "$TEST_DB" == "$POSTGRES_DB" ]]; then
  echo "Error: la base de pruebas ($TEST_DB) no puede ser la de desarrollo." >&2
  exit 1
fi
if [[ "$TEST_DB" != *_test ]]; then
  echo "Error: por seguridad, la base de pruebas debe terminar en \"_test\" (es \"$TEST_DB\")." >&2
  exit 1
fi

exists=$(docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '$TEST_DB'")

if [[ "$exists" != "1" ]]; then
  echo "Creando la base \"$TEST_DB\"..."
  docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$TEST_DB\""
else
  echo "La base \"$TEST_DB\" ya existe."
fi

echo "Aplicando migraciones a \"$TEST_DB\"..."
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @tienda/api exec prisma migrate deploy
