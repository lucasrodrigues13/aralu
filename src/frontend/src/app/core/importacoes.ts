/** Importação de planilha de convidados na fila (SPEC-059 §6.6). */
export interface ImportacaoConvidados {
  id: string;
  nomeArquivo: string;
  situacao: 'Pendente' | 'Processando' | 'Importado' | 'Erro';
  criadaEm: string;
  concluidaEm: string | null;
  convites: number;
  erros: string[];
}

export const ROTULO_SITUACAO_IMPORTACAO: Record<ImportacaoConvidados['situacao'], string> = {
  Pendente: 'Pendente',
  Processando: 'Processando',
  Importado: 'Importado',
  Erro: 'Erro',
};

/** Ainda há importação na fila: o modal continua consultando. */
export function temImportacaoEmAndamento(itens: ImportacaoConvidados[]): boolean {
  return itens.some((item) => item.situacao === 'Pendente' || item.situacao === 'Processando');
}
