import { defineConfig, devices } from '@playwright/test';

// Браузерные проверки production-сборки (docs/TESTING.md): полная партия, адаптивность, обучение, ошибки ресурсов.
const url = (port: number) => `http://localhost:${port}`;
const server = (product: string, port: number) => ({
  command: `npm run build:${product} && npx vite preview --mode ${product} --port ${port} --strictPort`,
  url: url(port),
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
});
const DESKTOP = { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } };
const PHONE = { ...devices['Pixel 7'], browserName: 'chromium' as const, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 };

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  // Каждый продукт собирается и запускается отдельно (docs/ARCHITECTURE.md §8).
  webServer: [server('igroteka', 4173), server('durak', 4174), server('dominoes', 4175)],
  projects: [
    // «Игротека» — весь набор проверок; product.e2e.ts — паспорт продукта.
    { name: 'desktop', metadata: { product: 'igroteka' }, use: { ...DESKTOP, baseURL: url(4173) } },
    { name: 'phone', metadata: { product: 'igroteka' }, use: { ...PHONE, baseURL: url(4173) } },
    // Самостоятельный «Дурак»: паспорт, голос и полная партия.
    { name: 'durak-desktop', metadata: { product: 'durak' }, testMatch: '**/product.e2e.ts', use: { ...DESKTOP, baseURL: url(4174) } },
    { name: 'durak-phone', metadata: { product: 'durak' }, testMatch: '**/product.e2e.ts', use: { ...PHONE, baseURL: url(4174) } },
    // Самостоятельное «Домино»: паспорт и полный матч.
    { name: 'dominoes-desktop', metadata: { product: 'dominoes' }, testMatch: ['**/product.e2e.ts', '**/dominoes.e2e.ts'], use: { ...DESKTOP, baseURL: url(4175) } },
    { name: 'dominoes-phone', metadata: { product: 'dominoes' }, testMatch: ['**/product.e2e.ts', '**/dominoes.e2e.ts'], use: { ...PHONE, baseURL: url(4175) } },
  ],
});
