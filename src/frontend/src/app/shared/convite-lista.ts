/** Lista de convites recolhida (SPEC-059): o resumo mostra quantos convidados há e quantos em cada situação. */
export function resumoDosConvidados(situacoes: string[]): string {
  const total = situacoes.length;
  const partes = [`${total} ${total === 1 ? 'convidado' : 'convidados'}`];
  const contagem = new Map<string, number>();
  for (const situacao of situacoes) contagem.set(situacao, (contagem.get(situacao) ?? 0) + 1);
  for (const [situacao, quantidade] of contagem) partes.push(`${quantidade} ${(quantidade === 1 ? situacao : PLURAIS[situacao] ?? situacao).toLowerCase()}`);
  return partes.join(' · ');
}

/** Dados preenchidos de um convidado, na ordem em que aparecem ao expandir o convite; campos vazios ficam de fora. */
export function dadosPreenchidos(pessoa: {
  ddi: string | null;
  celular: string | null;
  mesa?: string | null;
  genero?: string | null;
  faixa?: string | null;
  custo?: string | null;
  cpf?: string | null;
  observacao?: string | null;
}): string[] {
  const dados: string[] = [];
  if (pessoa.celular) dados.push(`Telefone ${((pessoa.ddi ?? '') + ' ' + pessoa.celular).trim()}`);
  if (pessoa.mesa) dados.push(`Mesa ${pessoa.mesa}`);
  if (pessoa.faixa) dados.push(ROTULOS[pessoa.faixa] ?? pessoa.faixa);
  if (pessoa.genero) dados.push(ROTULOS[pessoa.genero] ?? pessoa.genero);
  if (pessoa.custo) dados.push(`Custo ${(ROTULOS[pessoa.custo] ?? pessoa.custo).toLowerCase()}`);
  if (pessoa.cpf) dados.push(`CPF ${pessoa.cpf}`);
  if (pessoa.observacao) dados.push(pessoa.observacao);
  return dados;
}

const PLURAIS: Record<string, string> = {
  Pendente: 'Pendentes',
  Confirmado: 'Confirmados',
  'Não comparecerá': 'Não comparecerão',
};

const ROTULOS: Record<string, string> = {
  Adulto: 'Adulto',
  Adolescente: 'Adolescente',
  Crianca: 'Criança',
  CriancaDeColo: 'Criança de colo',
  Idoso: 'Idoso',
  Masculino: 'Masculino',
  Feminino: 'Feminino',
  NaoBinario: 'Não binário',
  Inteira: 'Inteira',
  Meia: 'Meia',
  Gratuita: 'Gratuita',
  NaoInformado: 'Não informado',
};
