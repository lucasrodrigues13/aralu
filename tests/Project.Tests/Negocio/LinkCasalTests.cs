using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Convidados;
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

    private static async Task<(LinkCasalServico Servico, DadosFalsos Dados, string Token)> CriarComConvidadosAsync(bool liberado = true)
    {
        var (servico, dados) = Criar();
        var token = (await servico.GerarAsync(Conta, EventoId, DateTimeOffset.UtcNow, default)).Valor!.Token!;
        if (liberado)
        {
            await servico.SalvarAsync(Conta, EventoId, new SalvarLinkCasal(false, true), default);
        }

        return (servico, dados, token);
    }

    private static ConviteCasalPedido Pedido(string nome = "Família Souza", string? telefone = "11999990000", string? email = "souza@exemplo.com", params ConvidadoCasalPedido[] convidados) =>
        new(nome, "+55", telefone, email, convidados.Length > 0 ? convidados : [new ConvidadoCasalPedido(null, "Maria Souza"), new ConvidadoCasalPedido(null, "João Souza")]);

    [Fact]
    public async Task Convidados_nascem_fechados_e_a_marcacao_liga_e_desliga_sem_mexer_no_financeiro()
    {
        var (servico, _, token) = await CriarComConvidadosAsync(liberado: false);

        Assert.False((await servico.ObterAsync(Conta, EventoId, default)).Valor!.ConvidadosLiberado);
        Assert.Equal(Codigos.Proibido, (await servico.CriarConviteAsync(token, Pedido(), default)).Falha!.Codigo);

        var ligado = (await servico.SalvarAsync(Conta, EventoId, new SalvarLinkCasal(false, true), default)).Valor!;
        Assert.True(ligado.ConvidadosLiberado);
        Assert.False(ligado.FinanceiroLiberado);

        // Sem informar a marcação de convidados, ela fica como está.
        Assert.True((await servico.SalvarAsync(Conta, EventoId, new SalvarLinkCasal(false), default)).Valor!.ConvidadosLiberado);
    }

    [Fact]
    public async Task Casal_cria_convite_com_telefone_no_primeiro_convidado_como_principal()
    {
        var (servico, dados, token) = await CriarComConvidadosAsync();

        var resultado = await servico.CriarConviteAsync(token, Pedido(), default);

        Assert.True(resultado.Ok);
        var convite = Assert.Single(resultado.Valor!.Convites!);
        Assert.Equal("Família Souza", convite.Nome);
        Assert.Equal("11999990000", convite.Telefone);
        Assert.Equal("souza@exemplo.com", convite.Email);
        Assert.Equal(["Maria Souza", "João Souza"], convite.Convidados.Select(item => item.Nome));
        Assert.All(convite.Convidados, item => Assert.Equal("Pendente", item.Situacao));
        var gravado = Assert.Single(dados.Convites);
        Assert.Equal(gravado.Convidados[0].Id, gravado.PrincipalId);
        Assert.Equal(EventoId, gravado.EventoId);
        Assert.Equal(Conta, gravado.ContaId);
        Assert.False(string.IsNullOrWhiteSpace(gravado.Token));
    }

    [Fact]
    public async Task Convite_sem_telefone_fica_sem_principal()
    {
        var (servico, dados, token) = await CriarComConvidadosAsync();

        Assert.True((await servico.CriarConviteAsync(token, Pedido(telefone: null), default)).Ok);

        Assert.Null(dados.Convites.Single().PrincipalId);
    }

    [Fact]
    public async Task Convite_invalido_e_recusado()
    {
        var (servico, dados, token) = await CriarComConvidadosAsync();

        Assert.Equal(Codigos.Validacao, (await servico.CriarConviteAsync(token, Pedido(nome: " "), default)).Falha!.Codigo);
        Assert.Equal(Codigos.Validacao, (await servico.CriarConviteAsync(token, new ConviteCasalPedido("Família", null, null, null, []), default)).Falha!.Codigo);
        Assert.Equal(Codigos.Validacao, (await servico.CriarConviteAsync(token, Pedido(convidados: new ConvidadoCasalPedido(null, " ")), default)).Falha!.Codigo);
        Assert.Equal(Codigos.Validacao, (await servico.CriarConviteAsync(token, Pedido(email: "sem-arroba"), default)).Falha!.Codigo);
        Assert.Empty(dados.Convites);
    }

    [Fact]
    public async Task Edicao_renomeia_inclui_e_remove_convidados_sem_mexer_na_situacao_de_quem_fica()
    {
        var (servico, dados, token) = await CriarComConvidadosAsync();
        await servico.CriarConviteAsync(token, Pedido(), default);
        var convite = dados.Convites.Single();
        var maria = convite.Convidados[0];
        var joao = convite.Convidados[1];
        maria.Situacao = SituacaoConvidado.Confirmado;
        maria.Mesa = "3";

        var resultado = await servico.AtualizarConviteAsync(
            token,
            convite.Id,
            Pedido("Souza e família", "11988887777", null, new ConvidadoCasalPedido(maria.Id, "Maria S. Souza"), new ConvidadoCasalPedido(null, "Ana Souza")),
            default);

        Assert.True(resultado.Ok);
        var lido = resultado.Valor!.Convites!.Single();
        Assert.Equal("Souza e família", lido.Nome);
        Assert.Equal("11988887777", lido.Telefone);
        Assert.Null(lido.Email);
        Assert.Equal(["Maria S. Souza", "Ana Souza"], lido.Convidados.Select(item => item.Nome));
        Assert.Equal(SituacaoConvidado.Confirmado, maria.Situacao);
        Assert.Equal("3", maria.Mesa);
        Assert.DoesNotContain(joao, convite.Convidados);
        Assert.Contains(joao, dados.ConvidadosRemovidos);
        Assert.Equal(maria.Id, convite.PrincipalId);
    }

    [Fact]
    public async Task Remover_o_principal_passa_o_telefone_para_quem_ficou()
    {
        var (servico, dados, token) = await CriarComConvidadosAsync();
        await servico.CriarConviteAsync(token, Pedido(), default);
        var convite = dados.Convites.Single();
        var joao = convite.Convidados[1];

        var resultado = await servico.AtualizarConviteAsync(token, convite.Id, Pedido(convidados: new ConvidadoCasalPedido(joao.Id, "João Souza")), default);

        Assert.True(resultado.Ok);
        Assert.Equal(joao.Id, convite.PrincipalId);
        Assert.Equal("11999990000", joao.Celular);
    }

    [Fact]
    public async Task Convite_de_outro_evento_ou_convidado_alheio_e_indisponivel()
    {
        var (servico, dados, token) = await CriarComConvidadosAsync();
        await servico.CriarConviteAsync(token, Pedido(), default);
        var convite = dados.Convites.Single();
        var alheio = new Convite { Id = Guid.NewGuid(), EventoId = Guid.NewGuid(), ContaId = Conta, Nome = "De outro evento" };
        dados.Convites.Add(alheio);

        Assert.Equal(Codigos.Indisponivel, (await servico.AtualizarConviteAsync(token, Guid.NewGuid(), Pedido(), default)).Falha!.Codigo);
        Assert.Equal(
            Codigos.Indisponivel,
            (await servico.AtualizarConviteAsync(token, convite.Id, Pedido(convidados: new ConvidadoCasalPedido(Guid.NewGuid(), "Outro")), default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.AtualizarConviteAsync(token, alheio.Id, Pedido(), default)).Falha!.Codigo);
    }

    [Fact]
    public async Task Evento_fora_de_andamento_recusa_o_cadastro()
    {
        var (servico, dados, token) = await CriarComConvidadosAsync();
        dados.EmAndamento = false;

        Assert.Equal(Codigos.Validacao, (await servico.CriarConviteAsync(token, Pedido(), default)).Falha!.Codigo);
    }

    [Fact]
    public async Task Leitura_so_traz_os_convites_com_a_marcacao_ligada()
    {
        var (servico, dados, token) = await CriarComConvidadosAsync(liberado: false);
        dados.Convites.Add(new Convite { Id = Guid.NewGuid(), EventoId = EventoId, ContaId = Conta, Nome = "Da organizadora" });

        Assert.Null((await servico.LerCasalAsync(token, default)).Valor!.Convites);

        await servico.SalvarAsync(Conta, EventoId, new SalvarLinkCasal(false, true), default);
        var leitura = (await servico.LerCasalAsync(token, default)).Valor!;
        Assert.True(leitura.ConvidadosLiberado);
        Assert.Equal("Da organizadora", Assert.Single(leitura.Convites!).Nome);
    }

    private sealed class DadosFalsos : IDadosLinkCasal
    {
        private readonly List<LinkCasal> links = [];

        public List<Convite> Convites { get; } = [];

        public List<Convidado> ConvidadosRemovidos { get; } = [];

        public bool EmAndamento { get; set; } = true;

        public Task<IReadOnlyList<Convite>> ListarConvitesAsync(Guid eventoId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<Convite>>(Convites.Where(item => item.EventoId == eventoId).ToList());

        public Task<Convite?> ObterConviteAsync(Guid eventoId, Guid conviteId, CancellationToken ct) =>
            Task.FromResult(Convites.FirstOrDefault(item => item.EventoId == eventoId && item.Id == conviteId));

        public Task InserirConviteAsync(Convite convite, CancellationToken ct)
        {
            Convites.Add(convite);
            return Task.CompletedTask;
        }

        public Task RemoverConvidadoAsync(Convidado convidado, CancellationToken ct)
        {
            ConvidadosRemovidos.Add(convidado);
            return Task.CompletedTask;
        }

        public Task<EventoDoLink?> ObterEventoAsync(string contaId, Guid eventoId, CancellationToken ct) =>
            Task.FromResult<EventoDoLink?>(contaId == Conta && eventoId == EventoId ? new EventoDoLink(EventoId, Conta, "Casamento", null, EmAndamento) : null);

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
