import { NotFoundError } from '../http/errors.ts';
import {
  toBrandDto,
  toBrandSummaryDto,
  toPerfumeDto,
  toPerfumeDtoWithBrand,
  type BrandDto,
  type BrandListDto,
  type PerfumeDto,
  type PerfumeListDto,
} from './catalog.dto.ts';
import type { CatalogRepository } from './catalog.repository.ts';

export interface CatalogService {
  listBrands(): Promise<BrandListDto>;
  getBrand(brandSlug: string): Promise<BrandDto>;
  listPerfumes(brandSlug: string, options?: { query?: string }): Promise<PerfumeListDto>;
  getPerfume(brandSlug: string, perfumeSlug: string): Promise<PerfumeDto>;
}

/** Reglas del catálogo: qué es "no encontrado" y cómo se presenta cada dato. No sabe de HTTP. */
export function createCatalogService(repository: CatalogRepository): CatalogService {
  async function requireBrand(brandSlug: string) {
    const brand = await repository.findBrandBySlug(brandSlug);
    if (!brand) {
      throw new NotFoundError(`No existe la marca "${brandSlug}".`);
    }
    return brand;
  }

  return {
    async listBrands() {
      const brands = await repository.listBrands();
      return { items: brands.map(toBrandSummaryDto) };
    },

    async getBrand(brandSlug) {
      return toBrandDto(await requireBrand(brandSlug));
    },

    async listPerfumes(brandSlug, options = {}) {
      const brand = await requireBrand(brandSlug);
      // Un texto en blanco equivale a no buscar.
      const query = options.query?.trim() || undefined;
      const perfumes = await repository.listPerfumes(brand.id, query ? { query } : {});
      return { items: perfumes.map((perfume) => toPerfumeDto(perfume, brand)) };
    },

    async getPerfume(brandSlug, perfumeSlug) {
      const perfume = await repository.findPerfume(brandSlug, perfumeSlug);
      if (!perfume) {
        throw new NotFoundError(
          `No existe el perfume "${perfumeSlug}" de la marca "${brandSlug}".`,
        );
      }
      return toPerfumeDtoWithBrand(perfume);
    },
  };
}
