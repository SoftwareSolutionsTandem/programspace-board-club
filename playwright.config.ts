import { defineConfig, devices } from '@playwright/test';

// Браузерные проверки production-сборки (docs/TESTING.md): полная партия, адаптивность, обучение, ошибки ресурсов.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'phone', use: { ...devices['Pixel 7'], browserName: 'chromium', viewport: { width: 390, height: 844 } } },
  ],
});
