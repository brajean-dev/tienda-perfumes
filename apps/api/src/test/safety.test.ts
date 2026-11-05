import { describe, expect, it } from 'vitest';
import { assertSafeTestDatabaseUrl } from './safety.ts';

const DEV = 'postgresql://user:pass@localhost:5432/perfumeria';
const TEST = 'postgresql://user:pass@localhost:5432/perfumeria_test';

describe('assertSafeTestDatabaseUrl', () => {
  it('acepta una base local cuyo nombre termina en _test y devuelve su nombre', () => {
    expect(assertSafeTestDatabaseUrl(TEST, DEV)).toBe('perfumeria_test');
  });

  it.each([
    'postgresql://u:p@127.0.0.1:5432/x_test',
    'postgres://u:p@localhost/x_test',
    'postgresql://u:p@[::1]:5432/x_test',
    'postgresql://u:p@localhost:5432/x_test?sslmode=disable',
  ])('acepta variantes locales válidas (%s)', (url) => {
    expect(assertSafeTestDatabaseUrl(url)).toBe('x_test');
  });

  it('exige que esté definida', () => {
    expect(() => assertSafeTestDatabaseUrl(undefined)).toThrow(/no está definida/);
    expect(() => assertSafeTestDatabaseUrl('')).toThrow(/no está definida/);
  });

  it('rechaza una URL mal formada con un mensaje claro', () => {
    expect(() => assertSafeTestDatabaseUrl('esto no es una url')).toThrow(/no es una URL válida/);
  });

  it('rechaza esquemas que no son de PostgreSQL', () => {
    expect(() => assertSafeTestDatabaseUrl('mysql://u:p@localhost/x_test')).toThrow(/PostgreSQL/);
  });

  it.each([
    'postgresql://u:p@db.ejemplo.com:5432/x_test',
    'postgresql://u:p@10.0.0.5:5432/x_test',
    'postgresql://u:p@localhost.ejemplo.com/x_test',
  ])('rechaza un servidor que no es esta máquina (%s)', (url) => {
    expect(() => assertSafeTestDatabaseUrl(url)).toThrow(/en esta máquina/);
  });

  it.each([
    'postgresql://u:p@localhost:5432/perfumeria',
    'postgresql://u:p@localhost:5432/test',
    'postgresql://u:p@localhost:5432/perfumeria_test2',
    'postgresql://u:p@localhost:5432/',
  ])('rechaza un nombre que no termina en _test (%s)', (url) => {
    expect(() => assertSafeTestDatabaseUrl(url)).toThrow(/_test/);
  });

  it.each([
    'postgresql://u:p@localhost:5432/Perfumeria_test',
    "postgresql://u:p@localhost:5432/a'b_test",
    'postgresql://u:p@localhost:5432/a%22b_test',
    'postgresql://u:p@localhost:5432/a-b_test',
    'postgresql://u:p@localhost:5432/a%20b_test',
  ])('rechaza nombres con mayúsculas o caracteres que no sean letras, números o _ (%s)', (url) => {
    expect(() => assertSafeTestDatabaseUrl(url)).toThrow(/_test/);
  });

  it.each([
    'postgresql://u:p@localhost/x_test?host=prod.ejemplo.com',
    'postgresql://u:p@localhost/x_test?port=6543',
    'postgresql://u:p@localhost/x_test?hostaddr=10.0.0.5',
    'postgresql://u:p@localhost/x_test?sslmode=disable&host=prod.ejemplo.com',
    'postgresql://u:p@localhost/x_test?HOST=prod.ejemplo.com',
    'postgresql://u:p@localhost/x_test?service=produccion',
  ])('rechaza parámetros que podrían redirigir la conexión a otro servidor (%s)', (url) => {
    expect(() => assertSafeTestDatabaseUrl(url)).toThrow(/no admite el parámetro/);
  });

  it('acepta los parámetros de la lista blanca', () => {
    const url = 'postgresql://u:p@localhost/x_test?sslmode=disable&connect_timeout=5&schema=public';

    expect(assertSafeTestDatabaseUrl(url)).toBe('x_test');
  });

  it('acepta el host en mayúsculas (no se normaliza solo con este esquema de URL)', () => {
    expect(assertSafeTestDatabaseUrl('postgresql://u:p@LOCALHOST:5432/x_test')).toBe('x_test');
  });

  it.each([
    [
      'postgresql://u:p@127.0.0.1:5432/perfumeria_test',
      'postgresql://u:p@localhost/perfumeria_test',
    ],
    [
      'postgresql://u:p@localhost/perfumeria_test',
      'postgresql://u:p@localhost:5432/perfumeria_test',
    ],
    ['postgresql://u:p@[::1]:5432/perfumeria_test', 'postgresql://u:p@LOCALHOST/perfumeria_test'],
  ])(
    'detecta la misma base aunque se escriba distinto el servidor (%s frente a %s)',
    (development, test) => {
      expect(() => assertSafeTestDatabaseUrl(test, development)).toThrow(/misma base/);
    },
  );

  it('rechaza una base de pruebas idéntica a la de desarrollo', () => {
    const same = 'postgresql://user:pass@localhost:5432/perfumeria_test';

    expect(() => assertSafeTestDatabaseUrl(same, same)).toThrow(/misma base/);
  });

  it('no confunde dos servidores locales distintos que usan el mismo nombre', () => {
    const otherPort = 'postgresql://user:pass@localhost:5433/perfumeria_test';

    expect(assertSafeTestDatabaseUrl(otherPort, TEST)).toBe('perfumeria_test');
  });

  it('ignora una DATABASE_URL inválida (no puede coincidir)', () => {
    expect(assertSafeTestDatabaseUrl(TEST, 'basura')).toBe('perfumeria_test');
  });
});
