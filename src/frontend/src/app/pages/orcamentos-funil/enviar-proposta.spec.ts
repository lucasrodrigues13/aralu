import { inserirTexto, mensagemSemLink } from './orcamentos-funil.page';

describe('Enviar proposta: link na mensagem do modelo', () => {
  const link = 'https://aralu.exemplo/proposta/abc';

  it('sem modelo escolhido vale a mensagem padrão, que já tem o link', () => {
    expect(mensagemSemLink(null, link)).toBe(false);
  });

  it('acusa mensagem de modelo sem o link e libera quando o link está no texto', () => {
    expect(mensagemSemLink('Olá! Segue a proposta.', link)).toBe(true);
    expect(mensagemSemLink(`Olá! Segue a proposta: ${link}`, link)).toBe(false);
  });

  it('insere o link no cursor com espaço em volta e devolve o cursor depois dele', () => {
    const r = inserirTexto('Veja:aqui', link, 5, 5);
    expect(r.texto).toBe(`Veja: ${link} aqui`);
    expect(r.cursor).toBe(`Veja: ${link}`.length);
  });

  it('troca o trecho selecionado e insere no fim sem espaço sobrando', () => {
    expect(inserirTexto('Clique em LINK', link, 10, 14).texto).toBe(`Clique em ${link}`);
    expect(inserirTexto('Segue a proposta ', link, 17, 17).texto).toBe(`Segue a proposta ${link}`);
    expect(inserirTexto('', link, 0, 0).texto).toBe(link);
  });
});
