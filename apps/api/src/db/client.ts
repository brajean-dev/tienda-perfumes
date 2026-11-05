import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

export type { PrismaClient };

export function createPrismaClient(databaseUrl: string | undefined): PrismaClient {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está definida (revisa tu .env)');
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}
