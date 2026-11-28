import { Cliente } from '../../core/negocio.client';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Clientes oferecidos na criação do evento (SPEC-008 v4, 6.1).
 * Sem texto, só quem não tem vínculo com evento; com texto, a busca pelo nome inclui quem já tem vínculo.
 */
export function clientesParaNovoEvento(clientes: Cliente[], busca: string, limite = 8): Cliente[] {
  const termo = normalizar(busca);
  if (!termo) return clientes.filter((cliente) => cliente.eventos.length === 0).slice(0, limite);
  return clientes.filter((cliente) => normalizar(cliente.nome).includes(termo)).slice(0, limite);
}

/** Texto de apoio na opção: o evento em que o cliente já está, se houver. */
export function vinculoDoCliente(cliente: Cliente): string {
  return cliente.eventos.map((evento) => evento.nome).join(', ');
}
