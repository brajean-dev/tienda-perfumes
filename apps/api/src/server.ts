import { buildApp } from './app.ts';
import { createCatalogRepository } from './catalog/catalog.repository.ts';
import { loadConfig } from './config.ts';
import { createPrismaClient } from './db/client.ts';

const config = loadConfig();
const prisma = createPrismaClient(config.DATABASE_URL);
const app = await buildApp(config, {
  logger: true,
  catalog: createCatalogRepository(prisma),
});

// Cierra la conexión a la base de datos cuando la API se detiene.
app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: config.API_PORT, host: config.API_HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
