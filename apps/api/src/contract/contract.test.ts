import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type RegisteredRoute } from '../app.ts';
import {
  SEARCH_MAX_LENGTH,
  SEARCH_PATTERN,
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
} from '../catalog/catalog.schemas.ts';
import {
  createFailingCatalogRepository,
  createFakeCatalogRepository,
} from '../test/catalog-fixtures.ts';
import { loadContract } from '../test/contract.ts';

// Estas pruebas impiden que packages/contracts/openapi.yaml y la API se separen sin que nadie lo
// note (ADR 0003). No necesitan base de datos: usan un repositorio en memoria.

const WEB_ORIGIN = 'http://localhost:5173';
const contract = loadContract();

type Case = {
  operationId: string;
  status: number;
  url: string;
  /** "fake" = datos en memoria; "failing" = un repositorio que lanza un error. */
  backend: 'fake' | 'failing';
};

const cases: Case[] = [
  { operationId: 'getHealth', status: 200, url: '/health', backend: 'fake' },

  { operationId: 'listBrands', status: 200, url: '/brands', backend: 'fake' },
  { operationId: 'listBrands', status: 500, url: '/brands', backend: 'failing' },

  { operationId: 'getBrand', status: 200, url: '/brands/marca-alfa', backend: 'fake' },
  { operationId: 'getBrand', status: 200, url: '/brands/marca-zeta', backend: 'fake' },
  { operationId: 'getBrand', status: 400, url: '/brands/MARCA_MALA', backend: 'fake' },
  // Estos dos los resuelve Fastify antes de llegar a las rutas; deben salir igual con la forma del contrato.
  { operationId: 'getBrand', status: 400, url: `/brands/${'a'.repeat(301)}`, backend: 'fake' },
  { operationId: 'getBrand', status: 400, url: '/brands/%E0%A4%A', backend: 'fake' },
  { operationId: 'getBrand', status: 404, url: '/brands/no-existe', backend: 'fake' },
  { operationId: 'getBrand', status: 500, url: '/brands/marca-alfa', backend: 'failing' },

  {
    operationId: 'listBrandPerfumes',
    status: 200,
    url: '/brands/marca-alfa/perfumes',
    backend: 'fake',
  },
  {
    operationId: 'listBrandPerfumes',
    status: 200,
    url: '/brands/marca-zeta/perfumes',
    backend: 'fake',
  },
  {
    operationId: 'listBrandPerfumes',
    status: 200,
    url: '/brands/marca-alfa/perfumes?q=noche',
    backend: 'fake',
  },
  {
    operationId: 'listBrandPerfumes',
    status: 400,
    url: `/brands/marca-alfa/perfumes?q=${'a'.repeat(SEARCH_MAX_LENGTH + 1)}`,
    backend: 'fake',
  },
  {
    operationId: 'listBrandPerfumes',
    status: 400,
    url: '/brands/marca-alfa/perfumes?q=%00',
    backend: 'fake',
  },
  {
    operationId: 'listBrandPerfumes',
    status: 400,
    url: `/brands/marca-alfa/perfumes?q=a${'%20'.repeat(SEARCH_MAX_LENGTH + 50)}`,
    backend: 'fake',
  },
  {
    operationId: 'listBrandPerfumes',
    status: 404,
    url: '/brands/no-existe/perfumes',
    backend: 'fake',
  },
  {
    operationId: 'listBrandPerfumes',
    status: 500,
    url: '/brands/marca-alfa/perfumes',
    backend: 'failing',
  },

  {
    operationId: 'getPerfume',
    status: 200,
    url: '/brands/marca-alfa/perfumes/noche-azul',
    backend: 'fake',
  },
  {
    operationId: 'getPerfume',
    status: 200,
    url: '/brands/marca-alfa/perfumes/dia-claro',
    backend: 'fake',
  },
  {
    operationId: 'getPerfume',
    status: 400,
    url: '/brands/marca-alfa/perfumes/MAL_SLUG',
    backend: 'fake',
  },
  {
    operationId: 'getPerfume',
    status: 404,
    url: '/brands/marca-alfa/perfumes/no-existe',
    backend: 'fake',
  },
  {
    operationId: 'getPerfume',
    status: 500,
    url: '/brands/marca-alfa/perfumes/noche-azul',
    backend: 'failing',
  },
];

let fakeApp: FastifyInstance;
let failingApp: FastifyInstance;
const registeredRoutes: RegisteredRoute[] = [];

beforeAll(async () => {
  fakeApp = await buildApp(
    { WEB_ORIGIN },
    {
      catalog: createFakeCatalogRepository(),
      onRoute: (route) => registeredRoutes.push(route),
    },
  );
  failingApp = await buildApp(
    { WEB_ORIGIN },
    { catalog: createFailingCatalogRepository('detalle-interno-que-no-debe-salir') },
  );
});

afterAll(async () => {
  await fakeApp.close();
  await failingApp.close();
});

describe('rutas de la API ↔ operaciones del contrato', () => {
  it('coinciden en ambos sentidos (ninguna ruta sin documentar, ningún endpoint documentado sin implementar)', () => {
    // HEAD y OPTIONS los añaden Fastify y el plugin de CORS por su cuenta; no son del contrato.
    const implemented = registeredRoutes
      .filter((route) => route.method !== 'HEAD' && route.method !== 'OPTIONS')
      .map((route) => `${route.method} ${route.url}`)
      .sort();
    const documented = contract.operations
      .map((operation) => `${operation.method} ${operation.fastifyPath}`)
      .sort();

    expect(implemented).toEqual(documented);
  });

  it.each(contract.operations.map((operation) => [operation.operationId, operation] as const))(
    '%s: los parámetros de ruta documentados coinciden con los de la ruta',
    (_operationId, operation) => {
      const inPath = [...operation.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      const documented = contract
        .parametersOf(operation.operationId)
        .filter((parameter) => parameter.in === 'path')
        .map((parameter) => parameter.name)
        .sort();

      expect(documented).toEqual(inPath);
    },
  );

  it('listBrandPerfumes documenta el parámetro de consulta q y ningún otro', () => {
    const query = contract
      .parametersOf('listBrandPerfumes')
      .filter((parameter) => parameter.in === 'query')
      .map((parameter) => parameter.name);

    expect(query).toEqual(['q']);
  });

  it('los parámetros de ruta son obligatorios y q es opcional', () => {
    for (const operation of contract.operations) {
      for (const parameter of contract.parametersOf(operation.operationId)) {
        expect(parameter.required, `${operation.operationId}.${parameter.name}`).toBe(
          parameter.in === 'path',
        );
      }
    }
  });

  it('todos los esquemas de components.schemas compilan (también los que ninguna respuesta referencia)', () => {
    const compiled = contract.compileAllSchemas();

    expect(compiled).toEqual(expect.arrayContaining(['Perfume', 'ErrorResponse', 'Slug']));
    expect(compiled).toEqual(Object.keys(contract.document.components.schemas));
  });
});

describe('respuestas reales ↔ esquemas del contrato', () => {
  it.each(cases)('$operationId → $status ($url)', async (testCase) => {
    const app = testCase.backend === 'failing' ? failingApp : fakeApp;

    const response = await app.inject({ method: 'GET', url: testCase.url });

    expect(response.statusCode).toBe(testCase.status);
    // El contrato documenta application/json en todas las respuestas.
    expect(response.headers['content-type']).toContain('application/json');
    const { ok, errors } = contract.validateResponse(
      testCase.operationId,
      testCase.status,
      response.json(),
    );
    expect(ok, errors).toBe(true);
  });

  it('cada respuesta documentada (operación + estado) tiene al menos un caso probado', () => {
    const documented = contract.operations.flatMap((operation) =>
      operation.statuses.map((status) => `${operation.operationId} ${status}`),
    );
    const exercised = new Set(cases.map((c) => `${c.operationId} ${c.status}`));

    expect(documented.filter((pair) => !exercised.has(pair))).toEqual([]);
  });

  it('un 500 no filtra el motivo del fallo', async () => {
    const response = await failingApp.inject({ method: 'GET', url: '/brands' });

    expect(response.body).not.toContain('detalle-interno');
  });
});

describe('el validador del contrato detecta respuestas incorrectas (no es una prueba vacía)', () => {
  const validPerfume = {
    slug: 'uno',
    name: 'Uno',
    brand: { slug: 'marca', name: 'Marca' },
    description: null,
    sizeMl: null,
    price: null,
    imageUrl: null,
    notes: { top: [], heart: [], base: [] },
    occasions: [],
  };

  it('acepta un perfume válido', () => {
    expect(contract.validateResponse('getPerfume', 200, validPerfume).ok).toBe(true);
  });

  it.each([
    ['un campo no documentado (por ejemplo un id interno)', { ...validPerfume, id: 'interno' }],
    ['un campo obligatorio ausente', { ...validPerfume, occasions: undefined }],
    [
      'un precio con otra moneda',
      { ...validPerfume, price: { amountCents: 100, currency: 'USD' } },
    ],
    ['un precio negativo', { ...validPerfume, price: { amountCents: -1, currency: 'PEN' } }],
    ['un precio no entero', { ...validPerfume, price: { amountCents: 1.5, currency: 'PEN' } }],
    ['un tamaño de 0 ml', { ...validPerfume, sizeMl: 0 }],
    ['un slug mal formado', { ...validPerfume, slug: 'Mal_Slug' }],
    ['notas con un tipo incorrecto', { ...validPerfume, notes: { top: 'x', heart: [], base: [] } }],
  ])('rechaza %s', (_descripcion, body) => {
    expect(contract.validateResponse('getPerfume', 200, body).ok).toBe(false);
  });

  it('rechaza un error con un código no documentado', () => {
    expect(
      contract.validateResponse('getBrand', 404, { error: { code: 'OTRO', message: 'x' } }).ok,
    ).toBe(false);
  });

  it('rechaza un conteo de perfumes negativo', () => {
    const body = { items: [{ slug: 'a', name: 'A', description: null, perfumeCount: -1 }] };

    expect(contract.validateResponse('listBrands', 200, body).ok).toBe(false);
  });

  it('falla con un mensaje claro si se pide una respuesta que el contrato no documenta', () => {
    expect(() => contract.validateResponse('getBrand', 418, {})).toThrow(
      /no documenta la respuesta 418/,
    );
    expect(() => contract.validateResponse('noExiste', 200, {})).toThrow(/no define la operación/);
  });
});

describe('validación de entrada de la API ↔ lo que documenta el contrato', () => {
  it('el patrón y la longitud máxima del slug coinciden', () => {
    const slug = contract.document.components.schemas.Slug as {
      pattern: string;
      maxLength: number;
    };

    expect(slug.pattern).toBe(SLUG_PATTERN.source);
    expect(slug.maxLength).toBe(SLUG_MAX_LENGTH);
  });

  it('la longitud máxima y el patrón de q coinciden', () => {
    const searchQuery = contract.document.components.parameters.SearchQuery as {
      schema: { maxLength: number; pattern: string };
    };

    expect(searchQuery.schema.maxLength).toBe(SEARCH_MAX_LENGTH);
    expect(searchQuery.schema.pattern).toBe(SEARCH_PATTERN.source);
  });
});
