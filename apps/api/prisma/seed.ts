import { createPrismaClient } from '../src/db/client.ts';
import { seedCatalog } from './seed-catalog.ts';
import { brands } from './seed-data.ts';

const prisma = createPrismaClient(process.env.DATABASE_URL);

try {
  const result = await seedCatalog(prisma, brands);
  console.log(`Semilla aplicada: ${result.brands} marcas y ${result.perfumes} perfumes.`);
} finally {
  await prisma.$disconnect();
}
