import { expect } from '@playwright/test';
import { URLS } from '../playwright.config';
import { mailpit } from './mailpit';

export const ADMIN = { email: 'admin@aralu.test', senha: 'Admin-E2E-2026!' };
export const SENHA_PADRAO = 'Senha-E2E-2026!';

export type Resposta<T = any> = { status: number; corpo: T };

/** Cliente HTTP da API com o token de um perfil. Usado para preparar cenários rápido e para checar 403/404. */
export class Api {
  /** Cookies recebidos (sessão dos links públicos: cliente, equipe, briefing). */
  private cookies = new Map<string, string>();

  constructor(public token?: string) {}

  async chamar<T = any>(metodo: string, caminho: string, corpo?: unknown, cabecalhos: Record<string, string> = {}): Promise<Resposta<T>> {
    const cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const r = await fetch(`${URLS.api}${caminho}`, {
      method: metodo,
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(cookie ? { cookie } : {}),
        ...cabecalhos,
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    for (const linha of r.headers.getSetCookie()) {
      const [par] = linha.split(';');
      const i = par.indexOf('=');
      this.cookies.set(par.slice(0, i).trim(), par.slice(i + 1).trim());
    }
    const texto = await r.text();
    let json: any = texto;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      /* corpo não é JSON */
    }
    return { status: r.status, corpo: json as T };
  }

  get = <T = any>(c: string) => this.chamar<T>('GET', c);
  post = <T = any>(c: string, b?: unknown) => this.chamar<T>('POST', c, b ?? {});
  put = <T = any>(c: string, b?: unknown) => this.chamar<T>('PUT', c, b ?? {});
  delete = <T = any>(c: string) => this.chamar<T>('DELETE', c);

  /** Igual a chamar, mas falha o teste se não vier 2xx. */
  async ok<T = any>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
    const r = await this.chamar<T>(metodo, caminho, corpo);
    expect(r.status, `${metodo} ${caminho} → ${JSON.stringify(r.corpo)}`).toBeLessThan(300);
    return r.corpo;
  }

  static async entrar(email: string, senha: string): Promise<Api> {
    const r = await new Api().post<{ token: string }>('/api/v1/conta/entrar', { email, senha });
    expect(r.status, `login ${email}: ${JSON.stringify(r.corpo)}`).toBe(200);
    return new Api(r.corpo.token);
  }

  static admin(): Promise<Api> {
    return Api.entrar(ADMIN.email, ADMIN.senha);
  }

  /** Cadastra um Dono pela API, confirma o e-mail pelo link do Mailpit e devolve logado. */
  static async novoDono(email: string, senha = SENHA_PADRAO): Promise<Api> {
    const publico = new Api();
    await publico.ok('POST', '/api/v1/conta/cadastro', { email, senha, confirmacao: senha, aceiteTermos: true });
    const mensagem = await mailpit.esperar(email, /confirm/i);
    const link = new URL(mailpit.link(mensagem, 'confirmar-email'));
    await publico.ok('POST', '/api/v1/conta/confirmar-email', {
      usuarioId: link.searchParams.get('usuarioId') ?? link.searchParams.get('userId'),
      token: link.searchParams.get('token'),
    });
    return Api.entrar(email, senha);
  }
}

/** Webhook do Asaas como o Asaas mandaria (token no header). */
export async function webhookAsaas(evento: string, pagamento: Record<string, unknown>, id = `evt_${crypto.randomUUID()}`) {
  return new Api().chamar('POST', '/api/v1/webhooks/asaas', { id, event: evento, payment: pagamento }, { 'asaas-access-token': 'e2e-webhook' });
}

/** Estado do Asaas falso: o que a API criou/alterou lá. */
export async function estadoAsaas(): Promise<{ clientes: any[]; assinaturas: any[]; cobrancas: any[]; chamadas: any[] }> {
  return (await fetch(`${URLS.asaas}/_estado`)).json();
}
