import type { PrismaClient } from '../src/db/client.ts';
import type { SeedBrand } from './seed-data.ts';

/**
 * Carga el catálogo de forma idempotente: upsert por slug, sin borrar nada.
 * Los datos de seed-data.ts son la fuente de verdad: volver a ejecutarlo sobrescribe
 * los campos de esas marcas y perfumes, pero no elimina los que ya no aparezcan.
 */
export async function seedCatalog(
  prisma: PrismaClient,
  brands: SeedBrand[],
): Promise<{ brands: number; perfumes: number }> {
  let perfumeCount = 0;

  for (const brand of brands) {
    const saved = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { name: brand.name, description: brand.description ?? null },
      create: { slug: brand.slug, name: brand.name, description: brand.description ?? null },
    });

    for (const perfume of brand.perfumes) {
      const data = {
        name: perfume.name,
        description: perfume.description ?? null,
        sizeMl: perfume.sizeMl ?? null,
        priceCents: perfume.priceCents ?? null,
        imageUrl: perfume.imageUrl ?? null,
        notesTop: perfume.notesTop,
        notesHeart: perfume.notesHeart,
        notesBase: perfume.notesBase,
        occasions: perfume.occasions,
      };
      await prisma.perfume.upsert({
        where: { brandId_slug: { brandId: saved.id, slug: perfume.slug } },
        update: data,
        create: { ...data, slug: perfume.slug, brandId: saved.id },
      });
      perfumeCount += 1;
    }
  }

  return { brands: brands.length, perfumes: perfumeCount };
}
