// Lo usa scripts/db-test-prepare.sh: valida TEST_DATABASE_URL y escribe el nombre de la base en la
// salida estándar. Si algo no cuadra, escribe el motivo en la salida de errores y falla.
// Las variables llegan con `node --env-file=.env` (sin ejecutar el .env como shell).
import { assertSafeTestDatabaseUrl } from './safety.ts';

try {
  console.log(assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL));
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
