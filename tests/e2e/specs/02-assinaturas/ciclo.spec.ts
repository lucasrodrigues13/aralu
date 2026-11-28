import { test, expect } from '@playwright/test';
import { Api, webhookAsaas, estadoAsaas } from '../../support/api';
import { relogio } from '../../support/relogio';
import { cpf, email } from '../../support/dados';
import { mailpit } from '../../support/mailpit';
import { planoPedido } from '../../support/fabricas';

type Situacao = { situacao: string; liberada: boolean; plano: string; pagoAte: string | null; proximoVencimento: string | null };

async function situacao(dono: Api): Promise<Situacao> {
  return dono.ok('GET', '/api/v1/assinatura');
}

/** Primeira cobrança que o Asaas falso guardou para a assinatura criada por este dono. */
async function cobrancaDe(assinaturaAsaasId: string) {
  const estado = await estadoAsaas();
  return estado.cobrancas.filter((c) => c.subscription === assinaturaAsaasId).at(-1);
}

async function assinar(dono: Api, planoId: string, forma: 'Cartao' | 'Pix') {
  const antes = (await estadoAsaas()).assinaturas.length;
  await dono.ok('POST', '/api/v1/assinatura/assinar', { documento: cpf(), nomeCobranca: 'Assessoria E2E', formaPagamento: forma, planoId });
  const assinaturas = (await estadoAsaas()).assinaturas;
  expect(assinaturas.length).toBe(antes + 1);
  return assinaturas.at(-1);
}

async function pagar(assinaturaAsaasId: string) {
  const cobranca = await cobrancaDe(assinaturaAsaasId);
  const r = await webhookAsaas('PAYMENT_CONFIRMED', { ...cobranca, status: 'CONFIRMED' });
  expect(r.status).toBeLessThan(300);
  return cobranca;
}

test.describe.serial('assinaturas: 3 planos, ciclo completo', () => {
  const planos: { id: string; nome: string }[] = [];
  let admin: Api;

  test.beforeAll(async () => {
    await relogio.zerar();
    admin = await Api.admin();
    for (const [nome, valor, ordem] of [['Basico', 59.9, 11], ['Medio', 119.9, 12], ['Topo', 239.9, 13]] as const) {
      planos.push(await admin.ok('POST', '/api/v1/admin/planos', planoPedido(nome, valor, [], ordem)));
    }
  });

  test.afterAll(async () => {
    await relogio.zerar();
  });

  for (const [indice, forma] of [[0, 'Cartao'], [1, 'Pix'], [2, 'Cartao']] as const) {
    test(`plano ${indice + 1}: assinar → cancelar → reativar → cancelar → reativar (${forma})`, async () => {
      const conta = email(`assina-${indice}`);
      const dono = await Api.novoDono(conta);
      expect((await situacao(dono)).situacao).toBe('Trial');

      const assinatura = await assinar(dono, planos[indice].id, forma);
      await pagar(assinatura.id);
      let s = await situacao(dono);
      expect(s.situacao).toBe('Ativa');
      expect(s.liberada).toBe(true);
      await expect.poll(() => mailpit.contar(conta, /pagamento/i)).toBe(1);

      for (const rodada of [1, 2]) {
        await dono.ok('POST', '/api/v1/assinatura/cancelar');
        s = await situacao(dono);
        expect(s.situacao, `cancelada (rodada ${rodada})`).toBe('Cancelada');
        expect(s.liberada, 'cancelada continua liberada até o fim do período pago').toBe(true);

        // Cancelar duas vezes não quebra nem duplica.
        expect((await dono.post('/api/v1/assinatura/cancelar')).status).toBe(400);

        await dono.ok('POST', '/api/v1/assinatura/reativar');
        s = await situacao(dono);
        expect(s.situacao, `reativada (rodada ${rodada})`).toBe('Ativa');

        // Reativar o que já está ativo é recusado.
        expect((await dono.post('/api/v1/assinatura/reativar')).status).toBe(400);
      }

      // A reativação não pode gerar cobrança imediata em duplicidade.
      const pendentes = (await estadoAsaas()).cobrancas.filter((c) => c.customer === assinatura.customer && c.status === 'PENDING');
      expect(pendentes.length).toBeLessThanOrEqual(1);
    });
  }

  test('webhook repetido não paga duas vezes nem manda 2 e-mails', async () => {
    const conta = email('webhook-dup');
    const dono = await Api.novoDono(conta);
    const assinatura = await assinar(dono, planos[0].id, 'Pix');
    const cobranca = await cobrancaDe(assinatura.id);
    const id = `evt_${crypto.randomUUID()}`;
    await webhookAsaas('PAYMENT_CONFIRMED', { ...cobranca, status: 'CONFIRMED' }, id);
    const primeira = await situacao(dono);
    await webhookAsaas('PAYMENT_CONFIRMED', { ...cobranca, status: 'CONFIRMED' }, id);
    await webhookAsaas('PAYMENT_RECEIVED', { ...cobranca, status: 'RECEIVED' });
    const depois = await situacao(dono);
    expect(depois.pagoAte).toBe(primeira.pagoAte);
    await expect.poll(() => mailpit.contar(conta, /pagamento/i)).toBe(1);
  });

  test('webhook fora de ordem: atraso que chega depois do pagamento não bloqueia', async () => {
    const dono = await Api.novoDono(email('webhook-ordem'));
    const assinatura = await assinar(dono, planos[1].id, 'Cartao');
    const cobranca = await cobrancaDe(assinatura.id);
    await webhookAsaas('PAYMENT_CONFIRMED', { ...cobranca, status: 'CONFIRMED' });
    await webhookAsaas('PAYMENT_OVERDUE', { ...cobranca, status: 'OVERDUE' });
    expect((await situacao(dono)).situacao).toBe('Ativa');
  });

  test('webhook sem token ou com token errado é recusado', async () => {
    const semToken = await new Api().chamar('POST', '/api/v1/webhooks/asaas', { event: 'PAYMENT_CONFIRMED', payment: {} });
    expect(semToken.status).toBe(401);
    const errado = await new Api().chamar('POST', '/api/v1/webhooks/asaas', { event: 'PAYMENT_CONFIRMED', payment: {} }, { 'asaas-access-token': 'x' });
    expect(errado.status).toBe(401);
  });

  test('viagem no tempo: trial vence e a conta é bloqueada; assinar libera', async ({ page }) => {
    const dono = await Api.novoDono(email('trial-vence'));
    const inicial = await situacao(dono);
    expect(inicial.situacao).toBe('Trial');

    await relogio.avancar({ dias: 31 });
    await relogio.rodarControleDiario();
    const vencida = await situacao(dono);
    expect(vencida.liberada).toBe(false);
    // Bloqueada só enxerga assinatura/conta.
    expect((await dono.get('/api/v1/eventos')).status).toBeGreaterThanOrEqual(400);

    const assinatura = await assinar(dono, planos[0].id, 'Pix');
    await pagar(assinatura.id);
    expect((await situacao(dono)).liberada).toBe(true);
    expect((await dono.get('/api/v1/eventos')).status).toBe(200);
    await relogio.zerar();
  });

  test('viagem no tempo: cobrança não paga → EmAtraso → bloqueio; pagamento desbloqueia', async () => {
    const dono = await Api.novoDono(email('atraso'));
    const assinatura = await assinar(dono, planos[2].id, 'Cartao');
    await pagar(assinatura.id);

    // Próximo mês: nova cobrança vence e não é paga.
    await relogio.avancar({ dias: 32 });
    const proxima = { id: `pay_${crypto.randomUUID()}`, subscription: assinatura.id, customer: assinatura.customer, value: assinatura.value, dueDate: (await relogio.agora()).toISOString().slice(0, 10), status: 'OVERDUE' };
    await webhookAsaas('PAYMENT_OVERDUE', proxima);
    expect((await situacao(dono)).situacao).toBe('EmAtraso');

    await relogio.avancar({ dias: 15 });
    await relogio.rodarControleDiario();
    expect((await situacao(dono)).liberada).toBe(false);

    await webhookAsaas('PAYMENT_RECEIVED', { ...proxima, status: 'RECEIVED' });
    const paga = await situacao(dono);
    expect(paga.situacao).toBe('Ativa');
    expect(paga.liberada).toBe(true);
    await relogio.zerar();
  });

  test('cancelada e período pago acabou: não reativa, precisa assinar de novo', async () => {
    const dono = await Api.novoDono(email('expirou'));
    const assinatura = await assinar(dono, planos[0].id, 'Pix');
    await pagar(assinatura.id);
    await dono.ok('POST', '/api/v1/assinatura/cancelar');
    const { pagoAte } = await situacao(dono);
    expect(pagoAte).not.toBeNull();

    // Último dia pago: ainda reativa? Só confere que não quebra; o dia seguinte é o que importa.
    const diasAteDepois = Math.ceil((new Date(`${pagoAte}T12:00:00Z`).getTime() - (await relogio.agora()).getTime()) / 86_400_000) + 1;
    await relogio.avancar({ dias: diasAteDepois });
    await relogio.rodarControleDiario();
    const r = await dono.post('/api/v1/assinatura/reativar');
    expect(r.status).toBe(400);
    const depois = await situacao(dono);
    expect(depois.situacao, 'regra do ControleDiario: cancelada e período pago acabou → Bloqueada').toBe('Bloqueada');
    expect(depois.liberada).toBe(false);
    await relogio.zerar();
  });

  test('assinar valida CPF, nome e forma de pagamento', async () => {
    const dono = await Api.novoDono(email('assinar-invalido'));
    const base = { documento: cpf(), nomeCobranca: 'Assessoria', formaPagamento: 'Pix', planoId: planos[0].id };
    expect((await dono.post('/api/v1/assinatura/assinar', { ...base, documento: '11111111111' })).status).toBe(400);
    expect((await dono.post('/api/v1/assinatura/assinar', { ...base, nomeCobranca: '' })).status).toBe(400);
    expect((await dono.post('/api/v1/assinatura/assinar', { ...base, nomeCobranca: 'x'.repeat(101) })).status).toBe(400);
    expect((await dono.post('/api/v1/assinatura/assinar', { ...base, formaPagamento: 'Boleto' })).status).toBe(400);
  });
});
