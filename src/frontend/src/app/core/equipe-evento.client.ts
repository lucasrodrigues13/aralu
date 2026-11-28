import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';
import { Cronograma, Roteiro } from './negocio.client';

export type SituacaoPessoaEquipe = 'NaoEnviado' | 'Enviado' | 'Acessou' | 'Vencido' | 'Encerrado';

/** Pessoa que trabalha no dia do evento, sem ser membro da conta (SPEC-067). */
export interface PessoaEquipe {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  funcao: string | null;
  recebePortaria: boolean;
  recebeRoteiro: boolean;
  recebeCronograma: boolean;
  token: string;
  situacao: SituacaoPessoaEquipe;
  enviadoEm: string | null;
  validoAte: string | null;
  ultimoAcessoEm: string | null;
}

export interface ModeloEscolhido {
  id: string;
  nome: string;
}

export interface EquipeEvento {
  roteiro: ModeloEscolhido | null;
  cronograma: ModeloEscolhido | null;
  pessoas: PessoaEquipe[];
}

export interface SalvarPessoaEquipe {
  nome: string;
  email: string;
  telefone: string | null;
  funcao: string | null;
  recebePortaria: boolean;
  recebeRoteiro: boolean;
  recebeCronograma: boolean;
}

/** Antes do código: o e-mail da pessoa vem só mascarado. */
export interface AcessoEquipe {
  empresa: string | null;
  evento: string;
  email: { id: string; email: string };
  sessaoValida: boolean;
  aguardarSegundos: number;
  codigoEnviado: boolean;
  enviadoPara: string | null;
}

/** Painel da pessoa depois do código. */
export interface EquipePublica {
  empresa: string | null;
  evento: string;
  data: string | null;
  hora: string | null;
  locais: { rotulo: string; nome: string | null; endereco: string | null }[];
  nome: string;
  funcao: string | null;
  portaria: boolean;
  roteiro: boolean;
  cronograma: boolean;
  validoAte: string | null;
}

/** Endereço público do link da pessoa. */
export function linkEquipe(token: string, origem: string = location.origin): string {
  return `${origem}/equipe/${token}`;
}

/** wa.me com o link. Telefone sem DDI ganha o 55; sem telefone, o WhatsApp abre para escolher o contato. */
export function whatsappEquipe(pessoa: Pick<PessoaEquipe, 'nome' | 'telefone'>, evento: string, link: string): string {
  const digitos = (pessoa.telefone ?? '').replace(/\D/g, '');
  const destino = digitos.length >= 10 ? (digitos.length <= 11 ? '55' + digitos : digitos) : '';
  const primeiro = pessoa.nome.trim().split(/\s+/)[0];
  const saudacao = primeiro ? `Olá, ${primeiro}!` : 'Olá!';
  const texto = `${saudacao} Aqui está o seu acesso ao evento ${evento}: ${link}\nPara sua segurança, o link pede um código que chega no seu e-mail.`;
  return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
}

/** Equipe do evento: gestão pela Organizer e acesso público da pessoa (SPEC-067). */
@Injectable({ providedIn: 'root' })
export class EquipeEventoClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  // ---- Organizer ----

  equipe(eventoId: string) {
    return this.http.get<EquipeEvento>(this.url(eventoId));
  }

  definirModelos(eventoId: string, roteiroId: string | null, cronogramaId: string | null) {
    return this.http.put<EquipeEvento>(`${this.url(eventoId)}/modelos`, { roteiroId, cronogramaId });
  }

  criar(eventoId: string, pessoa: SalvarPessoaEquipe) {
    return this.http.post<PessoaEquipe>(this.url(eventoId), pessoa);
  }

  atualizar(eventoId: string, pessoaId: string, pessoa: SalvarPessoaEquipe) {
    return this.http.put<PessoaEquipe>(`${this.url(eventoId)}/${pessoaId}`, pessoa);
  }

  remover(eventoId: string, pessoaId: string) {
    return this.http.delete(`${this.url(eventoId)}/${pessoaId}`);
  }

  /** Libera (ou reabre) o link e renova a validade. Chamado ao enviar pelo WhatsApp ou copiar. */
  liberar(eventoId: string, pessoaId: string) {
    return this.http.post<PessoaEquipe>(`${this.url(eventoId)}/${pessoaId}/liberacao`, null);
  }

  encerrar(eventoId: string, pessoaId: string) {
    return this.http.delete<PessoaEquipe>(`${this.url(eventoId)}/${pessoaId}/liberacao`);
  }

  private url(eventoId: string) {
    return `${this.base}/api/v1/eventos/${eventoId}/equipe`;
  }

  // ---- Pessoa da equipe (sem login) ----

  acesso(token: string) {
    return this.http.get<AcessoEquipe>(`${this.publico(token)}/acesso`);
  }

  pedirCodigo(token: string) {
    return this.http.post<AcessoEquipe>(`${this.publico(token)}/acesso/codigo`, null);
  }

  confirmarCodigo(token: string, codigo: string) {
    return this.http.post<{ ok: boolean }>(`${this.publico(token)}/acesso/confirmar`, { codigo });
  }

  painel(token: string) {
    return this.http.get<EquipePublica>(this.publico(token));
  }

  roteiro(token: string) {
    return this.http.get<Roteiro>(`${this.publico(token)}/roteiro`);
  }

  cronograma(token: string) {
    return this.http.get<Cronograma>(`${this.publico(token)}/cronograma`);
  }

  private publico(token: string) {
    return `${this.base}/api/v1/publico/equipe/${encodeURIComponent(token)}`;
  }
}
