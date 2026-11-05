import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../app.ts';

const WEB_ORIGIN = 'http://localhost:5173';
const FOREIGN_ORIGIN = 'https://sitio-ajeno.example';

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
      headers: { origin: FOREIGN_ORIGIN },
    });

    expect(allowed.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('preflight CORS (OPTIONS /health)', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({ WEB_ORIGIN });
  });

  afterEach(async () => {
    await app.close();
  });

  it('responde al origen permitido y solo anuncia métodos de lectura', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: { origin: WEB_ORIGIN, 'access-control-request-method': 'GET' },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);

    const methods = String(response.headers['access-control-allow-methods'])
      .split(',')
      .map((method) => method.trim());
    expect(methods).toContain('GET');
    expect(methods).not.toContain('POST');
    expect(methods).not.toContain('DELETE');
  });

  it('no concede el origen a un sitio ajeno (el navegador bloqueará la petición)', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: { origin: FOREIGN_ORIGIN, 'access-control-request-method': 'GET' },
    });

    // Lo que decide el navegador es Access-Control-Allow-Origin; sin él, no hay acceso.
    // (@fastify/cors sí anuncia Allow-Methods aunque el origen no esté permitido; no concede nada.)
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
