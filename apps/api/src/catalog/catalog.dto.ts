import type { components } from '@tienda/contracts';
import type {
  BrandRecord,
  BrandWithCount,
  PerfumeRecord,
  PerfumeWithBrand,
} from './catalog.repository.ts';

// Los tipos salen del contrato (openapi.yaml): si un mapeador devuelve algo que no coincide con
// él, `pnpm typecheck` falla. El resto de la API no ve los registros de la base de datos.
type Schemas = components['schemas'];
export type BrandDto = Schemas['Brand'];
export type BrandSummaryDto = Schemas['BrandSummary'];
export type PerfumeDto = Schemas['Perfume'];
export type BrandListDto = Schemas['BrandListResponse'];
export type PerfumeListDto = Schemas['PerfumeListResponse'];

export function toBrandDto(brand: BrandRecord): BrandDto {
  return { slug: brand.slug, name: brand.name, description: brand.description };
}

export function toBrandSummaryDto(brand: BrandWithCount): BrandSummaryDto {
  return { ...toBrandDto(brand), perfumeCount: brand.perfumeCount };
}

export function toPerfumeDto(
  perfume: PerfumeRecord,
  brand: Pick<BrandRecord, 'slug' | 'name'>,
): PerfumeDto {
  return {
    slug: perfume.slug,
    name: perfume.name,
    brand: { slug: brand.slug, name: brand.name },
    description: perfume.description,
    sizeMl: perfume.sizeMl,
    // priceCents null = precio por definir; nunca se inventa uno.
    price:
      perfume.priceCents === null ? null : { amountCents: perfume.priceCents, currency: 'PEN' },
    imageUrl: perfume.imageUrl,
    notes: { top: perfume.notesTop, heart: perfume.notesHeart, base: perfume.notesBase },
    occasions: perfume.occasions,
  };
}

export function toPerfumeDtoWithBrand(perfume: PerfumeWithBrand): PerfumeDto {
  return toPerfumeDto(perfume, perfume.brand);
}
