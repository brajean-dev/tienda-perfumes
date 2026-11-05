import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { seedCatalog } from '../../prisma/seed-catalog.ts';
import { brands as seedBrands } from '../../prisma/seed-data.ts';
import { createTestPrisma, resetCatalog } from '../test/db.ts';
import { createCatalogRepository } from './catalog.repository.ts';

const prisma = createTestPrisma();
const repository = createCatalogRepository(prisma);

function createBrand(slug: string, name: string) {
  return prisma.brand.create({ data: { slug, name } });
}

function createPerfume(brandId: string, slug: string, name: string) {
  return prisma.perfume.create({ data: { brandId, slug, name } });
}

beforeEach(async () => {
  await resetCatalog(prisma);
});

afterAll(async () => {
  await resetCatalog(prisma);
  await prisma.$disconnect();
});

describe('listBrands', () => {
  it('incluye el número de perfumes de cada marca', async () => {
    await createBrand('zeta', 'Zeta');
    const alfa = await createBrand('alfa', 'Alfa');
    await createPerfume(alfa.id, 'uno', 'Uno');
    await createPerfume(alfa.id, 'dos', 'Dos');

    const brands = await repository.listBrands();

    expect(brands.map((b) => [b.name, b.perfumeCount])).toEqual([
      ['Alfa', 2],
      ['Zeta', 0],
    ]);
  });

  it('ordena con la colación del español, no por bytes (mayúsculas, minúsculas y tildes)', async () => {
    for (const [slug, name] of [
      ['zeta', 'Zeta'],
      ['alfa', 'alfa'],
      ['edition', 'Édition'],
      ['frederic', 'Frédéric'],
      ['byredo', 'Byredo'],
      ['le-labo', 'le labo'],
    ] as const) {
      await createBrand(slug, name);
    }

    const brands = await repository.listBrands();

    // Con el orden por bytes de la base de datos saldría: Byredo, Frédéric, Zeta, alfa, le labo, Édition.
    expect(brands.map((b) => b.name)).toEqual([
      'alfa',
      'Byredo',
      'Édition',
      'Frédéric',
      'le labo',
      'Zeta',
    ]);
  });

  it('desempata por slug si dos marcas tienen el mismo nombre', async () => {
    await createBrand('clasica-b', 'Clásica');
    await createBrand('clasica-a', 'Clásica');

    const brands = await repository.listBrands();

    expect(brands.map((b) => b.slug)).toEqual(['clasica-a', 'clasica-b']);
  });

  it('devuelve una lista vacía si no hay marcas', async () => {
    expect(await repository.listBrands()).toEqual([]);
  });
});

describe('findBrandBySlug', () => {
  it('encuentra la marca por su slug', async () => {
    await createBrand('alfa', 'Alfa');

    expect(await repository.findBrandBySlug('alfa')).toMatchObject({ slug: 'alfa', name: 'Alfa' });
  });

  it('devuelve null si no existe', async () => {
    expect(await repository.findBrandBySlug('no-existe')).toBeNull();
  });
});

describe('listPerfumes', () => {
  async function setup() {
    const a = await createBrand('a', 'Marca A');
    const b = await createBrand('b', 'Marca B');
    await createPerfume(a.id, 'noche-azul', 'Noche Azul');
    await createPerfume(a.id, 'dia-claro', 'Día Claro');
    await createPerfume(b.id, 'otro', 'Otro');
    return { a, b };
  }

  it('lista solo los perfumes de la marca, ordenados por nombre', async () => {
    const { a } = await setup();

    const perfumes = await repository.listPerfumes(a.id);

    expect(perfumes.map((p) => p.name)).toEqual(['Día Claro', 'Noche Azul']);
  });

  it('ordena los perfumes con la colación del español', async () => {
    const a = await createBrand('a', 'Marca A');
    await createPerfume(a.id, 'zafiro', 'Zafiro');
    await createPerfume(a.id, 'ambar', 'ámbar');
    await createPerfume(a.id, 'oud', 'Oud');
    await createPerfume(a.id, 'eden', 'Edén');

    const perfumes = await repository.listPerfumes(a.id);

    expect(perfumes.map((p) => p.name)).toEqual(['ámbar', 'Edén', 'Oud', 'Zafiro']);
  });

  it('busca por nombre sin distinguir mayúsculas', async () => {
    const { a } = await setup();

    const perfumes = await repository.listPerfumes(a.id, { query: 'NOCHE' });

    expect(perfumes.map((p) => p.slug)).toEqual(['noche-azul']);
  });

  it('limitación conocida: la búsqueda distingue tildes ("dia" no encuentra "Día Claro")', async () => {
    const { a } = await setup();

    expect(await repository.listPerfumes(a.id, { query: 'dia' })).toEqual([]);
    expect((await repository.listPerfumes(a.id, { query: 'día' })).map((p) => p.slug)).toEqual([
      'dia-claro',
    ]);
  });

  it('trata el texto buscado de forma literal (un "%" o "_" no son comodines)', async () => {
    const { a } = await setup();

    expect(await repository.listPerfumes(a.id, { query: '%' })).toEqual([]);
    expect(await repository.listPerfumes(a.id, { query: '_' })).toEqual([]);
    expect(await repository.listPerfumes(a.id, { query: 'N%e' })).toEqual([]);
    expect(await repository.listPerfumes(a.id, { query: '\\' })).toEqual([]);
  });

  it('encuentra un "%", "_" o "\\" que sí aparezca en el nombre', async () => {
    const a = await createBrand('a', 'Marca A');
    await createPerfume(a.id, 'intenso', '100% Oud');
    await createPerfume(a.id, 'guion', 'Rose_Noir');
    await createPerfume(a.id, 'barra', 'Ámbar\\Vainilla');
    await createPerfume(a.id, 'otro', 'Otro');

    expect((await repository.listPerfumes(a.id, { query: '%' })).map((p) => p.slug)).toEqual([
      'intenso',
    ]);
    expect((await repository.listPerfumes(a.id, { query: 'e_N' })).map((p) => p.slug)).toEqual([
      'guion',
    ]);
    expect((await repository.listPerfumes(a.id, { query: '\\' })).map((p) => p.slug)).toEqual([
      'barra',
    ]);
  });

  it('ignora una búsqueda en blanco', async () => {
    const { a } = await setup();

    expect(await repository.listPerfumes(a.id, { query: '   ' })).toHaveLength(2);
  });
});

describe('findPerfume', () => {
  it('encuentra el perfume dentro de su marca, con datos ausentes como null o listas vacías', async () => {
    const a = await createBrand('a', 'Marca A');
    await createPerfume(a.id, 'uno', 'Uno');

    const perfume = await repository.findPerfume('a', 'uno');

    expect(perfume).toMatchObject({
      slug: 'uno',
      name: 'Uno',
      description: null,
      sizeMl: null,
      priceCents: null,
      imageUrl: null,
      notesTop: [],
      notesHeart: [],
      notesBase: [],
      occasions: [],
      brand: { slug: 'a', name: 'Marca A' },
    });
  });

  it('el mismo slug puede existir en dos marcas y cada una devuelve el suyo', async () => {
    const a = await createBrand('a', 'Marca A');
    const b = await createBrand('b', 'Marca B');
    await createPerfume(a.id, 'clasico', 'Clásico de A');
    await createPerfume(b.id, 'clasico', 'Clásico de B');

    expect((await repository.findPerfume('a', 'clasico'))?.name).toBe('Clásico de A');
    expect((await repository.findPerfume('b', 'clasico'))?.name).toBe('Clásico de B');
  });

  it('devuelve null si la marca o el perfume no existen, o si no se corresponden', async () => {
    const a = await createBrand('a', 'Marca A');
    await createBrand('b', 'Marca B');
    await createPerfume(a.id, 'uno', 'Uno');

    expect(await repository.findPerfume('a', 'no-existe')).toBeNull();
    expect(await repository.findPerfume('no-existe', 'uno')).toBeNull();
    expect(await repository.findPerfume('b', 'uno')).toBeNull();
  });
});

describe('restricciones de la base de datos', () => {
  it('guarda los identificadores como UUID nativo y rechaza ids que no lo son', async () => {
    const a = await createBrand('a', 'Marca A');

    expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    await expect(createPerfume('no-es-un-uuid', 'x', 'X')).rejects.toThrow();
  });

  it('rechaza un perfume sin marca existente (clave foránea)', async () => {
    await expect(
      createPerfume('00000000-0000-0000-0000-000000000000', 'huerfano', 'Huérfano'),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rechaza un slug repetido dentro de la misma marca', async () => {
    const a = await createBrand('a', 'Marca A');
    await createPerfume(a.id, 'uno', 'Uno');

    await expect(createPerfume(a.id, 'uno', 'Otro uno')).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rechaza dos marcas con el mismo slug', async () => {
    await createBrand('a', 'Marca A');

    await expect(createBrand('a', 'Otra A')).rejects.toMatchObject({ code: 'P2002' });
  });

  it('no permite borrar una marca que tiene perfumes', async () => {
    const a = await createBrand('a', 'Marca A');
    await createPerfume(a.id, 'uno', 'Uno');

    await expect(prisma.brand.delete({ where: { id: a.id } })).rejects.toMatchObject({
      code: 'P2003',
    });
  });
});

describe('seedCatalog', () => {
  // Los conteos salen de los propios datos semilla, para que estas pruebas sigan valiendo
  // cuando se carguen datos reales. La validez de esos datos se comprueba en seed-data.test.ts.
  const expectedBrands = seedBrands.length;
  const expectedPerfumes = seedBrands.reduce((total, brand) => total + brand.perfumes.length, 0);

  it('es idempotente: aplicarla dos veces no duplica filas', async () => {
    const first = await seedCatalog(prisma, seedBrands);
    const second = await seedCatalog(prisma, seedBrands);

    expect(first).toEqual({ brands: expectedBrands, perfumes: expectedPerfumes });
    expect(second).toEqual(first);
    expect(await prisma.brand.count()).toBe(expectedBrands);
    expect(await prisma.perfume.count()).toBe(expectedPerfumes);
  });

  it('guarda cada dato tal como está en la semilla, sin añadir precios ni tamaños', async () => {
    await seedCatalog(prisma, seedBrands);

    for (const seedBrand of seedBrands) {
      for (const seedPerfume of seedBrand.perfumes) {
        const saved = await repository.findPerfume(seedBrand.slug, seedPerfume.slug);

        expect(saved).toMatchObject({
          name: seedPerfume.name,
          priceCents: seedPerfume.priceCents ?? null,
          sizeMl: seedPerfume.sizeMl ?? null,
          imageUrl: seedPerfume.imageUrl ?? null,
          notesTop: seedPerfume.notesTop,
          occasions: seedPerfume.occasions,
        });
      }
    }
  });

  it('no borra datos que no estén en la semilla', async () => {
    const extra = await createBrand('extra', 'Marca extra');
    await createPerfume(extra.id, 'mio', 'Mío');

    await seedCatalog(prisma, seedBrands);

    expect(await repository.findPerfume('extra', 'mio')).not.toBeNull();
  });
});
