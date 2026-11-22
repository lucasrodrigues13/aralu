/**
 * Formulário único de convite (SPEC-059): o mesmo para a organizadora e para o link do cliente, ao criar e ao editar.
 * Só a observação é diferente: aparece para a organizadora; no link do cliente o backend grava "Preenchido pelo casal".
 */

/** Convidado no formulário: com `id` atualiza o existente; sem `id`, inclui um novo. */
export interface ConvidadoDoFormulario {
  id: string | null;
  nome: string;
  ddi: string | null;
  celular: string | null;
}

/** Corpo enviado aos dois endpoints (organizadora e link do cliente). */
export interface PedidoConvite {
  nome: string;
  email: string | null;
  excecaoPrazoRsvp: boolean;
  convidados: ConvidadoDoFormulario[];
  /** Só a organizadora envia; o link do cliente ignora. */
  observacao?: string | null;
}

/** O que o formulário recebe para editar um convite existente. */
export interface ConviteDoFormulario {
  nome: string;
  email: string | null;
  excecaoPrazoRsvp: boolean;
  observacao?: string | null;
  convidados: ConvidadoDoFormulario[];
}

export const DDI_PADRAO = '+55';

/** Valor bruto do formulário reativo. */
export interface ValorDoFormulario {
  nome: string;
  email: string;
  excecaoPrazoRsvp: boolean;
  observacao: string;
  convidados: { nome: string; ddi: string; celular: string }[];
}

/** Monta o pedido a partir do formulário; `ids` acompanha a ordem dos convidados (nulo = novo). */
export function pedidoDoFormulario(valor: ValorDoFormulario, ids: (string | null)[], comObservacao: boolean): PedidoConvite {
  const pedido: PedidoConvite = {
    nome: valor.nome.trim(),
    email: valor.email.trim() || null,
    excecaoPrazoRsvp: valor.excecaoPrazoRsvp,
    convidados: valor.convidados.map((item, indice) => {
      const celular = item.celular.trim() || null;
      return { id: ids[indice] ?? null, nome: item.nome.trim(), ddi: celular ? item.ddi.trim() || null : null, celular };
    }),
  };
  if (comObservacao) pedido.observacao = valor.observacao.trim() || null;
  return pedido;
}
