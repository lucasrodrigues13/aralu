import { defineConfig, devices } from '@playwright/test';

// Ambiente descartável do compose.e2e.yaml. Nunca apontar para staging/produção.
export const URLS = {
  app: process.env.E2E_APP_URL ?? 'http://localhost:18080',
  api: process.env.E2E_API_URL ?? 'http://localhost:18081',
  mailpit: process.env.E2E_MAILPIT_URL ?? 'http://localhost:18025',
  asaas: process.env.E2E_ASAAS_URL ?? 'http://localhost:18082',
};

export default defineConfig({
  testDir: './specs',
  // Pastas numeradas rodam em ordem; dentro de cada jornada o arquivo usa test.describe.serial.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: URLS.app,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] }, grep: /@celular/ },
  ],
});
