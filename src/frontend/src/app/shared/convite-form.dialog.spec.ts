import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConviteDoFormulario, pedidoDoFormulario } from '../core/convite-formulario';
import { ConviteFormDados, ConviteFormDialog } from './convite-form.dialog';

describe('Formulário único de convite (SPEC-059)', () => {
  const fechar = vi.fn();

  function abrir(dados: ConviteFormDados) {
    fechar.mockClear();
    TestBed.configureTestingModule({
      imports: [ConviteFormDialog],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: dados },
        { provide: MatDialogRef, useValue: { close: fechar } },
      ],
    });
    const fixture = TestBed.createComponent(ConviteFormDialog);
    fixture.detectChanges();
    return fixture;
  }

  function digitar(raiz: HTMLElement, rotulo: string, valor: string): void {
    const campo = raiz.querySelector(`input[aria-label="${rotulo}"]`) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function botao(raiz: HTMLElement, texto: string): HTMLButtonElement {
    return [...raiz.querySelectorAll('button')].find((item) => item.textContent?.includes(texto)) as HTMLButtonElement;
  }

  const rotulos = (raiz: HTMLElement) => [...raiz.querySelectorAll('input, mat-select')].map((item) => item.getAttribute('aria-label') ?? (item as HTMLInputElement).type);

  it('organizadora e cliente têm os mesmos campos, menos a observação', () => {
    const organizadora = rotulos(abrir({ convite: null, mostrarObservacao: true }).nativeElement);
    TestBed.resetTestingModule();
    const cliente = rotulos(abrir({ convite: null, mostrarObservacao: false }).nativeElement);

    expect(organizadora).toContain('Observação');
    expect(cliente).not.toContain('Observação');
    expect(organizadora.filter((item) => item !== 'Observação')).toEqual(cliente);
    expect(cliente).toEqual(expect.arrayContaining(['Nome do convite', 'E-mail', 'Nome completo do convidado 1', 'DDI do convidado 1', 'Telefone do convidado 1', 'Gênero do convidado 1', 'Faixa etária do convidado 1', 'checkbox']));
  });

  it('exige marcar um principal, com telefone, e envia vários convidados', () => {
    const fixture = abrir({ convite: null, mostrarObservacao: false });
    const raiz: HTMLElement = fixture.nativeElement;
    digitar(raiz, 'Nome do convite', 'Família Souza');
    digitar(raiz, 'Nome completo do convidado 1', 'Maria Souza');
    botao(raiz, 'Adicionar convidado').click();
    fixture.detectChanges();
    digitar(raiz, 'Nome completo do convidado 2', 'João Souza');
    fixture.detectChanges();
    expect(botao(raiz, 'Salvar convite').disabled).toBe(true);
    expect(raiz.textContent).toContain('Marque o convidado principal.');

    // O principal é o segundo convidado: só o telefone dele passa a ser obrigatório.
    (raiz.querySelector('[data-teste="principal-1"] input') as HTMLInputElement).click();
    fixture.detectChanges();
    expect(botao(raiz, 'Salvar convite').disabled).toBe(true);
    digitar(raiz, 'Telefone do convidado 2', '11977776666');
    fixture.detectChanges();
    expect(botao(raiz, 'Salvar convite').disabled).toBe(false);
    botao(raiz, 'Salvar convite').click();

    const pedido = fechar.mock.calls[0][0];
    expect(pedido.convidados.map((item: { nome: string }) => item.nome)).toEqual(['Maria Souza', 'João Souza']);
    expect(pedido.convidados.map((item: { principal: boolean }) => item.principal)).toEqual([false, true]);
    expect(pedido.convidados[0]).toMatchObject({ id: null, ddi: null, celular: null, genero: null, faixa: null });
    expect('observacao' in pedido).toBe(false);
  });

  it('na edição mantém os ids dos convidados e a organizadora envia a observação', () => {
    const convite: ConviteDoFormulario = {
      nome: 'Família Souza',
      email: null,
      observacao: 'Pedido da noiva',
      excecaoPrazoRsvp: true,
      convidados: [{ id: 'c1', nome: 'Maria Souza', ddi: '+55', celular: '11999990000', genero: 'Feminino', faixa: 'Adulto', principal: true }],
    };
    const fixture = abrir({ convite, mostrarObservacao: true });
    botao(fixture.nativeElement, 'Salvar convite').click();

    expect(fechar).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Família Souza',
      observacao: 'Pedido da noiva',
      excecaoPrazoRsvp: true,
      convidados: [expect.objectContaining({ id: 'c1', nome: 'Maria Souza', genero: 'Feminino', faixa: 'Adulto', principal: true })],
    }));
  });
});

describe('pedidoDoFormulario', () => {
  const valor = {
    nome: ' Família ',
    email: '',
    excecaoPrazoRsvp: false,
    observacao: ' nota ',
    principal: 0,
    convidados: [{ nome: 'Ana', ddi: '+55', celular: '11999990000', genero: 'Feminino', faixa: '' }, { nome: 'Bia', ddi: '+55', celular: ' ', genero: '', faixa: 'Crianca' }],
  };

  it('limpa os textos e tira o DDI de quem não tem telefone', () => {
    expect(pedidoDoFormulario(valor, ['a', null], true)).toEqual({
      nome: 'Família',
      email: null,
      excecaoPrazoRsvp: false,
      observacao: 'nota',
      convidados: [
        { id: 'a', nome: 'Ana', ddi: '+55', celular: '11999990000', genero: 'Feminino', faixa: null, principal: true },
        { id: null, nome: 'Bia', ddi: null, celular: null, genero: null, faixa: 'Crianca', principal: false },
      ],
    });
  });

  it('sem observação (link do cliente) não envia o campo', () => {
    expect('observacao' in pedidoDoFormulario(valor, [null, null], false)).toBe(false);
  });
});
