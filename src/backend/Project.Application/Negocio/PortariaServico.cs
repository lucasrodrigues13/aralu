using System.Security.Cryptography;
using Project.Application.Comum;
using Project.Application.Convidados;
using Project.Domain.Convidados;
using Project.Domain.Eventos;

namespace Project.Application.Negocio;

/// <summary>Link da portaria como a organizadora vê (SPEC-058 §6.1). <paramref name="Token"/> é nulo quando não há link.</summary>
public sealed record LinkPortariaLeitura(bool Ativo, string? Token);

public sealed record ConvidadoPortaria(Guid Id, string Nome, string Situacao, bool Confirmado, DateTimeOffset? CompareceuEm);

public sealed record ConvitePortaria(Guid Id, string Nome, IReadOnlyList<ConvidadoPortaria> Convidados);

/// <summary>Tela da portaria: totais e a lista completa dos convites que têm ao menos um convidado confirmado (SPEC-058).</summary>
public sealed record PortariaLeitura(string Evento, DateOnly? Data, int Confirmados, int Compareceram, IReadOnlyList<ConvitePortaria> Convites);

/// <summary>Convidados do convite que a portaria marca como presentes; os confirmados fora da lista voltam a "não entrou".</summary>
public sealed record ComparecimentoPedido(IReadOnlyList<Guid>? Compareceram);

public interface IDadosPortaria
{
    Task<EventoDoLink?> ObterEventoAsync(string contaId, Guid eventoId, CancellationToken ct);

    Task<LinkPortaria?> ObterPorEventoAsync(Guid eventoId, CancellationToken ct);

    Task<LinkPortaria?> ObterPorTokenAsync(string token, CancellationToken ct);

    Task InserirAsync(LinkPortaria link, CancellationToken ct);

    Task RemoverAsync(LinkPortaria link, CancellationToken ct);

    Task<IReadOnlyList<Convite>> ListarConvitesAsync(Guid eventoId, CancellationToken ct);

    Task<Convite?> ObterConviteAsync(Guid eventoId, Guid conviteId, CancellationToken ct);

    Task<Convite?> ObterConvitePorTokenAsync(string token, CancellationToken ct);

    /// <summary>Entradas da lista de presença do evento, para leitura e alteração.</summary>
    Task<IReadOnlyList<PresencaEvento>> ListarPresencasAsync(Guid eventoId, CancellationToken ct);

    Task SalvarAsync(CancellationToken ct);
}

/// <summary>
/// Portaria do evento (SPEC-058): a organizadora gerencia o link e o QR de cada convite; a equipe, sem login, confere a lista
/// e marca quem compareceu. O link só alcança o evento dele e só a portaria.
/// </summary>
public sealed class PortariaServico(IDadosPortaria dados, IGeradorQr qr)
{
    /// <summary>O que o QR de entrada carrega: o código do convite com este prefixo.</summary>
    public const string PrefixoQr = "entrada:";

    private const string LinkInvalido = "Link inválido.";
    private const string EventoEncerrado = "O evento não está em andamento.";

    // ---- Organizadora ----

    public async Task<Resultado<LinkPortariaLeitura>> ObterAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        if (await dados.ObterEventoAsync(contaId, eventoId, ct) is null)
        {
            return Resultado<LinkPortariaLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<LinkPortariaLeitura>.Sucesso(Ler(await dados.ObterPorEventoAsync(eventoId, ct)));
    }

    /// <summary>Gera o link da portaria ou, se já existe, troca o código (o endereço antigo deixa de valer).</summary>
    public async Task<Resultado<LinkPortariaLeitura>> GerarAsync(string contaId, Guid eventoId, DateTimeOffset agora, CancellationToken ct)
    {
        if (await dados.ObterEventoAsync(contaId, eventoId, ct) is null)
        {
            return Resultado<LinkPortariaLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var link = await dados.ObterPorEventoAsync(eventoId, ct);
        if (link is null)
        {
            link = new LinkPortaria { Id = Guid.NewGuid(), EventoId = eventoId, ContaId = contaId, Token = NovoToken(), CriadoEm = agora };
            await dados.InserirAsync(link, ct);
        }
        else
        {
            link.Token = NovoToken();
        }

        await dados.SalvarAsync(ct);
        return Resultado<LinkPortariaLeitura>.Sucesso(Ler(link));
    }

    public async Task<Resultado<LinkPortariaLeitura>> DesativarAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        if (await dados.ObterEventoAsync(contaId, eventoId, ct) is null)
        {
            return Resultado<LinkPortariaLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var link = await dados.ObterPorEventoAsync(eventoId, ct);
        if (link is not null)
        {
            await dados.RemoverAsync(link, ct);
            await dados.SalvarAsync(ct);
        }

        return Resultado<LinkPortariaLeitura>.Sucesso(Ler(null));
    }

    /// <summary>QR de entrada pela página de RSVP: quem tem o link do convite vê o QR depois de confirmar.</summary>
    public async Task<Resultado<byte[]>> QrPorTokenAsync(string token, CancellationToken ct)
    {
        var convite = string.IsNullOrWhiteSpace(token) ? null : await dados.ObterConvitePorTokenAsync(token, ct);
        if (convite is null || await dados.ObterEventoAsync(convite.ContaId, convite.EventoId, ct) is not { EmAndamento: true })
        {
            return Resultado<byte[]>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return GerarQr(convite);
    }

    private Resultado<byte[]> GerarQr(Convite? convite) =>
        convite is null || !convite.Convidados.Any(item => item.Situacao == SituacaoConvidado.Confirmado)
            ? Resultado<byte[]>.Erro(Codigos.Indisponivel, "Indisponível.")
            : Resultado<byte[]>.Sucesso(qr.Png(PrefixoQr + convite.Token));

    // ---- Portaria ----

    public async Task<Resultado<PortariaLeitura>> LerAsync(string token, CancellationToken ct)
    {
        var contexto = await ResolverAsync(token, exigirAndamento: false, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<PortariaLeitura>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        var convites = await dados.ListarConvitesAsync(contexto.Evento!.Id, ct);
        var presencas = (await dados.ListarPresencasAsync(contexto.Evento.Id, ct)).ToDictionary(item => item.ConvidadoId);
        var lista = convites
            .Where(convite => convite.Convidados.Any(item => item.Situacao == SituacaoConvidado.Confirmado))
            .OrderBy(convite => convite.Nome, StringComparer.CurrentCultureIgnoreCase)
            .Select(convite => LerConvite(convite, presencas))
            .ToArray();
        var confirmados = lista.SelectMany(item => item.Convidados).Where(item => item.Confirmado).ToArray();
        return Resultado<PortariaLeitura>.Sucesso(new PortariaLeitura(
            contexto.Evento.Nome,
            contexto.Evento.Data,
            confirmados.Length,
            confirmados.Count(item => item.CompareceuEm is not null),
            lista));
    }

    /// <summary>Abre o convite do QR lido (o texto do QR, com ou sem o prefixo). Convite de outro evento ou sem confirmados é indisponível.</summary>
    public async Task<Resultado<ConvitePortaria>> LerConviteDoQrAsync(string token, string? codigo, CancellationToken ct)
    {
        var contexto = await ResolverAsync(token, exigirAndamento: false, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<ConvitePortaria>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        var texto = codigo?.Trim() ?? "";
        if (texto.StartsWith(PrefixoQr, StringComparison.OrdinalIgnoreCase))
        {
            texto = texto[PrefixoQr.Length..];
        }

        var convite = texto.Length == 0 ? null : await dados.ObterConvitePorTokenAsync(texto, ct);
        if (convite is null || convite.EventoId != contexto.Evento!.Id || !convite.Convidados.Any(item => item.Situacao == SituacaoConvidado.Confirmado))
        {
            return Resultado<ConvitePortaria>.Erro(Codigos.Indisponivel, "QR code não reconhecido para este evento.");
        }

        return Resultado<ConvitePortaria>.Sucesso(await MontarConviteAsync(convite, ct));
    }

    public async Task<Resultado<ConvitePortaria>> LerConviteAsync(string token, Guid conviteId, CancellationToken ct)
    {
        var contexto = await ResolverAsync(token, exigirAndamento: false, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<ConvitePortaria>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        var convite = await dados.ObterConviteAsync(contexto.Evento!.Id, conviteId, ct);
        return convite is null
            ? Resultado<ConvitePortaria>.Erro(Codigos.Indisponivel, "Indisponível.")
            : Resultado<ConvitePortaria>.Sucesso(await MontarConviteAsync(convite, ct));
    }

    /// <summary>Marca quem do convite compareceu: os listados entram (mantendo a hora de quem já tinha entrado) e os outros confirmados ficam como não entrou.</summary>
    public async Task<Resultado<ConvitePortaria>> MarcarComparecimentoAsync(
        string token,
        Guid conviteId,
        ComparecimentoPedido pedido,
        DateTimeOffset agora,
        CancellationToken ct)
    {
        var contexto = await ResolverAsync(token, exigirAndamento: true, ct);
        if (contexto.Falha is not null)
        {
            return Resultado<ConvitePortaria>.Erro(contexto.Falha.Codigo, contexto.Falha.Mensagem);
        }

        var convite = await dados.ObterConviteAsync(contexto.Evento!.Id, conviteId, ct);
        if (convite is null)
        {
            return Resultado<ConvitePortaria>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var marcados = (pedido.Compareceram ?? []).Distinct().ToArray();
        if (marcados.Any(id => convite.Convidados.All(item => item.Id != id)))
        {
            return Resultado<ConvitePortaria>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var presencas = (await dados.ListarPresencasAsync(contexto.Evento.Id, ct)).Where(item => item.ConviteId == conviteId).ToArray();
        if (marcados.Any(id => presencas.All(item => item.ConvidadoId != id)))
        {
            return Resultado<ConvitePortaria>.Erro(Codigos.Validacao, "Só convidados confirmados podem ser marcados como presentes.");
        }

        foreach (var presenca in presencas)
        {
            if (marcados.Contains(presenca.ConvidadoId))
            {
                presenca.CompareceuEm ??= agora;
            }
            else
            {
                presenca.CompareceuEm = null;
            }
        }

        await dados.SalvarAsync(ct);
        return Resultado<ConvitePortaria>.Sucesso(await MontarConviteAsync(convite, ct));
    }

    private async Task<ConvitePortaria> MontarConviteAsync(Convite convite, CancellationToken ct)
    {
        var presencas = (await dados.ListarPresencasAsync(convite.EventoId, ct)).ToDictionary(item => item.ConvidadoId);
        return LerConvite(convite, presencas);
    }

    private static ConvitePortaria LerConvite(Convite convite, IReadOnlyDictionary<Guid, PresencaEvento> presencas) =>
        new(
            convite.Id,
            convite.Nome,
            convite.Convidados
                .OrderBy(item => item.Nome, StringComparer.CurrentCultureIgnoreCase)
                .Select(item => new ConvidadoPortaria(
                    item.Id,
                    item.Nome,
                    Rotulos.SituacaoTela(item.Situacao),
                    item.Situacao == SituacaoConvidado.Confirmado,
                    presencas.TryGetValue(item.Id, out var presenca) ? presenca.CompareceuEm : null))
                .ToArray());

    private sealed record Contexto(EventoDoLink? Evento, Falha? Falha);

    private async Task<Contexto> ResolverAsync(string token, bool exigirAndamento, CancellationToken ct)
    {
        var link = string.IsNullOrWhiteSpace(token) ? null : await dados.ObterPorTokenAsync(token, ct);
        var evento = link is null ? null : await dados.ObterEventoAsync(link.ContaId, link.EventoId, ct);
        if (link is null || evento is null)
        {
            return new Contexto(null, new Falha(Codigos.Indisponivel, LinkInvalido));
        }

        return exigirAndamento && !evento.EmAndamento
            ? new Contexto(evento, new Falha(Codigos.Validacao, EventoEncerrado))
            : new Contexto(evento, null);
    }

    private static LinkPortariaLeitura Ler(LinkPortaria? link) => new(link is not null, link?.Token);

    private static string NovoToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
}
