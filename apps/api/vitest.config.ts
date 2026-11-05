import { configDefaults, defineConfig } from 'vitest/config';

// `pnpm test` no necesita Docker: las pruebas de integración (*.db.test.ts) van aparte (`pnpm test:db`).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '**/*.db.test.ts'],
  },
});
