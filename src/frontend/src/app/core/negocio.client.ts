import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-base-url';
import { contaDoVisitante } from './auth.service';
import { FormaPagamento, ParcelaContrato, ParcelaOrcamento } from './dinheiro.client';
import { PedidoConvite } from './convite-formulario';
import { ImportacaoConvidados } from './importacoes';

export interface Painel {
  emAndamento: number;
  concluidos: number;
  cancelados: number;
  eventosEmAndamento: { id: string; nome: string; data: string | null }[];
  funil: FunilEstagio[];
}

export interface Perfil {
  email: string;
  nomeEmpresa: string | null;
  responsavel: string | null;
  documento: string | null;
  celular: string | null;
  nascimento: string | null;
  pais: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  fotoId: string | null;
  chavePix: string | null;
}

/** Serviço do modelo, ligado ao cadastro da conta (SPEC-012 v3 §8.4). */
export interface ServicoModelo {
  id: string;
  servicoContaId: string | null;
  nome: string;
  valorEstimado: number | null;
  /** Falso quando o serviço saiu do cadastro da conta. */
  noCadastro: boolean;
}

export interface ItemChecklistModelo {
  id: string;
  texto: string;
  prazoRelativo: number | null;
  responsavelPapel: string | null;
}

/** Tarefa do modelo: mesmo formato da tarefa do evento, sem data exata (SPEC-012 v3 §8.2). */
export interface TarefaModelo {
  id: string;
  servicoModeloId: string | null;
  titulo: string;
  descricao: string | null;
  /** Dias em relação à data do evento: negativo = antes, 0 = no dia, positivo = depois. */
  prazoRelativo: number | null;
  prioridade: string;
  visibilidade: string;
  responsaveis: string[];
  checklist: ItemChecklistModelo[];
}

/** Linha lida da lista colada ou da planilha para a grade em massa (SPEC-012 v3 §6.4). */
export interface TarefaLidaEmMassa {
  titulo: string;
  servico: string | null;
  prazoRelativo: number | null;
  prazoData: string | null;
  responsaveis: string[];
  prioridade: string | null;
  descricao: string | null;
  avisos: string[];
}

export interface LeituraTarefasEmMassa {
  tarefas: TarefaLidaEmMassa[];
  linhasIgnoradas: string[];
}

export interface ResultadoTarefasEmMassa {
  adicionadas: number;
  repetidas: number;
  servicosNovos: number;
}

export interface PreviaAplicarModelo {
  tarefasNovas: number;
  servicosNovos: number;
  tarefasExistentes: number;
  servicosExistentes: number;
  eventoSemData: boolean;
  resumo: string;
}

export interface PreviaSalvarComoModelo {
  nomeSugerido: string;
  tarefas: number;
  servicos: number;
  tarefasSemPrazo: number;
  eventoSemData: boolean;
  resumo: string;
}

export interface VinculoModelo {
  id: string;
  tipo: string;
  bibliotecaId: string;
}

export interface PermissoesModelo {
  gerais: boolean;
  planejamento: boolean;
  tarefas: boolean;
  servicosFornecedores: boolean;
  convites: boolean;
}

export interface Modelo {
  id: string;
  nome: string;
  tipo: string;
  servicos: ServicoModelo[];
  tarefas: TarefaModelo[];
  permissoes: PermissoesModelo;
  vinculos: VinculoModelo[];
}

export interface EstatisticasEventos {
  total: number;
  situacoes: { situacao: string; quantidade: number; percentual: number }[];
  eventosPorMes: { mes: number; quantidade: number }[];
  rankingOrcamento: { posicao: number; servico: string; percentual: number }[];
  rankingFornecedores: { posicao: number; fornecedor: string; quantidade: number }[];
  rankingServicos: { posicao: number; servico: string; quantidade: number }[];
  resumo: {
    tarefasSemana: number;
    aniversariosHoje: number;
    rotuloTarefas: string;
    rotuloAnexos: string;
    rotuloEquipe: string;
    rotuloAniversarios: string;
    contadorTarefas: string;
    contadorAniversarios: string;
  };
}

export interface ResultadoImportacaoCronograma {
  id: string | null;
  itens: number;
  erros: string[];
}

export interface ResultadoImportacaoRoteiro {
  id: string | null;
  momentos: number;
  itens: number;
  erros: string[];
}

export interface ResultadoImportacaoBriefing {
  id: string | null;
  secoes: number;
  perguntas: number;
  erros: string[];
}

export interface Briefing {
  id: string;
  nome: string;
  origem: string;
  padrao: boolean;
  criadoEm: string;
  secoes: {
    id: string;
    titulo: string;
    descricao: string | null;
    ordem: number;
    perguntas: { id: string; enunciado: string; tipo: string; ordem: number }[];
  }[];
}

export interface Roteiro {
  id: string;
  nome: string;
  secoes: {
    id: string;
    titulo: string | null;
    horario: string | null;
    musica: string | null;
    ordem: number;
    itens: { id: string; texto: string; ordem: number }[];
  }[];
}

export interface Cronograma {
  id: string;
  titulo: string;
  descricao: string | null;
  itens: {
    id: string;
    rotulo: string | null;
    descricao: string | null;
    data: string | null;
    hora: string | null;
    responsavel: string | null;
    recadoFornecedores: string | null;
    ordem: number;
  }[];
}

export interface Inspiracao {
  id: string;
  nome: string;
  itens: { id: string; arquivoId: string | null; url: string | null; ordem: number }[];
}

export interface MensagemModelo {
  id: string;
  nome: string;
  texto: string;
  parametros: string[];
}

export interface ServicoConta {
  id: string;
  nome: string;
  padrao: boolean;
}

export interface ResultadoImportacaoFornecedores {
  criados: number;
  servicosCriados: number;
  erros: string[];
}

export interface FornecedorResumo {
  id: string;
  nome: string;
  servicos: string[];
  completo: boolean;
}

export interface Fornecedor {
  id: string;
  nome: string;
  fotoId: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  cpf: string | null;
  nomeResponsavel: string | null;
  precoDe: number | null;
  precoAte: number | null;
  site: string | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  pinterest: string | null;
  pais: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  complemento: string | null;
  banco: string | null;
  agencia: string | null;
  contaBancaria: string | null;
  titularConta: string | null;
  tipoConta: string | null;
  documentosBancarios: string | null;
  pixTipo: string | null;
  pixChave: string | null;
  diferencial: string | null;
  diferencialVisivelCliente: boolean;
  informacoesGerais: string | null;
  portfolio: string | null;
  completo: boolean;
  servicoContaIds: string[];
  servicos: string[];
  telefones: { id: string; responsavel: string | null; ddi: string | null; numero: string; movel: boolean }[];
  emails: { id: string; endereco: string }[];
  orcamentos: { id: string; titulo: string; link: string | null; anexoId: string | null; visivelClientes: boolean }[];
}

export interface BudgetEvento {
  budget: number;
  estimado: number;
  contratado: number;
  provaReal: number;
  custoPorConvidado: number | null;
  servicos: { id: string; nome: string; estimado: number; contratado: number }[];
}

export const ETAPAS_NEGOCIACAO = [
  { valor: 'Orcamento', rotulo: 'Orçamento' },
  { valor: 'Contratado', rotulo: 'Contratado' },
];

export const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export interface EventoResumo {
  id: string;
  nome: string;
  situacao: string;
  tipo: string;
  data: string | null;
  diasRestantes: number | null;
  tags: string[];
  tarefasConcluidas: number;
  tarefas: number;
  convidadosConfirmados: number;
  convidados: number;
  /** Contrato do cliente gerado e ainda não assinado. */
  contratoPendente?: boolean;
}

export interface Local {
  nome: string | null;
  pais: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
}

export interface EventoDetalhe extends EventoResumo {
  primeiroNome: string | null;
  segundoNome: string | null;
  hora: string | null;
  orcamentoEstimado: number | null;
  convidadosEstimados: number | null;
  tempoFesta: string | null;
  inicioCerimonia: string | null;
  inicioRecepcao: string | null;
  quantidadePadrinhos: number | null;
  quantidadeDamas: number | null;
  urlSite: string | null;
  notificarAssessor: boolean;
  notificarAssistentes: boolean;
  notificarClientes: boolean;
  salvarNaAgenda: boolean;
  vinculoGoogle: string | null;
  imagemId: string | null;
  cerimonia: Local;
  recepcao: Local;
  servicos: EventoServico[];
  convidadosPendentes: number;
  convidadosRecusados: number;
}

export interface EventoServico {
  id: string;
  nome: string;
  contratado: boolean;
  valorEstimado: number | null;
  valorContratado: number | null;
  ocultoParaClient: boolean;
  ordem: number;
  servicoContaId: string | null;
  parcelas: { numero: number; vencimento: string; valor: number; entrada: boolean; situacao: string }[];
  subitens: { id: string; descricao: string; quantidade: number; valorUnitario: number; total: number }[];
  fornecedores: {
    id: string;
    fornecedorId: string;
    fornecedor: string;
    etapa: string;
    valorOrcamento: number | null;
    observacoes: string | null;
    /** Contrato assinado com este fornecedor (SPEC-045); pode vir antes de contratar. */
    contratoAssinado?: { arquivoId: string; nome: string; tipoConteudo: string } | null;
    /** "Organizadora" ou "Cliente"; nulo em contratos enviados antes do registro (SPEC-048). */
    contratoAssinadoPor?: string | null;
    contratoAssinadoEm?: string | null;
    /** Há pagamento ou comprovante no Dinheiro: voltar e excluir ficam bloqueados. */
    temPagamento?: boolean;
  }[];
}

export interface ResponsavelTarefa {
  papel: string;
  referenciaId: string | null;
}

export interface ItemChecklistTarefa {
  id: string;
  texto: string;
  feito: boolean;
  cancelado: boolean;
  prazo: string | null;
  responsavel: ResponsavelTarefa | null;
  /** Prazo relativo à data do evento; com ele, `prazo` é o prazo efetivo. */
  prazoRelativo: number | null;
}

export interface ComentarioTarefa {
  id: string;
  autorContaId: string;
  texto: string;
  criadoEm: string;
}

export interface AnexoTarefa {
  id: string;
  arquivoId: string;
  nome: string;
  tipoConteudo: string;
  enviadoEm: string;
}

export interface Tarefa {
  id: string;
  eventoId: string;
  evento: string;
  titulo: string;
  descricao: string | null;
  /** Prazo relativo à data do evento (SPEC-012 v3 §8.1); com ele, `prazo` é o prazo efetivo (nulo sem data do evento). */
  prazoRelativo: number | null;
  prazo: string | null;
  situacao: string;
  responsavelContaId: string;
  prioridade: string;
  visibilidade: string;
  servicoEventoId: string | null;
  servico: string | null;
  responsaveis: ResponsavelTarefa[];
  checklist: ItemChecklistTarefa[];
  comentarios: ComentarioTarefa[];
  anexos: AnexoTarefa[];
  grupoPrazo: string | null;
  eventoEmAndamento: boolean;
  tags: string[];
}

export interface Cliente {
  id: string;
  nome: string;
  papel: string | null;
  nascimento: string | null;
  email: string;
  ddi: string;
  celular: string;
  telefoneFixo: string | null;
  documento: string | null;
  profissao: string | null;
  estadoCivil?: string | null;
  nacionalidade?: string | null;
  inscricaoMunicipal: string | null;
  religiao: string | null;
  observacao: string | null;
  facebook: string | null;
  instagram: string | null;
  pais: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  complemento: string | null;
  fotoId: string | null;
  eventos: { id: string; nome: string }[];
}

export interface Convidado {
  id: string;
  nome: string;
  ddi: string | null;
  celular: string | null;
  situacao: string;
  situacaoTela: string;
  situacaoIcone: string;
  mesa: string | null;
  genero: string | null;
  faixa: string | null;
  custo: string | null;
  cpf: string | null;
  observacao: string | null;
  principal: boolean;
}

export interface Convite {
  id: string;
  eventoId: string;
  nome: string;
  observacao: string | null;
  telefone: string | null;
  token: string;
  acessada: boolean;
  respondida: boolean;
  convidados: Convidado[];
  email: string | null;
  /** O link deste convite aceita resposta após o prazo (SPEC-054). */
  excecaoPrazoRsvp: boolean;
}

export interface ListaConvites {
  convites: Convite[];
  porSituacao: { rotulo: string; quantidade: number }[];
  porFaixa: { rotulo: string; quantidade: number }[];
  porCusto: { rotulo: string; quantidade: number }[];
  mesas: string[];
  /** Data limite de confirmação, `aaaa-mm-dd`, ou nulo (SPEC-054). */
  prazoRsvp: string | null;
  prazoEncerrado: boolean;
  /** Data de envio dos convites do evento, `aaaa-mm-dd`, ou nulo (SPEC-059). */
  dataEnvioConvites: string | null;
}

/** Entrada da lista de presença: um convidado confirmado, com id único (SPEC-054). */
export interface PresencaEvento {
  id: string;
  conviteId: string;
  convite: string;
  convidadoId: string;
  convidado: string;
  confirmadoEm: string;
  /** Quando a portaria marcou a presença (SPEC-058); nulo = ainda não entrou. */
  compareceuEm: string | null;
}

export const PAPEIS = [
  'Anfitriao', 'Aniversariante', 'Avo', 'AvoHomem', 'Comissao', 'Formando', 'Mae', 'Noiva', 'Noivo', 'Pai', 'Promotor', 'Representante', 'Tia', 'Tio',
];

export const ROTULO_PAPEL: Record<string, string> = {
  Anfitriao: 'Anfitrião',
  Aniversariante: 'Aniversariante',
  Avo: 'Avó',
  AvoHomem: 'Avô',
  Comissao: 'Comissão',
  Formando: 'Formando(a)',
  Mae: 'Mãe',
  Noiva: 'Noiva',
  Noivo: 'Noivo',
  Pai: 'Pai',
  Promotor: 'Promotor',
  Representante: 'Representante',
  Tia: 'Tia',
  Tio: 'Tio',
};

export const TIPOS = [
  { valor: 'Casamento', rotulo: 'Casamento' },
  { valor: 'QuinzeAnos', rotulo: '15 anos' },
  { valor: 'Aniversario', rotulo: 'Aniversário' },
  { valor: 'Corporativo', rotulo: 'Corporativo' },
  { valor: 'Formatura', rotulo: 'Formatura' },
];

export const SITUACOES_TAREFA = [
  { valor: 'Pendente', rotulo: 'Pendente' },
  { valor: 'EmAndamento', rotulo: 'Em andamento' },
  { valor: 'Concluida', rotulo: 'Concluída' },
  { valor: 'Atrasada', rotulo: 'Atrasada' },
];

export const PRIORIDADES_TAREFA = [
  { valor: 'Baixa', rotulo: 'Baixa' },
  { valor: 'Media', rotulo: 'Média' },
  { valor: 'Alta', rotulo: 'Alta' },
];

export const VISIBILIDADES_TAREFA = [
  { valor: 'SoEu', rotulo: 'Só eu' },
  { valor: 'Cliente', rotulo: 'Cliente' },
  { valor: 'Compartilhada', rotulo: 'Compartilhada' },
];

/** Papéis que podem ser responsáveis (SPEC-012 v3 §8.3). No evento, "Assistente" sem pessoa = todas as assistentes ativas. */
export const PAPEIS_RESPONSAVEL_TAREFA = [
  { valor: 'Organizer', rotulo: 'Organizador' },
  { valor: 'Assistente', rotulo: 'Assistente (todas)' },
  { valor: 'Cliente', rotulo: 'Cliente' },
];

/** Papéis do modelo de evento: só papéis, sem pessoa (SPEC-012 v3 §8.3). */
export const PAPEIS_RESPONSAVEL_MODELO = [
  { valor: 'Organizer', rotulo: 'Organizador' },
  { valor: 'Assistente', rotulo: 'Assistente' },
  { valor: 'Cliente', rotulo: 'Cliente' },
];

@Injectable({ providedIn: 'root' })
export class NegocioClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  painel() {
    return this.http.get<Painel>(`${this.base}/api/v1/painel`);
  }

  perfil() {
    return this.http.get<Perfil>(`${this.base}/api/v1/perfil`);
  }

  salvarPerfil(perfil: Partial<Perfil>) {
    return this.http.put<Perfil>(`${this.base}/api/v1/perfil`, perfil);
  }

  enviarFotoPerfil(arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<{ imagemId: string }>(`${this.base}/api/v1/perfil/foto`, dados);
  }

  removerFotoPerfil() {
    return this.http.delete(`${this.base}/api/v1/perfil/foto`);
  }

  baixarArquivo(id: string) {
    return this.http.get(`${this.base}/api/v1/arquivos/${id}`, { responseType: 'blob' });
  }

  modelos(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<Modelo[]>(`${this.base}/api/v1/modelos`, { params });
  }

  modelo(id: string) {
    return this.http.get<Modelo>(`${this.base}/api/v1/modelos/${id}`);
  }

  criarModelo(pedido: { nome: string; tipo: string; servicos?: string[]; tarefas?: string[] }) {
    return this.http.post<Modelo>(`${this.base}/api/v1/modelos`, pedido);
  }

  atualizarModelo(id: string, pedido: unknown) {
    return this.http.put<Modelo>(`${this.base}/api/v1/modelos/${id}`, pedido);
  }

  excluirModelo(id: string) {
    return this.http.delete(`${this.base}/api/v1/modelos/${id}`);
  }

  clonarModelo(id: string) {
    return this.http.post<Modelo>(`${this.base}/api/v1/modelos/${id}/clonar`, {});
  }

  /** Lê a lista colada ou a planilha para a grade em massa. Não grava (SPEC-012 v3 §6.4). */
  lerTarefasEmMassa(dados: FormData | { texto: string }, paraModelo: boolean) {
    return this.http.post<LeituraTarefasEmMassa>(`${this.base}/api/v1/tarefas/em-massa/leitura?paraModelo=${paraModelo}`, dados);
  }

  adicionarTarefasEmMassa(eventoId: string, linhas: unknown[]) {
    return this.http.post<ResultadoTarefasEmMassa>(`${this.base}/api/v1/eventos/${eventoId}/tarefas/em-massa`, { linhas });
  }

  planilhaTarefasModelo() {
    return this.http.get(`${this.base}/api/v1/modelos/tarefas/planilha`, { responseType: 'blob' });
  }

  previaAplicarModelo(eventoId: string, modeloId: string) {
    return this.http.post<PreviaAplicarModelo>(`${this.base}/api/v1/eventos/${eventoId}/aplicar-modelo/previa`, { modeloId });
  }

  aplicarModelo(eventoId: string, modeloId: string) {
    return this.http.post<PreviaAplicarModelo>(`${this.base}/api/v1/eventos/${eventoId}/aplicar-modelo`, { modeloId });
  }

  previaSalvarComoModelo(eventoId: string, nome?: string) {
    return this.http.post<PreviaSalvarComoModelo>(`${this.base}/api/v1/eventos/${eventoId}/salvar-como-modelo/previa`, { nome: nome ?? null });
  }

  salvarComoModelo(eventoId: string, nome: string) {
    return this.http.post<Modelo>(`${this.base}/api/v1/eventos/${eventoId}/salvar-como-modelo`, { nome });
  }

  estatisticas() {
    return this.http.get<EstatisticasEventos>(`${this.base}/api/v1/eventos/estatisticas`);
  }

  briefings(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<Briefing[]>(`${this.base}/api/v1/modelos-briefing`, { params });
  }

  planilhaBriefing() {
    return this.http.get(`${this.base}/api/v1/modelos-briefing/planilha`, { responseType: 'blob' });
  }

  importarBriefing(nome: string, arquivo: File) {
    const dados = new FormData();
    dados.append('nome', nome);
    dados.append('arquivo', arquivo);
    return this.http.post<ResultadoImportacaoBriefing>(`${this.base}/api/v1/modelos-briefing/importar`, dados);
  }

  planilhaRoteiro() {
    return this.http.get(`${this.base}/api/v1/modelos-roteiro/planilha`, { responseType: 'blob' });
  }

  importarRoteiro(nome: string, arquivo: File) {
    const dados = new FormData();
    dados.append('nome', nome);
    dados.append('arquivo', arquivo);
    return this.http.post<ResultadoImportacaoRoteiro>(`${this.base}/api/v1/modelos-roteiro/importar`, dados);
  }

  briefing(id: string) {
    return this.http.get<Briefing>(`${this.base}/api/v1/modelos-briefing/${id}`);
  }

  criarBriefing(pedido: unknown) {
    return this.http.post<Briefing>(`${this.base}/api/v1/modelos-briefing`, pedido);
  }

  atualizarBriefing(id: string, pedido: unknown) {
    return this.http.put<Briefing>(`${this.base}/api/v1/modelos-briefing/${id}`, pedido);
  }

  excluirBriefing(id: string) {
    return this.http.delete(`${this.base}/api/v1/modelos-briefing/${id}`);
  }

  /** Modelo de mensagem com as tags trocadas pelos dados do lead e do orçamento. */
  mensagemDoOrcamento(orcamentoId: string, modeloId: string, link: string) {
    const params = new HttpParams().set('modeloId', modeloId).set('link', link);
    return this.http.get<{ texto: string }>(`${this.base}/api/v1/orcamentos-funil/${orcamentoId}/mensagem`, { params });
  }

  textoDoModeloOrcamento(modeloId: string, oportunidadeId: string, valor: number | null) {
    let params = new HttpParams().set('modeloId', modeloId).set('oportunidadeId', oportunidadeId);
    if (valor !== null) params = params.set('valor', String(valor));
    return this.http.get<{ texto: string }>(`${this.base}/api/v1/orcamentos-funil/modelo-aplicado`, { params });
  }

  briefingDoLead(oportunidadeId: string) {
    return this.http.get<{ briefing: BriefingDoLead | null }>(`${this.base}/api/v1/oportunidades/${oportunidadeId}/briefing`);
  }

  aplicarBriefingAoLead(oportunidadeId: string, modeloId: string) {
    return this.http.post<{ briefing: BriefingDoLead | null }>(`${this.base}/api/v1/oportunidades/${oportunidadeId}/briefing`, { modeloId });
  }

  salvarBriefingDoLead(oportunidadeId: string, respostas: { id: string; resposta: string }[]) {
    return this.http.put<{ briefing: BriefingDoLead | null }>(`${this.base}/api/v1/oportunidades/${oportunidadeId}/briefing`, { respostas });
  }

  removerBriefingDoLead(oportunidadeId: string) {
    return this.http.delete<void>(`${this.base}/api/v1/oportunidades/${oportunidadeId}/briefing`);
  }

  /** Libera o briefing para o cliente responder pelo link (SPEC-066). */
  liberarBriefingDoLead(oportunidadeId: string) {
    return this.http.post<{ briefing: BriefingDoLead | null }>(`${this.base}/api/v1/oportunidades/${oportunidadeId}/briefing/liberacao`, {});
  }

  encerrarBriefingDoLead(oportunidadeId: string) {
    return this.http.delete<{ briefing: BriefingDoLead | null }>(`${this.base}/api/v1/oportunidades/${oportunidadeId}/briefing/liberacao`);
  }

  briefingPublico(token: string) {
    return this.http.get<BriefingPublico>(`${this.base}/api/v1/publico/briefings/${encodeURIComponent(token)}`);
  }

  /** Salva as respostas; `concluir` fecha o link (SPEC-066). Pede sessão aberta pelo código. */
  responderBriefingPublico(token: string, respostas: { id: string; resposta: string }[], concluir = false) {
    return this.http.put<BriefingPublico>(`${this.base}/api/v1/publico/briefings/${encodeURIComponent(token)}`, { respostas, concluir });
  }

  // Código de acesso do briefing (SPEC-066, regras da SPEC-063): a sessão volta num cookie.

  acessoBriefing(token: string) {
    return this.http.get<AcessoBriefing>(`${this.base}/api/v1/publico/briefings/${encodeURIComponent(token)}/acesso`);
  }

  pedirCodigoBriefing(token: string, emailId: string) {
    return this.http.post<AcessoBriefing>(`${this.base}/api/v1/publico/briefings/${encodeURIComponent(token)}/acesso/codigo`, { emailId });
  }

  confirmarCodigoBriefing(token: string, codigo: string) {
    return this.http.post<{ ok: boolean }>(`${this.base}/api/v1/publico/briefings/${encodeURIComponent(token)}/acesso/confirmar`, { codigo });
  }

  clonarBriefing(id: string) {
    return this.http.post<Briefing>(`${this.base}/api/v1/modelos-briefing/${id}/clonar`, {});
  }

  roteiros(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<Roteiro[]>(`${this.base}/api/v1/modelos-roteiro`, { params });
  }

  roteiro(id: string) {
    return this.http.get<Roteiro>(`${this.base}/api/v1/modelos-roteiro/${id}`);
  }

  criarRoteiro(pedido: unknown) {
    return this.http.post<Roteiro>(`${this.base}/api/v1/modelos-roteiro`, pedido);
  }

  atualizarRoteiro(id: string, pedido: unknown) {
    return this.http.put<Roteiro>(`${this.base}/api/v1/modelos-roteiro/${id}`, pedido);
  }

  excluirRoteiro(id: string) {
    return this.http.delete(`${this.base}/api/v1/modelos-roteiro/${id}`);
  }

  clonarRoteiro(id: string) {
    return this.http.post<Roteiro>(`${this.base}/api/v1/modelos-roteiro/${id}/clonar`, {});
  }

  cronogramas(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<Cronograma[]>(`${this.base}/api/v1/modelos-cronograma`, { params });
  }

  cronograma(id: string) {
    return this.http.get<Cronograma>(`${this.base}/api/v1/modelos-cronograma/${id}`);
  }

  planilhaCronograma() {
    return this.http.get(`${this.base}/api/v1/modelos-cronograma/planilha`, { responseType: 'blob' });
  }

  importarCronograma(titulo: string, arquivo: File) {
    const dados = new FormData();
    dados.append('nome', titulo);
    dados.append('arquivo', arquivo);
    return this.http.post<ResultadoImportacaoCronograma>(`${this.base}/api/v1/modelos-cronograma/importar`, dados);
  }

  criarCronograma(pedido: unknown) {
    return this.http.post<Cronograma>(`${this.base}/api/v1/modelos-cronograma`, pedido);
  }

  atualizarCronograma(id: string, pedido: unknown) {
    return this.http.put<Cronograma>(`${this.base}/api/v1/modelos-cronograma/${id}`, pedido);
  }

  excluirCronograma(id: string) {
    return this.http.delete(`${this.base}/api/v1/modelos-cronograma/${id}`);
  }

  clonarCronograma(id: string) {
    return this.http.post<Cronograma>(`${this.base}/api/v1/modelos-cronograma/${id}/clonar`, {});
  }

  inspiracoes(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<Inspiracao[]>(`${this.base}/api/v1/modelos-inspiracoes`, { params });
  }

  inspiracao(id: string) {
    return this.http.get<Inspiracao>(`${this.base}/api/v1/modelos-inspiracoes/${id}`);
  }

  enviarArquivoInspiracao(arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<{ arquivoId: string; nome: string; tipoConteudo: string }>(`${this.base}/api/v1/modelos-inspiracoes/arquivos`, dados);
  }

  criarInspiracao(pedido: unknown) {
    return this.http.post<Inspiracao>(`${this.base}/api/v1/modelos-inspiracoes`, pedido);
  }

  atualizarInspiracao(id: string, pedido: unknown) {
    return this.http.put<Inspiracao>(`${this.base}/api/v1/modelos-inspiracoes/${id}`, pedido);
  }

  excluirInspiracao(id: string) {
    return this.http.delete(`${this.base}/api/v1/modelos-inspiracoes/${id}`);
  }

  clonarInspiracao(id: string) {
    return this.http.post<Inspiracao>(`${this.base}/api/v1/modelos-inspiracoes/${id}/clonar`, {});
  }

  mensagens(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<MensagemModelo[]>(`${this.base}/api/v1/modelos-mensagens`, { params });
  }

  mensagem(id: string) {
    return this.http.get<MensagemModelo>(`${this.base}/api/v1/modelos-mensagens/${id}`);
  }

  criarMensagem(pedido: unknown) {
    return this.http.post<MensagemModelo>(`${this.base}/api/v1/modelos-mensagens`, pedido);
  }

  atualizarMensagem(id: string, pedido: unknown) {
    return this.http.put<MensagemModelo>(`${this.base}/api/v1/modelos-mensagens/${id}`, pedido);
  }

  excluirMensagem(id: string) {
    return this.http.delete(`${this.base}/api/v1/modelos-mensagens/${id}`);
  }

  clonarMensagem(id: string) {
    return this.http.post<MensagemModelo>(`${this.base}/api/v1/modelos-mensagens/${id}/clonar`, {});
  }

  servicosConta(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<ServicoConta[]>(`${this.base}/api/v1/servicos-conta`, { params });
  }

  criarServicoConta(nome: string) {
    return this.http.post<ServicoConta>(`${this.base}/api/v1/servicos-conta`, { nome });
  }

  /** Cadastro em massa: `nomes` separados por vírgula. */
  criarServicosConta(nomes: string) {
    return this.http.post<ServicoConta[]>(`${this.base}/api/v1/servicos-conta/em-massa`, { nomes });
  }

  excluirServicoConta(id: string) {
    return this.http.delete(`${this.base}/api/v1/servicos-conta/${id}`);
  }

  fornecedores(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<FornecedorResumo[]>(`${this.base}/api/v1/fornecedores`, { params });
  }

  fornecedor(id: string) {
    return this.http.get<Fornecedor>(`${this.base}/api/v1/fornecedores/${id}`);
  }

  planilhaFornecedores() {
    return this.http.get(`${this.base}/api/v1/fornecedores/planilha`, { responseType: 'blob' });
  }

  importarFornecedores(arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<ResultadoImportacaoFornecedores>(`${this.base}/api/v1/fornecedores/importar`, dados);
  }

  criarFornecedor(pedido: unknown) {
    return this.http.post<Fornecedor>(`${this.base}/api/v1/fornecedores`, pedido);
  }

  atualizarFornecedor(id: string, pedido: unknown) {
    return this.http.put<Fornecedor>(`${this.base}/api/v1/fornecedores/${id}`, pedido);
  }

  excluirFornecedor(id: string) {
    return this.http.delete(`${this.base}/api/v1/fornecedores/${id}`);
  }

  adicionarServicoEvento(eventoId: string, nome: string) {
    return this.http.post<EventoDetalhe>(`${this.base}/api/v1/eventos/${eventoId}/servicos`, { nome });
  }

  atualizarEstimado(eventoId: string, servicoId: string, pedido: unknown) {
    return this.http.put(`${this.base}/api/v1/eventos/${eventoId}/servicos/${servicoId}/estimado`, pedido);
  }

  adicionarFornecedorServico(eventoId: string, servicoId: string, fornecedorId: string, etapa: string) {
    return this.http.post(`${this.base}/api/v1/eventos/${eventoId}/servicos/${servicoId}/fornecedores`, {
      fornecedorId,
      etapa,
    });
  }

  avancarEtapa(eventoId: string, servicoId: string, vinculoId: string) {
    return this.http.post(
      `${this.base}/api/v1/eventos/${eventoId}/servicos/${servicoId}/fornecedores/${vinculoId}/avancar`,
      {},
    );
  }

  voltarEtapa(eventoId: string, servicoId: string, vinculoId: string) {
    return this.http.post(
      `${this.base}/api/v1/eventos/${eventoId}/servicos/${servicoId}/fornecedores/${vinculoId}/voltar`,
      {},
    );
  }

  contratarFornecedor(eventoId: string, servicoId: string, vinculoId: string, pedido: unknown) {
    return this.http.post(
      `${this.base}/api/v1/eventos/${eventoId}/servicos/${servicoId}/fornecedores/${vinculoId}/contratar`,
      pedido,
    );
  }

  /** Anexa (ou troca) o contrato assinado com o fornecedor do serviço. */
  enviarContratoAssinado(eventoId: string, servicoId: string, vinculoId: string, arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<EventoDetalhe>(`${this.base}/api/v1/eventos/${eventoId}/servicos/${servicoId}/fornecedores/${vinculoId}/contrato-assinado`, dados);
  }

  excluirContratoAssinado(eventoId: string, servicoId: string, vinculoId: string) {
    return this.http.delete<EventoDetalhe>(`${this.base}/api/v1/eventos/${eventoId}/servicos/${servicoId}/fornecedores/${vinculoId}/contrato-assinado`);
  }

  /** Tira o fornecedor do serviço (bloqueado com pagamento registrado). */
  removerFornecedorServico(eventoId: string, servicoId: string, vinculoId: string) {
    return this.http.delete<EventoDetalhe>(`${this.base}/api/v1/eventos/${eventoId}/servicos/${servicoId}/fornecedores/${vinculoId}`);
  }

  /** Tira o serviço do evento (bloqueado com pagamento registrado). */
  removerServicoEvento(eventoId: string, servicoId: string) {
    return this.http.delete<EventoDetalhe>(`${this.base}/api/v1/eventos/${eventoId}/servicos/${servicoId}`);
  }

  budget(eventoId: string) {
    return this.http.get<BudgetEvento>(`${this.base}/api/v1/eventos/${eventoId}/budget`);
  }

  eventos(filtro: Record<string, string>) {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor) {
        params = params.set(chave, valor);
      }
    }
    return this.http.get<EventoResumo[]>(`${this.base}/api/v1/eventos`, { params });
  }

  evento(id: string) {
    return this.http.get<EventoDetalhe>(`${this.base}/api/v1/eventos/${id}`);
  }

  criarEvento(pedido: unknown) {
    return this.http.post<EventoDetalhe>(`${this.base}/api/v1/eventos`, pedido);
  }

  atualizarEvento(id: string, pedido: unknown) {
    return this.http.put<EventoDetalhe>(`${this.base}/api/v1/eventos/${id}`, pedido);
  }

  resumoEvento(id: string) {
    return this.http.get<ResumoEvento>(`${this.base}/api/v1/eventos/${id}/resumo`);
  }

  concluir(id: string) {
    return this.http.post<EventoDetalhe>(`${this.base}/api/v1/eventos/${id}/concluir`, {});
  }

  cancelar(id: string) {
    return this.http.post<EventoDetalhe>(`${this.base}/api/v1/eventos/${id}/cancelar`, {});
  }

  imagemEvento(id: string, arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<{ imagemId: string }>(`${this.base}/api/v1/eventos/${id}/imagem`, dados);
  }

  removerImagemEvento(id: string) {
    return this.http.delete(`${this.base}/api/v1/eventos/${id}/imagem`);
  }

  tarefas() {
    return this.http.get<Tarefa[]>(`${this.base}/api/v1/tarefas`);
  }

  tarefasDoEvento(id: string) {
    return this.http.get<Tarefa[]>(`${this.base}/api/v1/eventos/${id}/tarefas`);
  }

  criarTarefa(eventoId: string, pedido: unknown) {
    return this.http.post<Tarefa>(`${this.base}/api/v1/eventos/${eventoId}/tarefas`, pedido);
  }

  atualizarTarefa(id: string, pedido: unknown) {
    return this.http.put<Tarefa>(`${this.base}/api/v1/tarefas/${id}`, pedido);
  }

  marcarItemChecklist(id: string, itemId: string, pedido: { feito: boolean; cancelado: boolean }) {
    return this.http.put<Tarefa>(`${this.base}/api/v1/tarefas/${id}/checklist/${itemId}`, pedido);
  }

  concluirTarefa(id: string, concluida: boolean) {
    return this.http.put<Tarefa>(`${this.base}/api/v1/tarefas/${id}/conclusao`, { concluida });
  }

  anexarTarefa(id: string, arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<Tarefa>(`${this.base}/api/v1/tarefas/${id}/anexos`, dados);
  }

  removerAnexoTarefa(id: string, anexoId: string) {
    return this.http.delete<Tarefa>(`${this.base}/api/v1/tarefas/${id}/anexos/${anexoId}`);
  }

  comentarTarefa(id: string, texto: string) {
    return this.http.post<Tarefa>(`${this.base}/api/v1/tarefas/${id}/comentarios`, { texto });
  }

  clientes(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<Cliente[]>(`${this.base}/api/v1/clientes`, { params });
  }

  criarCliente(pedido: unknown) {
    return this.http.post<Cliente>(`${this.base}/api/v1/clientes`, pedido);
  }

  atualizarCliente(id: string, pedido: unknown) {
    return this.http.put<Cliente>(`${this.base}/api/v1/clientes/${id}`, pedido);
  }

  excluirCliente(id: string) {
    return this.http.delete<void>(`${this.base}/api/v1/clientes/${id}`);
  }

  clientesDoEvento(id: string) {
    return this.http.get<Cliente[]>(`${this.base}/api/v1/eventos/${id}/clientes`);
  }

  vincular(eventoId: string, clienteId: string) {
    return this.http.post(`${this.base}/api/v1/eventos/${eventoId}/clientes`, { clienteId });
  }

  desvincular(eventoId: string, clienteId: string) {
    return this.http.delete(`${this.base}/api/v1/eventos/${eventoId}/clientes/${clienteId}`);
  }

  cep(cep: string) {
    return this.http.get<{ endereco: string; estado: string; cidade: string; bairro: string; pais: string }>(
      `${this.base}/api/v1/cep/${cep}`,
    );
  }

  /** CEP na página de aceite, liberado pelo token da proposta (sem login). */
  cepPublico(token: string, cep: string) {
    return this.http.get<{ endereco: string; estado: string; cidade: string; bairro: string; pais: string }>(
      `${this.base}/api/v1/publico/propostas/${encodeURIComponent(token)}/cep/${cep}`,
    );
  }

  convites(eventoId: string, filtro: Record<string, string>) {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor) {
        params = params.set(chave, valor);
      }
    }
    return this.http.get<ListaConvites>(`${this.base}/api/v1/eventos/${eventoId}/convites`, { params });
  }

  criarConvite(eventoId: string, pedido: PedidoConvite) {
    return this.http.post<Convite>(`${this.base}/api/v1/eventos/${eventoId}/convites`, pedido);
  }

  atualizarConvite(id: string, pedido: PedidoConvite) {
    return this.http.put<Convite>(`${this.base}/api/v1/convites/${id}`, pedido);
  }

  removerConvidado(id: string) {
    return this.http.delete(`${this.base}/api/v1/convidados/${id}`);
  }

  definirPrincipal(conviteId: string, convidadoId: string) {
    return this.http.post<Convite>(`${this.base}/api/v1/convites/${conviteId}/principal`, { convidadoId });
  }

  importar(eventoId: string, arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<ImportacaoConvidados>(`${this.base}/api/v1/eventos/${eventoId}/convites/importar`, dados);
  }

  /** Histórico da fila de importações do evento (SPEC-059 §6.6). */
  importacoes(eventoId: string) {
    return this.http.get<ImportacaoConvidados[]>(`${this.base}/api/v1/eventos/${eventoId}/convites/importacoes`);
  }

  planilha(eventoId: string) {
    return this.http.get(`${this.base}/api/v1/eventos/${eventoId}/convites/planilha`, { responseType: 'blob' });
  }

  qr(conviteId: string) {
    return this.http.get(`${this.base}/api/v1/convites/${conviteId}/qr`, { responseType: 'blob' });
  }

  /** QR de entrada do convite (SPEC-058): só existe com ao menos um convidado confirmado. */
  qrEntrada(conviteId: string) {
    return this.http.get(`${this.base}/api/v1/convites/${conviteId}/qr-entrada`, { responseType: 'blob' });
  }

  /** Endereço da imagem do QR de entrada pelo link de RSVP. */
  urlQrEntradaDoRsvp(token: string) {
    return `${this.base}/api/v1/rsvp/${token}/qr-entrada`;
  }

  whatsapp(conviteId: string) {
    return this.http.get<{ url: string | null }>(`${this.base}/api/v1/convites/${conviteId}/whatsapp`);
  }

  abrirRsvp(token: string) {
    return this.http.get<{
      convite: string;
      convidados: { id: string; nome: string; situacao: string }[];
      /** Prazo vencido sem exceção: a página mostra "convite expirado" (SPEC-054). */
      expirado: boolean;
      prazo: string | null;
    }>(`${this.base}/api/v1/rsvp/${token}`);
  }

  definirPrazoRsvp(eventoId: string, prazo: string | null) {
    return this.http.put<{ prazo: string | null; encerrado: boolean }>(
      `${this.base}/api/v1/eventos/${eventoId}/prazo-rsvp`,
      { prazo },
    );
  }

  /** Data de envio dos convites, uma só para o evento (SPEC-059). */
  definirEnvioConvites(eventoId: string, data: string | null) {
    return this.http.put<{ data: string | null }>(`${this.base}/api/v1/eventos/${eventoId}/envio-convites`, { data });
  }

  definirExcecaoRsvp(conviteId: string, liberada: boolean) {
    return this.http.put<Convite>(`${this.base}/api/v1/convites/${conviteId}/excecao-rsvp`, { liberada });
  }

  presencas(eventoId: string) {
    return this.http.get<PresencaEvento[]>(`${this.base}/api/v1/eventos/${eventoId}/presencas`);
  }

  responderRsvp(
    token: string,
    respostas: { convidadoId: string; situacao: string }[],
    pretendeRealizarEvento?: boolean,
  ) {
    return this.http.post<{ convite: string; convidados: { id: string; nome: string; situacao: string }[] }>(
      `${this.base}/api/v1/rsvp/${token}`,
      { respostas, pretendeRealizarEvento },
    );
  }

  criarLeadPublico(
    contaId: string,
    pedido: {
      nome?: string | null;
      contatoNome: string;
      telefone?: string | null;
      email?: string | null;
      fonte?: string | null;
      tipoEvento?: string | null;
      dataPrevista?: string | null;
      quantidadeConvidados?: number | null;
      cidade?: string | null;
      uf?: string | null;
      site?: string | null;
      iniciadoEm?: number | null;
    },
  ) {
    return this.http.post(`${this.base}/api/v1/public/leads/${contaId}`, pedido);
  }

  agenda(de?: string, ate?: string) {
    let params = new HttpParams();
    if (de) params = params.set('de', de);
    if (ate) params = params.set('ate', ate);
    return this.http.get<CompromissoAgenda[]>(`${this.base}/api/v1/agenda`, { params });
  }

  criarCompromisso(pedido: { descricao: string; data: string; hora?: string | null }) {
    return this.http.post<CompromissoAgenda>(`${this.base}/api/v1/agenda`, pedido);
  }

  atualizarCompromisso(id: string, pedido: { descricao: string; data: string; hora?: string | null }) {
    return this.http.put<CompromissoAgenda>(`${this.base}/api/v1/agenda/${id}`, pedido);
  }

  excluirCompromisso(id: string) {
    return this.http.delete(`${this.base}/api/v1/agenda/${id}`);
  }

  oportunidades(filtro: Record<string, string | undefined> = {}) {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(chave, valor);
    }
    return this.http.get<Oportunidade[]>(`${this.base}/api/v1/oportunidades`, { params });
  }

  oportunidade(id: string) {
    return this.http.get<Oportunidade>(`${this.base}/api/v1/oportunidades/${id}`);
  }

  criarOportunidade(pedido: unknown) {
    return this.http.post<Oportunidade>(`${this.base}/api/v1/oportunidades`, pedido);
  }

  atualizarOportunidade(id: string, pedido: unknown) {
    return this.http.put<Oportunidade>(`${this.base}/api/v1/oportunidades/${id}`, pedido);
  }

  moverOportunidade(id: string, pedido: { estagio: string; motivoDescarte?: string }) {
    return this.http.post<Oportunidade>(`${this.base}/api/v1/oportunidades/${id}/mover`, pedido);
  }

  /** Fecha o negócio: liga o lead ao cliente e o coloca em Contratado. */
  vincularClienteOportunidade(id: string, clienteId: string) {
    return this.http.post<Oportunidade>(`${this.base}/api/v1/oportunidades/${id}/cliente`, { clienteId });
  }

  marcarRetornoOportunidade(id: string, data: string | null, hora: string | null) {
    return this.http.post<Oportunidade>(`${this.base}/api/v1/oportunidades/${id}/retorno`, { data, hora });
  }

  contatoRepetido(telefones: string[], emails: string[], ignorar?: string) {
    let params = new HttpParams();
    telefones.forEach((t) => (params = params.append('telefone', t)));
    emails.forEach((e) => (params = params.append('email', e)));
    if (ignorar) params = params.set('ignorar', ignorar);
    return this.http.get<ContatoRepetido[]>(`${this.base}/api/v1/oportunidades/contato-repetido`, { params });
  }

  estagiosFunil() {
    return this.http.get<EstagioFunil[]>(`${this.base}/api/v1/estagios-funil`);
  }

  salvarEstagiosFunil(pedido: SalvarEstagiosFunil) {
    return this.http.put<EstagioFunil[]>(`${this.base}/api/v1/estagios-funil`, pedido);
  }

  excluirOportunidade(id: string) {
    return this.http.delete(`${this.base}/api/v1/oportunidades/${id}`);
  }

  checarDataOportunidade(data: string) {
    return this.http.get<{ temCompromisso: boolean }>(`${this.base}/api/v1/oportunidades/checar-data`, {
      params: new HttpParams().set('data', data),
    });
  }

  exportarOportunidades(filtro: Record<string, string | undefined> = {}) {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(chave, valor);
    }
    return this.http.get(`${this.base}/api/v1/oportunidades/exportar`, { params, responseType: 'blob' });
  }

  leadsRsvp(busca = '') {
    const params = busca ? new HttpParams().set('busca', busca) : undefined;
    return this.http.get<LeadRsvp[]>(`${this.base}/api/v1/leads-rsvp`, { params });
  }

  gerarOportunidadeLead(id: string) {
    return this.http.post<Oportunidade>(`${this.base}/api/v1/leads-rsvp/${id}/gerar-oportunidade`, {});
  }

  descartarLead(id: string) {
    return this.http.post(`${this.base}/api/v1/leads-rsvp/${id}/descartar`, {});
  }

  contatarLead(id: string) {
    return this.http.post(`${this.base}/api/v1/leads-rsvp/${id}/contatar`, {});
  }

  contratosFunil(filtro: Record<string, string | undefined> = {}) {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(chave, valor);
    }
    return this.http.get<ContratoFunil[]>(`${this.base}/api/v1/contratos-funil`, { params });
  }

  contratoFunil(id: string) {
    return this.http.get<ContratoFunil>(`${this.base}/api/v1/contratos-funil/${id}`);
  }

  criarContratoFunil(pedido: unknown) {
    return this.http.post<ContratoFunil>(`${this.base}/api/v1/contratos-funil`, pedido);
  }

  atualizarContratoFunil(id: string, pedido: unknown) {
    return this.http.put<ContratoFunil>(`${this.base}/api/v1/contratos-funil/${id}`, pedido);
  }

  receberParcelaContratoFunil(id: string, parcelaId: string, pedido: { valor: number; forma: FormaPagamento; data: string }) {
    return this.http.post<ContratoFunil>(`${this.base}/api/v1/contratos-funil/${id}/parcelas/${parcelaId}/recebimentos`, pedido);
  }

  desfazerRecebimentoContratoFunil(id: string, parcelaId: string) {
    return this.http.delete<ContratoFunil>(`${this.base}/api/v1/contratos-funil/${id}/parcelas/${parcelaId}/recebimentos/ultimo`);
  }

  /** Define ou refaz o parcelamento do contrato (Gestão Financeira, SPEC-041); 1 parcela = à vista. */
  definirParcelasContratoFunil(id: string, pedido: PedidoParcelas) {
    return this.http.put<ContratoFunil>(`${this.base}/api/v1/contratos-funil/${id}/parcelas`, pedido);
  }

  definirParcelasOrcamentoFunil(id: string, pedido: PedidoParcelas) {
    return this.http.put<OrcamentoFunil>(`${this.base}/api/v1/orcamentos-funil/${id}/parcelas`, pedido);
  }

  enviarContratoFunil(id: string) {
    return this.http.post<ContratoFunil>(`${this.base}/api/v1/contratos-funil/${id}/enviar`, {});
  }

  assinarContratoFunil(id: string) {
    return this.http.post<ContratoFunil>(`${this.base}/api/v1/contratos-funil/${id}/assinar`, {});
  }

  cancelarContratoFunil(id: string) {
    return this.http.post<ContratoFunil>(`${this.base}/api/v1/contratos-funil/${id}/cancelar`, {});
  }

  excluirContratoFunil(id: string) {
    return this.http.delete(`${this.base}/api/v1/contratos-funil/${id}`);
  }

  orcamentosFunil(filtro: Record<string, string | undefined> = {}) {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(chave, valor);
    }
    return this.http.get<OrcamentoFunil[]>(`${this.base}/api/v1/orcamentos-funil`, { params });
  }

  criarOrcamentoFunil(pedido: unknown) {
    return this.http.post<OrcamentoFunil>(`${this.base}/api/v1/orcamentos-funil`, pedido);
  }

  atualizarOrcamentoFunil(id: string, pedido: unknown) {
    return this.http.put<OrcamentoFunil>(`${this.base}/api/v1/orcamentos-funil/${id}`, pedido);
  }

  /** Gera (ou mantém) o link da proposta e leva o lead para "Orçamento enviado" (SPEC-031 §6.6). */
  enviarOrcamentoFunil(id: string, dias?: number) {
    return this.http.post<OrcamentoFunil>(`${this.base}/api/v1/orcamentos-funil/${id}/enviar`, dias ? { dias } : {});
  }

  /** Validade padrão das propostas da conta, em dias (SPEC-064). */
  configuracaoPropostas() {
    return this.http.get<{ validadeDias: number }>(`${this.base}/api/v1/configuracoes/propostas`);
  }

  salvarConfiguracaoPropostas(validadeDias: number) {
    return this.http.put<{ validadeDias: number }>(`${this.base}/api/v1/configuracoes/propostas`, { validadeDias });
  }

  /** Página pública da proposta, sem login. */
  propostaPublica(token: string) {
    return this.http.get<PropostaPublica>(`${this.base}/api/v1/publico/propostas/${encodeURIComponent(token)}`, {
      headers: cabecalhoVisitante(),
    });
  }

  responderProposta(token: string, tipo: RespostaProposta, mensagem: string | null, contratante?: DadosContratante | null) {
    return this.http.post<PropostaPublica>(
      `${this.base}/api/v1/publico/propostas/${encodeURIComponent(token)}/resposta`,
      { tipo, mensagem, contratante: contratante ?? null },
      { headers: cabecalhoVisitante() },
    );
  }

  /** A assessoria registra o que o cliente respondeu fora do link (ligação, conversa). */
  responderOrcamentoFunil(id: string, tipo: RespostaProposta, mensagem: string | null) {
    return this.http.post<OrcamentoFunil>(`${this.base}/api/v1/orcamentos-funil/${id}/responder`, { tipo, mensagem });
  }

  cancelarOrcamentoFunil(id: string) {
    return this.http.post<OrcamentoFunil>(`${this.base}/api/v1/orcamentos-funil/${id}/cancelar`, {});
  }

  excluirOrcamentoFunil(id: string) {
    return this.http.delete(`${this.base}/api/v1/orcamentos-funil/${id}`);
  }

  tarefasFunil(filtro: Record<string, string | undefined> = {}) {
    let params = new HttpParams();
    for (const [chave, valor] of Object.entries(filtro)) {
      if (valor) params = params.set(chave, valor);
    }
    return this.http.get<TarefaFunil[]>(`${this.base}/api/v1/tarefas-funil`, { params });
  }

  criarTarefaFunil(pedido: unknown) {
    return this.http.post<TarefaFunil>(`${this.base}/api/v1/tarefas-funil`, pedido);
  }

  atualizarTarefaFunil(id: string, pedido: unknown) {
    return this.http.put<TarefaFunil>(`${this.base}/api/v1/tarefas-funil/${id}`, pedido);
  }

  concluirTarefaFunil(id: string) {
    return this.http.post<TarefaFunil>(`${this.base}/api/v1/tarefas-funil/${id}/concluir`, {});
  }

  reabrirTarefaFunil(id: string) {
    return this.http.post<TarefaFunil>(`${this.base}/api/v1/tarefas-funil/${id}/reabrir`, {});
  }

  excluirTarefaFunil(id: string) {
    return this.http.delete(`${this.base}/api/v1/tarefas-funil/${id}`);
  }

  relatoriosFunil(inicio: string, fim: string) {
    return this.http.get<CatalogoRelatoriosFunil>(`${this.base}/api/v1/relatorios-funil`, {
      params: new HttpParams().set('inicio', inicio).set('fim', fim),
    });
  }

  exportarRelatoriosFunil(inicio: string, fim: string) {
    return this.http.get(`${this.base}/api/v1/relatorios-funil/exportar`, {
      params: new HttpParams().set('inicio', inicio).set('fim', fim),
      responseType: 'blob',
    });
  }

  modelosServicoFunil(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<ModeloServicoFunil[]>(`${this.base}/api/v1/modelos-servicos-funil`, { params });
  }

  criarModeloServicoFunil(pedido: unknown) {
    return this.http.post<ModeloServicoFunil>(`${this.base}/api/v1/modelos-servicos-funil`, pedido);
  }

  atualizarModeloServicoFunil(id: string, pedido: unknown) {
    return this.http.put<ModeloServicoFunil>(`${this.base}/api/v1/modelos-servicos-funil/${id}`, pedido);
  }

  excluirModeloServicoFunil(id: string) {
    return this.http.delete(`${this.base}/api/v1/modelos-servicos-funil/${id}`);
  }

  modelosOrcamentoFunil(nome = '') {
    const params = nome ? new HttpParams().set('nome', nome) : undefined;
    return this.http.get<ModeloOrcamentoFunil[]>(`${this.base}/api/v1/modelos-orcamento-funil`, { params });
  }

  criarModeloOrcamentoFunil(pedido: unknown) {
    return this.http.post<ModeloOrcamentoFunil>(`${this.base}/api/v1/modelos-orcamento-funil`, pedido);
  }

  atualizarModeloOrcamentoFunil(id: string, pedido: unknown) {
    return this.http.put<ModeloOrcamentoFunil>(`${this.base}/api/v1/modelos-orcamento-funil/${id}`, pedido);
  }

  /** Foto da página de aceite (SPEC-061): JPG ou PNG até 5 MB. */
  enviarMidiaAceite(arquivo: File) {
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    return this.http.post<{ arquivoId: string; nome: string; tipoConteudo: string }>(`${this.base}/api/v1/modelos-orcamento-funil/midias`, dados);
  }

  /** Live Preview da página de aceite: documento com exemplos; fotos como aralu-midia:{id} (SPEC-061). */
  previaPaginaAceite(pedido: PreviaPaginaAceite) {
    return this.http.post<{ html: string }>(`${this.base}/api/v1/modelos-orcamento-funil/pagina-aceite/previa`, pedido);
  }

  /** Endereço público de uma foto da página de aceite, pelo token da proposta. */
  midiaPropostaPublica(token: string, arquivoId: string) {
    return `${this.base}/api/v1/publico/propostas/${encodeURIComponent(token)}/midias/${arquivoId}`;
  }

  excluirModeloOrcamentoFunil(id: string) {
    return this.http.delete(`${this.base}/api/v1/modelos-orcamento-funil/${id}`);
  }

  /** Modelos da tela única "Modelos de Contrato" (SPEC-039), para escolher ao criar o contrato de uma oportunidade. */
  modelosParaContratoFunil() {
    return this.http.get<ModeloParaContratoFunil[]>(`${this.base}/api/v1/contratos-funil/modelos`);
  }

  arquivo(id: string) {
    return `${this.base}/api/v1/arquivos/${id}`;
  }
}

export interface CompromissoAgenda {
  id: string;
  descricao: string;
  data: string;
  hora: string | null;
  eventoId: string | null;
  deEvento: boolean;
  /** compromisso avulso/de evento, tarefa de evento ou tarefa do funil. */
  origem: 'compromisso' | 'tarefa' | 'tarefaFunil';
  concluida: boolean;
  oportunidadeId: string | null;
  /** Nome do evento ou da oportunidade da tarefa. */
  contexto: string | null;
}

export interface BriefingDoLead {
  modeloId: string | null;
  modeloNome: string;
  aplicadoEm: string;
  itens: { id: string; secao: string | null; pergunta: string; resposta: string | null }[];
  /** Link público (SPEC-066): token nasce na primeira liberação. */
  token: string | null;
  liberadoEm: string | null;
  respondidoEm: string | null;
  /** Fim da liberação: o link fecha sozinho. */
  validoAte: string | null;
  /** O cliente clicou em "Concluir". */
  concluidoEm: string | null;
}

/** Briefing que o cliente abre pelo link, depois do código (SPEC-066). */
export interface BriefingPublico {
  empresa: string | null;
  nome: string;
  itens: { id: string; secao: string | null; pergunta: string; resposta: string | null }[];
  respondidoEm: string | null;
  validoAte: string | null;
}

/** O que a página do briefing recebe antes do código: e-mails só mascarados. */
export interface AcessoBriefing {
  empresa: string | null;
  nome: string;
  emails: { id: string; email: string }[];
  sessaoValida: boolean;
  aguardarSegundos: number;
  codigoEnviado: boolean;
  enviadoPara: string | null;
}

export interface ContatoOportunidade {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  /** Contato que assina o contrato. */
  contratante?: boolean;
}

export interface Oportunidade {
  id: string;
  nome: string;
  estagio: string;
  fonte: string | null;
  valorProposta: number | null;
  responsavel: string;
  servicoProduto: string | null;
  modeloServicoFunilId: string | null;
  tipoEvento: string | null;
  quantidadeConvidados: number | null;
  dataPrevista: string | null;
  /** Texto livre antigo; os quatro horários abaixo o substituem (SPEC-031 §6.7). */
  horarios: string | null;
  horaConvite: string | null;
  horaCerimonia: string | null;
  horaRecepcao: string | null;
  horaFesta: string | null;
  quantidadePadrinhos: number | null;
  quantidadeDamas: number | null;
  localCerimonia: string | null;
  enderecoCerimonia: string | null;
  cepCerimonia: string | null;
  paisCerimonia: string | null;
  numeroCerimonia: string | null;
  bairroCerimonia: string | null;
  localRecepcao: string | null;
  enderecoRecepcao: string | null;
  cepRecepcao: string | null;
  paisRecepcao: string | null;
  numeroRecepcao: string | null;
  bairroRecepcao: string | null;
  estadoRecepcao: string | null;
  cidadeRecepcao: string | null;
  uf: string | null;
  cidade: string | null;
  motivoDescarte: string | null;
  criadoEm: string;
  entradaNoEstagioEm: string;
  contatos: ContatoOportunidade[];
  /** Cliente criado a partir do lead, quando o negócio fechou. */
  clienteId: string | null;
  estagioId: string;
  /** Aberto, Contratado ou Descartado. */
  tipoEstagio: TipoEstagioFunil;
  /** Texto livre quando a origem é "Outro". */
  fonteOutro: string | null;
  /** Data de retorno (yyyy-MM-dd). */
  retornarEm: string | null;
  /** Hora do retorno (HH:mm:ss). */
  retornarHora: string | null;
  /** Lead do formulário público com contato que já existia na conta. */
  contatoRepetido: boolean;
  /** Proposta mais recente enviada por link (SPEC-031 §6.6); null quando não houve envio. */
  proposta: PropostaResumo | null;
  criadoPor?: string | null;
  contratante?: DadosContratante | null;
  /** Nome, CPF/CNPJ, estado civil, nacionalidade, e-mail, celular e endereço completo preenchidos (SPEC-049). */
  dadosContratoCompletos?: boolean;
  /** Evento criado a partir do lead contratado; com ele, o quadro não oferece "Criar evento" de novo (card #66). */
  eventoId?: string | null;
}

export type SituacaoProposta = 'NaoAberta' | 'Aberta' | 'Aceita' | 'Duvidas' | 'Recusada';

export interface PropostaResumo {
  orcamentoId: string;
  situacao: SituacaoProposta;
  abertaEm: string | null;
  mensagem: string | null;
  respondidaEm: string | null;
  /** Token do link da tela de aceite (só a assessoria vê). */
  tokenLink?: string | null;
}

export type RespostaProposta = 'Aceitar' | 'Duvidas' | 'Recusar';

/** Diz à API que quem abre a página pública é a conta logada neste navegador (ver contaDoVisitante). */
function cabecalhoVisitante(): Record<string, string> {
  const conta = contaDoVisitante();
  return conta ? { 'X-Aralu-Visitante': conta } : {};
}

export interface PropostaPublica {
  estado: 'Disponivel' | 'Vencida' | 'Cancelada';
  empresa: string | null;
  contato: string | null;
  titulo: string | null;
  conteudo: string | null;
  /**
   * Documento completo da página de aceite (SPEC-061), montado e sanitizado no servidor. Vai para um iframe isolado
   * (sem scripts); fotos vêm como aralu-midia:{id} e os botões como aralu-resposta:{tipo}.
   */
  paginaAceite?: string | null;
  valor: number | null;
  validoAte: string | null;
  resposta: RespostaProposta | null;
  respostaMensagem: string | null;
  respostaEm: string | null;
  /** A assessoria abriu o próprio link (logada): não conta como abertura e não pode responder. */
  daPropriaConta?: boolean;
  /** Parcelas do orçamento, mostradas antes do aceite (SPEC-042). */
  parcelas?: ParcelaOrcamento[] | null;
  /** O que a assessoria já sabe do contratante, para pré-preencher o aceite (SPEC-049). */
  contratante?: DadosContratante | null;
}

export interface LeadRsvp {
  id: string;
  convite: string;
  evento: string;
  criadoEm: string;
  telefone: string | null;
  /** Nulo se o convite foi apagado depois (SPEC-062: o lead fica como histórico). */
  conviteId: string | null;
  eventoId: string | null;
}

export interface ContratoFunil {
  id: string;
  oportunidadeId: string;
  oportunidadeNome: string;
  conteudo: string;
  situacao: string;
  criadoEm: string;
  enviadoEm: string | null;
  assinadoEm: string | null;
  modeloId: string | null;
  criadoPor?: string | null;
  /** Parcelas a receber do cliente, copiadas do orçamento aprovado (SPEC-040). */
  parcelas: ParcelaContrato[];
  valorTotal: number;
  recebido: number;
  saldo: number;
  /** Só na leitura de um contrato: telefone do contato e chave Pix, usados no "Cobrar". */
  oportunidadeTelefone?: string | null;
  chavePix?: string | null;
  /** Logo e fundo copiados do modelo ao gerar o contrato (SPEC-056). */
  logoArquivoId?: string | null;
  fundoArquivoId?: string | null;
  /** Gerado de modelo Word: o .docx já preenchido. */
  documentoArquivoId?: string | null;
}

export interface OrcamentoFunil {
  id: string;
  oportunidadeId: string;
  oportunidadeNome: string;
  conteudo: string;
  valor: number | null;
  situacao: string;
  criadoEm: string;
  enviadoEm: string | null;
  respondidoEm: string | null;
  modeloId: string | null;
  tokenLink: string | null;
  validoAte: string | null;
  abertoEm: string | null;
  situacaoProposta: SituacaoProposta | null;
  respostaMensagem: string | null;
  respostaEm: string | null;
  criadoPor?: string | null;
  parcelas: ParcelaOrcamento[];
  /** Dias de validade do último envio (SPEC-064); nulo antes do primeiro envio. */
  diasValidade?: number | null;
}

export interface PedidoParcelas {
  quantidadeParcelas: number;
  primeiraParcela: string | null;
  comEntrada: boolean;
  baseEntrada: 'Valor' | 'Porcentagem' | null;
  valorEntrada: number | null;
  dataEntrada: string | null;
}

export interface TarefaFunil {
  id: string;
  oportunidadeId: string;
  oportunidadeNome: string;
  titulo: string;
  observacao: string | null;
  tipo: string;
  responsavel: string;
  /** Dona e assistentes responsáveis (SPEC-031 §6.7). */
  responsaveis: { papel: string; referenciaId: string | null }[];
  prazo: string;
  completa: boolean;
  anexoArquivoId: string | null;
  criadoPor?: string | null;
}

export interface CatalogoRelatoriosFunil {
  fechadosPerdidos: { chave: string; quantidade: number; valor: number }[];
  porFonte: { chave: string; quantidade: number; valor: number }[];
  porServicoProduto: { chave: string; quantidade: number; valor: number }[];
  porEstagio: { chave: string; quantidade: number; valor: number }[];
  porRegiao: { uf: string; cidade: string; quantidade: number; valor: number }[];
  porResponsavel: { chave: string; quantidade: number; valor: number }[];
  porDataPrevista: { chave: string; quantidade: number; valor: number }[];
  porMotivosDescarte: { chave: string; quantidade: number; valor: number }[];
  oportunidadesRsvp: {
    visualizacoes: number;
    cliquesBotao: number;
    contatados: number;
    descartados: number;
    geradas: number;
    conversao: number;
    conversoesAnteriores: number;
  };
}

export interface ModeloServicoFunil {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number | null;
}

export interface ModeloOrcamentoFunil {
  id: string;
  nome: string;
  texto: string;
  corPrimaria: string | null;
  corSecundaria: string | null;
  parametros: string[];
  /** HTML já sanitizado pelo servidor: a página de aceite inteira (SPEC-061). */
  htmlAceite?: string | null;
  midias?: MidiaAceite[];
  depoimentos?: DepoimentoAceite[];
}

/** Foto de um espaço da página de aceite: logo, imagem:capa, galeria:bastidores, carrossel:dia_do_evento. */
export interface MidiaAceite {
  espaco: string;
  arquivoId: string;
  ordem: number;
}

export interface DepoimentoAceite {
  texto: string;
  autor: string | null;
}

export interface PreviaPaginaAceite {
  texto: string | null;
  htmlAceite: string | null;
  corPrimaria: string | null;
  corSecundaria: string | null;
  midias: MidiaAceite[];
  depoimentos: DepoimentoAceite[];
}

export interface ModeloParaContratoFunil {
  id: string;
  nome: string;
  texto: string;
  /** "word": o contrato sai do documento Word do modelo, sem editar o texto aqui. */
  formato?: 'texto' | 'word';
}

export type TipoEstagioFunil = 'Aberto' | 'Contratado' | 'Descartado';

/** Estágio do funil da conta (SPEC-031). */
export interface EstagioFunil {
  id: string;
  nome: string;
  /** Token de cor do tema. */
  cor: string;
  ordem: number;
  tipo: TipoEstagioFunil;
  quantidade: number;
}

export interface FunilEstagio {
  estagio: string;
  quantidade: number;
  valor: number;
  id: string;
  cor: string;
  tipo: TipoEstagioFunil;
}

export interface SalvarEstagiosFunil {
  abertos: { id: string | null; nome: string; cor: string }[];
  corContratado: string;
  corDescartado: string;
  exclusoes: { id: string; destinoId: string | null }[];
}

/** Paleta fechada dos estágios (tokens do tema). */
export const CORES_ESTAGIO = [
  { valor: 'info', rotulo: 'Azul' },
  { valor: 'warning', rotulo: 'Amarelo' },
  { valor: 'success', rotulo: 'Verde' },
  { valor: 'error', rotulo: 'Vermelho' },
  { valor: 'primary', rotulo: 'Petróleo' },
  { valor: 'secondary', rotulo: 'Dourado' },
  { valor: 'roxo', rotulo: 'Roxo' },
  { valor: 'rosa', rotulo: 'Rosa' },
  { valor: 'laranja', rotulo: 'Laranja' },
  { valor: 'turquesa', rotulo: 'Turquesa' },
  { valor: 'indigo', rotulo: 'Índigo' },
  { valor: 'lima', rotulo: 'Lima' },
  { valor: 'marrom', rotulo: 'Marrom' },
  { valor: 'cinza', rotulo: 'Cinza' },
];

export const MAXIMO_ESTAGIOS_ABERTOS = 8;

/** Origem do contato em lista fechada (SPEC-031 §6.4). */
export const ORIGENS_FUNIL = [
  'Instagram',
  'Indicação',
  'Google',
  'Página pública',
  'Formulário do site',
  'WhatsApp',
  'Feira ou evento',
  'Fornecedor parceiro',
  'Cliente antigo',
  'Outro',
];

/** Outro lead ou cliente com o mesmo telefone ou e-mail. */
export interface ContatoRepetido {
  tipo: 'oportunidade' | 'cliente';
  id: string;
  nome: string;
  estagio: string | null;
}

export const TIPOS_TAREFA_FUNIL = [
  { valor: 'Reuniao', rotulo: 'Reunião' },
  { valor: 'Ligacao', rotulo: 'Ligação' },
  { valor: 'Email', rotulo: 'E-mail' },
  { valor: 'Tarefa', rotulo: 'Tarefa' },
];

/** Para onde o alerta do resumo leva (SPEC-008 v2, 8.3). */
export type DestinoAlerta = 'TarefasAtrasadas' | 'Fornecedores' | 'ConvidadosPendentes' | 'Editar' | 'Contratos';

export interface AlertaEvento {
  codigo: string;
  quantidade: number;
  texto: string;
  destino: DestinoAlerta;
  /** Texto para filtrar a tela de destino (ex.: nome da oportunidade do contrato). */
  busca?: string | null;
}

export interface ResumoEvento {
  tarefasConcluidas: number;
  tarefas: number;
  tarefasAtrasadas: number;
  convidadosConfirmados: number;
  convidadosPendentes: number;
  convidadosRecusados: number;
  convidados: number;
  servicosContratados: number;
  servicos: number;
  servicosSemFornecedor: number;
  orcamentoEstimado: number | null;
  valorContratado: number;
  valorPago: number;
  cliente: { id: string; nome: string; ddi: string; celular: string } | null;
  alertas: AlertaEvento[];
}

/** Quem assina o contrato (SPEC-049). O documento é o campo único CPF/CNPJ, sem máscara. */
export interface DadosContratante {
  nome: string | null;
  documento: string | null;
  /** yyyy-MM-dd. */
  nascimento: string | null;
  profissao: string | null;
  estadoCivil: string | null;
  nacionalidade: string | null;
  email: string | null;
  celular: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  complemento: string | null;
  pais: string | null;
}

export const ESTADOS_CIVIS = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Separado(a)', 'Divorciado(a)', 'Viúvo(a)'] as const;

/** Campos que faltam para gerar o contrato (mesma regra da API). */
export function faltaParaContrato(d: Partial<DadosContratante> | null | undefined): string[] {
  const falta: string[] = [];
  const exige = (valor: string | null | undefined, rotulo: string) => {
    if (!valor || !valor.trim()) falta.push(rotulo);
  };
  exige(d?.nome, 'nome completo');
  exige(d?.documento, 'CPF/CNPJ');
  exige(d?.estadoCivil, 'estado civil');
  exige(d?.nacionalidade, 'nacionalidade');
  exige(d?.email, 'e-mail');
  exige(d?.celular, 'celular');
  exige(d?.cep, 'CEP');
  exige(d?.endereco, 'endereço');
  exige(d?.numero, 'número');
  exige(d?.bairro, 'bairro');
  exige(d?.cidade, 'cidade');
  exige(d?.estado, 'estado');
  return falta;
}
