import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/perfumeria';

describe('loadConfig', () => {
  it('usa valores por defecto seguros cuando solo está DATABASE_URL', () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      API_PORT: 3000,
      API_HOST: '127.0.0.1',
      WEB_ORIGIN: 'http://localhost:5173',
      DATABASE_URL,
    });
  });

  it('convierte el puerto a número', () => {
    expect(loadConfig({ DATABASE_URL, API_PORT: '4000' }).API_PORT).toBe(4000);
  });

  it('normaliza WEB_ORIGIN a un origen sin barra final ni ruta', () => {
    expect(loadConfig({ DATABASE_URL, WEB_ORIGIN: 'http://localhost:5173/' }).WEB_ORIGIN).toBe(
      'http://localhost:5173',
    );
  });

  it('acepta https', () => {
    expect(loadConfig({ DATABASE_URL, WEB_ORIGIN: 'https://tienda.example' }).WEB_ORIGIN).toBe(
      'https://tienda.example',
    );
  });

  it.each(['abc', '0', '70000', ''])('rechaza un puerto inválido (%j)', (port) => {
    expect(() => loadConfig({ DATABASE_URL, API_PORT: port })).toThrow(/Configuración inválida/);
  });

  it('rechaza un WEB_ORIGIN que no es una URL', () => {
    expect(() => loadConfig({ DATABASE_URL, WEB_ORIGIN: 'no-es-una-url' })).toThrow(
      /Configuración inválida/,
    );
  });

  it.each(['file:///tmp/index.html', 'data:text/plain,hola', 'ftp://localhost:5173'])(
    'rechaza un WEB_ORIGIN con esquema distinto de http(s) (%s)',
    (origin) => {
      expect(() => loadConfig({ DATABASE_URL, WEB_ORIGIN: origin })).toThrow(
        /Configuración inválida/,
      );
    },
  );

  it('exige DATABASE_URL, con un mensaje que la nombra', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });

  it.each(['mysql://u:p@localhost/db', 'no-es-una-url', ''])(
    'rechaza una DATABASE_URL que no es de PostgreSQL (%j)',
    (url) => {
      expect(() => loadConfig({ DATABASE_URL: url })).toThrow(/DATABASE_URL/);
    },
  );

  it('acepta los dos esquemas de PostgreSQL', () => {
    expect(loadConfig({ DATABASE_URL: 'postgres://u:p@localhost/db' }).DATABASE_URL).toBe(
      'postgres://u:p@localhost/db',
    );
  });

  it('los mensajes de error salen en español', () => {
    expect(() => loadConfig({ DATABASE_URL, API_PORT: 'abc' })).toThrow(
      /Entrada inválida|inválid/i,
    );
  });
});
