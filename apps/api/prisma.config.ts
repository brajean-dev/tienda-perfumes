import { defineConfig } from 'prisma/config';

// Prisma 7 ya no carga el .env por su cuenta. Se carga el de la raíz del monorepo si existe
// (los comandos se ejecutan desde apps/api); sin .env, por ejemplo en CI, se usa el entorno.
try {
  process.loadEnvFile('../../.env');
} catch {
  // Sin .env: se usan las variables que ya estén definidas.
}

const databaseUrl = process.env.DATABASE_URL ?? '';

// `prisma generate` (y `postinstall`), `validate`, `format` y `migrate diff` no necesitan conexión;
// las órdenes de abajo sí. Se avisa con un mensaje claro en lugar del error genérico de Prisma.
// Es una coincidencia sobre `process.argv`. Prisma 7.10.1 lo entrega como UNA cadena
// (`["migrate status"]`), no separado, así que se unen los argumentos antes de comparar y vale
// para ambas formas. Si Prisma cambiara cómo carga la configuración, el efecto sería volver al
// error genérico de Prisma, no romper ninguna orden.
const COMMANDS_THAT_NEED_DATABASE =
  /(^|\s)(migrate\s+(dev|deploy|status|reset|resolve)|db\s+(seed|push|pull|execute))(\s|$)/;
const needsDatabase = COMMANDS_THAT_NEED_DATABASE.test(process.argv.slice(2).join(' '));
if (needsDatabase && !databaseUrl) {
  throw new Error('DATABASE_URL no está definida. Ejecuta `pnpm env:init` para crear el .env.');
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
