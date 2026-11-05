import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.ts';
import {
  createFailingCatalogRepository,
  createFakeCatalogRepository,
} from '../test/catalog-fixtures.ts';

const WEB_ORIGIN = 'http://localhost:5173';
let app: FastifyInstance;

afterEach(async () => {
  await app?.close();
});

async function appWithFakeData() {
  app = await buildApp({ WEB_ORIGIN }, { catalog: createFakeCatalogRepository() });
  return app;
}

describe('GET /brands', () => {
  it('responde 200 con { items } y sin campos internos', async () => {
    const response = await (await appWithFakeData()).inject({ method: 'GET', url: '/brands' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const { items } = response.json();
    expect(items.map((item: { slug: string }) => item.slug)).toEqual(['marca-alfa', 'marca-zeta']);
    expect(items[0]).not.toHaveProperty('id');
  });
});

describe('GET /brands/:brandSlug', () => {
  it('responde 200 con la marca', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/marca-alfa',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ slug: 'marca-alfa', name: 'Marca Alfa', description: null });
  });

  it('responde 404 con NOT_FOUND si la marca no existe', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/no-existe',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No existe la marca "no-existe".' },
    });
  });

  it.each(['Marca_Alfa', 'MARCA', 'con%20espacio', '-guion', 'doble--guion', 'a'.repeat(101)])(
    'responde 400 con VALIDATION_ERROR si el slug está mal formado (%s)',
    async (slug) => {
      const response = await (
        await appWithFakeData()
      ).inject({
        method: 'GET',
        url: `/brands/${slug}`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
      expect(response.json().error.message).toContain('brandSlug');
    },
  );
});

describe('GET /brands/:brandSlug/perfumes', () => {
  it('lista los perfumes de la marca', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/marca-alfa/perfumes',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().items.map((p: { slug: string }) => p.slug)).toEqual([
      'noche-azul',
      'dia-claro',
    ]);
  });

  it('filtra con ?q= sin distinguir mayúsculas', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/marca-alfa/perfumes?q=NOCHE',
    });

    expect(response.json().items.map((p: { slug: string }) => p.slug)).toEqual(['noche-azul']);
  });

  it('una búsqueda sin coincidencias devuelve 200 con lista vacía', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/marca-alfa/perfumes?q=nada',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ items: [] });
  });

  it('responde 404 si la marca no existe', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/no-existe/perfumes',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('responde 400 si q supera los 100 caracteres', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: `/brands/marca-alfa/perfumes?q=${'a'.repeat(101)}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain('q');
  });

  it('responde 400 si q se repite (?q=a&q=b)', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/marca-alfa/perfumes?q=a&q=b',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /brands/:brandSlug/perfumes/:perfumeSlug', () => {
  it('responde 200 con el perfume completo', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/marca-alfa/perfumes/noche-azul',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      slug: 'noche-azul',
      brand: { slug: 'marca-alfa' },
      price: { amountCents: 25000, currency: 'PEN' },
    });
  });

  it('responde 404 si el perfume no existe', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/marca-alfa/perfumes/no-existe',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('responde 400 si algún slug está mal formado', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/marca-alfa/perfumes/MAL_SLUG',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toContain('perfumeSlug');
  });
});

describe('errores que Fastify resuelve antes de llegar a las rutas', () => {
  it('un parámetro por encima del tope responde 400 con la forma del contrato y sin repetir la ruta', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: `/brands/${'a'.repeat(301)}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'La solicitud no es válida.' },
    });
    expect(response.body).not.toContain('aaaa');
  });

  it('una URL mal codificada responde 400 con la forma del contrato', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/brands/%E0%A4%A',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('errores generales', () => {
  it('una ruta desconocida responde 404 con la forma del contrato y sin repetir lo enviado', async () => {
    const response = await (
      await appWithFakeData()
    ).inject({
      method: 'GET',
      url: '/no-existe-esta-ruta?x=<script>',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'No existe la ruta pedida.' },
    });
    expect(response.body).not.toContain('script');
  });

  it('un fallo interno responde 500 genérico y no revela el motivo', async () => {
    app = await buildApp(
      { WEB_ORIGIN },
      { catalog: createFailingCatalogRepository('contraseña-de-la-base-secreta') },
    );

    const response = await app.inject({ method: 'GET', url: '/brands' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' },
    });
    expect(response.body).not.toContain('secreta');
  });

  it('los endpoints del catálogo conservan CORS restringido al origen de la web', async () => {
    const instance = await appWithFakeData();

    const allowed = await instance.inject({
      method: 'GET',
      url: '/brands',
      headers: { origin: WEB_ORIGIN },
    });
    const denied = await instance.inject({
      method: 'GET',
      url: '/brands',
      headers: { origin: 'https://sitio-ajeno.example' },
    });

    expect(allowed.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sin repositorio no se registran las rutas del catálogo, pero /health sigue', async () => {
    app = await buildApp({ WEB_ORIGIN });

    expect((await app.inject({ method: 'GET', url: '/brands' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
  });
});
