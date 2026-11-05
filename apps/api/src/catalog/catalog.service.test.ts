import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../http/errors.ts';
import { createFakeCatalogRepository } from '../test/catalog-fixtures.ts';
import { createCatalogService } from './catalog.service.ts';

function setup() {
  const repository = createFakeCatalogRepository();
  return { repository, service: createCatalogService(repository) };
}

describe('listBrands', () => {
  it('devuelve las marcas con su número de perfumes y sin campos internos', async () => {
    const { service } = setup();

    expect(await service.listBrands()).toEqual({
      items: [
        { slug: 'marca-alfa', name: 'Marca Alfa', description: null, perfumeCount: 2 },
        {
          slug: 'marca-zeta',
          name: 'Marca Zeta',
          description: 'Una marca de prueba sin perfumes.',
          perfumeCount: 0,
        },
      ],
    });
  });
});

describe('getBrand', () => {
  it('devuelve la marca sin campos internos', async () => {
    const { service } = setup();

    expect(await service.getBrand('marca-alfa')).toEqual({
      slug: 'marca-alfa',
      name: 'Marca Alfa',
      description: null,
    });
  });

  it('lanza NotFoundError si la marca no existe', async () => {
    const { service } = setup();

    await expect(service.getBrand('no-existe')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getBrand('no-existe')).rejects.toThrow('No existe la marca "no-existe".');
  });
});

describe('listPerfumes', () => {
  it('presenta cada perfume completo: precio en soles, notas por capas y la marca', async () => {
    const { service } = setup();

    const { items } = await service.listPerfumes('marca-alfa');

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      slug: 'noche-azul',
      name: 'Noche Azul',
      brand: { slug: 'marca-alfa', name: 'Marca Alfa' },
      description: 'Un perfume de prueba.',
      sizeMl: 50,
      price: { amountCents: 25000, currency: 'PEN' },
      imageUrl: 'https://ejemplo.test/noche-azul.jpg',
      notes: { top: ['Nota A'], heart: ['Nota B', 'Nota C'], base: ['Nota D'] },
      occasions: ['Noche'],
    });
  });

  it('un precio sin definir es null (nunca 0 ni un valor inventado)', async () => {
    const { service } = setup();

    const { items } = await service.listPerfumes('marca-alfa');

    expect(items[1]).toMatchObject({
      slug: 'dia-claro',
      price: null,
      sizeMl: null,
      imageUrl: null,
    });
    expect(items[1]?.notes).toEqual({ top: [], heart: [], base: [] });
  });

  it('una marca sin perfumes devuelve una lista vacía, no un error', async () => {
    const { service } = setup();

    expect(await service.listPerfumes('marca-zeta')).toEqual({ items: [] });
  });

  it('lanza NotFoundError si la marca no existe y no consulta perfumes', async () => {
    const { service, repository } = setup();

    await expect(service.listPerfumes('no-existe')).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.calls.listPerfumes).toEqual([]);
  });

  it('pasa la búsqueda recortada al repositorio', async () => {
    const { service, repository } = setup();

    await service.listPerfumes('marca-alfa', { query: '  noche  ' });

    expect(repository.calls.listPerfumes).toEqual([{ brandId: 'brand-1', query: 'noche' }]);
  });

  it.each(['', '   '])('una búsqueda en blanco (%j) equivale a no buscar', async (query) => {
    const { service, repository } = setup();

    const { items } = await service.listPerfumes('marca-alfa', { query });

    expect(items).toHaveLength(2);
    expect(repository.calls.listPerfumes).toEqual([{ brandId: 'brand-1', query: undefined }]);
  });
});

describe('getPerfume', () => {
  it('devuelve el perfume con su marca', async () => {
    const { service } = setup();

    expect(await service.getPerfume('marca-alfa', 'noche-azul')).toMatchObject({
      slug: 'noche-azul',
      brand: { slug: 'marca-alfa', name: 'Marca Alfa' },
      price: { amountCents: 25000, currency: 'PEN' },
    });
  });

  it('lanza NotFoundError si el perfume no existe o no es de esa marca', async () => {
    const { service } = setup();

    await expect(service.getPerfume('marca-alfa', 'no-existe')).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(service.getPerfume('marca-zeta', 'noche-azul')).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(service.getPerfume('no-existe', 'noche-azul')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
