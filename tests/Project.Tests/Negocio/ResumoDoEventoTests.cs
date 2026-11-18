using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Convidados;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;
using Project.Domain.Tarefas;

namespace Project.Tests.Negocio;

public class ResumoDoEventoTests
{
    private const string Conta = "conta-1";
    private static readonly DateOnly Hoje = new(2026, 11, 18);

    [Fact]
    public void Evento_vazio_sem_data_so_alerta_a_falta_de_data()
    {
        var resumo = ResumoDoEvento.Calcular(Conta, Evento(null), [], [], null, Hoje);

        Assert.Equal(0, resumo.Tarefas);
        Assert.Equal(0, resumo.Servicos);
        Assert.Null(resumo.Cliente);
        var alerta = Assert.Single(resumo.Alertas);
        Assert.Equal("sem-data", alerta.Codigo);
        Assert.Equal(DestinoAlerta.Editar, alerta.Destino);
    }

    [Fact]
    public void Alertas_seguem_a_ordem_da_spec_e_param_em_tres()
    {
        var evento = Evento(Hoje.AddDays(20));
        evento.Servicos.Add(Servico(contratado: false, parcelas: [Parcela(Hoje.AddDays(-1)), Parcela(Hoje.AddDays(3))]));
        Tarefa[] tarefas = [Tarefa(Hoje.AddDays(-2), SituacaoTarefa.Pendente), Tarefa(Hoje.AddDays(-2), SituacaoTarefa.Concluida)];

        var resumo = ResumoDoEvento.Calcular(Conta, evento, tarefas, [SituacaoConvidado.Pendente], null, Hoje);

        Assert.Equal(["tarefas-atrasadas", "pagamentos-vencidos", "pagamentos-semana"], resumo.Alertas.Select(alerta => alerta.Codigo));
        Assert.Equal("1 tarefa atrasada", resumo.Alertas[0].Texto);
        Assert.Equal(1, resumo.TarefasAtrasadas);
        Assert.Equal(1, resumo.TarefasConcluidas);
    }

    [Fact]
    public void Servico_sem_fornecedor_e_convidados_respeitam_os_prazos()
    {
        var longe = Evento(Hoje.AddDays(90));
        longe.Servicos.Add(Servico(contratado: false));
        Assert.Empty(ResumoDoEvento.Calcular(Conta, longe, [], [SituacaoConvidado.Pendente], null, Hoje).Alertas);

        var perto = Evento(Hoje.AddDays(45));
        perto.Servicos.Add(Servico(contratado: false));
        var alertas = ResumoDoEvento.Calcular(Conta, perto, [], [SituacaoConvidado.Pendente], null, Hoje).Alertas;
        Assert.Equal(["servicos-sem-fornecedor"], alertas.Select(alerta => alerta.Codigo));

        var muitoPerto = Evento(Hoje.AddDays(20));
        var convidados = ResumoDoEvento.Calcular(Conta, muitoPerto, [], [SituacaoConvidado.Pendente, SituacaoConvidado.Pendente], null, Hoje).Alertas;
        Assert.Equal("2 convidados sem resposta", Assert.Single(convidados).Texto);
    }

    [Fact]
    public void Servico_da_propria_assessoria_fica_fora_dos_fornecedores()
    {
        var evento = Evento(Hoje.AddDays(10));
        var assessoria = Servico(contratado: true, valor: 15000m, parcelas: [Parcela(Hoje.AddDays(-5))]);
        assessoria.FornecedorContaId = Conta;
        evento.Servicos.Add(assessoria);
        evento.Servicos.Add(Servico(contratado: true, valor: 4000m, parcelas: [Parcela(Hoje.AddDays(-30), SituacaoParcela.Pago, 1000m)]));

        var resumo = ResumoDoEvento.Calcular(Conta, evento, [], [], null, Hoje);

        Assert.Equal(1, resumo.Servicos);
        Assert.Equal(4000m, resumo.ValorContratado);
        Assert.Equal(1000m, resumo.ValorPago);
        Assert.Empty(resumo.Alertas);
    }

    [Fact]
    public void Evento_encerrado_nao_tem_alerta()
    {
        var evento = Evento(null);
        evento.Situacao = SituacaoEvento.Concluido;
        Assert.Empty(ResumoDoEvento.Calcular(Conta, evento, [Tarefa(Hoje.AddDays(-1), SituacaoTarefa.Pendente)], [], null, Hoje).Alertas);
    }

    [Theory]
    [InlineData("31999990001", "(31) 99999-0001")]
    [InlineData("+55 (31) 99999-0001", "(31) 99999-0001")]
    [InlineData("3133330001", "(31) 3333-0001")]
    [InlineData("99990001", "")]
    [InlineData(" ", null)]
    public void Celular_com_ddd(string entrada, string? esperado)
    {
        Assert.Equal(esperado, Mascaras.Celular(entrada));
    }

    [Fact]
    public void Cliente_rapido_pede_nome_e_whatsapp()
    {
        Assert.False(EventoServico.MontarClienteRapido(Conta, new ClienteRapido(" ", "31999990001")).Ok);
        Assert.False(EventoServico.MontarClienteRapido(Conta, new ClienteRapido("Ana", "9999")).Ok);

        var cliente = EventoServico.MontarClienteRapido(Conta, new ClienteRapido(" Ana ", "31999990001"));
        Assert.True(cliente.Ok);
        Assert.Equal("Ana", cliente.Valor!.Nome);
        Assert.Equal("(31) 99999-0001", cliente.Valor.Celular);
        Assert.Null(cliente.Valor.Papel);
    }

    private static Evento Evento(DateOnly? data) => new()
    {
        Id = Guid.NewGuid(),
        ContaId = Conta,
        Nome = "Ana & Bruno",
        Tipo = TipoEvento.Casamento,
        Situacao = SituacaoEvento.EmAndamento,
        Data = data,
    };

    private static ServicoEvento Servico(bool contratado, decimal? valor = null, ParcelaServico[]? parcelas = null) => new()
    {
        Id = Guid.NewGuid(),
        Nome = "Buffet",
        Contratado = contratado,
        ValorContratado = valor,
        Parcelas = (parcelas ?? []).ToList(),
    };

    private static ParcelaServico Parcela(DateOnly vencimento, SituacaoParcela situacao = SituacaoParcela.Pendente, decimal valor = 500m) => new()
    {
        Id = Guid.NewGuid(),
        Vencimento = vencimento,
        Valor = valor,
        Situacao = situacao,
    };

    private static Tarefa Tarefa(DateOnly? prazo, SituacaoTarefa situacao) => new()
    {
        Id = Guid.NewGuid(),
        ContaId = Conta,
        Titulo = "Tarefa",
        Prazo = prazo,
        Situacao = situacao,
    };
}
