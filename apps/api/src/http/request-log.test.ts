import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { requestForLog } from './request-log.ts';

function fakeRequest(url: string): FastifyRequest {
  return {
    method: 'GET',
    url,
    host: 'localhost:3000',
    ip: '127.0.0.1',
    socket: { remotePort: 54321 },
  } as unknown as FastifyRequest;
}

describe('requestForLog', () => {
  it('registra el método, la ruta, el host y el origen de la petición', () => {
    expect(requestForLog(fakeRequest('/brands/byredo'))).toEqual({
      method: 'GET',
      url: '/brands/byredo',
      host: 'localhost:3000',
      remoteAddress: '127.0.0.1',
      remotePort: 54321,
    });
  });

  it('no registra la consulta, así que la búsqueda del usuario no queda en el log', () => {
    const logged = requestForLog(fakeRequest('/brands/byredo/perfumes?q=busqueda-privada&x=1'));

    expect(logged.url).toBe('/brands/byredo/perfumes');
    expect(JSON.stringify(logged)).not.toContain('busqueda-privada');
  });

  it('una URL sin consulta se registra completa', () => {
    expect(requestForLog(fakeRequest('/health')).url).toBe('/health');
  });
});
