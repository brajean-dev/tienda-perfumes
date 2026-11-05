import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedCatalog } from '../../prisma/seed-catalog.ts';
import { brands as seedBrands } from '../../prisma/seed-data.ts';
import { buildApp } from '../app.ts';
import { createPrismaClient } from '../db/client.ts';
import { loadContract } from '../test/contract.ts';
import { createTestPrisma, resetCatalog } from '../test/db.ts';
import { createCatalogRepository } from './catalog.repository.ts';

// La API completa (rutas, servicio, repositorio y Prisma) contra PostgreSQL real y sembrada con
// los datos de seed-data.ts. Las respuestas se validan contra el contrato.

const WEB_ORIGIN = 'http://localhost:5173';
const prisma = createTestPrisma();
const contract = loadContract();
let app: FastifyInstance;

const firstBrand = seedBrands[0]!;
const firstPerfume = firstBrand.perfumes[0]!;

function expectMatchesContract(operationId: string, status: number, body: unknown) {
  const { ok, errors } = contract.validateResponse(operationId, status, body);
  expect(ok, errors).toBe(true);
}

beforeAll(async () => {
  app = await buildApp({ WEB_ORIGIN }, { catalog: createCatalogRepository(prisma) });
});

beforeEach(async () => {
  await resetCatalog(prisma);
  await seedCatalog(prisma, seedBrands);
});

afterAll(async () => {
  await app.close();
  await resetCatalog(prisma);
  await prisma.$disconnect();
});

describe('GET /brands', () => {
  it('lista las marcas sembradas, ordenadas con la colación del español y con su número de perfumes', async () => {
    const response = await app.inject({ method: 'GET', url: '/brands' });

    expect(response.statusCode).toBe(200);
    expectMatchesContract('listBrands', 200, response.json());

    const collator = new Intl.Collator('es');
    const expected = [...seedBrands].sort((a, b) => collator.compare(a.name, b.name));
    expect(
      response
        .json()
        .items.map((b: { name: string; perfumeCount: number }) => [b.name, b.perfumeCount]),
    ).toEqual(expected.map((b) => [b.name, b.perfumes.length]));
  });

  it('una marca sin perfumes aparece con perfumeCount 0', async () => {
    await prisma.brand.create({ data: { slug: 'sin-perfumes', name: 'Sin perfumes' } });

    const response = await app.inject({ method: 'GET', url: '/brands' });

    expect(response.json().items).toContainEqual(
      expect.objectContaining({ slug: 'sin-perfumes', perfumeCount: 0 }),
    );
  });
});

describe('GET /brands/:brandSlug y sus perfumes', () => {
  it('devuelve la marca y sus perfumes, sin precio ni tamaño inventados', async () => {
    const brand = await app.inject({ method: 'GET', url: `/brands/${firstBrand.slug}` });
    const perfumes = await app.inject({
      method: 'GET',
      url: `/brands/${firstBrand.slug}/perfumes`,
    });

    expect(brand.statusCode).toBe(200);
    expectMatchesContract('getBrand', 200, brand.json());
    expect(perfumes.statusCode).toBe(200);
    expectMatchesContract('listBrandPerfumes', 200, perfumes.json());

    const { items } = perfumes.json();
    expect(items).toHaveLength(firstBrand.perfumes.length);
    expect(
      items.every(
        (p: { price: unknown; sizeMl: unknown }) => p.price === null && p.sizeMl === null,
      ),
    ).toBe(true);
  });

  it('el precio y el tamaño guardados salen como céntimos de sol y mililitros', async () => {
    await prisma.perfume.updateMany({
      where: { slug: firstPerfume.slug, brand: { slug: firstBrand.slug } },
      data: { priceCents: 25000, sizeMl: 50 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/brands/${firstBrand.slug}/perfumes/${firstPerfume.slug}`,
    });

    expect(response.statusCode).toBe(200);
    expectMatchesContract('getPerfume', 200, response.json());
    expect(response.json()).toMatchObject({
      sizeMl: 50,
      price: { amountCents: 25000, currency: 'PEN' },
      brand: { slug: firstBrand.slug, name: firstBrand.name },
      notes: {
        top: firstPerfume.notesTop,
        heart: firstPerfume.notesHeart,
        base: firstPerfume.notesBase,
      },
      occasions: firstPerfume.occasions,
    });
  });

  it('busca por nombre sin distinguir mayúsculas y trata "%" como texto literal', async () => {
    const base = `/brands/${firstBrand.slug}/perfumes`;

    const found = await app.inject({
      method: 'GET',
      url: `${base}?q=${encodeURIComponent('perfume 1')}`,
    });
    const wildcard = await app.inject({ method: 'GET', url: `${base}?q=%25` });
    const blank = await app.inject({ method: 'GET', url: `${base}?q=%20%20` });

    expect(found.json().items.map((p: { slug: string }) => p.slug)).toEqual([firstPerfume.slug]);
    expect(wildcard.json()).toEqual({ items: [] });
    expect(blank.json().items).toHaveLength(firstBrand.perfumes.length);
  });

  it('un carácter de control en q (el byte NUL que PostgreSQL no admite) da 400, no un 500 de la base', async () => {
    const base = `/brands/${firstBrand.slug}/perfumes`;

    const nul = await app.inject({ method: 'GET', url: `${base}?q=%00` });
    const inside = await app.inject({ method: 'GET', url: `${base}?q=per%00fume` });

    expect(nul.statusCode).toBe(400);
    expectMatchesContract('listBrandPerfumes', 400, nul.json());
    expect(inside.statusCode).toBe(400);
  });

  it('un q con espacios alrededor busca igual que sin ellos', async () => {
    const base = `/brands/${firstBrand.slug}/perfumes`;

    const response = await app.inject({ method: 'GET', url: `${base}?q=%20%20perfume%201%20%20` });

    expect(response.json().items.map((p: { slug: string }) => p.slug)).toEqual([firstPerfume.slug]);
  });

  it('responde 404 para una marca o un perfume que no existen, con la forma del contrato', async () => {
    const missingBrand = await app.inject({ method: 'GET', url: '/brands/no-existe' });
    const missingPerfume = await app.inject({
      method: 'GET',
      url: `/brands/${firstBrand.slug}/perfumes/no-existe`,
    });
    // La marca existe, pero no tiene este perfume (el slug sí existe en otras marcas).
    await prisma.brand.create({ data: { slug: 'sin-ese-perfume', name: 'Sin ese perfume' } });
    const wrongBrand = await app.inject({
      method: 'GET',
      url: `/brands/sin-ese-perfume/perfumes/${firstPerfume.slug}`,
    });

    expect(missingBrand.statusCode).toBe(404);
    expectMatchesContract('getBrand', 404, missingBrand.json());
    expect(missingPerfume.statusCode).toBe(404);
    expectMatchesContract('getPerfume', 404, missingPerfume.json());
    expect(wrongBrand.statusCode).toBe(404);
    expectMatchesContract('getPerfume', 404, wrongBrand.json());
  });
});

describe('cuando la base de datos falla de verdad', () => {
  it('responde 500 genérico y no filtra la dirección ni el error de conexión', async () => {
    // Puerto 1: nadie escucha, la conexión se rechaza.
    const unreachable = createPrismaClient(
      'postgresql://usuario:clave-secreta@127.0.0.1:1/inexistente',
    );
    const brokenApp = await buildApp(
      { WEB_ORIGIN },
      { catalog: createCatalogRepository(unreachable) },
    );

    try {
      const response = await brokenApp.inject({ method: 'GET', url: '/brands' });

      expect(response.statusCode).toBe(500);
      expectMatchesContract('listBrands', 500, response.json());
      expect(response.body).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|clave-secreta|inexistente/);
    } finally {
      await brokenApp.close();
      await unreachable.$disconnect();
    }
  });
});
