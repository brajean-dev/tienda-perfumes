import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('usa valores por defecto seguros cuando no hay variables', () => {
    expect(loadConfig({})).toEqual({
      API_PORT: 3000,
      API_HOST: '127.0.0.1',
      WEB_ORIGIN: 'http://localhost:5173',
    });
  });

  it('convierte el puerto a número', () => {
    expect(loadConfig({ API_PORT: '4000' }).API_PORT).toBe(4000);
  });

  it('normaliza WEB_ORIGIN a un origen sin barra final ni ruta', () => {
    expect(loadConfig({ WEB_ORIGIN: 'http://localhost:5173/' }).WEB_ORIGIN).toBe(
      'http://localhost:5173',
    );
  });

  it.each(['abc', '0', '70000', ''])('rechaza un puerto inválido (%j)', (port) => {
    expect(() => loadConfig({ API_PORT: port })).toThrow(/Configuración inválida/);
  });

  it('rechaza un WEB_ORIGIN que no es una URL', () => {
    expect(() => loadConfig({ WEB_ORIGIN: 'no-es-una-url' })).toThrow(/Configuración inválida/);
  });
});
