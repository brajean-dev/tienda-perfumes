import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertSafeTestDatabaseUrl } from '../apps/api/src/test/safety.ts';
import { generatePassword, initEnv, PLACEHOLDER, renderEnv } from './env-init.ts';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..');
const realTemplate = readFileSync(join(repoRoot, '.env.example'), 'utf8');

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'env-init-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function envValue(content: string, key: string): string {
  const line = content.split('\n').find((candidate) => candidate.startsWith(`${key}=`));
  assert.ok(line, `falta ${key} en el .env`);
  return line.slice(key.length + 1);
}

describe('generatePassword', () => {
  it('son 32 caracteres hexadecimales', () => {
    assert.match(generatePassword(), /^[0-9a-f]{32}$/);
  });

  it('cada llamada da una contraseña distinta', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generatePassword()));

    assert.equal(passwords.size, 20);
  });
});

describe('renderEnv', () => {
  it('sustituye todos los marcadores y no toca nada más', () => {
    const template = `A=${PLACEHOLDER}\n# comentario\nB=postgresql://u:${PLACEHOLDER}@localhost/db\nC=otro\n`;

    assert.equal(
      renderEnv(template, 'secreto'),
      'A=secreto\n# comentario\nB=postgresql://u:secreto@localhost/db\nC=otro\n',
    );
  });

  it('falla con un mensaje claro si .env.example ya no tiene marcadores', () => {
    assert.throws(() => renderEnv('A=1\n', 'x'), /ya no contiene "change-me"/);
  });
});

describe('initEnv con el .env.example real del repositorio', () => {
  beforeEach(() => {
    writeFileSync(join(dir, '.env.example'), realTemplate);
  });

  it('crea .env sin ningún marcador y con la misma contraseña en los tres sitios', () => {
    initEnv(dir, 'abc123');
    const env = readFileSync(join(dir, '.env'), 'utf8');

    assert.ok(!env.includes(PLACEHOLDER));
    assert.equal(envValue(env, 'POSTGRES_PASSWORD'), 'abc123');
    assert.ok(envValue(env, 'DATABASE_URL').includes(':abc123@'));
    assert.ok(envValue(env, 'TEST_DATABASE_URL').includes(':abc123@'));
  });

  it('el .env.example real tiene "change-me" EXACTAMENTE en estas tres variables (y en ninguna más)', () => {
    // Si alguien añade otra variable con "change-me" (por ejemplo una clave de API), el script le
    // pondría la misma contraseña de la base de datos: esta prueba obliga a decidirlo a conciencia.
    const variables = realTemplate
      .split('\n')
      .filter((line) => line.includes(PLACEHOLDER))
      .map((line) => line.split('=')[0]);

    assert.deepEqual(variables.sort(), ['DATABASE_URL', 'POSTGRES_PASSWORD', 'TEST_DATABASE_URL']);
    assert.equal(realTemplate.split(PLACEHOLDER).length - 1, 3);
  });

  it('solo cambia la contraseña: el resto del archivo queda idéntico', () => {
    initEnv(dir, 'abc123');
    const env = readFileSync(join(dir, '.env'), 'utf8');

    assert.equal(env.replaceAll('abc123', PLACEHOLDER), realTemplate);
  });

  it('el .env resultante pasa las salvaguardas de la base de pruebas', () => {
    initEnv(dir);
    const env = readFileSync(join(dir, '.env'), 'utf8');

    assert.equal(
      assertSafeTestDatabaseUrl(envValue(env, 'TEST_DATABASE_URL'), envValue(env, 'DATABASE_URL')),
      'perfumeria_test',
    );
  });

  it('usa una contraseña aleatoria distinta cada vez', () => {
    const other = mkdtempSync(join(tmpdir(), 'env-init-'));
    try {
      writeFileSync(join(other, '.env.example'), realTemplate);
      initEnv(dir);
      initEnv(other);

      assert.notEqual(
        envValue(readFileSync(join(dir, '.env'), 'utf8'), 'POSTGRES_PASSWORD'),
        envValue(readFileSync(join(other, '.env'), 'utf8'), 'POSTGRES_PASSWORD'),
      );
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });

  it(
    'crea el .env con permisos 600 (solo lo lee quien lo creó)',
    { skip: process.platform === 'win32' },
    () => {
      initEnv(dir);

      assert.equal(statSync(join(dir, '.env')).mode & 0o777, 0o600);
    },
  );

  it('NO sobrescribe un .env existente y lo deja intacto', () => {
    writeFileSync(join(dir, '.env'), 'MI_CONTRASEÑA=importante\n');

    assert.throws(() => initEnv(dir, 'nueva'), /Ya existe un \.env y no se sobrescribe/);
    assert.equal(readFileSync(join(dir, '.env'), 'utf8'), 'MI_CONTRASEÑA=importante\n');
  });

  it('el aviso de "ya existe" explica el problema del volumen y avisa de lo destructivo del remedio', () => {
    writeFileSync(join(dir, '.env'), 'X=1\n');

    assert.throws(() => initEnv(dir), /docker compose down -v/);
    assert.throws(() => initEnv(dir), /recuperar el \.env anterior/);
    assert.throws(() => initEnv(dir), /TODOS los datos/);
    assert.throws(() => initEnv(dir), /pnpm db:test:prepare/);
  });
});

describe('initEnv sin .env.example', () => {
  it('falla con un mensaje claro y no crea ningún .env', () => {
    assert.throws(() => initEnv(dir), /No se encuentra .*\.env\.example.*git checkout/);
    assert.throws(() => readFileSync(join(dir, '.env')), /ENOENT/);
  });
});

describe('línea de comandos (node scripts/env-init.ts)', () => {
  // El script calcula la raíz a partir de su propia ubicación: se copia a una carpeta temporal.
  function prepareProject() {
    mkdirSync(join(dir, 'scripts'));
    cpSync(join(repoRoot, 'scripts', 'env-init.ts'), join(dir, 'scripts', 'env-init.ts'));
    writeFileSync(join(dir, '.env.example'), realTemplate);
  }

  function run() {
    return spawnSync(process.execPath, [join(dir, 'scripts', 'env-init.ts')], { encoding: 'utf8' });
  }

  it('crea el .env y NO muestra la contraseña por pantalla', () => {
    prepareProject();

    const result = run();
    const password = envValue(readFileSync(join(dir, '.env'), 'utf8'), 'POSTGRES_PASSWORD');

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Creado \.env/);
    assert.ok(
      !result.stdout.includes(password),
      'la contraseña no debe salir por la salida estándar',
    );
    assert.ok(!result.stderr.includes(password), 'ni por la salida de errores');
  });

  it('funciona aunque el proyecto esté bajo un enlace simbólico (si no, no haría nada y sin avisar)', () => {
    prepareProject();
    const link = `${dir}-enlace`;
    symlinkSync(dir, link);
    try {
      const result = spawnSync(process.execPath, [join(link, 'scripts', 'env-init.ts')], {
        encoding: 'utf8',
      });

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Creado \.env/);
      assert.ok(statSync(join(dir, '.env')).isFile(), 'debe haber creado el .env');
    } finally {
      rmSync(link, { force: true });
    }
  });

  it('importarlo como módulo no ejecuta nada (no crea ningún .env)', () => {
    prepareProject();

    const result = spawnSync(
      process.execPath,
      ['-e', `import(${JSON.stringify(join(dir, 'scripts', 'env-init.ts'))})`],
      { encoding: 'utf8', cwd: dir },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.throws(() => readFileSync(join(dir, '.env')), /ENOENT/);
  });

  it('una segunda ejecución falla con código 1, explica por qué y no cambia el .env', () => {
    prepareProject();
    run();
    const before = readFileSync(join(dir, '.env'), 'utf8');

    const second = run();

    assert.equal(second.status, 1);
    assert.match(second.stderr, /Ya existe un \.env/);
    assert.equal(readFileSync(join(dir, '.env'), 'utf8'), before);
  });
});
