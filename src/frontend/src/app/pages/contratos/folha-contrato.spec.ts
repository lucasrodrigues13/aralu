import { blocosDoContrato, limparHtml } from './folha-contrato';

describe('limparHtml (A05-001)', () => {
  it('remove onerror de img e mantém o texto', () => {
    const r = limparHtml('<p>Olá <img src=x onerror=alert(1)> mundo</p>');
    expect(r).not.toContain('onerror');
    expect(r).not.toContain('src');
    expect(r).toContain('Olá');
    expect(r).toContain('mundo');
  });

  it('remove href javascript: e mantém o texto do link', () => {
    const r = limparHtml('<p><a href="javascript:alert(1)">clique</a></p>');
    expect(r).not.toContain('javascript');
    expect(r).toContain('clique');
  });

  it('permite src data:image só em img', () => {
    expect(limparHtml('<img src="data:image/png;base64,AAAA">')).toContain('data:image/png');
    expect(limparHtml('<a href="data:text/html,x">a</a>')).not.toContain('data:');
    expect(limparHtml('<img src="data:text/html,<script>1</script>">')).not.toContain('data:');
  });

  it('remove srcdoc, formaction e xlink:href', () => {
    const r = limparHtml('<p srcdoc="x" formaction="y" xlink:href="z">t</p>');
    expect(r).not.toMatch(/srcdoc|formaction|xlink/);
    expect(r).toContain('t');
  });

  it('o texto antigo (com <br>) também passa pela limpeza antes de virar blocos', () => {
    const blocos = blocosDoContrato(limparHtml('a<br>b<img src=x onerror=alert(1)>'));
    expect(blocos.join('')).not.toContain('onerror');
    expect(blocos.length).toBe(2);
  });
});
