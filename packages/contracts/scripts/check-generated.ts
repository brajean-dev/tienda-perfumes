// Comprueba que generated/schema.d.ts está al día con openapi.yaml: regenera los tipos en un
// directorio temporal y los compara con los versionados. Si no coinciden, alguien cambió el
// contrato sin ejecutar `pnpm contracts:generate` (o editó el archivo generado a mano).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const committedPath = 'generated/schema.d.ts';
const workDir = mkdtempSync(join(tmpdir(), 'contracts-check-'));
const freshPath = join(workDir, 'schema.d.ts');

try {
  execFileSync('pnpm', ['exec', 'openapi-typescript', 'openapi.yaml', '-o', freshPath], {
    stdio: 'pipe',
  });

  const fresh = readFileSync(freshPath, 'utf8');
  const committed = readFileSync(committedPath, 'utf8');

  if (fresh === committed) {
    console.log(`OK: ${committedPath} está al día con openapi.yaml.`);
  } else {
    console.error(
      `Error: ${committedPath} no coincide con openapi.yaml. Ejecuta \`pnpm contracts:generate\` y vuelve a comprobar.`,
    );
    // process.exitCode (no process.exit): así el bloque finally borra el directorio temporal.
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    `Error al comprobar los tipos generados: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
