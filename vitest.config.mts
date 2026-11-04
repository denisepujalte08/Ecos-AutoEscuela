import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` lanza fuera de Next; en los tests se reemplaza por un módulo vacío.
      'server-only': fileURLToPath(new URL('./src/test/empty.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    // Carga .env.local para las pruebas contra servicios reales (*.live.test.ts).
    // Los tests unitarios fijan sus propias variables con vi.stubEnv.
    env: loadEnv(mode, process.cwd(), ''),
  },
}));
