import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export interface Assistente {
  id: string;
  nome: string;
  email: string;
  celular: string | null;
  nascimento: string | null;
  podeVerFinanceiro: boolean;
  somenteDela: boolean;
  situacao: 'Convidada' | 'Ativa' | 'Removida' | 'Inativa';
  convidadaEm: string;
  primeiroAcessoEm: string | null;
  conviteEnviado: boolean | null;
}

export interface ContaComAssistentes {
  contaId: string;
  emailDaConta: string;
  assistentes: Assistente[];
}

export interface NomeAssistente {
  id: string;
  nome: string;
  removida: boolean;
}

export interface SalvarAssistente {
  nome: string;
  email: string;
  celular: string | null;
  nascimento: string | null;
  podeVerFinanceiro: boolean;
  somenteDela: boolean;
}

export interface MinhaConta {
  nome: string;
  email: string;
  celular: string | null;
  nascimento: string | null;
  empresa: string;
}

/** Assistentes da conta (SPEC-032): gestão pela dona, seletores e "Minha conta" da assistente. */
@Injectable({ providedIn: 'root' })
export class AssistentesClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  listar() {
    return this.http.get<Assistente[]>(`${this.base}/api/v1/assistentes`);
  }

  /** Consulta do Admin: assistentes de todas as contas (só leitura). */
  doAdmin() {
    return this.http.get<ContaComAssistentes[]>(`${this.base}/api/v1/admin/assistentes`);
  }

  ativas() {
    return this.http.get<Assistente[]>(`${this.base}/api/v1/assistentes/ativas`);
  }

  nomes() {
    return this.http.get<NomeAssistente[]>(`${this.base}/api/v1/assistentes/nomes`);
  }

  convidar(pedido: SalvarAssistente) {
    return this.http.post<Assistente>(`${this.base}/api/v1/assistentes`, pedido);
  }

  atualizar(id: string, pedido: SalvarAssistente) {
    return this.http.put<Assistente>(`${this.base}/api/v1/assistentes/${id}`, pedido);
  }

  reenviar(id: string) {
    return this.http.post<Assistente>(`${this.base}/api/v1/assistentes/${id}/reenviar`, null);
  }

  /** Desativa o acesso sem apagar o cadastro (pode ser reativado). */
  desativar(id: string) {
    return this.http.post<void>(`${this.base}/api/v1/assistentes/${id}/desativar`, null);
  }

  reativar(id: string) {
    return this.http.post<Assistente>(`${this.base}/api/v1/assistentes/${id}/reativar`, null);
  }

  aceitarConvite(usuarioId: string, token: string, senha: string, confirmacao: string) {
    return this.http.post<{ mensagem: string }>(`${this.base}/api/v1/conta/aceitar-convite`, {
      usuarioId,
      token,
      senha,
      confirmacao,
    });
  }

  doEvento(eventoId: string) {
    return this.http.get<{ assistentes: string[] }>(`${this.base}/api/v1/eventos/${eventoId}/assistentes`);
  }

  definirDoEvento(eventoId: string, assistentes: string[]) {
    return this.http.put<{ assistentes: string[] }>(`${this.base}/api/v1/eventos/${eventoId}/assistentes`, { assistentes });
  }

  minhaConta() {
    return this.http.get<MinhaConta>(`${this.base}/api/v1/minha-conta`);
  }

  atualizarMinhaConta(pedido: { nome: string; celular: string | null; nascimento: string | null }) {
    return this.http.put<MinhaConta>(`${this.base}/api/v1/minha-conta`, pedido);
  }

  trocarSenha(atual: string, nova: string) {
    return this.http.post<{ mensagem: string }>(`${this.base}/api/v1/minha-conta/senha`, { atual, nova });
  }
}
