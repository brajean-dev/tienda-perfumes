import type {
  BrandRecord,
  BrandWithCount,
  CatalogRepository,
  PerfumeRecord,
  PerfumeWithBrand,
} from '../catalog/catalog.repository.ts';

// Datos de PRUEBA, inventados para las pruebas (no son datos del catálogo). Se usan con un
// repositorio en memoria, así que estas pruebas no necesitan base de datos.

export type FakeBrand = BrandRecord & { perfumes: PerfumeRecord[] };

export function makePerfume(overrides: Partial<PerfumeRecord> = {}): PerfumeRecord {
  return {
    id: 'perfume-id',
    slug: 'sin-datos',
    name: 'Perfume sin datos',
    description: null,
    sizeMl: null,
    priceCents: null,
    imageUrl: null,
    notesTop: [],
    notesHeart: [],
    notesBase: [],
    occasions: [],
    ...overrides,
  };
}

/** Un perfume con todos los datos informados. */
export const COMPLETE_PERFUME = makePerfume({
  id: 'perfume-1',
  slug: 'noche-azul',
  name: 'Noche Azul',
  description: 'Un perfume de prueba.',
  sizeMl: 50,
  priceCents: 25000,
  imageUrl: 'https://ejemplo.test/noche-azul.jpg',
  notesTop: ['Nota A'],
  notesHeart: ['Nota B', 'Nota C'],
  notesBase: ['Nota D'],
  occasions: ['Noche'],
});

/** Un perfume con todo lo opcional ausente. */
export const EMPTY_PERFUME = makePerfume({
  id: 'perfume-2',
  slug: 'dia-claro',
  name: 'Día Claro',
});

export function sampleBrands(): FakeBrand[] {
  return [
    {
      id: 'brand-1',
      slug: 'marca-alfa',
      name: 'Marca Alfa',
      description: null,
      perfumes: [COMPLETE_PERFUME, EMPTY_PERFUME],
    },
    {
      id: 'brand-2',
      slug: 'marca-zeta',
      name: 'Marca Zeta',
      description: 'Una marca de prueba sin perfumes.',
      perfumes: [],
    },
  ];
}

export type FakeCatalogRepository = CatalogRepository & {
  calls: { listPerfumes: Array<{ brandId: string; query: string | undefined }> };
};

/** Repositorio en memoria. Devuelve los datos en el orden recibido (el orden real es de la base). */
export function createFakeCatalogRepository(
  brands: FakeBrand[] = sampleBrands(),
): FakeCatalogRepository {
  const calls: FakeCatalogRepository['calls'] = { listPerfumes: [] };

  return {
    calls,

    async listBrands(): Promise<BrandWithCount[]> {
      return brands.map(({ perfumes, ...brand }) => ({ ...brand, perfumeCount: perfumes.length }));
    },

    async findBrandBySlug(slug): Promise<BrandRecord | null> {
      const found = brands.find((brand) => brand.slug === slug);
      if (!found) return null;
      const { perfumes: _perfumes, ...brand } = found;
      return brand;
    },

    async listPerfumes(brandId, options = {}): Promise<PerfumeRecord[]> {
      calls.listPerfumes.push({ brandId, query: options.query });
      const found = brands.find((brand) => brand.id === brandId);
      const query = options.query?.toLowerCase();
      return (found?.perfumes ?? []).filter(
        (perfume) => !query || perfume.name.toLowerCase().includes(query),
      );
    },

    async findPerfume(brandSlug, perfumeSlug): Promise<PerfumeWithBrand | null> {
      const brand = brands.find((candidate) => candidate.slug === brandSlug);
      const perfume = brand?.perfumes.find((candidate) => candidate.slug === perfumeSlug);
      if (!brand || !perfume) return null;
      return { ...perfume, brand: { slug: brand.slug, name: brand.name } };
    },
  };
}

/** Repositorio que siempre falla, para probar el 500 y que no se filtra el motivo. */
export function createFailingCatalogRepository(message: string): CatalogRepository {
  const fail = async (): Promise<never> => {
    throw new Error(message);
  };
  return { listBrands: fail, findBrandBySlug: fail, listPerfumes: fail, findPerfume: fail };
}
