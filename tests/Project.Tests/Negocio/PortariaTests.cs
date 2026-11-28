using Project.Application.Comum;
using Project.Application.Convidados;
using Project.Application.Negocio;
using Project.Domain.Convidados;
using Project.Domain.Eventos;

namespace Project.Tests.Negocio;

/// <summary>Regras da portaria (SPEC-058): QR de entrada, lista completa e marcação de quem compareceu.</summary>
public class PortariaTests
{
    private static readonly Guid EventoId = Guid.NewGuid();
    private static readonly Guid Conta = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid OutraConta = Guid.Parse("99999999-9999-9999-9999-999999999999");
    private static readonly DateTimeOffset Agora = new(2026, 11, 21, 20, 0, 0, TimeSpan.Zero);

    private static (PortariaServico Servico, DadosFalsos Dados, string Token) CriarAsync()
    {
        var dados = new DadosFalsos();
        return (new PortariaServico(dados, new QrFalso()), dados, "");
    }

    private static Convite NovoConvite(DadosFalsos dados, string nome, params SituacaoConvidado[] situacoes)
    {
        var convite = new Convite { Id = Guid.NewGuid(), EventoId = EventoId, ContaId = Conta, Nome = nome, Token = Guid.NewGuid().ToString("N") };
        var indice = 0;
        foreach (var situacao in situacoes)
        {
            var convidado = new Convidado { Id = Guid.NewGuid(), ConviteId = convite.Id, Nome = $"{nome} {++indice}", Situacao = situacao };
            convite.Convidados.Add(convidado);
            if (situacao == SituacaoConvidado.Confirmado)
            {
                dados.Presencas.Add(new PresencaEvento { Id = Guid.NewGuid(), EventoId = EventoId, ConviteId = convite.Id, ConvidadoId = convidado.Id, ConfirmadoEm = Agora });
            }
        }

        dados.Convites.Add(convite);
        return convite;
    }

    [Fact]
    public async Task Evento_de_outra_conta_e_indisponivel()
    {
        var (servico, _, _) = CriarAsync();

        Assert.Equal(Codigos.Indisponivel, (await servico.LerAsync(OutraConta, EventoId, default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.MarcarComparecimentoAsync(OutraConta, EventoId, Guid.NewGuid(), new ComparecimentoPedido([]), Agora, default)).Falha!.Codigo);
    }

    [Fact]
    public async Task Lista_traz_so_convites_com_confirmados_e_os_totais()
    {
        var (servico, dados, token) = CriarAsync();
        NovoConvite(dados, "Silva", SituacaoConvidado.Confirmado, SituacaoConvidado.Confirmado, SituacaoConvidado.NaoComparecera);
        NovoConvite(dados, "Souza", SituacaoConvidado.Pendente);
        var presenca = dados.Presencas[0];
        presenca.CompareceuEm = Agora;

        var lista = (await servico.LerAsync(Conta, EventoId, default)).Valor!;

        Assert.Equal("Casamento", lista.Evento);
        var convite = Assert.Single(lista.Convites);
        Assert.Equal("Silva", convite.Nome);
        Assert.Equal(3, convite.Convidados.Count);
        Assert.Equal(2, lista.Confirmados);
        Assert.Equal(1, lista.Compareceram);
    }

    [Fact]
    public async Task Qr_do_convite_abre_o_convite_com_e_sem_prefixo()
    {
        var (servico, dados, token) = CriarAsync();
        var convite = NovoConvite(dados, "Silva", SituacaoConvidado.Confirmado);

        var comPrefixo = await servico.LerConviteDoQrAsync(Conta, EventoId, PortariaServico.PrefixoQr + convite.Token, default);
        var semPrefixo = await servico.LerConviteDoQrAsync(Conta, EventoId, convite.Token, default);

        Assert.Equal(convite.Id, comPrefixo.Valor!.Id);
        Assert.Equal(convite.Id, semPrefixo.Valor!.Id);
    }

    [Fact]
    public async Task Qr_de_outro_evento_ou_sem_confirmados_ou_invalido_e_indisponivel()
    {
        var (servico, dados, token) = CriarAsync();
        var outroEvento = NovoConvite(dados, "Outro", SituacaoConvidado.Confirmado);
        outroEvento.EventoId = Guid.NewGuid();
        var semConfirmado = NovoConvite(dados, "Pendente", SituacaoConvidado.Pendente);

        Assert.Equal(Codigos.Indisponivel, (await servico.LerConviteDoQrAsync(Conta, EventoId, outroEvento.Token, default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.LerConviteDoQrAsync(Conta, EventoId, semConfirmado.Token, default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.LerConviteDoQrAsync(Conta, EventoId, "lixo", default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.LerConviteDoQrAsync(Conta, EventoId, null, default)).Falha!.Codigo);
    }

    [Fact]
    public async Task Marcar_registra_quem_entrou_e_so_desfaz_quem_foi_pedido()
    {
        var (servico, dados, token) = CriarAsync();
        var convite = NovoConvite(dados, "Silva", SituacaoConvidado.Confirmado, SituacaoConvidado.Confirmado, SituacaoConvidado.Confirmado);
        var esposa = convite.Convidados[1];
        var filho = convite.Convidados[2];

        var primeira = (await servico.MarcarComparecimentoAsync(Conta, EventoId, convite.Id, new ComparecimentoPedido([esposa.Id, filho.Id]), Agora, default)).Valor!;

        Assert.Equal([false, true, true], primeira.Convidados.OrderBy(item => item.Nome).Select(item => item.CompareceuEm is not null));

        var depois = Agora.AddMinutes(10);
        var marido = convite.Convidados[0];
        var segunda = (await servico.MarcarComparecimentoAsync(Conta, EventoId, convite.Id, new ComparecimentoPedido([marido.Id, esposa.Id]), depois, default)).Valor!;

        // Quem ficou fora das listas não muda: o filho, marcado por outra pessoa da portaria, continua presente.
        Assert.Equal(depois, segunda.Convidados.First(item => item.Id == marido.Id).CompareceuEm);
        Assert.Equal(Agora, segunda.Convidados.First(item => item.Id == esposa.Id).CompareceuEm);
        Assert.Equal(Agora, segunda.Convidados.First(item => item.Id == filho.Id).CompareceuEm);

        var terceira = (await servico.MarcarComparecimentoAsync(Conta, EventoId, convite.Id, new ComparecimentoPedido([], [filho.Id]), depois, default)).Valor!;

        Assert.Null(terceira.Convidados.First(item => item.Id == filho.Id).CompareceuEm);
        Assert.Equal(Agora, terceira.Convidados.First(item => item.Id == esposa.Id).CompareceuEm);

        var contraditorio = await servico.MarcarComparecimentoAsync(Conta, EventoId, convite.Id, new ComparecimentoPedido([filho.Id], [filho.Id]), depois, default);
        Assert.Equal(Codigos.Validacao, contraditorio.Falha!.Codigo);
    }

    [Fact]
    public async Task Marcar_recusa_convidado_nao_confirmado_ou_de_outro_convite()
    {
        var (servico, dados, token) = CriarAsync();
        var convite = NovoConvite(dados, "Silva", SituacaoConvidado.Confirmado, SituacaoConvidado.NaoComparecera);
        var outro = NovoConvite(dados, "Souza", SituacaoConvidado.Confirmado);

        var naoConfirmado = await servico.MarcarComparecimentoAsync(Conta, EventoId, convite.Id, new ComparecimentoPedido([convite.Convidados[1].Id]), Agora, default);
        var deOutro = await servico.MarcarComparecimentoAsync(Conta, EventoId, convite.Id, new ComparecimentoPedido([outro.Convidados[0].Id]), Agora, default);

        Assert.Equal(Codigos.Validacao, naoConfirmado.Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, deOutro.Falha!.Codigo);
        Assert.All(dados.Presencas, item => Assert.Null(item.CompareceuEm));
    }

    [Fact]
    public async Task Marcar_com_evento_fora_de_andamento_e_recusado_mas_a_lista_abre()
    {
        var (servico, dados, token) = CriarAsync();
        var convite = NovoConvite(dados, "Silva", SituacaoConvidado.Confirmado);
        dados.EmAndamento = false;

        var marcar = await servico.MarcarComparecimentoAsync(Conta, EventoId, convite.Id, new ComparecimentoPedido([convite.Convidados[0].Id]), Agora, default);

        Assert.Equal(Codigos.Validacao, marcar.Falha!.Codigo);
        Assert.True((await servico.LerAsync(Conta, EventoId, default)).Ok);
    }

    [Fact]
    public async Task Convite_de_outro_evento_nao_abre_pelo_link()
    {
        var (servico, dados, token) = CriarAsync();
        var convite = NovoConvite(dados, "Silva", SituacaoConvidado.Confirmado);
        convite.EventoId = Guid.NewGuid();

        Assert.Equal(Codigos.Indisponivel, (await servico.LerConviteAsync(Conta, EventoId, convite.Id, default)).Falha!.Codigo);
        Assert.Equal(Codigos.Indisponivel, (await servico.MarcarComparecimentoAsync(Conta, EventoId, convite.Id, new ComparecimentoPedido([]), Agora, default)).Falha!.Codigo);
    }

    [Fact]
    public async Task Qr_pelo_link_do_convite_so_existe_com_confirmado_e_evento_em_andamento()
    {
        var (servico, dados, _) = CriarAsync();
        var confirmado = NovoConvite(dados, "Silva", SituacaoConvidado.Confirmado);
        var pendente = NovoConvite(dados, "Souza", SituacaoConvidado.Pendente);

        var qr = await servico.QrPorTokenAsync(confirmado.Token, default);

        Assert.True(qr.Ok);
        Assert.Equal(System.Text.Encoding.UTF8.GetBytes(PortariaServico.PrefixoQr + confirmado.Token), qr.Valor);
        Assert.Equal(Codigos.Indisponivel, (await servico.QrPorTokenAsync(pendente.Token, default)).Falha!.Codigo);

        dados.EmAndamento = false;
        Assert.Equal(Codigos.Indisponivel, (await servico.QrPorTokenAsync(confirmado.Token, default)).Falha!.Codigo);
    }

    private sealed class QrFalso : IGeradorQr
    {
        public byte[] Png(string texto) => System.Text.Encoding.UTF8.GetBytes(texto);
    }

    private sealed class DadosFalsos : IDadosPortaria
    {
        public List<Convite> Convites { get; } = [];

        public List<PresencaEvento> Presencas { get; } = [];

        public bool EmAndamento { get; set; } = true;

        public Task<EventoDoLink?> ObterEventoAsync(Guid contaId, Guid eventoId, CancellationToken ct) =>
            Task.FromResult<EventoDoLink?>(contaId == Conta && eventoId == EventoId ? new EventoDoLink(EventoId, Conta, "Casamento", null, EmAndamento) : null);

        public Task<IReadOnlyList<Convite>> ListarConvitesAsync(Guid eventoId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<Convite>>(Convites.Where(item => item.EventoId == eventoId).ToList());

        public Task<Convite?> ObterConviteAsync(Guid eventoId, Guid conviteId, CancellationToken ct) =>
            Task.FromResult(Convites.FirstOrDefault(item => item.EventoId == eventoId && item.Id == conviteId));

        public Task<Convite?> ObterConvitePorTokenAsync(string token, CancellationToken ct) =>
            Task.FromResult(Convites.FirstOrDefault(item => item.Token == token));

        public Task<IReadOnlyList<PresencaEvento>> ListarPresencasAsync(Guid eventoId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<PresencaEvento>>(Presencas.Where(item => item.EventoId == eventoId).ToList());

        public Task SalvarAsync(CancellationToken ct) => Task.CompletedTask;
    }
}
