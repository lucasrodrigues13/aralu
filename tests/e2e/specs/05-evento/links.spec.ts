import { test, expect } from '@playwright/test';
import { Api } from '../../support/api';
import { email } from '../../support/dados';
import { fecharLead } from '../../support/cenario';
import { mailpit } from '../../support/mailpit';
import { relogio } from '../../support/relogio';

test.describe('evento: link do cliente, 2 organizadores, convidados', () => {
  let dono: Api;
  let eventos: Awaited<ReturnType<typeof fecharLead>>[] = [];

  test.beforeAll(async () => {
    dono = await Api.novoDono(email('dono-evento'));
    eventos = [await fecharLead(dono, 'Casamento'), await fecharLead(dono, 'QuinzeAnos')];
  });

  test.afterAll(() => relogio.zerar());

  test('cliente entra pelo link com código do e-mail', async ({ page }) => {
    const ev = eventos[0];
    const link = await dono.ok<{ token: string }>('POST', `/api/v1/eventos/${ev.eventoId}/link-cliente`, { financeiroLiberado: true, convidadosLiberado: true });
    expect(link.token).toBeTruthy();
    await dono.ok('PUT', `/api/v1/eventos/${ev.eventoId}/link-cliente`, { financeiroLiberado: true, convidadosLiberado: true });

    const cliente = new Api();
    const acesso = await cliente.ok('GET', `/api/v1/publico/cliente/${link.token}/acesso`);
    expect(acesso.sessaoValida).toBe(false);
    expect((await cliente.get(`/api/v1/publico/cliente/${link.token}`)).status, 'sem código não entra').toBeGreaterThanOrEqual(400);

    await cliente.ok('POST', `/api/v1/publico/cliente/${link.token}/acesso/codigo`, { clienteId: acesso.emails[0].clienteId });
    const codigo = mailpit.codigo(await mailpit.esperar(ev.clienteEmail, /código|codigo|acesso/i));

    expect((await cliente.post(`/api/v1/publico/cliente/${link.token}/acesso/confirmar`, { codigo: '000000' })).status, 'código errado').toBeGreaterThanOrEqual(400);
    await cliente.ok('POST', `/api/v1/publico/cliente/${link.token}/acesso/confirmar`, { codigo });
    const painel = await cliente.ok('GET', `/api/v1/publico/cliente/${link.token}`);
    expect(painel).toBeTruthy();

    // Pela tela: a página do link pede o código.
    await page.goto(`/cliente/${link.token}`);
    await expect(page.locator('body')).toContainText(/código|e-mail/i);
  });

  test('cliente cadastra convidado pelo link e o dono vê', async () => {
    const ev = eventos[0];
    const { token } = await dono.ok('GET', `/api/v1/eventos/${ev.eventoId}/link-cliente`);
    const cliente = new Api();
    const acesso = await cliente.ok('GET', `/api/v1/publico/cliente/${token}/acesso`);
    await relogio.avancar({ minutos: 2 }); // respeita o intervalo entre pedidos de código
    await cliente.ok('POST', `/api/v1/publico/cliente/${token}/acesso/codigo`, { clienteId: acesso.emails[0].clienteId });
    const mensagens = await mailpit.listar(ev.clienteEmail);
    const codigo = mailpit.codigo(await mailpit.ler(mensagens[0].ID));
    await cliente.ok('POST', `/api/v1/publico/cliente/${token}/acesso/confirmar`, { codigo });

    await cliente.ok('POST', `/api/v1/publico/cliente/${token}/convites`, { nome: 'Família Silva', convidados: [{ nome: 'Pedro Silva', principal: true, ddi: '55', celular: '11955554444' }, { nome: 'Ana Silva' }] });
    const convites = await dono.ok<{ convites: unknown[] }>('GET', `/api/v1/eventos/${ev.eventoId}/convites`);
    expect(JSON.stringify(convites.convites)).toContain('Pedro Silva');
  });

  test('link revogado para de funcionar', async () => {
    const ev = eventos[1];
    const { token } = await dono.ok('POST', `/api/v1/eventos/${ev.eventoId}/link-cliente`, { financeiroLiberado: false });
    await dono.ok('DELETE', `/api/v1/eventos/${ev.eventoId}/link-cliente`);
    expect((await new Api().get(`/api/v1/publico/cliente/${token}/acesso`)).status).toBeGreaterThanOrEqual(400);
  });

  test('2 organizadores, um em cada evento, entram com código e só veem o próprio', async () => {
    const pessoas: { id: string; token: string; email: string; eventoId: string }[] = [];
    for (const [i, ev] of eventos.entries()) {
      const mail = email(`organizador-${i}`);
      const pessoa = await dono.ok<{ id: string; token: string }>('POST', `/api/v1/eventos/${ev.eventoId}/equipe`, {
        nome: `Organizador ${i + 1}`,
        email: mail,
        telefone: '11966665555',
        funcao: 'Cerimonialista',
        recebePortaria: true,
        recebeRoteiro: true,
        recebeCronograma: true,
      });
      await dono.ok('POST', `/api/v1/eventos/${ev.eventoId}/equipe/${pessoa.id}/liberacao`, {});
      pessoas.push({ ...pessoa, email: mail, eventoId: ev.eventoId });
    }

    const lidas: { id: string; token: string }[] = await dono.ok('GET', `/api/v1/eventos/${eventos[0].eventoId}/equipe`).then((r: any) => r.pessoas ?? r);
    const token0 = lidas.find((p) => p.id === pessoas[0].id)!.token;

    const org = new Api();
    await org.ok('POST', `/api/v1/publico/equipe/${token0}/acesso/codigo`, {});
    const codigo = mailpit.codigo(await mailpit.esperar(pessoas[0].email, /código|codigo|acesso/i));
    await org.ok('POST', `/api/v1/publico/equipe/${token0}/acesso/confirmar`, { codigo });
    // Roteiro e cronograma só abrem depois de o dono escolher os modelos do evento (PUT /equipe/modelos): coberto na próxima leva.
    for (const sufixo of ['', '/portaria']) {
      const r = await org.get(`/api/v1/publico/equipe/${token0}${sufixo}`);
      expect(r.status, `equipe${sufixo} → ${JSON.stringify(r.corpo)}`).toBe(200);
    }

    // O organizador do evento 1 não abre o painel do evento 2 com a sessão dele.
    const token1 = (await dono.ok('GET', `/api/v1/eventos/${eventos[1].eventoId}/equipe`).then((r: any) => r.pessoas ?? r) as { id: string; token: string }[])
      .find((p) => p.id === pessoas[1].id)!.token;
    expect((await org.get(`/api/v1/publico/equipe/${token1}`)).status).toBeGreaterThanOrEqual(400);

    // Encerrar a liberação derruba a sessão.
    await dono.ok('DELETE', `/api/v1/eventos/${eventos[0].eventoId}/equipe/${pessoas[0].id}/liberacao`);
    expect((await org.get(`/api/v1/publico/equipe/${token0}`)).status).toBeGreaterThanOrEqual(400);
  });

  test('concluir e cancelar evento', async () => {
    await dono.ok('POST', `/api/v1/eventos/${eventos[0].eventoId}/concluir`, {});
    expect((await dono.ok('GET', `/api/v1/eventos/${eventos[0].eventoId}`)).situacao).toBe('Concluido');
    await dono.ok('POST', `/api/v1/eventos/${eventos[1].eventoId}/cancelar`, {});
    expect((await dono.ok('GET', `/api/v1/eventos/${eventos[1].eventoId}`)).situacao).toBe('Cancelado');
  });
});
