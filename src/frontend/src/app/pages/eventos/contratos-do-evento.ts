import { EventoServico } from '../../core/negocio.client';

export interface ContratoDoEvento {
  servicoId: string;
  servico: string;
  /** Fornecedor(es) contratado(s) no serviço; vazio se o vínculo voltou para orçamento depois do envio. */
  fornecedores: string[];
  arquivoId: string;
  nome: string;
  tipoConteudo: string;
}

/** Contratos de fornecedor enviados ao sistema no evento: um arquivo por serviço (SPEC-048 §6). */
export function montarContratosDoEvento(servicos: EventoServico[]): ContratoDoEvento[] {
  return servicos
    .filter((servico) => servico.contratoAssinado !== null)
    .map((servico) => ({
      servicoId: servico.id,
      servico: servico.nome,
      fornecedores: servico.fornecedores.filter((v) => v.etapa === 'Contratado').map((v) => v.fornecedor),
      arquivoId: servico.contratoAssinado!.arquivoId,
      nome: servico.contratoAssinado!.nome,
      tipoConteudo: servico.contratoAssinado!.tipoConteudo,
    }))
    .sort((a, b) => a.servico.localeCompare(b.servico, 'pt-BR'));
}
