import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './healthApi';

describe('resolveApiUrl', () => {
  it('usa la URL por defecto si no hay valor', () => {
    expect(resolveApiUrl(undefined)).toBe('http://localhost:3000');
  });

  it.each(['', '   '])('trata un valor vacío como no definido (%j)', (value) => {
    expect(resolveApiUrl(value)).toBe('http://localhost:3000');
  });

  it.each([
    ['http://localhost:4000', 'http://localhost:4000'],
    ['http://localhost:4000/', 'http://localhost:4000'],
    ['https://api.tienda.example///', 'https://api.tienda.example'],
    ['  http://localhost:4000/  ', 'http://localhost:4000'],
  ])('quita la barra final y los espacios (%j)', (value, expected) => {
    expect(resolveApiUrl(value)).toBe(expected);
  });
});
