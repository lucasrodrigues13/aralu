/**
 * Ajustes no HTML do docx-preview para o Live Preview parecer o Word.
 *
 * 1. Paginação: o docx-preview só quebra página onde o Word gravou a quebra (lastRenderedPageBreak). Documentos
 *    gerados por outros programas ou pelo próprio sistema não trazem essa marca e saem como uma folha só, muito
 *    alta, com cabeçalho, rodapé e fundo apenas no começo. Aqui o conteúdo é medido e repartido em folhas do
 *    tamanho da página, repetindo cabeçalho e rodapé em cada uma.
 * 2. Fundo de página: imagem "atrás do texto" do tamanho da folha, ancorada no cabeçalho ou rodapé, que o
 *    docx-preview posiciona a partir da margem (deixando uma faixa branca à esquerda). Ela passa a cobrir a folha
 *    inteira, a partir do canto.
 */
export function ajustarPaginasWord(raiz: HTMLElement): void {
  const folhas = Array.from(raiz.querySelectorAll<HTMLElement>('.docx-wrapper > section'));
  for (const folha of folhas) {
    paginar(folha);
  }
  for (const folha of Array.from(raiz.querySelectorAll<HTMLElement>('.docx-wrapper > section'))) {
    fixarFundo(folha);
  }
}

const PT_PARA_PX = 96 / 72;

function emPx(valor: string): number {
  const numero = parseFloat(valor);
  if (Number.isNaN(numero)) return 0;
  return valor.endsWith('pt') ? numero * PT_PARA_PX : numero;
}

/** Reparte o <article> da folha em folhas novas enquanto o conteúdo passar da altura da página. */
function paginar(primeira: HTMLElement): void {
  const altura = emPx(primeira.style.minHeight);
  if (!altura) return;
  let folha = primeira;
  // Limite de segurança: um documento de contrato não passa disso; evita laço infinito com medidas estranhas.
  for (let i = 0; i < 300; i++) {
    const resto = repartir(folha, altura);
    if (!resto) return;
    folha.after(resto);
    folha = resto;
  }
}

/** Devolve uma folha nova com o que não coube nesta, ou null quando tudo coube. */
function repartir(folha: HTMLElement, altura: number): HTMLElement | null {
  const artigo = folha.querySelector<HTMLElement>(':scope > article');
  if (!artigo) return null;
  const rodape = folha.querySelector<HTMLElement>(':scope > footer');
  const estilo = getComputedStyle(folha);
  const limite = altura - parseFloat(estilo.paddingBottom) - (rodape ? alturaExterna(rodape) : 0);
  const topoFolha = folha.getBoundingClientRect().top;

  const filhos = Array.from(artigo.children) as HTMLElement[];
  let corte = -1;
  for (let i = 0; i < filhos.length; i++) {
    const fim = filhos[i].getBoundingClientRect().bottom - topoFolha;
    if (fim > limite + 1) {
      corte = i;
      break;
    }
  }
  if (corte < 0) return null;

  const nova = folha.cloneNode(false) as HTMLElement;
  const cabecalho = folha.querySelector<HTMLElement>(':scope > header');
  if (cabecalho) nova.appendChild(cabecalho.cloneNode(true));
  const novoArtigo = artigo.cloneNode(false) as HTMLElement;
  nova.appendChild(novoArtigo);
  if (rodape) nova.appendChild(rodape.cloneNode(true));

  // Tabela maior que o espaço que sobra: as linhas que cabem ficam, o resto segue numa cópia da tabela.
  const alvo = filhos[corte];
  if (corte >= 0 && alvo.tagName === 'TABLE') {
    const restoTabela = partirTabela(alvo as HTMLTableElement, topoFolha, limite);
    if (restoTabela) {
      novoArtigo.appendChild(restoTabela);
      corte++;
    }
  }
  if (corte === 0 && filhos.length > 0 && !novoArtigo.children.length) {
    // Um bloco sozinho maior que a folha: fica onde está para não gerar folhas vazias sem fim.
    if (filhos.length === 1) return null;
    corte = 1;
  }
  for (const filho of filhos.slice(corte)) {
    novoArtigo.appendChild(filho);
  }
  return novoArtigo.children.length ? nova : null;
}

function partirTabela(tabela: HTMLTableElement, topoFolha: number, limite: number): HTMLTableElement | null {
  const linhas = Array.from(tabela.rows);
  const primeiraFora = linhas.findIndex((linha) => linha.getBoundingClientRect().bottom - topoFolha > limite + 1);
  if (primeiraFora <= 0) return null;
  const copia = tabela.cloneNode(false) as HTMLTableElement;
  for (const filho of Array.from(tabela.children)) {
    if (filho.tagName === 'COLGROUP') copia.appendChild(filho.cloneNode(true));
  }
  const corpo = document.createElement('tbody');
  copia.appendChild(corpo);
  for (const linha of linhas.slice(primeiraFora)) {
    corpo.appendChild(linha);
  }
  return copia;
}

function alturaExterna(el: HTMLElement): number {
  const estilo = getComputedStyle(el);
  return el.getBoundingClientRect().height + parseFloat(estilo.marginTop) + parseFloat(estilo.marginBottom);
}

/** Imagem de fundo (quase do tamanho da folha) no cabeçalho/rodapé: cobre a folha a partir do canto, atrás do texto. */
function fixarFundo(folha: HTMLElement): void {
  const larguraFolha = folha.getBoundingClientRect().width;
  if (!larguraFolha) return;
  for (const desenho of Array.from(folha.querySelectorAll<HTMLElement>(':scope > header div, :scope > footer div'))) {
    if (desenho.style.position !== 'relative' || desenho.style.width !== '0px') continue;
    const imagem = desenho.querySelector<HTMLElement>('img, svg');
    if (!imagem || imagem.getBoundingClientRect().width < larguraFolha * 0.9) continue;
    desenho.style.position = 'absolute';
    desenho.style.left = '0';
    desenho.style.top = '0';
    desenho.style.zIndex = '-1';
    folha.style.zIndex = '0';
    imagem.style.position = 'absolute';
    imagem.style.left = '0';
    imagem.style.top = '0';
    imagem.style.width = '100%';
    imagem.style.height = '100%';
    imagem.style.objectFit = 'cover';
    desenho.style.width = '100%';
    desenho.style.height = '100%';
    folha.insertBefore(desenho, folha.firstChild);
  }
}
