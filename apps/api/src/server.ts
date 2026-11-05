import { buildApp } from './app.ts';
import { createCatalogRepository } from './catalog/catalog.repository.ts';
import { loadConfig } from './config.ts';
import { createPrismaClient } from './db/client.ts';

// Tiempo máximo para un apagado ordenado: si una petición lenta lo bloquea, se fuerza la salida.
const SHUTDOWN_TIMEOUT_MS = 10_000;

const config = loadConfig();
const prisma = createPrismaClient(config.DATABASE_URL);
const app = await buildApp(config, {
  logger: true,
  catalog: createCatalogRepository(prisma),
});

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'apagando la API');

  const forceExit = setTimeout(() => {
    app.log.error('el apagado ordenado tardó demasiado; se fuerza la salida');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    // Primero se deja de aceptar peticiones y terminan las que están en curso; después se cierra la
    // base de datos, para que ninguna petición en vuelo se encuentre Prisma ya desconectado.
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'error durante el apagado');
    process.exit(1);
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

try {
  await app.listen({ port: config.API_PORT, host: config.API_HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
