// Datos semilla del catálogo.
//
// - Las MARCAS son reales (perfumería de nicho); solo se guarda el nombre, sin descripciones.
// - Los PERFUMES son ejemplos claramente falsos ("[EJEMPLO]"): sin precio, sin tamaño y con notas
//   y ocasiones obviamente de relleno. Reemplázalos por datos reales verificados.
//   Los precios (en céntimos de sol) los define el dueño de la tienda; no se inventan aquí.
// - El repositorio es público: no pongas aquí nada que no quieras publicar.

export type SeedPerfume = {
  slug: string;
  name: string;
  description?: string;
  sizeMl?: number;
  priceCents?: number;
  imageUrl?: string;
  notesTop: string[];
  notesHeart: string[];
  notesBase: string[];
  occasions: string[];
};

export type SeedBrand = {
  slug: string;
  name: string;
  description?: string;
  perfumes: SeedPerfume[];
};

function examplePerfumes(): SeedPerfume[] {
  return [1, 2].map((n) => ({
    slug: `ejemplo-${n}`,
    name: `[EJEMPLO] Perfume ${n}`,
    description: 'Datos de ejemplo: reemplazar por la información real del perfume.',
    notesTop: ['[Ejemplo] nota de salida'],
    notesHeart: ['[Ejemplo] nota de corazón'],
    notesBase: ['[Ejemplo] nota de fondo'],
    occasions: ['[Ejemplo] ocasión de uso'],
  }));
}

export const brands: SeedBrand[] = [
  { slug: 'byredo', name: 'Byredo', perfumes: examplePerfumes() },
  { slug: 'le-labo', name: 'Le Labo', perfumes: examplePerfumes() },
  {
    slug: 'maison-francis-kurkdjian',
    name: 'Maison Francis Kurkdjian',
    perfumes: examplePerfumes(),
  },
  { slug: 'xerjoff', name: 'Xerjoff', perfumes: examplePerfumes() },
];
