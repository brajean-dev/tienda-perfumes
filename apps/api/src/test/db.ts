import { createPrismaClient, type PrismaClient } from '../db/client.ts';
import { assertSafeTestDatabaseUrl } from './safety.ts';

/**
 * Cliente para las pruebas de integración. Borra datos, así que se niega a funcionar si la URL
 * no apunta a una base de pruebas local (reglas en safety.ts, compartidas con el script).
 */
export function createTestPrisma(): PrismaClient {
  assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
  return createPrismaClient(process.env.TEST_DATABASE_URL);
}

export async function resetCatalog(prisma: PrismaClient): Promise<void> {
  await prisma.perfume.deleteMany();
  await prisma.brand.deleteMany();
}
