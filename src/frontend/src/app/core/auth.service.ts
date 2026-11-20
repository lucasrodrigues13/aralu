import { Injectable, signal } from '@angular/core';

const CHAVE = 'aralu.sessao';
const CHAVE_CONTA = 'aralu.conta-admin';

export interface Sessao {
  token: string;
  email: string;
  papeis: string[];
}

/** O que a pessoa logada pode ver. Vem de /conta/area, lido do banco a cada pedido (SPEC-032 §6.3). */
export interface Permissoes {
  podeVerFinanceiro: boolean;
  somenteDela: boolean;
  /** Id do usuário logado; serve para saber o que a assistente criou (SPEC-032 §18, passo 1). */
  usuarioId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessao = signal<Sessao | null>(this.ler());
  /** Conta organizer que o admin está operando (Início Admin); vai no cabeçalho de cada pedido. */
  readonly contaSelecionada = signal<{ id: string; email: string } | null>(this.lerConta());
  readonly permissoes = signal<Permissoes | null>(null);

  autenticado(): boolean {
    return !!this.sessao()?.token;
  }

  ehAdmin(): boolean {
    return this.sessao()?.papeis.includes('Admin') ?? false;
  }

  /** Assistente da conta: não vê Perfil, Contratos da conta nem Assistentes (SPEC-032 §8). */
  ehAssistente(): boolean {
    return this.sessao()?.papeis.includes('Assistant') ?? false;
  }

  /** A dona vê o financeiro sempre; a assistente só com a permissão. */
  podeVerFinanceiro(): boolean {
    return !this.ehAssistente() || (this.permissoes()?.podeVerFinanceiro ?? false);
  }

  /** A dona exclui tudo do funil; a assistente só o que ela mesma criou (SPEC-032 §18, passo 1). */
  podeExcluirDoFunil(criadoPor: string | null | undefined): boolean {
    if (!this.ehAssistente()) {
      return true;
    }

    const eu = this.permissoes()?.usuarioId;
    return !!criadoPor && !!eu && criadoPor === eu;
  }

  email(): string {
    return this.sessao()?.email ?? '';
  }

  token(): string | null {
    return this.sessao()?.token ?? null;
  }

  guardar(sessao: Sessao): void {
    sessionStorage.setItem(CHAVE, JSON.stringify(sessao));
    this.sessao.set(sessao);
    this.permissoes.set(null);
  }

  selecionarConta(conta: { id: string; email: string } | null): void {
    if (conta) {
      sessionStorage.setItem(CHAVE_CONTA, JSON.stringify(conta));
    } else {
      sessionStorage.removeItem(CHAVE_CONTA);
    }

    this.contaSelecionada.set(conta);
  }

  private lerConta(): { id: string; email: string } | null {
    try {
      const conta = JSON.parse(sessionStorage.getItem(CHAVE_CONTA) ?? 'null');
      return conta?.id ? conta : null;
    } catch {
      return null;
    }
  }

  sair(): void {
    sessionStorage.removeItem(CHAVE);
    sessionStorage.removeItem(CHAVE_CONTA);
    this.contaSelecionada.set(null);
    this.sessao.set(null);
    this.permissoes.set(null);
  }

  private ler(): Sessao | null {
    const texto = sessionStorage.getItem(CHAVE);
    if (!texto) {
      return null;
    }

    try {
      const sessao = JSON.parse(texto) as Sessao;
      return sessao?.token ? sessao : null;
    } catch {
      return null;
    }
  }
}
