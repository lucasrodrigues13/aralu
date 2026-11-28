import { expect } from '@playwright/test';
import { URLS } from '../playwright.config';

type Resumo = { ID: string; Subject: string; To: { Address: string }[]; Created: string };
type Mensagem = { ID: string; Subject: string; HTML: string; Text: string };

/** Caixa de e-mail do ambiente E2E: tudo que a API envia fica preso no Mailpit. */
export const mailpit = {
  async listar(para: string): Promise<Resumo[]> {
    const r = await fetch(`${URLS.mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}&limit=50`);
    const corpo = (await r.json()) as { messages: Resumo[] };
    return corpo.messages ?? [];
  },

  async ler(id: string): Promise<Mensagem> {
    const r = await fetch(`${URLS.mailpit}/api/v1/message/${id}`);
    return (await r.json()) as Mensagem;
  },

  /** Espera chegar um e-mail para `para` cujo assunto contenha `assunto` e devolve o mais recente. */
  async esperar(para: string, assunto: RegExp | string, timeout = 20_000): Promise<Mensagem> {
    let achado: Resumo | undefined;
    await expect
      .poll(
        async () => {
          const lista = await mailpit.listar(para);
          achado = lista.find((m) => (typeof assunto === 'string' ? m.Subject.includes(assunto) : assunto.test(m.Subject)));
          return !!achado;
        },
        { timeout, message: `e-mail "${assunto}" para ${para}` },
      )
      .toBe(true);
    return mailpit.ler(achado!.ID);
  },

  /** Quantos e-mails com esse assunto `para` recebeu (para checar duplicidade). */
  async contar(para: string, assunto: RegExp | string): Promise<number> {
    const lista = await mailpit.listar(para);
    return lista.filter((m) => (typeof assunto === 'string' ? m.Subject.includes(assunto) : assunto.test(m.Subject))).length;
  },

  /** Primeiro link do e-mail que contenha `trecho` (ex.: "/confirmar-email"). */
  link(mensagem: Mensagem, trecho: string): string {
    const links = [...mensagem.HTML.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replaceAll('&amp;', '&'));
    const link = links.find((l) => l.includes(trecho));
    if (!link) throw new Error(`Link com "${trecho}" não encontrado no e-mail "${mensagem.Subject}". Links: ${links.join(', ')}`);
    return link;
  },

  /** Código numérico de segurança (4 a 8 dígitos) do e-mail. */
  codigo(mensagem: Mensagem): string {
    const m = mensagem.Text.match(/\b(\d{4,8})\b/);
    if (!m) throw new Error(`Código não encontrado no e-mail "${mensagem.Subject}".`);
    return m[1];
  },

  async limpar(): Promise<void> {
    await fetch(`${URLS.mailpit}/api/v1/messages`, { method: 'DELETE' });
  },
};
