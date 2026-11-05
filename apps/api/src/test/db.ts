import { createPrismaClient, type PrismaClient } from '../db/client.ts';

/**
 * Cliente para las pruebas de integración. Borra datos, así que se niega a funcionar
 * si la URL apunta a una base que no sea claramente de pruebas.
 */
export function createTestPrisma(): PrismaClient {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL no está definida. Revisa tu .env y ejecuta `pnpm db:test:prepare`.',
    );
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL no puede ser igual a DATABASE_URL (borraría tus datos).');
  }
  const databaseName = new URL(url).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Por seguridad, la base de pruebas debe terminar en "_test" (recibida: "${databaseName}").`,
    );
  }
  return createPrismaClient(url);
}

export async function resetCatalog(prisma: PrismaClient): Promise<void> {
  await prisma.perfume.deleteMany();
  await prisma.brand.deleteMany();
}
