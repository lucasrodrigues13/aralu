import { filtrarCampos, inserirMarca, previaDestacada } from './mesclagem';

const campos = [{ marca: 'contratante_nome', rotulo: 'Nome', fonte: 'Cadastro de clientes, Nome', exemplo: 'Ana <Souza>' }];

describe('filtrarCampos', () => {
  const lista = [...campos, { marca: 'evento_data', rotulo: 'Evento: data prevista', fonte: 'Oportunidade, Data', exemplo: '20 de março' }];

  it('devolve tudo sem busca', () => {
    expect(filtrarCampos(lista, '  ')).toEqual(lista);
  });

  it('busca na marca, no rótulo e na fonte, sem acento nem caixa', () => {
    expect(filtrarCampos(lista, 'EVENTO').map((c) => c.marca)).toEqual(['evento_data']);
    expect(filtrarCampos(lista, 'oportunidade').map((c) => c.marca)).toEqual(['evento_data']);
    expect(filtrarCampos(lista, 'cadastro').map((c) => c.marca)).toEqual(['contratante_nome']);
  });
});

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
