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

const SITUACOES = [
  { valor: 'Pendente', rotulo: 'Pendente', titulo: 'Pendentes', icone: 'schedule', cor: 'warning' },
  { valor: 'Confirmado', rotulo: 'Confirmado', titulo: 'Confirmados', icone: 'check_circle', cor: 'success' },
  { valor: 'NaoComparecera', rotulo: 'Não comparecerá', titulo: 'Não confirmados', icone: 'cancel', cor: 'error' },
];

/** Três cards fixos; situação sem convidados aparece com 0. */
export function cardsPorSituacao(porSituacao: { rotulo: string; quantidade: number }[]) {
  const porRotulo = new Map(porSituacao.map((item) => [item.rotulo, item.quantidade]));
  return SITUACOES.map((item) => ({ ...item, quantidade: porRotulo.get(item.rotulo) ?? 0 }));
}

/** O prazo vale até o fim do dia (SPEC-054): encerra no dia seguinte. `hoje` em `aaaa-mm-dd`. */
export function prazoEncerrado(prazo: string | null, hoje: string = hojeLocal()): boolean {
  return !!prazo && hoje > prazo;
}

function hojeLocal(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

/** Contagem por situação a partir dos rótulos de tela dos convidados (link do cliente). */
export function contarPorSituacao(situacoes: string[]): { rotulo: string; quantidade: number }[] {
  const contagem = new Map<string, number>();
  for (const situacao of situacoes) contagem.set(situacao, (contagem.get(situacao) ?? 0) + 1);
  return [...contagem].map(([rotulo, quantidade]) => ({ rotulo, quantidade }));
}

/** Filtros da aba Convidados (SPEC-059 §6.5). `situacao` usa o valor da API (Pendente, Confirmado, NaoComparecera). */
export interface FiltroDeConvites {
  nome: string;
  situacao: string;
  telefone: string;
  observacao: string;
  somenteConfirmados: boolean;
}

interface ConviteFiltravel<C extends { nome: string; situacao: string; celular: string | null }> {
  nome: string;
  convidados: C[];
}

const digitos = (texto: string | null | undefined) => (texto ?? '').replace(/\D/g, '');
const contem = (texto: string, termo: string) => texto.toLocaleLowerCase('pt-BR').includes(termo.trim().toLocaleLowerCase('pt-BR'));

/**
 * Filtro do link do cliente, feito na tela com as mesmas regras do filtro da organizadora (que roda na API): o
 * convidado passa se atende a todos os filtros; o nome vale para o convidado ou o convite; o convite fica com os
 * convidados que passaram e sai se nenhum passou. Sem filtro, volta tudo.
 */
export function filtrarConvites<C extends { nome: string; situacao: string; celular: string | null }, T extends ConviteFiltravel<C>>(
  convites: T[],
  filtro: FiltroDeConvites,
): T[] {
  const rotulo = SITUACOES.find((item) => item.valor === filtro.situacao)?.rotulo;
  const telefone = digitos(filtro.telefone);
  const nome = filtro.nome.trim();
  if (!rotulo && !telefone && !nome && !filtro.somenteConfirmados) return convites;
  return convites
    .map((convite) => ({
      ...convite,
      convidados: convite.convidados.filter((pessoa) =>
        (!filtro.somenteConfirmados || pessoa.situacao === 'Confirmado')
        && (!rotulo || pessoa.situacao === rotulo)
        && (!telefone || digitos(pessoa.celular).includes(telefone))
        && (!nome || contem(pessoa.nome, nome) || contem(convite.nome, nome))),
    }))
    .filter((convite) => convite.convidados.length > 0);
}
