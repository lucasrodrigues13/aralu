import { test, expect } from '@playwright/test';
import { Api, ADMIN } from '../../support/api';
import { email } from '../../support/dados';
import { planoPedido } from '../../support/fabricas';
import { entrarPelaTela, vigiarErros } from '../../support/tela';


test.describe.serial('admin: planos', () => {
  let admin: Api;

  test.beforeAll(async () => {
    admin = await Api.admin();
  });

  test('admin entra pela tela e vê a área de planos', async ({ page }) => {
    const erros = vigiarErros(page);
    await entrarPelaTela(page, ADMIN.email, ADMIN.senha);
    await page.goto('/admin/planos');
    await expect(page).toHaveURL(/\/admin\/planos/);
    await erros.conferir();
  });

  test('cadastra 3 planos com recursos diferentes', async () => {
    const pedidos = [
      planoPedido('Essencial', 79.9, [], 1),
      planoPedido('Profissional', 149.9, [{ recurso: 'MensagensIa', limite: 500 }], 2),
      planoPedido('Completo', 299.9, [
        { recurso: 'MensagensIa', limite: null },
        { recurso: 'LigacoesIa', limite: 100 },
        { recurso: 'Integracoes', limite: null },
      ], 3),
    ];
    for (const pedido of pedidos) {
      const r = await admin.post('/api/v1/admin/planos', pedido);
      expect(r.status, JSON.stringify(r.corpo)).toBe(201);
    }
    const lista = (await admin.ok('GET', '/api/v1/admin/planos')) as { codigo: string }[];
    for (const pedido of pedidos) expect(lista.map((p) => p.codigo)).toContain(pedido.codigo);
  });

  test('não aceita código repetido, valor negativo ou nome vazio', async () => {
    const base = planoPedido('Repetido', 50);
    expect((await admin.post('/api/v1/admin/planos', base)).status).toBe(201);
    expect((await admin.post('/api/v1/admin/planos', { ...base, nome: 'Outro' })).status).toBe(400);
    expect((await admin.post('/api/v1/admin/planos', { ...planoPedido('Negativo', -1) })).status).toBe(400);
    expect((await admin.post('/api/v1/admin/planos', { ...planoPedido('Vazio', 10), nome: '' })).status).toBe(400);
  });

  test('edita e desativa plano; plano inativo some da lista pública', async () => {
    const pedido = planoPedido('Editavel', 99);
    const criado = (await admin.ok('POST', '/api/v1/admin/planos', pedido)) as { id: string };
    await admin.ok('PUT', `/api/v1/admin/planos/${criado.id}`, { ...pedido, valorMensal: 109, ativo: false });

    const dono = await Api.novoDono(email('planos-publicos'));
    const publicos = (await dono.ok('GET', '/api/v1/assinatura/planos')) as { id: string }[];
    expect(publicos.map((p) => p.id)).not.toContain(criado.id);
  });

  test('dono não acessa rotas de admin (API e tela)', async ({ page }) => {
    const conta = email('dono-sem-admin');
    const dono = await Api.novoDono(conta);
    expect((await dono.get('/api/v1/admin/planos')).status).toBe(403);
    expect((await dono.get('/api/v1/admin/usuarios')).status).toBe(403);
    expect((await dono.post('/api/v1/admin/planos', planoPedido('Invasor', 1))).status).toBe(403);

    await entrarPelaTela(page, conta, 'Senha-E2E-2026!');
    await page.goto('/admin/planos');
    await expect(page).not.toHaveURL(/\/admin\/planos/);
  });
});
