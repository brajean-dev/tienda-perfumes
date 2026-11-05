import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // Lee el .env de la raíz. Vite solo expone al cliente las variables que empiezan por VITE_.
  envDir: '../..',
  server: {
    port: 5173,
    // La API solo acepta CORS desde este origen: si el puerto cambiara en silencio, fallaría.
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
