import { aplicarLink, aplicarLista, aplicarNegrito, htmlDeTextoSimples } from './texto-simples';

describe('texto simples das observações', () => {
  it('escapa HTML e aplica negrito, lista e links', () => {
    const html = htmlDeTextoSimples('<b>oi</b> **forte**\n- um\n- dois\n[site](https://exemplo.com) e https://outro.com');

    expect(html).toContain('&lt;b&gt;oi&lt;/b&gt; <strong>forte</strong>');
    expect(html).toContain('<ul><li>um</li><li>dois</li></ul>');
    expect(html).toContain('<a href="https://exemplo.com" target="_blank" rel="noopener noreferrer">site</a>');
    expect(html).toContain('<a href="https://outro.com" target="_blank" rel="noopener noreferrer">https://outro.com</a>');
    expect(html).not.toContain('<b>');
  });

  it('não vira link o que não começa com http ou https', () => {
    expect(htmlDeTextoSimples('[x](javascript:alert(1))')).not.toContain('<a ');
  });

  it('aplica a formatação na seleção', () => {
    expect(aplicarNegrito('abc def', 4, 7)).toEqual({ texto: 'abc **def**', inicio: 6, fim: 9 });
    expect(aplicarLista('um\ndois', 0, 7).texto).toBe('- um\n- dois');
    expect(aplicarLink('veja aqui', 5, 9).texto).toBe('veja [aqui](https://)');
  });
});
