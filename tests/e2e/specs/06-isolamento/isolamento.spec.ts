import { test, expect } from '@playwright/test';
import { Api } from '../../support/api';
import { email } from '../../support/dados';
import { fecharLead } from '../../support/cenario';

// IDOR: o erro nº 1 de SaaS multi-tenant. O dono B tenta ler, editar e apagar tudo do dono A pelo ID.
test.describe('isolamento entre contas', () => {
  test('dono B não lê, não edita e não apaga nada do dono A', async () => {
    const a = await Api.novoDono(email('tenant-a'));
    const b = await Api.novoDono(email('tenant-b'));
    const r = await fecharLead(a, 'Casamento');

    const leituras = [
      `/api/v1/oportunidades/${r.lead.id}`,
      `/api/v1/orcamentos-funil/${r.orcamentoId}`,
      `/api/v1/contratos-funil/${r.contratoId}`,
      `/api/v1/eventos/${r.eventoId}`,
      `/api/v1/eventos/${r.eventoId}/dinheiro`,
      `/api/v1/eventos/${r.eventoId}/convites`,
      `/api/v1/eventos/${r.eventoId}/tarefas`,
      `/api/v1/eventos/${r.eventoId}/equipe`,
      `/api/v1/eventos/${r.eventoId}/link-cliente`,
      `/api/v1/eventos/${r.eventoId}/resumo`,
      `/api/v1/oportunidades/${r.lead.id}/briefing`,
    ];
    for (const rota of leituras) {
      const resp = await b.get(rota);
      expect([403, 404], `GET ${rota} → ${resp.status}`).toContain(resp.status);
    }

    const escritas: [string, string, unknown][] = [
      ['PUT', `/api/v1/oportunidades/${r.lead.id}`, { nome: 'invadido' }],
      ['POST', `/api/v1/oportunidades/${r.lead.id}/mover`, { estagio: 'Descartado', motivoDescarte: 'Preço' }],
      ['DELETE', `/api/v1/oportunidades/${r.lead.id}`, undefined],
      ['PUT', `/api/v1/clientes/${r.clienteId}`, { nome: 'invadido' }],
      ['DELETE', `/api/v1/clientes/${r.clienteId}`, undefined],
      ['POST', `/api/v1/eventos/${r.eventoId}/cancelar`, {}],
      ['POST', `/api/v1/eventos/${r.eventoId}/link-cliente`, { financeiroLiberado: true }],
      ['POST', `/api/v1/contratos-funil/${r.contratoId}/cancelar`, {}],
    ];
    for (const [metodo, rota, corpo] of escritas) {
      const resp = await b.chamar(metodo, rota, corpo);
      expect([400, 403, 404], `${metodo} ${rota} → ${resp.status}`).toContain(resp.status);
    }

    // Nada mudou do lado do A.
    expect((await a.ok('GET', `/api/v1/oportunidades/${r.lead.id}`)).tipoEstagio).toBe('Contratado');
    expect((await a.ok('GET', `/api/v1/eventos/${r.eventoId}`)).situacao).toBe('EmAndamento');

    // Listas do B não trazem nada do A.
    for (const rota of ['/api/v1/oportunidades', '/api/v1/clientes', '/api/v1/eventos', '/api/v1/contratos-funil', '/api/v1/orcamentos-funil']) {
      const texto = JSON.stringify((await b.ok('GET', rota)));
      expect(texto, rota).not.toContain(r.lead.id);
      expect(texto, rota).not.toContain(r.clienteId);
    }
  });

  test('sem login, nada da área logada responde', async () => {
    const anonimo = new Api();
    for (const rota of ['/api/v1/eventos', '/api/v1/oportunidades', '/api/v1/clientes', '/api/v1/perfil', '/api/v1/equipe', '/api/v1/admin/planos']) {
      expect((await anonimo.get(rota)).status, rota).toBe(401);
    }
  });

  test('token adulterado é recusado', async () => {
    const dono = await Api.novoDono(email('token-adulterado'));
    const [h, p, s] = dono.token!.split('.');
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    payload.role = 'Admin';
    const falso = new Api(`${h}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${s}`);
    expect((await falso.get('/api/v1/eventos')).status).toBe(401);
  });
});
