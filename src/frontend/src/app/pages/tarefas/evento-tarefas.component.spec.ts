import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AssistentesClient } from '../../core/assistentes.client';
import { NegocioClient, Tarefa } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { EventoTarefasComponent } from './evento-tarefas.component';

function tarefa(parcial: Partial<Tarefa> & Pick<Tarefa, 'id' | 'titulo'>): Tarefa {
  return {
    eventoId: 'evento-1',
    evento: 'Ana & Bruno',
    descricao: null,
    grupo: null,
    prazo: null,
    situacao: 'Pendente',
    responsavelContaId: 'conta',
    prioridade: 'Media',
    visibilidade: 'SoEu',
    servicoEventoId: null,
    servico: null,
    responsaveis: [{ papel: 'Organizer', referenciaId: 'conta' }],
    checklist: [],
    comentarios: [],
    anexos: [],
    grupoPrazo: null,
    eventoEmAndamento: true,
    tags: [],
    ...parcial,
  };
}

function montar(situacaoEvento: string, tarefas: Tarefa[], dialogo: Pick<MatDialog, 'open'> = {
  open: () => ({ afterClosed: () => of(false) }) as never,
}): ComponentFixture<EventoTarefasComponent> {
  TestBed.configureTestingModule({
    imports: [EventoTarefasComponent],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      {
        provide: NegocioClient,
        useValue: {
          evento: () => of({ situacao: situacaoEvento, tipo: 'Casamento', servicos: [], data: '2026-12-21' }),
          tarefasDoEvento: () => of(tarefas),
        },
      },
      { provide: MatDialog, useValue: dialogo },
      { provide: AssistentesClient, useValue: { nomes: () => of([]) } },
      { provide: ToastService, useValue: { erro: () => undefined, sucesso: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(EventoTarefasComponent);
  fixture.componentRef.setInput('eventoId', 'evento-1');
  fixture.detectChanges();
  return fixture;
}

describe('Tarefas do evento no Resumo', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('agrupa as tarefas pela distância até o evento', () => {
    const fixture = montar('EmAndamento', [
      tarefa({ id: '1', titulo: 'Depois', prazo: '2026-12-01', grupo: 'Cerimônia' }),
      tarefa({ id: '2', titulo: 'Antes', prazo: '2026-11-18' }),
    ]);
    const raiz = fixture.nativeElement as HTMLElement;
    const grupos = [...raiz.querySelectorAll('.nome-grupo')].map((item) => item.textContent?.trim());
    const linhas = [...raiz.querySelectorAll('tr.linha-tarefa')].map((linha) => linha.textContent ?? '');

    expect(raiz.textContent).toContain('Nova tarefa');
    expect(raiz.textContent).toContain('2 tarefas encontradas');
    expect(raiz.querySelector('mat-button-toggle-group')).toBeNull();
    expect(grupos).toEqual(['1 mês antes', '2 semanas antes']);
    expect(linhas[0]).toContain('Antes');
    expect(linhas[1]).toContain('Depois');
    expect(linhas[1]).toContain('Cerimônia');
  });

  it('não mostra Nova tarefa quando o evento não está em andamento', () => {
    const raiz = montar('Concluido', []).nativeElement as HTMLElement;

    expect(raiz.textContent).not.toContain('Nova tarefa');
    expect(raiz.textContent).toContain('Não há tarefa para mostrar.');
  });

  it('Nova tarefa abre o modal de criação', () => {
    let dados: { eventoId?: string; tarefa?: unknown } | undefined;
    const fixture = montar('EmAndamento', [tarefa({ id: '1', titulo: 'Lista' })], {
      open: ((_componente: unknown, config: { data: { eventoId?: string; tarefa?: unknown } }) => {
        dados = config.data;
        return { afterClosed: () => of(false) };
      }) as never,
    });
    const botao = [...fixture.nativeElement.querySelectorAll('button')].find((item) =>
      (item.textContent ?? '').includes('Nova tarefa'),
    ) as HTMLButtonElement;

    botao.click();

    expect(dados).toEqual({ eventoId: 'evento-1' });
  });

  it('mostrarAtrasadas filtra só as atrasadas', () => {
    const fixture = montar('EmAndamento', [
      tarefa({ id: '1', titulo: 'Velha', prazo: '2020-01-01' }),
      tarefa({ id: '2', titulo: 'Concluída velha', prazo: '2020-01-01', situacao: 'Concluida' }),
      tarefa({ id: '3', titulo: 'Futura', prazo: '2099-01-01' }),
    ]);
    fixture.componentInstance.mostrarAtrasadas();
    fixture.detectChanges();
    const linhas = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tr.linha-tarefa')].map((linha) => linha.textContent ?? '');

    expect(linhas.length).toBe(1);
    expect(linhas[0]).toContain('Velha');
  });

  it('marcar a tarefa conclui, risca o título e avisa o Resumo', () => {
    const fixture = montar('EmAndamento', [tarefa({ id: '1', titulo: 'Buffet' })]);
    const pedidos: [string, boolean][] = [];
    const negocio = TestBed.inject(NegocioClient) as unknown as Record<string, unknown>;
    negocio['concluirTarefa'] = (id: string, concluida: boolean) => {
      pedidos.push([id, concluida]);
      return of(tarefa({ id, titulo: 'Buffet', situacao: concluida ? 'Concluida' : 'Pendente' }));
    };
    let avisos = 0;
    fixture.componentInstance.mudou.subscribe(() => avisos++);
    const raiz = fixture.nativeElement as HTMLElement;

    (raiz.querySelector('tr.linha-tarefa .concluir input') as HTMLInputElement).click();
    fixture.detectChanges();

    expect(pedidos).toEqual([['1', true]]);
    expect(avisos).toBe(1);
    expect(raiz.querySelector('tr.linha-tarefa .titulo-tarefa.concluida')).not.toBeNull();
  });
});
