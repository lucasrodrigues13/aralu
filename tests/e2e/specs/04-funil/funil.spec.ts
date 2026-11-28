import { test, expect } from '@playwright/test';
import { Api } from '../../support/api';
import { TIPOS_EVENTO, email } from '../../support/dados';
import { contratante, criarOportunidade, fecharLead } from '../../support/cenario';
import { abrirLogado, vigiarErros } from '../../support/tela';

test.describe('funil: aprovado e desistente para cada tipo de evento', () => {
  let dono: Api;
  let donoEmail: string;

  test.beforeAll(async () => {
    donoEmail = email('dono-funil');
    dono = await Api.novoDono(donoEmail);
  });

  for (const tipo of TIPOS_EVENTO) {
    test(`${tipo}: lead → orçamento → aceite → contrato → cliente → evento`, async () => {
      const r = await fecharLead(dono, tipo);
      const evento = await dono.ok('GET', `/api/v1/eventos/${r.eventoId}`);
      expect(evento.tipo).toBe(tipo);
      const op = await dono.ok('GET', `/api/v1/oportunidades/${r.lead.id}`);
      expect(op.tipoEstagio).toBe('Contratado');
      expect(op.clienteId).toBe(r.clienteId);
      const contrato = await dono.ok('GET', `/api/v1/contratos-funil/${r.contratoId}`);
      expect(contrato.situacao).toBe('Assinado');
    });

    test(`${tipo}: lead desiste → descartado com motivo e dados sensíveis apagados`, async () => {
      const lead = await criarOportunidade(dono, tipo);
      const dados = contratante('Desistente', lead.email);
      await dono.ok('PUT', `/api/v1/oportunidades/${lead.id}`, { nome: lead.nome, estagio: 'Contato inicial', fonte: 'Instagram', tipoEvento: tipo, contatos: [{ nome: 'Desistente', telefone: '11977776666', email: lead.email, contratante: true }], contratante: dados });

      expect((await dono.post(`/api/v1/oportunidades/${lead.id}/mover`, { estagio: 'Descartado' })).status, 'sem motivo não descarta').toBe(400);
      await dono.ok('POST', `/api/v1/oportunidades/${lead.id}/mover`, { estagio: 'Descartado', motivoDescarte: 'Preço' });

      const op = await dono.ok('GET', `/api/v1/oportunidades/${lead.id}`);
      expect(op.tipoEstagio).toBe('Descartado');
      expect(op.motivoDescarte).toBe('Preço');
      expect(op.contratante?.documento ?? null, 'CPF apagado ao descartar').toBeNull();
    });
  }

  test('proposta recusada e proposta com dúvidas', async () => {
    for (const [tipo, esperado] of [['Recusar', 'Respondido'], ['Duvidas', 'EmAndamento']] as const) {
      const lead = await criarOportunidade(dono, 'Aniversario');
      const orc = await dono.ok<{ id: string }>('POST', '/api/v1/orcamentos-funil', { oportunidadeId: lead.id, conteudo: '<p>x</p>', valor: 3000 });
      const { tokenLink } = await dono.ok('POST', `/api/v1/orcamentos-funil/${orc.id}/enviar`, {});
      await new Api().ok('POST', `/api/v1/publico/propostas/${tokenLink}/resposta`, { tipo, mensagem: 'teste' });
      expect((await dono.ok('GET', `/api/v1/orcamentos-funil/${orc.id}`)).situacao).toBe(esperado);
    }
  });

  test('proposta cancelada e token inventado não abrem', async () => {
    const lead = await criarOportunidade(dono, 'Corporativo');
    const orc = await dono.ok<{ id: string }>('POST', '/api/v1/orcamentos-funil', { oportunidadeId: lead.id, conteudo: '<p>x</p>', valor: 3000 });
    const { tokenLink } = await dono.ok('POST', `/api/v1/orcamentos-funil/${orc.id}/enviar`, {});
    await dono.ok('POST', `/api/v1/orcamentos-funil/${orc.id}/cancelar`, {});
    const cancelada = await new Api().get(`/api/v1/publico/propostas/${tokenLink}`);
    // Por desenho a API responde 200 com estado Cancelada e sem conteúdo (mensagem neutra na tela).
    expect(cancelada.corpo.estado).toBe('Cancelada');
    expect(cancelada.corpo.conteudo).toBeNull();
    expect(cancelada.corpo.valor).toBeNull();
    expect((await new Api().get('/api/v1/publico/propostas/inventado-123')).status).toBeGreaterThanOrEqual(400);
  });

  test('contrato sem orçamento aprovado é recusado', async () => {
    const lead = await criarOportunidade(dono, 'Formatura');
    expect((await dono.post('/api/v1/contratos-funil', { oportunidadeId: lead.id, conteudo: '<p>x</p>' })).status).toBe(400);
  });

  test('aceite com script no HTML não executa (XSS)', async ({ page }) => {
    const lead = await criarOportunidade(dono, 'Casamento');
    const orc = await dono.ok<{ id: string }>('POST', '/api/v1/orcamentos-funil', {
      oportunidadeId: lead.id,
      conteudo: '<p>ok</p><script>window.__xss=1</script><img src=x onerror="window.__xss=2">',
      valor: 1000,
    });
    const { tokenLink } = await dono.ok('POST', `/api/v1/orcamentos-funil/${orc.id}/enviar`, {});
    await page.goto(`/proposta/${tokenLink}`);
    await expect(page.getByText('ok').first()).toBeVisible();
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  });

  test('telas do funil abrem sem erro com os dados criados', async ({ page }) => {
    const erros = vigiarErros(page);
    const sessao = { token: dono.token!, email: donoEmail, papeis: ['Organizer'] };
    for (const rota of ['/oportunidades', '/orcamentos-funil', '/contratos-funil', '/tarefas-funil', '/relatorios-funil', '/leads-rsvp', '/clientes', '/eventos', '/gestao-financeira', '/hoje']) {
      await abrirLogado(page, sessao, rota);
      await expect(page, rota).toHaveURL(new RegExp(rota));
      await page.waitForLoadState('networkidle');
    }
    await erros.conferir();
  });
});
