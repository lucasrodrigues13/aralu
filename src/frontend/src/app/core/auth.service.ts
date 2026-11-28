import { Injectable, signal } from '@angular/core';

const CHAVE = 'aralu.sessao';
const CHAVE_CONTA = 'aralu.conta-admin';
const CHAVE_VISITANTE = 'aralu.visitante';

/**
 * Conta logada neste navegador, em qualquer aba. O login fica em sessionStorage (não passa para outra aba),
 * então a página pública da proposta usa esta marca para saber que quem abriu o link é a assessoria, não o lead.
 * Janela anônima não enxerga a marca.
 */
export function contaDoVisitante(): string | null {
  try {
    return localStorage.getItem(CHAVE_VISITANTE);
  } catch {
    return null;
  }
}

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
  /** Permissões do grupo do Membro ("Modulo:Acao"). O Dono não tem lista: pode tudo (SPEC-062 §9). */
  permissoes?: string[];
}

/** Módulos com permissão por grupo (SPEC-062 §9). */
export type Modulo =
  | 'Clientes'
  | 'Eventos'
  | 'Convidados'
  | 'Tarefas'
  | 'Agenda'
  | 'Funil'
  | 'OrcamentosContratos'
  | 'Financeiro'
  | 'Fornecedores'
  | 'Modelos';

/** Converte a resposta de /conta/area nas permissões da sessão. */
export function permissoesDaArea(area: {
  podeVerFinanceiro?: boolean;
  somenteDela?: boolean;
  usuarioId?: string;
  permissoes?: string[];
}): Permissoes {
  return {
    podeVerFinanceiro: !!area.podeVerFinanceiro,
    somenteDela: !!area.somenteDela,
    usuarioId: area.usuarioId,
    permissoes: area.permissoes ?? [],
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessao = signal<Sessao | null>(this.ler());
  /** Conta organizer que o admin está operando (Início Admin); vai no cabeçalho de cada pedido. */
  readonly contaSelecionada = signal<{ id: string; email: string } | null>(this.lerConta());
  readonly permissoes = signal<Permissoes | null>(null);

  constructor() {
    // Sessão que já existia antes da marca (login feito antes desta versão) também ganha a marca.
    this.marcarVisitante();
  }

  private marcarVisitante(): void {
    try {
      const conta = this.contaId();
      if (conta) localStorage.setItem(CHAVE_VISITANTE, conta);
    } catch {
      // sem localStorage a marca só deixa de valer em outras abas
    }
  }

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

  /** O Dono pode tudo; o Membro, o que o grupo libera (SPEC-062 §9). O servidor confere de novo. */
  pode(modulo: Modulo, acao: 'Ver' | 'Editar' | 'Excluir' = 'Ver'): boolean {
    return !this.ehAssistente() || (this.permissoes()?.permissoes ?? []).includes(`${modulo}:${acao}`);
  }

  podeVerFinanceiro(): boolean {
    return this.pode('Financeiro');
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

  /** Id da conta (da dona): organizer_id para assistente e admin; para a dona, o próprio usuário. */
  contaId(): string | null {
    const token = this.token();
    if (!token) return null;
    try {
      // JWT usa base64url (- e _); o atob só entende base64 comum.
      const base64 = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes)) as { sub?: string; organizer_id?: string };
      return payload.organizer_id ?? payload.sub ?? null;
    } catch {
      return null;
    }
  }

  guardar(sessao: Sessao): void {
    sessionStorage.setItem(CHAVE, JSON.stringify(sessao));
    this.sessao.set(sessao);
    this.permissoes.set(null);
    this.marcarVisitante();
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
    try {
      localStorage.removeItem(CHAVE_VISITANTE);
    } catch {
      // ver guardar()
    }
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
