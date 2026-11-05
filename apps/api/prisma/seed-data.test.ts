import { describe, expect, it } from 'vitest';
import { brands, type SeedPerfume } from './seed-data.ts';

// Estas pruebas NO necesitan base de datos: corren con `pnpm test`, así que cualquiera que edite
// seed-data.ts recibe aviso en el ciclo normal. El repositorio es público y los precios y las notas
// los define el dueño de la tienda, no se inventan.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EXAMPLE_MARK = '[EJEMPLO]';

const allPerfumes = brands.flatMap((brand) =>
  brand.perfumes.map((perfume) => ({ brand, perfume })),
);

function isExample(perfume: SeedPerfume): boolean {
  return perfume.name.startsWith(EXAMPLE_MARK);
}

function mentionsExample(perfume: SeedPerfume): boolean {
  const texts = [
    perfume.description ?? '',
    ...perfume.notesTop,
    ...perfume.notesHeart,
    ...perfume.notesBase,
    ...perfume.occasions,
  ];
  return texts.some((text) => /\[ejemplo\]/i.test(text));
}

describe('seed-data: estructura', () => {
  it('tiene al menos una marca (una marca sin perfumes sí es válida)', () => {
    expect(brands.length).toBeGreaterThan(0);
  });

  it('usa slugs válidos (minúsculas, números y guiones) y únicos', () => {
    const brandSlugs = brands.map((brand) => brand.slug);
    expect(new Set(brandSlugs).size).toBe(brandSlugs.length);

    for (const brand of brands) {
      expect(brand.slug).toMatch(SLUG);
      const perfumeSlugs = brand.perfumes.map((perfume) => perfume.slug);
      expect(new Set(perfumeSlugs).size, `slugs repetidos en ${brand.slug}`).toBe(
        perfumeSlugs.length,
      );
      for (const slug of perfumeSlugs) expect(slug).toMatch(SLUG);
    }
  });

  it('no tiene nombres vacíos', () => {
    for (const { brand, perfume } of allPerfumes) {
      expect(brand.name.trim(), brand.slug).not.toBe('');
      expect(perfume.name.trim(), `${brand.slug}/${perfume.slug}`).not.toBe('');
    }
  });
});

describe('seed-data: valores numéricos (lo que haría un CHECK en SQL, ver ADR 0006)', () => {
  it('el precio, si existe, es un entero de céntimos mayor o igual que cero', () => {
    for (const { brand, perfume } of allPerfumes) {
      if (perfume.priceCents === undefined) continue;
      expect(Number.isInteger(perfume.priceCents), `${brand.slug}/${perfume.slug}`).toBe(true);
      expect(perfume.priceCents, `${brand.slug}/${perfume.slug}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('el tamaño, si existe, es un entero de mililitros mayor que cero', () => {
    for (const { brand, perfume } of allPerfumes) {
      if (perfume.sizeMl === undefined) continue;
      expect(Number.isInteger(perfume.sizeMl), `${brand.slug}/${perfume.slug}`).toBe(true);
      expect(perfume.sizeMl, `${brand.slug}/${perfume.slug}`).toBeGreaterThan(0);
    }
  });
});

describe('seed-data: datos de ejemplo frente a datos reales', () => {
  it('un perfume de ejemplo no lleva precio, tamaño ni imagen', () => {
    for (const { brand, perfume } of allPerfumes.filter(({ perfume }) => isExample(perfume))) {
      const id = `${brand.slug}/${perfume.slug}`;
      expect(perfume.priceCents, `${id}: un ejemplo no puede tener precio`).toBeUndefined();
      expect(perfume.sizeMl, `${id}: un ejemplo no puede tener tamaño`).toBeUndefined();
      expect(perfume.imageUrl, `${id}: un ejemplo no puede tener imagen`).toBeUndefined();
    }
  });

  it('no mezcla relleno de ejemplo dentro de un perfume que parece real', () => {
    for (const { brand, perfume } of allPerfumes) {
      if (isExample(perfume)) continue;
      expect(
        mentionsExample(perfume),
        `${brand.slug}/${perfume.slug}: tiene texto "[Ejemplo]" pero su nombre no lleva "${EXAMPLE_MARK}"`,
      ).toBe(false);
    }
  });
});
