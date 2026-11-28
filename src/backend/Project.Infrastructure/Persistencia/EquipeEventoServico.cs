using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Project.Application.Comum;
using Project.Domain.Comum;
using Project.Domain.Eventos;

namespace Project.Infrastructure.Persistencia;

/// <summary>Pessoa da equipe como a organizadora vê. <c>Situacao</c>: NaoEnviado, Enviado, Acessou, Vencido ou Encerrado.</summary>
public sealed record PessoaEquipeLeitura(
    Guid Id,
    string Nome,
    string Email,
    string? Telefone,
    string? Funcao,
    bool RecebePortaria,
    bool RecebeRoteiro,
    bool RecebeCronograma,
    string Token,
    string Situacao,
    DateTimeOffset? EnviadoEm,
    DateTimeOffset? ValidoAte,
    DateTimeOffset? UltimoAcessoEm);

public sealed record ModeloEscolhido(Guid Id, string Nome);

/// <summary>Equipe do evento: o roteiro e o cronograma vinculados e as pessoas.</summary>
public sealed record EquipeEventoLeitura(
    ModeloEscolhido? Roteiro,
    ModeloEscolhido? Cronograma,
    IReadOnlyList<PessoaEquipeLeitura> Pessoas);

public sealed record SalvarPessoaEquipe(
    string? Nome,
    string? Email,
    string? Telefone,
    string? Funcao,
    bool RecebePortaria,
    bool RecebeRoteiro,
    bool RecebeCronograma);

public sealed record ModelosDaEquipe(Guid? RoteiroId, Guid? CronogramaId);

/// <summary>
/// Equipe do evento (SPEC-067), só para a Organizer: cadastra quem trabalha no dia, escolhe o que cada um recebe,
/// libera (envio pelo WhatsApp ou cópia do link) e encerra o acesso. O link abre só com código no e-mail da pessoa.
/// </summary>
public sealed class EquipeEventoServico(AppDbContext banco)
{
    private const string Indisponivel = "Indisponível.";

    public async Task<Resultado<EquipeEventoLeitura>> ObterAsync(Guid contaId, Guid eventoId, DateTimeOffset agora, CancellationToken ct)
    {
        var evento = await EventoAsync(contaId, eventoId, ct);
        return evento is null
            ? Resultado<EquipeEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel)
            : Resultado<EquipeEventoLeitura>.Sucesso(await LerAsync(evento, agora, ct));
    }

    /// <summary>Escolhe o roteiro e o cronograma da biblioteca que a equipe vê. Nulo desvincula.</summary>
    public async Task<Resultado<EquipeEventoLeitura>> DefinirModelosAsync(Guid contaId, Guid eventoId, ModelosDaEquipe pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var evento = await EventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<EquipeEventoLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        if (pedido.RoteiroId is Guid roteiro && !await banco.ModelosRoteiro.AnyAsync(item => item.Id == roteiro && item.ContaId == contaId, ct))
        {
            return Resultado<EquipeEventoLeitura>.Erro(Codigos.Validacao, "Roteiro não encontrado.");
        }

        if (pedido.CronogramaId is Guid cronograma && !await banco.ModelosCronograma.AnyAsync(item => item.Id == cronograma && item.ContaId == contaId, ct))
        {
            return Resultado<EquipeEventoLeitura>.Erro(Codigos.Validacao, "Cronograma não encontrado.");
        }

        evento.RoteiroId = pedido.RoteiroId;
        evento.CronogramaId = pedido.CronogramaId;
        await banco.SaveChangesAsync(ct);
        return Resultado<EquipeEventoLeitura>.Sucesso(await LerAsync(evento, agora, ct));
    }

    public async Task<Resultado<PessoaEquipeLeitura>> CriarAsync(Guid contaId, Guid eventoId, SalvarPessoaEquipe pedido, DateTimeOffset agora, CancellationToken ct)
    {
        if (await EventoAsync(contaId, eventoId, ct) is null)
        {
            return Resultado<PessoaEquipeLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        var pessoa = new PessoaEquipeEvento { Id = Guid.NewGuid(), ContaId = contaId, EventoId = eventoId, Token = NovoToken(), CriadoEm = agora };
        if (Aplicar(pessoa, pedido) is { } erro)
        {
            return Resultado<PessoaEquipeLeitura>.Erro(Codigos.Validacao, erro);
        }

        banco.PessoasEquipeEvento.Add(pessoa);
        await banco.SaveChangesAsync(ct);
        return Resultado<PessoaEquipeLeitura>.Sucesso(Ler(pessoa, agora));
    }

    public async Task<Resultado<PessoaEquipeLeitura>> AtualizarAsync(Guid contaId, Guid eventoId, Guid pessoaId, SalvarPessoaEquipe pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var pessoa = await PessoaAsync(contaId, eventoId, pessoaId, ct);
        if (pessoa is null)
        {
            return Resultado<PessoaEquipeLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        var emailAntes = pessoa.Email;
        if (Aplicar(pessoa, pedido) is { } erro)
        {
            return Resultado<PessoaEquipeLeitura>.Erro(Codigos.Validacao, erro);
        }

        // Trocar o e-mail derruba quem já tinha entrado com o código do e-mail antigo.
        if (!string.Equals(emailAntes, pessoa.Email, StringComparison.OrdinalIgnoreCase))
        {
            await DerrubarSessoesAsync(pessoa.Id, ct);
        }

        await banco.SaveChangesAsync(ct);
        return Resultado<PessoaEquipeLeitura>.Sucesso(Ler(pessoa, agora));
    }

    public async Task<Resultado<bool>> RemoverAsync(Guid contaId, Guid eventoId, Guid pessoaId, CancellationToken ct)
    {
        var pessoa = await PessoaAsync(contaId, eventoId, pessoaId, ct);
        if (pessoa is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        banco.PessoasEquipeEvento.Remove(pessoa);
        await banco.SaveChangesAsync(ct);
        return Resultado<bool>.Sucesso(true);
    }

    /// <summary>Libera o link (no envio pelo WhatsApp ou ao copiar): reabre se estava encerrado e renova a validade.</summary>
    public async Task<Resultado<PessoaEquipeLeitura>> LiberarAsync(Guid contaId, Guid eventoId, Guid pessoaId, DateTimeOffset agora, CancellationToken ct)
    {
        var evento = await EventoAsync(contaId, eventoId, ct);
        var pessoa = evento is null ? null : await PessoaAsync(contaId, eventoId, pessoaId, ct);
        if (evento is null || pessoa is null)
        {
            return Resultado<PessoaEquipeLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        pessoa.EnviadoEm = agora;
        pessoa.EncerradoEm = null;
        pessoa.ValidoAte = PessoaEquipeEvento.Validade(evento.Data, agora);
        await banco.SaveChangesAsync(ct);
        return Resultado<PessoaEquipeLeitura>.Sucesso(Ler(pessoa, agora));
    }

    public async Task<Resultado<PessoaEquipeLeitura>> EncerrarAsync(Guid contaId, Guid eventoId, Guid pessoaId, DateTimeOffset agora, CancellationToken ct)
    {
        var pessoa = await PessoaAsync(contaId, eventoId, pessoaId, ct);
        if (pessoa is null)
        {
            return Resultado<PessoaEquipeLeitura>.Erro(Codigos.Indisponivel, Indisponivel);
        }

        pessoa.EncerradoEm = agora;
        await DerrubarSessoesAsync(pessoa.Id, ct);
        await banco.SaveChangesAsync(ct);
        return Resultado<PessoaEquipeLeitura>.Sucesso(Ler(pessoa, agora));
    }

    private static string? Aplicar(PessoaEquipeEvento pessoa, SalvarPessoaEquipe pedido)
    {
        var nome = Texto.Limpo(pedido.Nome);
        var email = Texto.Limpo(pedido.Email);
        if (nome is null)
        {
            return "Informe o nome.";
        }

        if (nome.Length > 200)
        {
            return "O nome pode ter até 200 caracteres.";
        }

        if (email is null || email.Length > 320 || !Texto.EmailValido(email))
        {
            return "Informe um e-mail válido. É nele que a pessoa recebe o código de acesso.";
        }

        if (!pedido.RecebePortaria && !pedido.RecebeRoteiro && !pedido.RecebeCronograma)
        {
            return "Marque ao menos uma opção para a pessoa receber.";
        }

        var telefone = Texto.Limpo(pedido.Telefone);
        var funcao = Texto.Limpo(pedido.Funcao);
        if (telefone is { Length: > 40 } || funcao is { Length: > 120 })
        {
            return "Telefone ou função longos demais.";
        }

        pessoa.Nome = nome;
        pessoa.Email = email;
        pessoa.Telefone = telefone;
        pessoa.Funcao = funcao;
        pessoa.RecebePortaria = pedido.RecebePortaria;
        pessoa.RecebeRoteiro = pedido.RecebeRoteiro;
        pessoa.RecebeCronograma = pedido.RecebeCronograma;
        return null;
    }

    private Task<Evento?> EventoAsync(Guid contaId, Guid eventoId, CancellationToken ct) =>
        banco.Eventos.FirstOrDefaultAsync(item => item.Id == eventoId && item.ContaId == contaId, ct);

    private Task<PessoaEquipeEvento?> PessoaAsync(Guid contaId, Guid eventoId, Guid pessoaId, CancellationToken ct) =>
        banco.PessoasEquipeEvento.FirstOrDefaultAsync(item => item.Id == pessoaId && item.EventoId == eventoId && item.ContaId == contaId, ct);

    private Task DerrubarSessoesAsync(Guid pessoaId, CancellationToken ct) =>
        banco.SessoesEquipe.IgnoreQueryFilters().Where(item => item.PessoaId == pessoaId).ExecuteDeleteAsync(ct);

    private async Task<EquipeEventoLeitura> LerAsync(Evento evento, DateTimeOffset agora, CancellationToken ct)
    {
        var roteiro = evento.RoteiroId is Guid r
            ? await banco.ModelosRoteiro.Where(item => item.Id == r).Select(item => new ModeloEscolhido(item.Id, item.Nome)).FirstOrDefaultAsync(ct)
            : null;
        var cronograma = evento.CronogramaId is Guid c
            ? await banco.ModelosCronograma.Where(item => item.Id == c).Select(item => new ModeloEscolhido(item.Id, item.Titulo)).FirstOrDefaultAsync(ct)
            : null;
        var pessoas = await banco.PessoasEquipeEvento.AsNoTracking()
            .Where(item => item.EventoId == evento.Id && item.ContaId == evento.ContaId)
            .ToListAsync(ct);
        return new EquipeEventoLeitura(
            roteiro,
            cronograma,
            pessoas.OrderBy(item => item.Nome, StringComparer.CurrentCultureIgnoreCase).Select(item => Ler(item, agora)).ToArray());
    }

    private static PessoaEquipeLeitura Ler(PessoaEquipeEvento pessoa, DateTimeOffset agora) => new(
        pessoa.Id,
        pessoa.Nome,
        pessoa.Email,
        pessoa.Telefone,
        pessoa.Funcao,
        pessoa.RecebePortaria,
        pessoa.RecebeRoteiro,
        pessoa.RecebeCronograma,
        pessoa.Token,
        pessoa.EncerradoEm is not null ? "Encerrado"
            : pessoa.EnviadoEm is null ? "NaoEnviado"
            : !pessoa.Aberto(agora) ? "Vencido"
            : pessoa.UltimoAcessoEm is not null ? "Acessou"
            : "Enviado",
        pessoa.EnviadoEm,
        pessoa.ValidoAte,
        pessoa.UltimoAcessoEm);

    private static string NovoToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
}
