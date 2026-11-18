import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NegocioClient, Tarefa } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { TarefasPage } from './tarefas.page';

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
    grupoPrazo: null,
    eventoEmAndamento: true,
    tags: [],
    ...parcial,
  };
}

function montar(situacaoEvento: string, tarefas: Tarefa[], dialogo: Pick<MatDialog, 'open'> = {
  open: () => ({ afterClosed: () => of(false) }) as never,
}): ComponentFixture<TarefasPage> {
  TestBed.configureTestingModule({
    imports: [TarefasPage],
    providers: [
      provideRouter([]),
      provideNoopAnimations(),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ id: 'evento-1' }),
            queryParamMap: convertToParamMap({}),
          },
        },
      },
      {
        provide: NegocioClient,
        useValue: {
          evento: () => of({ situacao: situacaoEvento, tipo: 'Casamento', servicos: [] }),
          tarefasDoEvento: () => of(tarefas),
        },
      },
      { provide: MatDialog, useValue: dialogo },
      { provide: ToastService, useValue: { erro: () => undefined, sucesso: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(TarefasPage);
  fixture.detectChanges();
  return fixture;
}

describe('TarefasPage na aba do evento', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('mostra uma tabela com Nova tarefa e sem grupos de prazo', () => {
    const fixture = montar('EmAndamento', [
      tarefa({ id: '1', titulo: 'Depois', prazo: '2026-12-01', grupo: 'Cerimônia' }),
      tarefa({ id: '2', titulo: 'Antes', prazo: '2026-11-18' }),
    ]);
    const raiz = fixture.nativeElement as HTMLElement;
    const titulos = [...raiz.querySelectorAll('td.mat-column-titulo')].map((celula) => celula.textContent ?? '');

    expect(raiz.textContent).toContain('Nova tarefa');
    expect(raiz.textContent).not.toContain('Esta semana');
    expect(raiz.querySelector('mat-button-toggle-group')).toBeNull();
    expect(titulos[0]).toContain('Antes');
    expect(titulos[1]).toContain('Depois');
    expect(titulos[1]).toContain('Cerimônia');
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
});
