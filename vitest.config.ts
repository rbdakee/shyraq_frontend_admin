import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // e2e/Playwright not used (decision A3); excludes are defensive only
    exclude: ['tests/**', 'node_modules/**'],
  },
});
