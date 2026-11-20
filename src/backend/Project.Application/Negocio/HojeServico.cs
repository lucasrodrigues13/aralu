using Project.Domain.Funil;
using Project.Domain.Tarefas;

namespace Project.Application.Negocio;

public sealed record TarefaHojeDado(Guid EventoId, DateOnly? Prazo, SituacaoTarefa Situacao);

public sealed record EventoHojeDado(Guid Id, string Nome, DateOnly? Data);

public sealed record ConvidadosEventoDado(Guid EventoId, int Total, int Pendentes, int Confirmados = 0, int NaoVao = 0);

/// <summary>Cartão "Respostas de convidados" (SPEC-007 §6.3): pendentes, sim e não.</summary>
public sealed record RespostasConvidadosHoje(int Pendentes, int Sim, int Nao);

public sealed record ParcelaHojeDado(Guid EventoId, string Evento, int Numero, bool Entrada, DateOnly Vencimento, decimal Saldo);

public sealed record PagamentoSemanaDado(DateOnly Vencimento, decimal Valor);

public sealed record ConfiguracaoContaDado(bool TemPerfil, bool TemPix, bool TemContrato);

/// <summary>Lead com retorno marcado até hoje, num estágio aberto (SPEC-031 §6.3).</summary>
public sealed record RetornoFunilHoje(Guid Id, string Nome, string Estagio, DateOnly Data, TimeOnly? Hora, bool Atrasado);

/// <summary>Tarefa aberta cujo responsável é uma assistente removida (SPEC-032 §18, passo 2). Origem: "Evento" ou "Funil".</summary>
public sealed record TarefaSemResponsavelAtivo(
    string Origem,
    Guid Id,
    string Titulo,
    Guid ContextoId,
    string Contexto,
    DateOnly? Prazo,
    string Assistente);

public interface IDadosHoje
{
    /// <summary>Tarefas abertas (evento e funil) com assistente removida entre os responsáveis.</summary>
    Task<IReadOnlyList<TarefaSemResponsavelAtivo>> TarefasSemResponsavelAtivoAsync(string contaId, CancellationToken ct);

    Task<IReadOnlyList<EventoHojeDado>> EventosEmAndamentoAsync(string contaId, CancellationToken ct);

    Task<IReadOnlyList<TarefaHojeDado>> TarefasAsync(string contaId, IReadOnlyCollection<Guid> eventoIds, CancellationToken ct);

    Task<IReadOnlyList<ConvidadosEventoDado>> ConvidadosAsync(string contaId, IReadOnlyCollection<Guid> eventoIds, CancellationToken ct);

    Task<IReadOnlyList<ParcelaHojeDado>> CobrancasAsync(string contaId, IReadOnlyCollection<Guid> eventoIds, DateOnly ate, CancellationToken ct);

    Task<IReadOnlyList<PagamentoSemanaDado>> PagamentosPendentesAsync(string contaId, IReadOnlyCollection<Guid> eventoIds, DateOnly de, DateOnly ate, CancellationToken ct);

    Task<ConfiguracaoContaDado> ConfiguracaoAsync(string contaId, CancellationToken ct);

    /// <summary>Leads em estágio aberto com retorno marcado até a data.</summary>
    Task<IReadOnlyList<RetornoFunilHoje>> RetornosFunilAsync(string contaId, DateOnly ate, CancellationToken ct);
}

public sealed record CobrancaHoje(Guid EventoId, string Evento, string Parcela, DateOnly Vencimento, decimal Saldo, bool Atrasada);

public sealed record ProximoEventoHoje(Guid Id, string Nome, DateOnly Data, int Dias);

public sealed record CarteiraLinha(
    Guid Id,
    string Nome,
    DateOnly? Data,
    int PercentualTarefas,
    int Responderam,
    int Convidados,
    int TarefasAtrasadas,
    bool RespostasAbaixo);

public sealed record HojeLeitura(
    DateOnly Hoje,
    int TarefasHoje,
    int TarefasAtrasadas,
    int TarefasSemana,
    IReadOnlyList<CobrancaHoje> Cobrancas,
    RespostasConvidadosHoje RespostasConvidados,
    int PagamentosSemana,
    decimal ValorPagamentosSemana,
    ProximoEventoHoje? ProximoEvento,
    IReadOnlyList<CarteiraLinha> Carteira,
    IReadOnlyList<FunilEstagio> Funil,
    ConfiguracaoContaDado Configuracao,
    IReadOnlyList<RetornoFunilHoje> RetornosFunil,
    IReadOnlyList<TarefaSemResponsavelAtivo> TarefasSemResponsavelAtivo);

/// <summary>Regras da tela Hoje (SPEC-007 v2, decisões de 18/11/2026).</summary>
public static class HojeRegras
{
    public static bool Ativa(SituacaoTarefa situacao) => situacao != SituacaoTarefa.Concluida;

    public static bool Atrasada(TarefaHojeDado tarefa, DateOnly hoje) =>
        Ativa(tarefa.Situacao) && (tarefa.Situacao == SituacaoTarefa.Atrasada || (tarefa.Prazo is DateOnly prazo && prazo < hoje));

    /// <summary>"N tarefas pedem você hoje": ativas com prazo hoje, de qualquer evento.</summary>
    public static bool PedeHoje(TarefaHojeDado tarefa, DateOnly hoje) => Ativa(tarefa.Situacao) && tarefa.Prazo == hoje;

    /// <summary>Faltam menos de 2 meses para o evento e 50% ou mais dos convidados ainda não responderam.</summary>
    public static bool RespostasAbaixo(DateOnly? dataEvento, DateOnly hoje, int total, int pendentes) =>
        total > 0
        && dataEvento is DateOnly data
        && data >= hoje
        && data < hoje.AddMonths(2)
        && pendentes * 2 >= total;
}

/// <summary>Tela Hoje: o que pede ação hoje (SPEC-007 v2).</summary>
public sealed class HojeServico(IDadosHoje dados, PainelServico painel)
{
    public async Task<HojeLeitura> ObterAsync(
        string contaId,
        DateOnly hoje,
        CancellationToken ct,
        IReadOnlySet<Guid>? eventosLiberados = null,
        bool comFinanceiro = true,
        bool comPendencias = false)
    {
        var eventos = await dados.EventosEmAndamentoAsync(contaId, ct);
        if (eventosLiberados is not null)
        {
            eventos = eventos.Where(evento => eventosLiberados.Contains(evento.Id)).ToArray();
        }

        var ids = eventos.Select(evento => evento.Id).ToArray();
        var tarefas = await dados.TarefasAsync(contaId, ids, ct);
        var convidados = (await dados.ConvidadosAsync(contaId, ids, ct)).ToDictionary(item => item.EventoId);
        var cobrancas = comFinanceiro ? await dados.CobrancasAsync(contaId, ids, hoje.AddDays(7), ct) : [];
        var pagamentos = comFinanceiro ? await dados.PagamentosPendentesAsync(contaId, ids, hoje, hoje.AddDays(6), ct) : [];
        var funil = (await painel.ObterAsync(contaId, ct)).Funil;

        var proximo = eventos
            .Where(evento => evento.Data is DateOnly data && data >= hoje)
            .OrderBy(evento => evento.Data)
            .Select(evento => new ProximoEventoHoje(evento.Id, evento.Nome, evento.Data!.Value, evento.Data.Value.DayNumber - hoje.DayNumber))
            .FirstOrDefault();

        var carteira = eventos
            .OrderBy(evento => evento.Data ?? DateOnly.MaxValue)
            .ThenBy(evento => evento.Nome)
            .Select(evento =>
            {
                var doEvento = tarefas.Where(tarefa => tarefa.EventoId == evento.Id).ToArray();
                var feitas = doEvento.Count(tarefa => tarefa.Situacao == SituacaoTarefa.Concluida);
                convidados.TryGetValue(evento.Id, out var lista);
                var total = lista?.Total ?? 0;
                var pendentes = lista?.Pendentes ?? 0;
                return new CarteiraLinha(
                    evento.Id,
                    evento.Nome,
                    evento.Data,
                    doEvento.Length == 0 ? 0 : (int)Math.Round(feitas * 100.0 / doEvento.Length),
                    total - pendentes,
                    total,
                    doEvento.Count(tarefa => HojeRegras.Atrasada(tarefa, hoje)),
                    HojeRegras.RespostasAbaixo(evento.Data, hoje, total, pendentes));
            })
            .ToArray();

        return new HojeLeitura(
            hoje,
            tarefas.Count(tarefa => HojeRegras.PedeHoje(tarefa, hoje)),
            tarefas.Count(tarefa => HojeRegras.Atrasada(tarefa, hoje)),
            tarefas.Count(tarefa => HojeRegras.Ativa(tarefa.Situacao) && tarefa.Prazo is DateOnly prazo && prazo >= hoje && prazo <= hoje.AddDays(6)),
            cobrancas
                .OrderBy(item => item.Vencimento)
                .Select(item => new CobrancaHoje(
                    item.EventoId,
                    item.Evento,
                    item.Entrada ? "Entrada" : $"Parcela {item.Numero}",
                    item.Vencimento,
                    item.Saldo,
                    item.Vencimento < hoje))
                .ToArray(),
            new RespostasConvidadosHoje(
                convidados.Values.Sum(item => item.Pendentes),
                convidados.Values.Sum(item => item.Confirmados),
                convidados.Values.Sum(item => item.NaoVao)),
            pagamentos.Count,
            pagamentos.Sum(item => item.Valor),
            proximo,
            carteira,
            funil,
            await dados.ConfiguracaoAsync(contaId, ct),
            (await dados.RetornosFunilAsync(contaId, hoje, ct))
                .Select(item => item with { Atrasado = item.Data < hoje })
                .OrderBy(item => item.Data)
                .ThenBy(item => item.Hora ?? TimeOnly.MaxValue)
                .ToArray(),
            comPendencias ? await dados.TarefasSemResponsavelAtivoAsync(contaId, ct) : []);
    }
}
