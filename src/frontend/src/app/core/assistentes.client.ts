import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

export interface Assistente {
  id: string;
  nome: string;
  email: string;
  celular: string | null;
  nascimento: string | null;
  tipo: 'Dono' | 'Membro';
  grupoId: string | null;
  grupo: string | null;
  situacao: 'Convidada' | 'Ativa' | 'Removida' | 'Inativa';
  convidadaEm: string;
  primeiroAcessoEm: string | null;
  conviteEnviado: boolean | null;
}

export interface ContaComAssistentes {
  contaId: string;
  emailDaConta: string;
  membros: Assistente[];
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
  tipo: 'Dono' | 'Membro';
  grupoId: string | null;
}

export interface PermissaoGrupo {
  modulo: string;
  ver: boolean;
  editar: boolean;
  excluir: boolean;
}

export interface SalvarGrupo {
  nome: string;
  veTodosEventos: boolean;
  permissoes: PermissaoGrupo[];
}

/** Módulos da grade de permissões, na ordem da SPEC-062 §9. */
export const MODULOS_GRUPO: { modulo: string; rotulo: string; cobre: string }[] = [
  { modulo: 'Clientes', rotulo: 'Clientes', cobre: 'Cadastro de clientes.' },
  { modulo: 'Eventos', rotulo: 'Eventos', cobre: 'Dados do evento, roteiro, cronograma, inspirações, observações.' },
  { modulo: 'Convidados', rotulo: 'Convidados', cobre: 'Convites, convidados, RSVP, portaria.' },
  { modulo: 'Tarefas', rotulo: 'Tarefas', cobre: 'Tarefas e checklists do evento.' },
  { modulo: 'Agenda', rotulo: 'Agenda', cobre: 'Minha agenda e compromissos.' },
  { modulo: 'Funil', rotulo: 'Funil', cobre: 'Oportunidades, briefings, tarefas do funil.' },
  { modulo: 'OrcamentosContratos', rotulo: 'Orçamentos e contratos', cobre: 'Propostas, contratos e parcelas com o cliente.' },
  { modulo: 'Financeiro', rotulo: 'Financeiro', cobre: 'Valores, parcelas, recebimentos, pagamentos e relatórios financeiros.' },
  { modulo: 'Fornecedores', rotulo: 'Fornecedores', cobre: 'Cadastro e contratação de fornecedores.' },
  { modulo: 'Modelos', rotulo: 'Modelos', cobre: 'Biblioteca de modelos.' },
];

export interface GrupoAcesso {
  id: string;
  nome: string;
  veTodosEventos: boolean;
  padrao: boolean;
  membros: number;
  permissoes: PermissaoGrupo[];
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
    return this.http.get<Assistente[]>(`${this.base}/api/v1/equipe`);
  }

  /** Grupos de acesso da conta (SPEC-062 §9). */
  grupos() {
    return this.http.get<GrupoAcesso[]>(`${this.base}/api/v1/grupos-acesso`);
  }

  criarGrupo(pedido: SalvarGrupo) {
    return this.http.post<GrupoAcesso>(`${this.base}/api/v1/grupos-acesso`, pedido);
  }

  atualizarGrupo(id: string, pedido: SalvarGrupo) {
    return this.http.put<GrupoAcesso>(`${this.base}/api/v1/grupos-acesso/${id}`, pedido);
  }

  excluirGrupo(id: string) {
    return this.http.delete<void>(`${this.base}/api/v1/grupos-acesso/${id}`);
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
    return this.http.post<Assistente>(`${this.base}/api/v1/equipe`, pedido);
  }

  atualizar(id: string, pedido: SalvarAssistente) {
    return this.http.put<Assistente>(`${this.base}/api/v1/equipe/${id}`, pedido);
  }

  reenviar(id: string) {
    return this.http.post<Assistente>(`${this.base}/api/v1/equipe/${id}/reenviar`, null);
  }

  /** Desativa o acesso sem apagar o cadastro (pode ser reativado). */
  desativar(id: string) {
    return this.http.post<void>(`${this.base}/api/v1/equipe/${id}/desativar`, null);
  }

  reativar(id: string) {
    return this.http.post<Assistente>(`${this.base}/api/v1/equipe/${id}/reativar`, null);
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
