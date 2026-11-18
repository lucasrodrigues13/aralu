import { filtrarTarefas, ordenarPorPrazo, secoesPorPrazo, TarefaAgrupavel } from './grupo-tarefa';

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
