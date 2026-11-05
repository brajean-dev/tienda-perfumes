import { describe, expect, it } from 'vitest';
import { compareByName } from './sorting.ts';

function sortedNames(names: string[]): string[] {
  return names
    .map((name) => ({ name, slug: name.toLowerCase() }))
    .sort(compareByName)
    .map((item) => item.name);
}

describe('compareByName', () => {
  it('ordena sin distinguir mayúsculas de minúsculas en la primera letra', () => {
    expect(sortedNames(['Zeta', 'alfa', 'Byredo', 'le labo', 'Xerjoff'])).toEqual([
      'alfa',
      'Byredo',
      'le labo',
      'Xerjoff',
      'Zeta',
    ]);
  });

  it('coloca las letras con tilde junto a su letra base, no al final', () => {
    // Se comparan primero las letras base (ambar < amor); la tilde solo desempata después.
    expect(sortedNames(['Frédéric', 'Édition', 'Eau', 'Zeta', 'Amor', 'Ámbar'])).toEqual([
      'Ámbar',
      'Amor',
      'Eau',
      'Édition',
      'Frédéric',
      'Zeta',
    ]);
  });

  it('con las mismas letras base, la palabra sin tilde va antes que la acentuada', () => {
    expect(sortedNames(['Edén', 'Edwin', 'Eden'])).toEqual(['Eden', 'Edén', 'Edwin']);
  });

  it('pone la ñ después de la n, como en español', () => {
    expect(sortedNames(['Ñandú', 'Nube', 'Oro'])).toEqual(['Nube', 'Ñandú', 'Oro']);
  });

  it('desempata por slug cuando dos nombres son iguales', () => {
    const items = [
      { name: 'Clásico', slug: 'clasico-b' },
      { name: 'Clásico', slug: 'clasico-a' },
    ];

    expect(items.sort(compareByName).map((item) => item.slug)).toEqual(['clasico-a', 'clasico-b']);
  });
});
