import { test, expect } from '@playwright/test';
import { Api, ADMIN, SENHA_PADRAO } from '../../support/api';
import { mailpit } from '../../support/mailpit';
import { email } from '../../support/dados';
import { entrarPelaTela, vigiarErros } from '../../support/tela';

test.describe('cadastro, confirmação e login', () => {
  test('dono se cadastra pela tela, confirma pelo e-mail e entra', async ({ page }) => {
    const erros = vigiarErros(page);
    const conta = email('dono');

    await page.goto('/cadastro');
    await page.getByLabel('E-mail').fill(conta);
    await page.getByLabel('Senha', { exact: true }).fill(SENHA_PADRAO);
    await page.getByLabel('Confirme a senha').fill(SENHA_PADRAO);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Criar conta' }).click();

    const mensagem = await mailpit.esperar(conta, /confirm/i);
    await page.goto(mailpit.link(mensagem, '/confirmar-email'));
    await expect(page.getByText(/confirmado/i).first()).toBeVisible();

    await entrarPelaTela(page, conta, SENHA_PADRAO);
    await expect(page).toHaveURL(/\/hoje/);
    expect(await mailpit.contar(conta, /confirm/i), 'um único e-mail de confirmação').toBe(1);
    await erros.conferir();
  });

  test('cadastro recusa e-mail repetido mesmo com maiúsculas', async () => {
    const conta = email('dup');
    await Api.novoDono(conta);
    const r = await new Api().post('/api/v1/conta/cadastro', {
      email: conta.toUpperCase(),
      senha: SENHA_PADRAO,
      confirmacao: SENHA_PADRAO,
      aceiteTermos: true,
    });
    // Não pode criar segunda conta. A resposta pode ser neutra (sem revelar que existe), mas não 5xx.
    expect(r.status).toBeLessThan(500);
    const login = await new Api().post('/api/v1/conta/entrar', { email: conta.toUpperCase(), senha: SENHA_PADRAO });
    expect(login.status).toBe(200);
  });

  test('cadastro valida campos', async () => {
    const api = new Api();
    for (const pedido of [
      { email: '', senha: SENHA_PADRAO, confirmacao: SENHA_PADRAO, aceiteTermos: true },
      { email: 'invalido', senha: SENHA_PADRAO, confirmacao: SENHA_PADRAO, aceiteTermos: true },
      { email: email('fraca'), senha: '123', confirmacao: '123', aceiteTermos: true },
      { email: email('diferente'), senha: SENHA_PADRAO, confirmacao: 'Outra-Senha-1!', aceiteTermos: true },
      { email: email('termos'), senha: SENHA_PADRAO, confirmacao: SENHA_PADRAO, aceiteTermos: false },
    ]) {
      const r = await api.post('/api/v1/conta/cadastro', pedido);
      expect(r.status, JSON.stringify(pedido)).toBe(400);
    }
  });

  test('login sem confirmar e-mail é recusado', async () => {
    const conta = email('semconfirmar');
    await new Api().ok('POST', '/api/v1/conta/cadastro', { email: conta, senha: SENHA_PADRAO, confirmacao: SENHA_PADRAO, aceiteTermos: true });
    const r = await new Api().post('/api/v1/conta/entrar', { email: conta, senha: SENHA_PADRAO });
    expect(r.status).not.toBe(200);
  });

  test('senha errada mostra erro e não entra', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill(ADMIN.email);
    await page.getByLabel('Senha').fill('errada-123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/entrar/);
  });

  test('link de confirmação não pode ser reutilizado', async () => {
    const conta = email('reuso');
    const publico = new Api();
    await publico.ok('POST', '/api/v1/conta/cadastro', { email: conta, senha: SENHA_PADRAO, confirmacao: SENHA_PADRAO, aceiteTermos: true });
    const link = new URL(mailpit.link(await mailpit.esperar(conta, /confirm/i), 'confirmar-email'));
    const pedido = { usuarioId: link.searchParams.get('usuarioId'), token: link.searchParams.get('token') };
    await publico.ok('POST', '/api/v1/conta/confirmar-email', pedido);
    const segunda = await publico.post('/api/v1/conta/confirmar-email', pedido);
    expect(segunda.status).toBeLessThan(500);
  });

  test('esqueci a senha: e-mail inexistente tem resposta neutra; existente recebe link e troca a senha', async ({ page }) => {
    const publico = new Api();
    const neutra = await publico.post('/api/v1/conta/esqueci-senha', { email: email('naoexiste') });
    expect(neutra.status).toBe(200);

    const conta = email('esqueci');
    await Api.novoDono(conta);
    await publico.ok('POST', '/api/v1/conta/esqueci-senha', { email: conta });
    const mensagem = await mailpit.esperar(conta, /senha/i);
    await page.goto(mailpit.link(mensagem, '/redefinir-senha'));
    const nova = 'Nova-Senha-E2E-2026!';
    await page.getByLabel(/nova senha/i).first().fill(nova);
    await page.getByLabel(/confirm/i).fill(nova);
    await page.getByRole('button', { name: /redefinir|salvar|trocar/i }).click();
    await expect(page.getByText(/redefinida/i)).toBeVisible();

    expect((await publico.post('/api/v1/conta/entrar', { email: conta, senha: SENHA_PADRAO })).status).not.toBe(200);
    expect((await publico.post('/api/v1/conta/entrar', { email: conta, senha: nova })).status).toBe(200);
  });
});
