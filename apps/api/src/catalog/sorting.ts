// El orden alfabético no se delega en PostgreSQL: en la imagen `postgres:17-alpine` ordena por
// bytes ("Zeta" antes que "alfa", "Édition" al final). Se ordena aquí con la colación del español.
// Mientras el catálogo sea pequeño basta; si algún día se pagina, habrá que llevarlo a la base
// con una colación explícita.
const collator = new Intl.Collator('es');

type Named = { name: string; slug: string };

/** Por nombre (colación del español) y, si coinciden, por slug para que el orden sea estable. */
export function compareByName(a: Named, b: Named): number {
  const byName = collator.compare(a.name, b.name);
  if (byName !== 0) return byName;
  if (a.slug < b.slug) return -1;
  if (a.slug > b.slug) return 1;
  return 0;
}
