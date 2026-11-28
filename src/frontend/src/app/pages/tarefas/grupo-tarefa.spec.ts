import { filtrarTarefas, grupoAteEvento, ordenarPorPrazo, secoesAteEvento, secoesPorPrazo, TarefaAgrupavel } from './grupo-tarefa';

function tarefa(parcial: Partial<TarefaAgrupavel> & Pick<TarefaAgrupavel, 'titulo'>): TarefaAgrupavel {
  return {
    grupoPrazo: null,
    situacao: 'Pendente',
    prazo: null,
    eventoId: 'evento-1',
    servicoEventoId: null,
    tags: [],
    responsaveis: [],
    ...parcial,
  };
}

describe('grupo-tarefa', () => {
  it('agrupa esta semana, sem prazo e feitas', () => {
    const secoes = secoesPorPrazo(
      [
        tarefa({ titulo: 'B', grupoPrazo: 'EstaSemana', prazo: '2026-11-20' }),
        tarefa({ titulo: 'A', grupoPrazo: 'EstaSemana', prazo: '2026-11-18' }),
        tarefa({ titulo: 'Solta', grupoPrazo: 'SemPrazo' }),
        tarefa({ titulo: 'Pronta', grupoPrazo: 'Feitas', situacao: 'Concluida', prazo: '2026-11-01' }),
      ],
      (situacao) => situacao,
    );

    expect(secoes.map((secao) => secao.rotulo)).toEqual(['Esta semana', 'Sem prazo', 'Feitas']);
    expect(secoes[0].tarefas.map((item) => item.titulo)).toEqual(['A', 'B']);
  });

  it('isola a lista geral por evento e situação', () => {
    const lista = [
      tarefa({ titulo: 'Um', eventoId: 'a', situacao: 'Pendente' }),
      tarefa({ titulo: 'Dois', eventoId: 'b', situacao: 'Concluida' }),
    ];

    const filtradas = filtrarTarefas(lista, {
      situacao: 'Pendente',
      eventoId: 'a',
      responsavel: '',
      servicoId: '',
      tag: '',
      prazoDe: null,
      prazoAte: null,
    });

    expect(filtradas.map((item) => item.titulo)).toEqual(['Um']);
  });

  it('ordena a lista do evento pelo prazo e, sem prazo, pelo título', () => {
    const lista = ordenarPorPrazo([
      tarefa({ titulo: 'Z', prazo: null }),
      tarefa({ titulo: 'B', prazo: '2026-11-20' }),
      tarefa({ titulo: 'A', prazo: null }),
      tarefa({ titulo: 'C', prazo: '2026-11-18' }),
    ]);

    expect(lista.map((item) => item.titulo)).toEqual(['C', 'B', 'A', 'Z']);
  });
});

describe('secoesAteEvento', () => {
  const evento = '2026-11-21';

  it('rotula pela distância até o evento', () => {
    expect(grupoAteEvento('2026-09-02', evento).rotulo).toBe('2 meses antes');
    expect(grupoAteEvento('2026-10-13', evento).rotulo).toBe('1 mês antes');
    expect(grupoAteEvento('2026-10-31', evento).rotulo).toBe('3 semanas antes');
    expect(grupoAteEvento('2026-11-14', evento).rotulo).toBe('1 semana antes');
    expect(grupoAteEvento('2026-11-20', evento).rotulo).toBe('1 dia antes');
    expect(grupoAteEvento('2026-11-21', evento).rotulo).toBe('No dia do evento');
    expect(grupoAteEvento('2026-11-25', evento).rotulo).toBe('Depois do evento');
    expect(grupoAteEvento(null, evento).rotulo).toBe('Sem prazo');
  });

  it('ordena do mais longe para o mais perto e põe sem prazo no fim', () => {
    const secoes = secoesAteEvento(
      [
        tarefa({ titulo: 'Perto', prazo: '2026-11-20' }),
        tarefa({ titulo: 'Sem' }),
        tarefa({ titulo: 'Longe B', prazo: '2026-09-19' }),
        tarefa({ titulo: 'Longe A', prazo: '2026-09-02' }),
        tarefa({ titulo: 'Depois', prazo: '2026-12-01' }),
      ],
      evento,
    );
    expect(secoes.map((secao) => secao.rotulo)).toEqual(['2 meses antes', '1 dia antes', 'Depois do evento', 'Sem prazo']);
    expect(secoes[0].tarefas.map((item) => item.titulo)).toEqual(['Longe A', 'Longe B']);
  });

  it('sem data do evento agrupa pelo mês do prazo', () => {
    const secoes = secoesAteEvento([tarefa({ titulo: 'Dez', prazo: '2026-12-02' }), tarefa({ titulo: 'Nov', prazo: '2026-11-05' })], null);
    expect(secoes.map((secao) => secao.rotulo)).toEqual(['novembro de 2026', 'dezembro de 2026']);
  });
});

describe('secoesAteEvento com prazo relativo (SPEC-012 v3 §8.1)', () => {
  it('evento sem data: a tarefa relativa entra no grupo da distância', () => {
    const base = { situacao: 'Pendente', eventoId: 'e', servicoEventoId: null, tags: [], responsaveis: [], grupoPrazo: null };
    const secoes = secoesAteEvento([
      { ...base, titulo: 'Relativa', prazo: null, prazoRelativo: -42 },
      { ...base, titulo: 'Sem prazo', prazo: null, prazoRelativo: null },
    ], null);
    expect(secoes.map((secao) => secao.rotulo)).toEqual(['1 mês antes', 'Sem prazo']);
  });
});
