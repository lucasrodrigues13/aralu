import { expect, type Page } from '@playwright/test';

/** Login pela tela (o mesmo caminho que o usuário faz). */
export async function entrarPelaTela(page: Page, email: string, senha: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/entrar/);
}

/** Abre a área logada já com o token, sem passar pela tela de login (para jornadas que não testam login). */
export async function abrirLogado(page: Page, sessao: { token: string; email: string; papeis: string[] }, caminho = '/hoje') {
  await page.goto('/entrar');
  await page.evaluate((s) => sessionStorage.setItem('aralu.sessao', JSON.stringify(s)), sessao);
  await page.goto(caminho);
}

/** Falha o teste se a página mostrar erro no console ou resposta 5xx. Chamar no início de cada teste de tela. */
export function vigiarErros(page: Page) {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 500) erros.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });
  return {
    async conferir() {
      expect(erros, 'erros na página').toEqual([]);
    },
  };
}
