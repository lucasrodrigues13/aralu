using Project.Domain.Clientes;
using Project.Domain.Convidados;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;
using Project.Domain.Tarefas;

namespace Project.Application.Negocio;

/// <summary>Para onde o alerta leva. A tela traduz em rota.</summary>
public enum DestinoAlerta
{
    TarefasAtrasadas,
    Fornecedores,
    ConvidadosPendentes,
    Editar,
    Contratos,
}

/// <summary>Alerta do resumo. Busca: texto para filtrar a tela de destino (ex.: nome da oportunidade).</summary>
public sealed record AlertaEvento(string Codigo, int Quantidade, string Texto, DestinoAlerta Destino, string? Busca = null);

public sealed record ClienteDoResumo(Guid Id, string Nome, string Ddi, string Celular);

public sealed record ResumoEvento(
    int TarefasConcluidas,
    int Tarefas,
    int TarefasAtrasadas,
    int ConvidadosConfirmados,
    int ConvidadosPendentes,
    int ConvidadosRecusados,
    int Convidados,
    int ServicosContratados,
    int Servicos,
    int ServicosSemFornecedor,
    decimal? OrcamentoEstimado,
    decimal ValorContratado,
    decimal ValorPago,
    ClienteDoResumo? Cliente,
    IReadOnlyList<AlertaEvento> Alertas);

/// <summary>Cartões e alertas do resumo do evento (SPEC-008 v2, 8.3 e 8.4).</summary>
public static class ResumoDoEvento
{
    public const int DiasServicoSemFornecedor = 60;
    public const int DiasConvidadosSemResposta = 30;
    public const int MaximoAlertas = 3;

    public static ResumoEvento Calcular(
        Evento evento,
        IReadOnlyList<Tarefa> tarefas,
        IReadOnlyList<SituacaoConvidado> convidados,
        Cliente? cliente,
        DateOnly hoje,
        string? oportunidadeComContratoPendente = null)
    {
        var atrasadas = tarefas.Count(tarefa => EstaAtrasada(tarefa, hoje));

        var servicos = evento.Servicos.ToArray();
        var contratados = servicos.Count(servico => servico.Contratado);
        var semFornecedor = servicos.Length - contratados;
        var parcelasPendentes = servicos
            .SelectMany(servico => servico.ContratosAtivos.SelectMany(contrato => contrato.Parcelas))
            .Where(parcela => parcela.Situacao == SituacaoParcela.Pendente)
            .ToArray();
        var vencidas = parcelasPendentes.Count(parcela => parcela.Vencimento < hoje);
        var naSemana = parcelasPendentes.Count(parcela => parcela.Vencimento >= hoje && parcela.Vencimento <= hoje.AddDays(7));
        var pendentes = convidados.Count(situacao => situacao == SituacaoConvidado.Pendente);
        int? faltam = evento.Data is DateOnly data ? data.DayNumber - hoje.DayNumber : null;

        var alertas = new List<AlertaEvento>();
        if (evento.Situacao == SituacaoEvento.EmAndamento)
        {
            if (oportunidadeComContratoPendente is not null)
            {
                alertas.Add(new("contrato-nao-assinado", 0, "Contrato do cliente ainda não assinado", DestinoAlerta.Contratos, oportunidadeComContratoPendente));
            }

            if (atrasadas > 0)
            {
                alertas.Add(new("tarefas-atrasadas", atrasadas, Plural(atrasadas, "tarefa atrasada", "tarefas atrasadas"), DestinoAlerta.TarefasAtrasadas));
            }

            if (vencidas > 0)
            {
                alertas.Add(new("pagamentos-vencidos", vencidas, Plural(vencidas, "pagamento a fornecedor vencido", "pagamentos a fornecedor vencidos"), DestinoAlerta.Fornecedores));
            }

            if (naSemana > 0)
            {
                alertas.Add(new("pagamentos-semana", naSemana, Plural(naSemana, "pagamento a fornecedor nesta semana", "pagamentos a fornecedor nesta semana"), DestinoAlerta.Fornecedores));
            }

            if (semFornecedor > 0 && faltam is int diasServico && diasServico <= DiasServicoSemFornecedor)
            {
                alertas.Add(new("servicos-sem-fornecedor", semFornecedor, Plural(semFornecedor, "serviço sem fornecedor contratado", "serviços sem fornecedor contratado"), DestinoAlerta.Fornecedores));
            }

            if (pendentes > 0 && faltam is int diasConvidados && diasConvidados <= DiasConvidadosSemResposta)
            {
                alertas.Add(new("convidados-sem-resposta", pendentes, Plural(pendentes, "convidado sem resposta", "convidados sem resposta"), DestinoAlerta.ConvidadosPendentes));
            }

            if (evento.Data is null)
            {
                alertas.Add(new("sem-data", 0, "Evento sem data", DestinoAlerta.Editar));
            }
        }

        return new ResumoEvento(
            tarefas.Count(tarefa => tarefa.Situacao == SituacaoTarefa.Concluida),
            tarefas.Count,
            atrasadas,
            convidados.Count(situacao => situacao == SituacaoConvidado.Confirmado),
            pendentes,
            convidados.Count(situacao => situacao == SituacaoConvidado.NaoComparecera),
            convidados.Count,
            contratados,
            servicos.Length,
            semFornecedor,
            evento.OrcamentoEstimado ?? SomaOuNulo(servicos.Select(servico => servico.ValorEstimado)),
            servicos.Where(servico => servico.Contratado).Sum(servico => servico.ValorContratado ?? 0m),
            servicos.Sum(ValorPagoDoServico),
            cliente is null ? null : new ClienteDoResumo(cliente.Id, cliente.Nome, cliente.Ddi, cliente.Celular),
            alertas.Take(MaximoAlertas).ToArray());
    }

    /// <summary>Quanto já foi pago ao fornecedor do serviço: parcelas pagas, ou o valor todo se o pagamento sem parcelas está pago (SPEC-043).</summary>
    private static decimal ValorPagoDoServico(ServicoEvento servico)
        => servico.ContratosAtivos.Sum(contrato => contrato.Parcelas.Count > 0
            ? contrato.Parcelas.Where(parcela => parcela.Situacao == SituacaoParcela.Pago).Sum(parcela => parcela.Valor)
            : contrato.Pago ? servico.ValorDoContrato(contrato) : 0m);

    public static bool EstaAtrasada(Tarefa tarefa, DateOnly hoje) =>
        tarefa.Situacao != SituacaoTarefa.Concluida
        && (tarefa.Situacao == SituacaoTarefa.Atrasada || tarefa.Prazo is DateOnly prazo && prazo < hoje);

    private static decimal? SomaOuNulo(IEnumerable<decimal?> valores)
    {
        var preenchidos = valores.OfType<decimal>().ToArray();
        return preenchidos.Length == 0 ? null : preenchidos.Sum();
    }

    private static string Plural(int quantidade, string singular, string plural) =>
        $"{quantidade} {(quantidade == 1 ? singular : plural)}";
}
