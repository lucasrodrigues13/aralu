import { Cliente } from '../../core/negocio.client';

export interface NomesDosNoivos {
  noiva: string;
  noivo: string;
}

/**
 * Nomes de noiva e noivo de um casamento, tirados dos clientes vinculados pelo papel cadastrado.
 * Sem cliente no papel, mantém o nome já gravado no evento; se ele for só o nome do evento, deixa vazio.
 */
export function nomesDosNoivos(
  clientes: Pick<Cliente, 'nome' | 'papel'>[],
  gravados: { primeiroNome: string | null; segundoNome: string | null; nomeDoEvento: string },
): NomesDosNoivos {
  const doPapel = (papel: string) => clientes.find((cliente) => cliente.papel === papel)?.nome.trim() ?? '';
  const gravado = (valor: string | null) => {
    const texto = (valor ?? '').trim();
    return texto && texto !== gravados.nomeDoEvento.trim() ? texto : '';
  };
  return {
    noiva: doPapel('Noiva') || gravado(gravados.primeiroNome),
    noivo: doPapel('Noivo') || gravado(gravados.segundoNome),
  };
}
