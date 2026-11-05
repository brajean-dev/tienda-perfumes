import type { PrismaClient } from '../db/client.ts';

// Registros del dominio: no exponen tipos de Prisma al resto de la API.
export type BrandRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type BrandWithCount = BrandRecord & { perfumeCount: number };

export type PerfumeRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sizeMl: number | null;
  /** Céntimos de sol (PEN). null = precio por definir. */
  priceCents: number | null;
  imageUrl: string | null;
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  occasions: string[];
};

export type PerfumeWithBrand = PerfumeRecord & {
  brand: Pick<BrandRecord, 'slug' | 'name'>;
};

export interface CatalogRepository {
  listBrands(): Promise<BrandWithCount[]>;
  findBrandBySlug(slug: string): Promise<BrandRecord | null>;
  listPerfumes(brandId: string, options?: { query?: string }): Promise<PerfumeRecord[]>;
  findPerfume(brandSlug: string, perfumeSlug: string): Promise<PerfumeWithBrand | null>;
}

const brandSelect = { id: true, slug: true, name: true, description: true } as const;

const perfumeSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  sizeMl: true,
  priceCents: true,
  imageUrl: true,
  notesTop: true,
  notesHeart: true,
  notesBase: true,
  occasions: true,
} as const;

/**
 * Prisma pasa `contains` a LIKE/ILIKE sin escapar los comodines. Se escapan aquí para que
 * lo que escribe la persona se busque de forma literal ("%" y "_" no son patrones).
 */
function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

export function createCatalogRepository(prisma: PrismaClient): CatalogRepository {
  return {
    async listBrands() {
      const brands = await prisma.brand.findMany({
        select: { ...brandSelect, _count: { select: { perfumes: true } } },
        orderBy: { name: 'asc' },
      });
      return brands.map(({ _count, ...brand }) => ({ ...brand, perfumeCount: _count.perfumes }));
    },

    findBrandBySlug(slug) {
      return prisma.brand.findUnique({ where: { slug }, select: brandSelect });
    },

    listPerfumes(brandId, options = {}) {
      const query = options.query?.trim();
      return prisma.perfume.findMany({
        where: {
          brandId,
          ...(query
            ? { name: { contains: escapeLikePattern(query), mode: 'insensitive' as const } }
            : {}),
        },
        select: perfumeSelect,
        orderBy: { name: 'asc' },
      });
    },

    findPerfume(brandSlug, perfumeSlug) {
      return prisma.perfume.findFirst({
        where: { slug: perfumeSlug, brand: { slug: brandSlug } },
        select: { ...perfumeSelect, brand: { select: { slug: true, name: true } } },
      });
    },
  };
}
