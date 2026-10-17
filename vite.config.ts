import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Относительные пути: архив игры для Яндекс Игр открывается не из корня домена.
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
