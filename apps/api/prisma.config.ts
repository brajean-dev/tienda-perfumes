import { defineConfig } from 'prisma/config';

// Prisma 7 ya no carga el .env por su cuenta. Se carga el de la raíz del monorepo si existe
// (los comandos se ejecutan desde apps/api); sin .env, por ejemplo en CI, se usa el entorno.
try {
  process.loadEnvFile('../../.env');
} catch {
  // Sin .env: se usan las variables que ya estén definidas.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` no necesita conexión: con "" no falla al instalar sin DATABASE_URL.
    url: process.env.DATABASE_URL ?? '',
  },
});
