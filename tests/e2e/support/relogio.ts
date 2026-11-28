import type { Page } from '@playwright/test';
import { URLS } from '../playwright.config';

async function post(caminho: string, corpo?: unknown) {
  const r = await fetch(`${URLS.api}/_test${caminho}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok) throw new Error(`/_test${caminho} respondeu ${r.status}: ${await r.text()}`);
  return r.json();
}

/**
 * Relógio controlável da API (só no compose.e2e.yaml). Avança o tempo do backend e, se receber a página,
 * acerta o relógio do navegador junto, para a tela e a API concordarem sobre "hoje".
 */
export const relogio = {
  async agora(): Promise<Date> {
    const r = await fetch(`${URLS.api}/_test/relogio`);
    return new Date(((await r.json()) as { agora: string }).agora);
  },

  async avancar(tempo: { dias?: number; horas?: number; minutos?: number }, page?: Page): Promise<Date> {
    const r = (await post('/relogio/avancar', tempo)) as { agora: string };
    const agora = new Date(r.agora);
    if (page) await page.clock.setSystemTime(agora);
    return agora;
  },

  async definir(momento: Date, page?: Page): Promise<void> {
    await post('/relogio/definir', { momento: momento.toISOString() });
    if (page) await page.clock.setSystemTime(momento);
  },

  async zerar(): Promise<void> {
    await post('/relogio/zerar');
  },

  /** Roda o controle diário de assinaturas na hora "atual" do relógio. */
  async rodarControleDiario(): Promise<{ contas: number; avisos: number; mudancas: number }> {
    return post('/jobs/controle-diario-assinaturas');
  },

  async processarImportacoes(): Promise<{ processadas: number }> {
    return post('/jobs/processar-importacoes');
  },
};
