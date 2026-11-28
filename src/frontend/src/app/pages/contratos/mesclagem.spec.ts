import { imagemModeloValida } from '../../core/contrato.client';
import { filtrarCampos, inserirMarca, previaDestacada, tagsDesconhecidas, textoEmHtml } from './mesclagem';

describe('textoEmHtml (contrato gerado, SPEC-056)', () => {
  it('escapa HTML e troca quebra de linha por <br>, sem destacar marcas', () => {
    expect(textoEmHtml('A <b>&</b>\nB {{x}}')).toBe('A &lt;b&gt;&amp;&lt;/b&gt;<br>B {{x}}');
  });
});

describe('imagemModeloValida (logo e fundo, SPEC-056)', () => {
  it('aceita JPG, PNG e WebP até 5 MB', () => {
    expect(imagemModeloValida({ type: 'image/png', size: 1000 })).toBeNull();
    expect(imagemModeloValida({ type: 'image/jpeg', size: 5 * 1024 * 1024 })).toBeNull();
    expect(imagemModeloValida({ type: 'image/webp', size: 1 })).toBeNull();
  });

  it('recusa outro formato ou arquivo maior que 5 MB', () => {
    expect(imagemModeloValida({ type: 'application/pdf', size: 1000 })).not.toBeNull();
    expect(imagemModeloValida({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).not.toBeNull();
  });
});

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

  it('mantém a marca desconhecida, destacada como aviso, e troca quebra de linha', () => {
    expect(previaDestacada('{{apelido}}\nfim', campos)).toBe('<mark class="desconhecida">{{apelido}}</mark><br>fim');
  });
});

describe('tagsDesconhecidas', () => {
  it('lista só as tags fora da lista, sem repetir', () => {
    expect(tagsDesconhecidas('{{contratante_nome}} {{Apelido}} {{apelido}} {{x_y}}', campos)).toEqual(['apelido', 'x_y']);
  });

  it('devolve vazio quando todas existem', () => {
    expect(tagsDesconhecidas('Olá {{contratante_nome}}', campos)).toEqual([]);
  });
});

describe('inserirMarca', () => {
  it('insere no cursor e posiciona depois da marca', () => {
    expect(inserirMarca('Olá !', 4, 4, 'contratante_nome')).toEqual({ texto: 'Olá {{contratante_nome}}!', cursor: 24 });
  });
});
