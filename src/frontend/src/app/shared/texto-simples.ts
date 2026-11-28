/**
 * Formatação simples para observações (SPEC-031 §6.7, ponto 3): **negrito**, lista com "- " e links.
 * O texto fica guardado como o usuário escreveu; só a exibição vira HTML, sempre com o texto escapado.
 */

const URL = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s<]+)/g;

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emLinha(texto: string): string {
  const comLinks = escapar(texto).replace(URL, (_tudo, _md, rotulo?: string, endereco?: string, solto?: string) => {
    const destino = endereco ?? solto ?? '';
    const aparece = rotulo ?? destino;
    return `<a href="${destino}" target="_blank" rel="noopener noreferrer">${aparece}</a>`;
  });
  return comLinks.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function htmlDeTextoSimples(texto: string | null | undefined): string {
  if (!texto) {
    return '';
  }

  const saida: string[] = [];
  let emLista = false;
  for (const linha of texto.split(/\r?\n/)) {
    const item = /^\s*[-*]\s+(.*)$/.exec(linha);
    if (item) {
      if (!emLista) {
        saida.push('<ul>');
        emLista = true;
      }

      saida.push(`<li>${emLinha(item[1])}</li>`);
      continue;
    }

    if (emLista) {
      saida.push('</ul>');
      emLista = false;
    }

    saida.push(linha.trim() === '' ? '<br>' : `<p>${emLinha(linha)}</p>`);
  }

  if (emLista) {
    saida.push('</ul>');
  }

  return saida.join('');
}

export interface EdicaoTexto {
  texto: string;
  inicio: number;
  fim: number;
}

/** Envolve a seleção em **negrito**; sem seleção, deixa o cursor entre os asteriscos. */
export function aplicarNegrito(texto: string, inicio: number, fim: number): EdicaoTexto {
  const selecionado = texto.slice(inicio, fim);
  return {
    texto: `${texto.slice(0, inicio)}**${selecionado}**${texto.slice(fim)}`,
    inicio: inicio + 2,
    fim: fim + 2,
  };
}

/** Põe "- " no começo de cada linha tocada pela seleção. */
export function aplicarLista(texto: string, inicio: number, fim: number): EdicaoTexto {
  const comecoDaLinha = texto.lastIndexOf('\n', inicio - 1) + 1;
  const trecho = texto.slice(comecoDaLinha, fim);
  const linhas = trecho.split('\n').map((linha) => (/^\s*[-*]\s/.test(linha) ? linha : `- ${linha}`));
  const novo = linhas.join('\n');
  return {
    texto: texto.slice(0, comecoDaLinha) + novo + texto.slice(fim),
    inicio: comecoDaLinha,
    fim: comecoDaLinha + novo.length,
  };
}

/** Transforma a seleção em [texto](https://). O cursor fica dentro dos parênteses. */
export function aplicarLink(texto: string, inicio: number, fim: number): EdicaoTexto {
  const selecionado = texto.slice(inicio, fim) || 'link';
  const markdown = `[${selecionado}](https://)`;
  const posicao = inicio + markdown.length - 1;
  return {
    texto: texto.slice(0, inicio) + markdown + texto.slice(fim),
    inicio: posicao,
    fim: posicao,
  };
}
