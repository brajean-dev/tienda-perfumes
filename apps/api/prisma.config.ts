import { defineConfig } from 'prisma/config';

// Prisma 7 ya no carga el .env por su cuenta. Se carga el de la raíz del monorepo si existe
// (los comandos se ejecutan desde apps/api); sin .env, por ejemplo en CI, se usa el entorno.
try {
  process.loadEnvFile('../../.env');
} catch {
  // Sin .env: se usan las variables que ya estén definidas.
}

const databaseUrl = process.env.DATABASE_URL ?? '';

// `prisma generate` (y `postinstall`) no necesitan conexión; `migrate` y `db seed` sí.
// Se avisa con un mensaje claro en lugar del error genérico de Prisma.
const needsDatabase = process.argv.some((arg) => arg === 'migrate' || arg === 'db');
if (needsDatabase && !databaseUrl) {
  throw new Error('DATABASE_URL no está definida. Copia .env.example a .env y revisa sus valores.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
