import { inserirMarca, previaDestacada } from './mesclagem';

const campos = [{ marca: 'contratante_nome', rotulo: 'Nome', exemplo: 'Ana <Souza>' }];

describe('previaDestacada', () => {
  it('destaca o exemplo da marca conhecida e escapa o HTML', () => {
    expect(previaDestacada('Olá {{contratante_nome}} <b>', campos)).toBe('Olá <mark>Ana &lt;Souza&gt;</mark> &lt;b&gt;');
  });

  it('mantém a marca desconhecida e troca quebra de linha', () => {
    expect(previaDestacada('{{apelido}}\nfim', campos)).toBe('{{apelido}}<br>fim');
  });
});

describe('inserirMarca', () => {
  it('insere no cursor e posiciona depois da marca', () => {
    expect(inserirMarca('Olá !', 4, 4, 'contratante_nome')).toEqual({ texto: 'Olá {{contratante_nome}}!', cursor: 24 });
  });
});
