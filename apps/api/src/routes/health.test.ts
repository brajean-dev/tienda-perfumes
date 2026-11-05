import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.ts';

const WEB_ORIGIN = 'http://localhost:5173';

describe('GET /health', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({ WEB_ORIGIN });
  });

  afterEach(async () => {
    await app.close();
  });

  it('responde 200 con { status: "ok" } en JSON', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('solo existe como GET (el contrato no define otros métodos)', async () => {
    const response = await app.inject({ method: 'POST', url: '/health' });

    expect(response.statusCode).toBe(404);
  });

  it('permite CORS solo desde el origen de la web configurado', async () => {
    const allowed = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: WEB_ORIGIN },
    });
    const denied = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://sitio-ajeno.example' },
    });

    expect(allowed.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
