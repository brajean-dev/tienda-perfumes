// Crea el .env a partir de .env.example con una contraseña aleatoria para PostgreSQL.
//
//   pnpm env:init
//
// .env.example usa "change-me" como contraseña en tres sitios (POSTGRES_PASSWORD, DATABASE_URL y
// TEST_DATABASE_URL) y los tres deben coincidir. Este script los sustituye todos por la misma
// contraseña aleatoria, así no hay que editarlos a mano.
//
// - Nunca sobrescribe un .env existente: si quieres rehacerlo, bórralo tú.
// - No muestra la contraseña por pantalla.
// - El nombre es env:init y no "setup" porque `pnpm setup` es una orden de pnpm que modifica la
//   configuración del shell, y se ejecutaría esa en lugar de este script.
import { randomBytes } from 'node:crypto';
import { chmodSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PLACEHOLDER = 'change-me';

/** 32 caracteres hexadecimales (128 bits). Hexadecimal: no necesita escaparse en una URL ni en un .env. */
export function generatePassword(): string {
  return randomBytes(16).toString('hex');
}

/** Sustituye todos los marcadores. Falla si no hay ninguno: .env.example habría cambiado sin avisar. */
export function renderEnv(template: string, password: string): string {
  if (!template.includes(PLACEHOLDER)) {
    throw new Error(
      `.env.example ya no contiene "${PLACEHOLDER}": hay que actualizar scripts/env-init.ts.`,
    );
  }
  return template.replaceAll(PLACEHOLDER, password);
}

/** Crea `<directory>/.env` desde `<directory>/.env.example`. No sobrescribe nada. */
export function initEnv(directory: string, password: string = generatePassword()): string {
  const examplePath = resolve(directory, '.env.example');
  const envPath = resolve(directory, '.env');

  let template: string;
  try {
    template = readFileSync(examplePath, 'utf8');
  } catch {
    throw new Error(
      `No se encuentra ${examplePath}. Restáuralo con \`git checkout -- .env.example\`.`,
    );
  }

  const content = renderEnv(template, password);

  try {
    // "wx": falla si el archivo ya existe, en vez de sobrescribirlo.
    writeFileSync(envPath, content, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(
        'Ya existe un .env y no se sobrescribe. Si lo borras y lo creas de nuevo, la contraseña será otra.\n' +
          'Ojo: PostgreSQL solo usa POSTGRES_PASSWORD al crear su volumen la primera vez. Si la base ya existe, ' +
          'lo más simple es recuperar el .env anterior. Rehacer el volumen con `docker compose down -v` ' +
          'borra TODOS los datos (la base de desarrollo y la de pruebas): hazlo tú, a conciencia, y después ' +
          'repite `pnpm db:up`, `pnpm db:migrate`, `pnpm db:seed` y `pnpm db:test:prepare`.',
      );
    }
    throw error;
  }
  try {
    chmodSync(envPath, 0o600);
  } catch {
    // Redundante con el `mode` de arriba: en sistemas sin permisos tipo POSIX (Windows) no es fatal.
  }
  return envPath;
}

// `import.meta.main` solo existe desde Node 24.2 (y es experimental): en una 24.0 o 24.1 valdría
// `undefined` y este script terminaría sin hacer nada y sin avisar. Se compara con la ruta del archivo.
// Se comparan RUTAS REALES: si el proyecto está bajo un enlace simbólico (en macOS, /var y /tmp lo
// son), `process.argv[1]` conserva el enlace pero `import.meta.url` no, y no coincidirían.
function isRunDirectly(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(resolve(entry)) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

const isMain = isRunDirectly();

if (isMain) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    initEnv(root);
    console.log('Creado .env con una contraseña aleatoria para PostgreSQL (no se muestra).');
    console.log('Siguiente paso: pnpm db:up');
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
