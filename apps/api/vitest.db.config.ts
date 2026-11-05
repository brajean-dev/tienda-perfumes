import { defineConfig } from 'vitest/config';

// Pruebas de integración contra PostgreSQL real, en una base APARTE (TEST_DATABASE_URL).
try {
  process.loadEnvFile('../../.env');
} catch {
  // Sin .env: se usan las variables que ya estén definidas.
}

export default defineConfig({
  test: {
    include: ['src/**/*.db.test.ts'],
    // Comparten una misma base: los archivos se ejecutan uno tras otro.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
