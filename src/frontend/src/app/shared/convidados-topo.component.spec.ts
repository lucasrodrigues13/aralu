import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConvidadosTopoComponent } from './convidados-topo.component';
import { contarPorSituacao, filtrarConvites, FiltroDeConvites, prazoEncerrado } from './convite-lista';

describe('Topo da aba Convidados (SPEC-059 §6.5)', () => {
  function criar(mostrarObservacao: boolean) {
    TestBed.configureTestingModule({ imports: [ConvidadosTopoComponent], providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(ConvidadosTopoComponent);
    fixture.componentRef.setInput('mostrarObservacao', mostrarObservacao);
    fixture.componentRef.setInput('porSituacao', [{ rotulo: 'Pendente', quantidade: 2 }, { rotulo: 'Confirmado', quantidade: 1 }]);
    fixture.detectChanges();
    return fixture;
  }

  const textos = (raiz: HTMLElement) => [...raiz.querySelectorAll('button')].map((item) => item.textContent?.trim() ?? '');

  it('tem as mesmas ferramentas nas duas telas e só a organizadora filtra por observação', () => {
    const organizadora = criar(true).nativeElement as HTMLElement;
    const ferramentas = ['Data de envio', 'Prazo de confirmação', 'Lista de presença', 'Importar', 'Novo convite'];
    for (const nome of ferramentas) expect(textos(organizadora).some((texto) => texto.includes(nome))).toBe(true);
    expect(organizadora.querySelector('input[aria-label="Observação"]')).not.toBeNull();

    TestBed.resetTestingModule();
    const cliente = criar(false).nativeElement as HTMLElement;
    for (const nome of ferramentas) expect(textos(cliente).some((texto) => texto.includes(nome))).toBe(true);
    expect(cliente.querySelector('input[aria-label="Observação"]')).toBeNull();
    expect(cliente.querySelector('[aria-label="Pendentes"]')?.textContent).toContain('2');
  });

  it('clicar num card filtra pela situação e clicar de novo limpa', () => {
    const fixture = criar(false);
    const filtros: FiltroDeConvites[] = [];
    fixture.componentInstance.filtrar.subscribe((filtro) => filtros.push(filtro));
    const card = (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Confirmados"]') as HTMLButtonElement;

    card.click();
    card.click();

    expect(filtros.map((item) => item.situacao)).toEqual(['Confirmado', '']);
  });
});

describe('Filtro da lista no link do cliente', () => {
  const convites = [
    { nome: 'Família Souza', convidados: [
      { nome: 'Maria Souza', situacao: 'Confirmado', celular: '11999990000' },
      { nome: 'João Souza', situacao: 'Pendente', celular: null },
    ] },
    { nome: 'Ana Lima', convidados: [{ nome: 'Ana Lima', situacao: 'Não comparecerá', celular: '21988887777' }] },
  ];
  const vazio: FiltroDeConvites = { nome: '', situacao: '', telefone: '', observacao: '', somenteConfirmados: false };

  it('sem filtro volta tudo', () => {
    expect(filtrarConvites(convites, vazio)).toBe(convites);
  });

  it('filtra por situação, nome do convite ou convidado, telefone e só confirmados', () => {
    expect(filtrarConvites(convites, { ...vazio, situacao: 'NaoComparecera' }).map((item) => item.nome)).toEqual(['Ana Lima']);
    expect(filtrarConvites(convites, { ...vazio, nome: 'souza' })[0].convidados.length).toBe(2);
    expect(filtrarConvites(convites, { ...vazio, nome: 'joão' })[0].convidados.map((item) => item.nome)).toEqual(['João Souza']);
    expect(filtrarConvites(convites, { ...vazio, telefone: '(21) 98888' }).map((item) => item.nome)).toEqual(['Ana Lima']);
    expect(filtrarConvites(convites, { ...vazio, somenteConfirmados: true })[0].convidados.map((item) => item.nome)).toEqual(['Maria Souza']);
  });

  it('conta os convidados por situação para os cards e calcula o prazo encerrado', () => {
    expect(contarPorSituacao(['Pendente', 'Confirmado', 'Pendente'])).toEqual([{ rotulo: 'Pendente', quantidade: 2 }, { rotulo: 'Confirmado', quantidade: 1 }]);
    expect(prazoEncerrado('2026-11-21', '2026-11-22')).toBe(true);
    expect(prazoEncerrado('2026-11-22', '2026-11-22')).toBe(false);
    expect(prazoEncerrado(null, '2026-11-22')).toBe(false);
  });
});
