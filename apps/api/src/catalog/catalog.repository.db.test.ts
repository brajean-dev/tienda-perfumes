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
  it('ordena por nombre e incluye el número de perfumes', async () => {
    const zeta = await createBrand('zeta', 'Zeta');
    const alfa = await createBrand('alfa', 'Alfa');
    await createPerfume(alfa.id, 'uno', 'Uno');
    await createPerfume(alfa.id, 'dos', 'Dos');

    const brands = await repository.listBrands();

    expect(brands.map((b) => [b.name, b.perfumeCount])).toEqual([
      ['Alfa', 2],
      ['Zeta', 0],
    ]);
    expect(zeta.id).toBeTruthy();
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

  it('busca por nombre sin distinguir mayúsculas', async () => {
    const { a } = await setup();

    const perfumes = await repository.listPerfumes(a.id, { query: 'NOCHE' });

    expect(perfumes.map((p) => p.slug)).toEqual(['noche-azul']);
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
  it('es idempotente: aplicarla dos veces no duplica filas', async () => {
    const first = await seedCatalog(prisma, seedBrands);
    const second = await seedCatalog(prisma, seedBrands);

    expect(first).toEqual({ brands: 4, perfumes: 8 });
    expect(second).toEqual(first);
    expect(await prisma.brand.count()).toBe(4);
    expect(await prisma.perfume.count()).toBe(8);
  });

  it('no deja precios ni tamaños inventados en los perfumes de ejemplo', async () => {
    await seedCatalog(prisma, seedBrands);

    const perfumes = await prisma.perfume.findMany();

    expect(perfumes.every((p) => p.priceCents === null && p.sizeMl === null)).toBe(true);
    expect(perfumes.every((p) => p.name.startsWith('[EJEMPLO]'))).toBe(true);
  });

  it('no borra datos que no estén en la semilla', async () => {
    const extra = await createBrand('extra', 'Marca extra');
    await createPerfume(extra.id, 'mio', 'Mío');

    await seedCatalog(prisma, seedBrands);

    expect(await repository.findPerfume('extra', 'mio')).not.toBeNull();
  });
});
