using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Eventos;

namespace Project.Infrastructure.Persistencia;

/// <summary>O que a página da equipe recebe antes do código. O e-mail vem só mascarado.</summary>
public sealed record AcessoEquipeLeitura(
    string? Empresa,
    string Evento,
    EmailDoBriefing Email,
    bool SessaoValida,
    int AguardarSegundos,
    bool CodigoEnviado = false,
    string? EnviadoPara = null);

public sealed record ConfirmarCodigoEquipe(string? Codigo);

public sealed record LocalEquipe(string Rotulo, string? Nome, string? Endereco);

/// <summary>Painel da pessoa depois do código: o evento e os itens que ela recebe.</summary>
public sealed record EquipePublicaLeitura(
    string? Empresa,
    string Evento,
    DateOnly? Data,
    TimeOnly? Hora,
    IReadOnlyList<LocalEquipe> Locais,
    string Nome,
    string? Funcao,
    bool Portaria,
    bool Roteiro,
    bool Cronograma,
    DateTimeOffset? ValidoAte);

/// <summary>Pessoa da equipe com a sessão conferida: o evento dela, para a portaria.</summary>
public sealed record PessoaAutorizada(Guid ContaId, Guid EventoId);

/// <summary>
/// Acesso da equipe do evento (SPEC-067): o link individual só abre com código enviado ao e-mail da pessoa.
/// Regras do código iguais às da SPEC-063 (<see cref="RegrasAcessoCliente"/>); a sessão dura até o link vencer.
/// </summary>
public sealed class EquipeAcessoServico(AppDbContext banco, IEnvioEmail email, RoteiroServico roteiros, CronogramaServico cronogramas)
{
    public const string Indisponivel = "Este link não está mais disponível. Fale com quem organizou o evento.";
    public const string SessaoVencida = "Para sua segurança, digite o código enviado ao seu e-mail.";
    public const string NaoLiberado = "Este item não foi liberado para você.";

    /// <summary>Código de erro que a API devolve como 401 (sessão ausente ou vencida).</summary>
    public const string CodigoSessao = "sessao";

    public async Task<Resultado<AcessoEquipeLeitura>> LerAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var pessoa = await AbertaAsync(token, agora, ct);
        if (pessoa is null)
        {
            return Resultado<AcessoEquipeLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        var codigos = await CodigosAsync(pessoa.Id, agora, ct);
        var pendente = codigos.Any(item => !item.Invalidado && item.UsadoEm is null && item.ExpiraEm > agora && item.Tentativas < RegrasAcessoCliente.TentativasMaximas);
        var (empresa, evento) = await CabecalhoAsync(pessoa, ct);
        return Resultado<AcessoEquipeLeitura>.Sucesso(new AcessoEquipeLeitura(
            empresa,
            evento?.Nome ?? "",
            new EmailDoBriefing(pessoa.Id, RegrasAcessoCliente.Mascarar(pessoa.Email)),
            await SessaoAsync(pessoa, sessao, agora, ct) is not null,
            Aguardar(codigos, agora),
            pendente));
    }

    public async Task<Resultado<AcessoEquipeLeitura>> PedirCodigoAsync(string token, DateTimeOffset agora, CancellationToken ct)
    {
        var pessoa = await AbertaAsync(token, agora, ct);
        if (pessoa is null)
        {
            return Resultado<AcessoEquipeLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        var codigos = await CodigosAsync(pessoa.Id, agora, ct);
        if (RegrasAcessoCliente.ProximoPedido(codigos.Select(item => item.CriadoEm), agora) is { } bloqueio)
        {
            var falta = bloqueio.Liberado - agora;
            return Resultado<AcessoEquipeLeitura>.Erro(
                Codigos.Validacao,
                bloqueio.Espera
                    ? $"Você pediu vários códigos. Aguarde {Math.Max(1, (int)Math.Ceiling(falta.TotalMinutes))} minutos para pedir outro."
                    : $"Aguarde {Math.Max(1, (int)Math.Ceiling(falta.TotalSeconds))} segundos para pedir outro código.");
        }

        foreach (var anterior in codigos)
        {
            anterior.Invalidado = true;
        }

        var codigo = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var novo = new CodigoAcessoEquipe
        {
            Id = Guid.NewGuid(),
            PessoaId = pessoa.Id,
            ContaId = pessoa.ContaId,
            CodigoHash = Hash(pessoa.Id, codigo),
            CriadoEm = agora,
            ExpiraEm = agora + RegrasAcessoCliente.ValidadeCodigo,
        };
        banco.CodigosAcessoEquipe.Add(novo);
        await banco.SaveChangesAsync(ct);

        var (empresa, evento) = await CabecalhoAsync(pessoa, ct);
        var nomeEvento = evento?.Nome ?? "do evento";
        var minutos = (int)RegrasAcessoCliente.ValidadeCodigo.TotalMinutes;
        await email.EnviarAsync(
            pessoa.Email,
            new EmailConteudo(
                $"Seu código para abrir o evento {nomeEvento}",
                $"Use o código {codigo} para abrir o evento {nomeEvento}.",
                "Seu código de acesso",
                [
                    string.IsNullOrWhiteSpace(empresa)
                        ? $"Use este código para abrir o evento {nomeEvento}:"
                        : $"Use este código para abrir o evento {nomeEvento}, de {empresa}:",
                    codigo,
                    $"O código vale {minutos} minutos.",
                ],
                Nota: "Se você não pediu este código, ignore este e-mail."),
            ct);

        return Resultado<AcessoEquipeLeitura>.Sucesso(new AcessoEquipeLeitura(
            empresa,
            evento?.Nome ?? "",
            new EmailDoBriefing(pessoa.Id, RegrasAcessoCliente.Mascarar(pessoa.Email)),
            false,
            Aguardar(codigos.Append(novo), agora),
            true,
            RegrasAcessoCliente.Mascarar(pessoa.Email)));
    }

    /// <summary>Confere o código e abre a sessão até o link vencer. Devolve o token da sessão (vai só no cookie).</summary>
    public async Task<Resultado<SessaoAberta>> ConfirmarAsync(string token, ConfirmarCodigoEquipe pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var pessoa = await AbertaAsync(token, agora, ct);
        if (pessoa is null)
        {
            return Resultado<SessaoAberta>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        var codigos = await CodigosAsync(pessoa.Id, agora, ct);
        var atual = codigos.Where(item => !item.Invalidado && item.UsadoEm is null).MaxBy(item => item.CriadoEm);
        if (atual is null || agora >= atual.ExpiraEm)
        {
            return Resultado<SessaoAberta>.Erro(Codigos.Validacao, AcessoLinkClienteServico.Expirado);
        }

        if (atual.Tentativas >= RegrasAcessoCliente.TentativasMaximas)
        {
            return Resultado<SessaoAberta>.Erro(Codigos.Validacao, AcessoLinkClienteServico.Esgotado);
        }

        var digitado = new string((pedido.Codigo ?? "").Where(char.IsDigit).ToArray());
        if (!CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Hash(pessoa.Id, digitado)), Encoding.ASCII.GetBytes(atual.CodigoHash)))
        {
            atual.Tentativas++;
            await banco.SaveChangesAsync(ct);
            var restam = RegrasAcessoCliente.TentativasMaximas - atual.Tentativas;
            return Resultado<SessaoAberta>.Erro(
                Codigos.Validacao,
                restam > 0 ? string.Format(AcessoLinkClienteServico.Incorreto, restam) : AcessoLinkClienteServico.Esgotado);
        }

        atual.UsadoEm = agora;
        pessoa.UltimoAcessoEm = agora;
        var sessaoToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        var sessao = new SessaoEquipe
        {
            Id = Guid.NewGuid(),
            PessoaId = pessoa.Id,
            ContaId = pessoa.ContaId,
            TokenHash = Hash(pessoa.Id, sessaoToken),
            CriadaEm = agora,
            ExpiraEm = pessoa.ValidoAte!.Value,
        };
        banco.SessoesEquipe.Add(sessao);
        await banco.SaveChangesAsync(ct);
        return Resultado<SessaoAberta>.Sucesso(new SessaoAberta(sessaoToken, sessao.ExpiraEm));
    }

    public async Task<Resultado<EquipePublicaLeitura>> ObterAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var (pessoa, falha) = await ComSessaoAsync(token, sessao, agora, ct);
        if (pessoa is null)
        {
            return Resultado<EquipePublicaLeitura>.Erro(falha!.Codigo, falha.Mensagem);
        }

        var (empresa, evento) = await CabecalhoAsync(pessoa, ct);
        var locais = new List<LocalEquipe>();
        if (evento is not null)
        {
            AdicionarLocal(locais, "Cerimônia", evento.Cerimonia);
            AdicionarLocal(locais, "Recepção", evento.Recepcao);
        }

        return Resultado<EquipePublicaLeitura>.Sucesso(new EquipePublicaLeitura(
            empresa,
            evento?.Nome ?? "",
            evento?.Data,
            evento?.Hora,
            locais,
            pessoa.Nome,
            pessoa.Funcao,
            pessoa.RecebePortaria,
            pessoa.RecebeRoteiro && evento?.RoteiroId is not null,
            pessoa.RecebeCronograma && evento?.CronogramaId is not null,
            pessoa.ValidoAte));
    }

    public async Task<Resultado<RoteiroLeitura>> RoteiroAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var (pessoa, falha) = await ComSessaoAsync(token, sessao, agora, ct);
        if (pessoa is null)
        {
            return Resultado<RoteiroLeitura>.Erro(falha!.Codigo, falha.Mensagem);
        }

        var id = await banco.Eventos.IgnoreQueryFilters().Where(item => item.Id == pessoa.EventoId).Select(item => item.RoteiroId).FirstOrDefaultAsync(ct);
        return !pessoa.RecebeRoteiro || id is null
            ? Resultado<RoteiroLeitura>.Erro(Codigos.Indisponivel, NaoLiberado)
            : await roteiros.ObterAsync(pessoa.ContaId, id.Value, ct);
    }

    public async Task<Resultado<CronogramaLeitura>> CronogramaAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var (pessoa, falha) = await ComSessaoAsync(token, sessao, agora, ct);
        if (pessoa is null)
        {
            return Resultado<CronogramaLeitura>.Erro(falha!.Codigo, falha.Mensagem);
        }

        var id = await banco.Eventos.IgnoreQueryFilters().Where(item => item.Id == pessoa.EventoId).Select(item => item.CronogramaId).FirstOrDefaultAsync(ct);
        return !pessoa.RecebeCronograma || id is null
            ? Resultado<CronogramaLeitura>.Erro(Codigos.Indisponivel, NaoLiberado)
            : await cronogramas.ObterAsync(pessoa.ContaId, id.Value, ct);
    }

    /// <summary>Confere a sessão e a liberação da portaria. Devolve o evento para o <see cref="PortariaServico"/>.</summary>
    public async Task<Resultado<PessoaAutorizada>> AutorizarPortariaAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var (pessoa, falha) = await ComSessaoAsync(token, sessao, agora, ct);
        if (pessoa is null)
        {
            return Resultado<PessoaAutorizada>.Erro(falha!.Codigo, falha.Mensagem);
        }

        return pessoa.RecebePortaria
            ? Resultado<PessoaAutorizada>.Sucesso(new PessoaAutorizada(pessoa.ContaId, pessoa.EventoId))
            : Resultado<PessoaAutorizada>.Erro(Codigos.Indisponivel, NaoLiberado);
    }

    private static void AdicionarLocal(List<LocalEquipe> locais, string rotulo, LocalEvento local)
    {
        var partes = new[] { local.Endereco, local.Numero, local.Bairro, local.Cidade, local.Estado }
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .ToArray();
        if (!string.IsNullOrWhiteSpace(local.Nome) || partes.Length > 0)
        {
            locais.Add(new LocalEquipe(rotulo, local.Nome, partes.Length > 0 ? string.Join(", ", partes) : null));
        }
    }

    private async Task<PessoaEquipeEvento?> AbertaAsync(string token, DateTimeOffset agora, CancellationToken ct)
    {
        var pessoa = string.IsNullOrWhiteSpace(token)
            ? null
            : await banco.PessoasEquipeEvento.IgnoreQueryFilters().FirstOrDefaultAsync(item => item.Token == token, ct);
        return pessoa is not null && pessoa.Aberto(agora) ? pessoa : null;
    }

    private async Task<(PessoaEquipeEvento? Pessoa, Falha? Falha)> ComSessaoAsync(string token, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        var pessoa = await AbertaAsync(token, agora, ct);
        if (pessoa is null)
        {
            return (null, new Falha(Codigos.Indisponivel, Indisponivel));
        }

        return await SessaoAsync(pessoa, sessao, agora, ct) is null
            ? (null, new Falha(CodigoSessao, SessaoVencida))
            : (pessoa, null);
    }

    private async Task<SessaoEquipe?> SessaoAsync(PessoaEquipeEvento pessoa, string? sessao, DateTimeOffset agora, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(sessao))
        {
            return null;
        }

        var hash = Hash(pessoa.Id, sessao);
        return await banco.SessoesEquipe.IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.PessoaId == pessoa.Id && item.TokenHash == hash && item.ExpiraEm > agora, ct);
    }

    private async Task<List<CodigoAcessoEquipe>> CodigosAsync(Guid pessoaId, DateTimeOffset agora, CancellationToken ct)
    {
        var desde = agora - TimeSpan.FromHours(1);
        return await banco.CodigosAcessoEquipe.IgnoreQueryFilters()
            .Where(item => item.PessoaId == pessoaId && item.CriadoEm >= desde)
            .ToListAsync(ct);
    }

    private async Task<(string? Empresa, Evento? Evento)> CabecalhoAsync(PessoaEquipeEvento pessoa, CancellationToken ct)
    {
        var evento = await banco.Eventos.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(item => item.Id == pessoa.EventoId, ct);
        var empresa = await banco.Perfis.IgnoreQueryFilters()
            .Where(item => item.ContaId == pessoa.ContaId)
            .Select(item => item.NomeEmpresa)
            .FirstOrDefaultAsync(ct);
        return (empresa, evento);
    }

    private static int Aguardar(IEnumerable<CodigoAcessoEquipe> codigos, DateTimeOffset agora) =>
        RegrasAcessoCliente.ProximoPedido(codigos.Select(item => item.CriadoEm), agora) is { } bloqueio
            ? Math.Max(1, (int)Math.Ceiling((bloqueio.Liberado - agora).TotalSeconds))
            : 0;

    private static string Hash(Guid pessoaId, string valor) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"equipe:{pessoaId:N}:{valor}")));
}
