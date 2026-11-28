import { test, expect } from '@playwright/test';
import { URLS } from '../../playwright.config';
import { relogio } from '../../support/relogio';

// Garante que a suíte está rodando no ambiente certo antes de qualquer jornada.
test.describe('ambiente E2E', () => {
  test('API, Mailpit e Asaas falso respondem', async () => {
    expect((await fetch(`${URLS.api}/api/health`)).status).toBe(200);
    expect((await fetch(`${URLS.mailpit}/api/v1/info`)).status).toBe(200);
    expect((await fetch(`${URLS.asaas}/_estado`)).status).toBe(200);
  });

  test('relógio controlável avança e volta', async () => {
    await relogio.zerar();
    const antes = await relogio.agora();
    const depois = await relogio.avancar({ dias: 10 });
    expect(depois.getTime() - antes.getTime()).toBeGreaterThanOrEqual(10 * 86_400_000 - 5_000);
    await relogio.zerar();
    expect(Math.abs((await relogio.agora()).getTime() - Date.now())).toBeLessThan(60_000);
  });

  test('front abre a tela de login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/entrar/);
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });
});
