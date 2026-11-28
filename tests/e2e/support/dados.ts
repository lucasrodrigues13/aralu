/** Dados únicos por execução: cada teste cria o que usa, sem depender de ordem nem de sobra de outro teste. */
const execucao = Date.now().toString(36);
let contador = 0;

export const unico = (prefixo: string) => `${prefixo}-${execucao}-${++contador}`;

export const email = (perfil: string) => `${unico(perfil)}@e2e.aralu.test`.toLowerCase();

/** CPF válido gerado (dígitos verificadores corretos). */
export function cpf(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (base: number[]) => {
    const soma = base.reduce((s, d, i) => s + d * (base.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dv(n));
  n.push(dv(n));
  return n.join('');
}

export const TIPOS_EVENTO = ['Casamento', 'QuinzeAnos', 'Aniversario', 'Corporativo', 'Formatura'] as const;
export const MODULOS = ['Clientes', 'Eventos', 'Convidados', 'Tarefas', 'Agenda', 'Funil', 'OrcamentosContratos', 'Financeiro', 'Fornecedores', 'Modelos'] as const;
