import { test, expect } from '@playwright/test';
import { Api, SENHA_PADRAO } from '../../support/api';
import { email, unico } from '../../support/dados';
import { convidarAssistente, criarGrupo, criarOportunidade } from '../../support/cenario';
import { entrarPelaTela, vigiarErros } from '../../support/tela';

type Assistente = Awaited<ReturnType<typeof convidarAssistente>>;

test.describe.serial('dono: configura a conta, 2 grupos × 2 assistentes', () => {
  let dono: Api;
  let donoEmail: string;
  const vendas: Assistente[] = [];
  const operacao: Assistente[] = [];

  test.beforeAll(async () => {
    donoEmail = email('dono-equipe');
    dono = await Api.novoDono(donoEmail);
  });

  test('dono preenche perfil e configurações de proposta', async () => {
    await dono.ok('PUT', '/api/v1/perfil', {
      nomeEmpresa: unico('Ateliê E2E'),
      responsavel: 'Júlia E2E',
      documento: '11222333000181',
      celular: '11999990000',
      pais: 'Brasil',
      cep: '01310100',
      endereco: 'Avenida Paulista',
      numero: '1000',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP',
      chavePix: 'pix@e2e.aralu.test',
    });
    await dono.ok('PUT', '/api/v1/configuracoes/propostas', { validadeDias: 15 });
    const perfil = await dono.ok('GET', '/api/v1/perfil');
    expect(perfil.chavePix).toBe('pix@e2e.aralu.test');
  });

  test('cadastra modelos de serviço, contrato e mensagem', async () => {
    await dono.ok('POST', '/api/v1/servicos-conta', { nome: 'Assessoria completa' });
    await dono.ok('POST', '/api/v1/contratos', { nome: unico('Contrato padrão'), texto: '<p>{{nome_contratante}} contrata {{nome_assessoria}}</p>' });
    const contratos = await dono.ok<unknown[]>('GET', '/api/v1/contratos');
    expect(contratos.length).toBeGreaterThan(0);
  });

  test('cria 2 grupos de acesso com permissões diferentes', async () => {
    const grupoVendas = await criarGrupo(dono, 'Vendas', { Funil: 'Excluir', OrcamentosContratos: 'Editar', Clientes: 'Ver' });
    const grupoOperacao = await criarGrupo(dono, 'Operação', { Eventos: 'Editar', Convidados: 'Editar', Tarefas: 'Editar', Fornecedores: 'Ver' });

    for (const nome of ['vendas-ana', 'vendas-bia']) vendas.push(await convidarAssistente(dono, grupoVendas.id, nome));
    for (const nome of ['operacao-caio', 'operacao-duda']) operacao.push(await convidarAssistente(dono, grupoOperacao.id, nome));

    const equipe = await dono.ok<unknown[]>('GET', '/api/v1/equipe');
    expect(equipe.length).toBeGreaterThanOrEqual(4);
  });

  test('assistente de vendas trabalha no funil e é barrada no resto', async () => {
    for (const a of vendas) {
      const lead = await criarOportunidade(a.api, 'Casamento');
      expect((await a.api.get(`/api/v1/oportunidades/${lead.id}`)).status).toBe(200);
      expect((await a.api.get('/api/v1/orcamentos-funil')).status).toBe(200);
      expect((await a.api.get('/api/v1/clientes')).status).toBe(200);

      expect((await a.api.get('/api/v1/eventos')).status, 'sem módulo Eventos').toBe(403);
      expect((await a.api.get('/api/v1/fornecedores')).status, 'sem módulo Fornecedores').toBe(403);
      expect((await a.api.get('/api/v1/equipe')).status, 'equipe é só do dono').toBe(403);
      expect((await a.api.get('/api/v1/perfil')).status, 'perfil é só do dono').toBe(403);
      expect((await a.api.post('/api/v1/clientes', { nome: 'Não pode' })).status, 'Clientes só Ver').toBe(403);
    }
  });

  test('assistente de operação vê eventos e é barrada no funil', async () => {
    for (const a of operacao) {
      expect((await a.api.get('/api/v1/eventos')).status).toBe(200);
      expect((await a.api.get('/api/v1/tarefas')).status).toBe(200);
      expect((await a.api.get('/api/v1/oportunidades')).status, 'sem módulo Funil').toBe(403);
      expect((await a.api.get('/api/v1/orcamentos-funil')).status).toBe(403);
      expect((await a.api.post('/api/v1/fornecedores', { nome: 'Não pode' })).status, 'Fornecedores só Ver').toBe(403);
    }
  });

  test('assistente entra pela tela e o menu respeita o grupo', async ({ page }) => {
    const erros = vigiarErros(page);
    await entrarPelaTela(page, operacao[0].email, SENHA_PADRAO);
    await page.goto('/oportunidades');
    await expect(page).not.toHaveURL(/\/oportunidades/);
    await page.goto('/configuracoes/equipe');
    await expect(page).not.toHaveURL(/\/configuracoes\/equipe/);
    await page.goto('/eventos');
    await expect(page).toHaveURL(/\/eventos/);
    await erros.conferir();
  });

  test('desativar derruba o acesso na hora; reativar devolve', async () => {
    const alvo = vendas[1];
    await dono.ok('POST', `/api/v1/equipe/${alvo.membroId}/desativar`, {});
    expect((await alvo.api.get('/api/v1/oportunidades')).status, 'token antigo para de valer').toBeGreaterThanOrEqual(401);
    expect((await new Api().post('/api/v1/conta/entrar', { email: alvo.email, senha: SENHA_PADRAO })).status).not.toBe(200);

    await dono.ok('POST', `/api/v1/equipe/${alvo.membroId}/reativar`, {});
    const devolta = await Api.entrar(alvo.email, SENHA_PADRAO);
    const r = await devolta.get('/api/v1/oportunidades');
    expect(r.status, JSON.stringify(r.corpo)).toBe(200);
  });

  test('convite reenviado invalida o link antigo', async () => {
    const grupo = await criarGrupo(dono, 'Reenvio', { Agenda: 'Ver' });
    const conta = email('reenvio');
    const membro = await dono.ok<{ id: string }>('POST', '/api/v1/equipe', { nome: 'Reenvio', email: conta, celular: '11988887777', tipo: 'Membro', grupoId: grupo.id });
    const { mailpit } = await import('../../support/mailpit');
    const antigo = new URL(mailpit.link(await mailpit.esperar(conta, /convite|equipe|acesso/i), '/convite'));
    await dono.ok('POST', `/api/v1/equipe/${membro.id}/reenviar`, {});
    await expect.poll(() => mailpit.contar(conta, /convite|equipe|acesso/i)).toBe(2);
    const r = await new Api().post('/api/v1/conta/aceitar-convite', {
      usuarioId: antigo.searchParams.get('usuarioId'),
      token: antigo.searchParams.get('token'),
      senha: SENHA_PADRAO,
      confirmacao: SENHA_PADRAO,
    });
    expect(r.status).toBe(400);
  });

  test('grupo com membros não pode ser apagado', async () => {
    const grupos = await dono.ok<{ id: string; membros: number }[]>('GET', '/api/v1/grupos-acesso');
    const comMembros = grupos.find((g) => g.membros > 0)!;
    expect([400, 409]).toContain((await dono.delete(`/api/v1/grupos-acesso/${comMembros.id}`)).status);
  });
});
