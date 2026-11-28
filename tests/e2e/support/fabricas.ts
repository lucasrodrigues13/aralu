import { unico } from './dados';

export const planoPedido = (nome: string, valor: number, recursos: { recurso: string; limite: number | null }[] = [], ordem = 1) => ({
  codigo: unico(nome.toLowerCase()),
  nome: `${nome} ${unico('')}`,
  descricao: `Plano ${nome} do E2E`,
  valorMensal: valor,
  publico: true,
  padrao: false,
  ativo: true,
  ordem,
  recursos,
});
