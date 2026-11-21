using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Eventos;

namespace Project.Tests.Negocio;

/// <summary>Regras do link do casal (SPEC-046) que não dependem do financeiro: gestão do link, link inválido e financeiro fechado.</summary>
public class LinkCasalTests
{
    private static readonly Guid EventoId = Guid.NewGuid();
    private const string Conta = "conta-1";

    private static (LinkCasalServico Servico, DadosFalsos Dados) Criar()
    {
        var dados = new DadosFalsos();
        // O financeiro (DinheiroServico, FornecedorServico) não é alcançado nestes cenários.
        return (new LinkCasalServico(dados, null!, null!, null!), dados);
    }

    [Fact]
    public async Task Gerar_cria_o_link_com_o_financeiro_fechado()
    {
        var (servico, _) = Criar();

        var resultado = await servico.GerarAsync(Conta, EventoId, DateTimeOffset.UtcNow, default);

        Assert.True(resultado.Ok);
        Assert.True(resultado.Valor!.Ativo);
        Assert.False(string.IsNullOrWhiteSpace(resultado.Valor.Token));
        Assert.False(resultado.Valor.FinanceiroLiberado);
    }

    [Fact]
    public async Task Gerar_de_novo_troca_o_codigo_e_o_antigo_deixa_de_valer()
    {
        var (servico, _) = Criar();
        var primeiro = (await servico.GerarAsync(Conta, EventoId, DateTimeOffset.UtcNow, default)).Valor!;
        await servico.SalvarAsync(Conta, EventoId, new SalvarLinkCasal(true), default);

        var segundo = (await servico.GerarAsync(Conta, EventoId, DateTimeOffset.UtcNow, default)).Valor!;

        Assert.NotEqual(primeiro.Token, segundo.Token);
        Assert.True(segundo.FinanceiroLiberado);
        Assert.Equal(Codigos.Indisponivel, (await servico.LerCasalAsync(primeiro.Token!, default)).Falha!.Codigo);
        Assert.Equal(segundo.Token, (await servico.ObterAsync(Conta, EventoId, default)).Valor!.Token);
    }

    [Fact]
    public async Task Desativar_apaga_o_link()
    {
        var (servico, _) = Criar();
        var link = (await servico.GerarAsync(Conta, EventoId, DateTimeOffset.UtcNow, default)).Valor!;

        var resultado = await servico.DesativarAsync(Conta, EventoId, default);

        Assert.False(resultado.Valor!.Ativo);
        Assert.Equal(Codigos.Indisponivel, (await servico.LerCasalAsync(link.Token!, default)).Falha!.Codigo);
    }

    [Fact]
    public async Task Outra_conta_nao_gerencia_o_link()
    {
        var (servico, _) = Criar();

        Assert.Equal(Codigos.Indisponivel, (await servico.GerarAsync("outra", EventoId, DateTimeOffset.UtcNow, default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.ObterAsync("outra", EventoId, default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.SalvarAsync("outra", EventoId, new SalvarLinkCasal(true), default)).Falha!.Codigo);
    }

    [Fact]
    public async Task Financeiro_fechado_mostra_so_o_evento_e_recusa_as_acoes()
    {
        var (servico, _) = Criar();
        var token = (await servico.GerarAsync(Conta, EventoId, DateTimeOffset.UtcNow, default)).Valor!.Token!;

        var leitura = await servico.LerCasalAsync(token, default);
        var acao = await servico.DefinirPagoAsync(token, Guid.NewGuid(), true, new DateOnly(2026, 11, 21), default);
        var arquivo = await servico.AbrirArquivoAsync(token, Guid.NewGuid(), default);

        Assert.True(leitura.Ok);
        Assert.Equal("Casamento", leitura.Valor!.Evento);
        Assert.False(leitura.Valor.FinanceiroLiberado);
        Assert.Null(leitura.Valor.Financeiro);
        Assert.Equal(Codigos.Proibido, acao.Falha!.Codigo);
        Assert.Equal(Codigos.Proibido, arquivo.Falha!.Codigo);
    }

    [Fact]
    public async Task Link_desconhecido_ou_vazio_e_indisponivel()
    {
        var (servico, _) = Criar();

        Assert.Equal(Codigos.Indisponivel, (await servico.LerCasalAsync("nao-existe", default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.LerCasalAsync("", default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.DefinirPagoAsync("nao-existe", Guid.NewGuid(), true, new DateOnly(2026, 11, 21), default)).Falha!.Codigo);
    }

    private sealed class DadosFalsos : IDadosLinkCasal
    {
        private readonly List<LinkCasal> links = [];

        public Task<EventoDoLink?> ObterEventoAsync(string contaId, Guid eventoId, CancellationToken ct) =>
            Task.FromResult<EventoDoLink?>(contaId == Conta && eventoId == EventoId ? new EventoDoLink(EventoId, Conta, "Casamento", null) : null);

        public Task<LinkCasal?> ObterPorEventoAsync(Guid eventoId, CancellationToken ct) =>
            Task.FromResult(links.FirstOrDefault(link => link.EventoId == eventoId));

        public Task<LinkCasal?> ObterPorTokenAsync(string token, CancellationToken ct) =>
            Task.FromResult(links.FirstOrDefault(link => link.Token == token));

        public Task InserirAsync(LinkCasal link, CancellationToken ct)
        {
            links.Add(link);
            return Task.CompletedTask;
        }

        public Task RemoverAsync(LinkCasal link, CancellationToken ct)
        {
            links.Remove(link);
            return Task.CompletedTask;
        }

        public Task SalvarAsync(CancellationToken ct) => Task.CompletedTask;
    }
}
