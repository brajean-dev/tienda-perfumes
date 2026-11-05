// Salvaguardas para la base de pruebas de integración, que BORRA datos.
// Una sola implementación, usada por las pruebas (createTestPrisma) y por scripts/db-test-prepare.sh
// (a través de safety-cli.ts), para que ambos apliquen exactamente las mismas reglas.

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const DEFAULT_PORT = '5432';

// Solo minúsculas, números y guion bajo, y con sufijo "_test". La lista blanca también evita que
// el nombre llegue al SQL del script con comillas u otros caracteres peligrosos.
const TEST_DATABASE_NAME = /^[a-z0-9_]+_test$/;

// Parámetros de la URL que se admiten. Es una lista BLANCA a propósito: el cliente de PostgreSQL
// (`pg`) deja que `?host=`, `?hostaddr=` o `?port=` sustituyan al servidor de la URL, y entonces
// la comprobación de "servidor local" validaría un host y la conexión iría a otro.
const ALLOWED_QUERY_PARAMS = new Set([
  'sslmode',
  'schema',
  'connect_timeout',
  'application_name',
  'connection_limit',
  'pool_timeout',
]);

function parseUrl(value: string, label: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${label} no es una URL válida.`);
  }
}

function databaseName(url: URL): string {
  const raw = url.pathname.replace(/^\//, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// Los nombres de host no se pasan a minúsculas solos con esquemas como `postgresql:`.
function normalizedHost(url: URL): string {
  return url.hostname.toLowerCase();
}

// Dos URLs apuntan al mismo servidor si coinciden host y puerto; localhost, 127.0.0.1 y ::1 cuentan
// como el mismo, y un puerto ausente es el 5432.
function serverKey(url: URL): string {
  const host = normalizedHost(url);
  return `${LOCAL_HOSTS.has(host) ? 'local' : host}:${url.port || DEFAULT_PORT}`;
}

/**
 * Comprueba que la URL apunta a una base de pruebas inofensiva y devuelve su nombre.
 * Lanza un Error con un mensaje claro si algo no cuadra. `developmentUrl` es la base de desarrollo.
 */
export function assertSafeTestDatabaseUrl(
  testUrl: string | undefined,
  developmentUrl?: string,
): string {
  if (!testUrl) {
    throw new Error('TEST_DATABASE_URL no está definida. Revisa tu .env (ver .env.example).');
  }

  const test = parseUrl(testUrl, 'TEST_DATABASE_URL');

  if (test.protocol !== 'postgresql:' && test.protocol !== 'postgres:') {
    throw new Error(
      `TEST_DATABASE_URL debe ser una URL de PostgreSQL (recibida: "${test.protocol}").`,
    );
  }

  for (const key of test.searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) {
      throw new Error(
        `Por seguridad, TEST_DATABASE_URL no admite el parámetro "${key}" (podría redirigir la conexión a otro servidor). Parámetros permitidos: ${[...ALLOWED_QUERY_PARAMS].join(', ')}.`,
      );
    }
  }

  if (!LOCAL_HOSTS.has(normalizedHost(test))) {
    throw new Error(
      `Por seguridad, la base de pruebas debe estar en esta máquina (localhost o 127.0.0.1), no en "${test.hostname}".`,
    );
  }

  const name = databaseName(test);
  if (!TEST_DATABASE_NAME.test(name)) {
    throw new Error(
      `Por seguridad, el nombre de la base de pruebas debe terminar en "_test" y usar solo minúsculas, números y guion bajo (recibido: "${name}").`,
    );
  }

  if (developmentUrl) {
    let development: URL | undefined;
    try {
      development = new URL(developmentUrl);
    } catch {
      // Si DATABASE_URL no es una URL válida no puede coincidir con la de pruebas.
    }
    if (
      development &&
      serverKey(development) === serverKey(test) &&
      databaseName(development) === name
    ) {
      throw new Error(
        'TEST_DATABASE_URL apunta a la misma base que DATABASE_URL (borraría tus datos).',
      );
    }
  }

  return name;
}
