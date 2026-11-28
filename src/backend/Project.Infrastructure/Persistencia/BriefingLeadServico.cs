using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Project.Application.Comum;
using Project.Domain.Funil;

namespace Project.Infrastructure.Persistencia;

public sealed record ItemBriefingLeadLeitura(Guid Id, string? Secao, string Pergunta, string? Resposta);

public sealed record BriefingLeadLeitura(
    Guid? ModeloId,
    string ModeloNome,
    DateTimeOffset AplicadoEm,
    IReadOnlyList<ItemBriefingLeadLeitura> Itens,
    string? Token = null,
    DateTimeOffset? LiberadoEm = null,
    DateTimeOffset? RespondidoEm = null,
    DateTimeOffset? ValidoAte = null,
    DateTimeOffset? ConcluidoEm = null);

public sealed record AplicarBriefingLead(Guid? ModeloId);

public sealed record RespostaBriefingLead(Guid Id, string? Resposta);

public sealed record SalvarRespostasBriefingLead(IReadOnlyList<RespostaBriefingLead>? Respostas);

/// <summary>Briefing do lead como roteiro interno da conversa (SPEC-031 §6.7, ponto 4).</summary>
public sealed class BriefingLeadServico(AppDbContext banco)
{
    public const int LimiteResposta = 2000;

    public async Task<Resultado<BriefingLeadLeitura?>> ObterAsync(Guid contaId, Guid oportunidadeId, CancellationToken ct)
    {
        if (!await LeadDaContaAsync(contaId, oportunidadeId, ct))
        {
            return Resultado<BriefingLeadLeitura?>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var briefing = await banco.BriefingsOportunidade.AsNoTracking()
            .Include(item => item.Itens)
            .FirstOrDefaultAsync(item => item.ContaId == contaId && item.OportunidadeId == oportunidadeId, ct);
        return Resultado<BriefingLeadLeitura?>.Sucesso(briefing is null ? null : Ler(briefing));
    }

    /// <summary>Aplica um modelo ao lead. Se já havia briefing, ele é substituído (as respostas anteriores se perdem).</summary>
    public async Task<Resultado<BriefingLeadLeitura?>> AplicarAsync(Guid contaId, Guid oportunidadeId, AplicarBriefingLead pedido, CancellationToken ct)
    {
        if (!await LeadDaContaAsync(contaId, oportunidadeId, ct))
        {
            return Resultado<BriefingLeadLeitura?>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (pedido.ModeloId is not Guid modeloId)
        {
            return Resultado<BriefingLeadLeitura?>.Erro(Codigos.Validacao, "Escolha o modelo de briefing.");
        }

        var modelo = await banco.ModelosBriefing.AsNoTracking()
            .Include(item => item.Secoes).ThenInclude(secao => secao.Perguntas)
            .FirstOrDefaultAsync(item => item.ContaId == contaId && item.Id == modeloId, ct);
        if (modelo is null)
        {
            return Resultado<BriefingLeadLeitura?>.Erro(Codigos.Validacao, "Escolha o modelo de briefing.");
        }

        var anterior = await banco.BriefingsOportunidade.AsNoTracking()
            .Where(item => item.ContaId == contaId && item.OportunidadeId == oportunidadeId)
            .Select(item => new { item.TokenLink, item.LiberadoEm, item.ValidoAte, item.ConcluidoEm })
            .FirstOrDefaultAsync(ct);
        await banco.BriefingsOportunidade
            .Where(item => item.ContaId == contaId && item.OportunidadeId == oportunidadeId)
            .ExecuteDeleteAsync(ct);

        var novo = new BriefingOportunidade
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            OportunidadeId = oportunidadeId,
            ModeloBriefingId = modelo.Id,
            ModeloNome = modelo.Nome,
            AplicadoEm = Relogio.Agora,
            // Trocar o modelo mantém o mesmo link: quem já recebeu passa a ver as perguntas novas.
            TokenLink = anterior?.TokenLink,
            LiberadoEm = anterior?.LiberadoEm,
            ValidoAte = anterior?.ValidoAte,
            ConcluidoEm = anterior?.ConcluidoEm,
        };
        var ordem = 0;
        foreach (var secao in modelo.Secoes.OrderBy(item => item.Ordem))
        {
            foreach (var pergunta in secao.Perguntas.OrderBy(item => item.Ordem))
            {
                novo.Itens.Add(new ItemBriefingOportunidade
                {
                    Id = Guid.NewGuid(),
                    BriefingOportunidadeId = novo.Id,
                    Ordem = ordem++,
                    Secao = secao.Titulo,
                    Pergunta = pergunta.Enunciado,
                });
            }
        }

        banco.BriefingsOportunidade.Add(novo);
        await banco.SaveChangesAsync(ct);
        return Resultado<BriefingLeadLeitura?>.Sucesso(Ler(novo));
    }

    public async Task<Resultado<BriefingLeadLeitura?>> SalvarRespostasAsync(
        Guid contaId,
        Guid oportunidadeId,
        SalvarRespostasBriefingLead pedido,
        CancellationToken ct)
    {
        var briefing = await banco.BriefingsOportunidade
            .Include(item => item.Itens)
            .FirstOrDefaultAsync(item => item.ContaId == contaId && item.OportunidadeId == oportunidadeId, ct);
        if (briefing is null)
        {
            return Resultado<BriefingLeadLeitura?>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        foreach (var resposta in pedido.Respostas ?? [])
        {
            var texto = Domain.Comum.Texto.Limpo(resposta.Resposta);
            if (texto is not null && texto.Length > LimiteResposta)
            {
                return Resultado<BriefingLeadLeitura?>.Erro(Codigos.Validacao, $"A resposta pode ter até {LimiteResposta} caracteres.");
            }

            var item = briefing.Itens.FirstOrDefault(i => i.Id == resposta.Id);
            if (item is not null)
            {
                item.Resposta = texto;
            }
        }

        await banco.SaveChangesAsync(ct);
        return Resultado<BriefingLeadLeitura?>.Sucesso(Ler(briefing));
    }

    public async Task<Resultado<bool>> RemoverAsync(Guid contaId, Guid oportunidadeId, CancellationToken ct)
    {
        var removidos = await banco.BriefingsOportunidade
            .Where(item => item.ContaId == contaId && item.OportunidadeId == oportunidadeId)
            .ExecuteDeleteAsync(ct);
        return removidos == 0
            ? Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.")
            : Resultado<bool>.Sucesso(true);
    }

    /// <summary>
    /// Libera o briefing para o cliente responder pelo link (SPEC-066). Exige um contato com e-mail, que recebe o
    /// código de acesso. Cada liberação vale <see cref="BriefingOportunidade.DiasDeValidade"/> dias e reabre um
    /// briefing concluído. Repetir não troca o token.
    /// </summary>
    public async Task<Resultado<BriefingLeadLeitura?>> LiberarAsync(Guid contaId, Guid oportunidadeId, DateTimeOffset agora, CancellationToken ct)
    {
        var briefing = await banco.BriefingsOportunidade
            .Include(item => item.Itens)
            .FirstOrDefaultAsync(item => item.ContaId == contaId && item.OportunidadeId == oportunidadeId, ct);
        if (briefing is null)
        {
            return Resultado<BriefingLeadLeitura?>.Erro(Codigos.Indisponivel, "Aplique um modelo de briefing antes de enviar ao cliente.");
        }

        if ((await BriefingAcessoServico.EmailsDoLeadAsync(banco, oportunidadeId, ct)).Count == 0)
        {
            return Resultado<BriefingLeadLeitura?>.Erro(Codigos.Validacao, SemEmail);
        }

        briefing.TokenLink ??= NovoToken();
        briefing.LiberadoEm = agora;
        briefing.ValidoAte = agora.AddDays(BriefingOportunidade.DiasDeValidade);
        briefing.ConcluidoEm = null;
        await banco.SaveChangesAsync(ct);
        return Resultado<BriefingLeadLeitura?>.Sucesso(Ler(briefing));
    }

    public const string SemEmail = "Cadastre o e-mail do contato para enviar o briefing. O cliente recebe nele o código de acesso.";

    /// <summary>Fecha o link na hora e derruba as sessões abertas.</summary>
    public async Task<Resultado<BriefingLeadLeitura?>> EncerrarAsync(Guid contaId, Guid oportunidadeId, CancellationToken ct)
    {
        var briefing = await banco.BriefingsOportunidade
            .Include(item => item.Itens)
            .FirstOrDefaultAsync(item => item.ContaId == contaId && item.OportunidadeId == oportunidadeId, ct);
        if (briefing is null)
        {
            return Resultado<BriefingLeadLeitura?>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        briefing.LiberadoEm = null;
        briefing.ValidoAte = null;
        await banco.SessoesBriefing.Where(item => item.BriefingId == briefing.Id).ExecuteDeleteAsync(ct);
        await banco.CodigosAcessoBriefing.Where(item => item.BriefingId == briefing.Id).ExecuteDeleteAsync(ct);
        await banco.SaveChangesAsync(ct);
        return Resultado<BriefingLeadLeitura?>.Sucesso(Ler(briefing));
    }

    private static string NovoToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private Task<bool> LeadDaContaAsync(Guid contaId, Guid oportunidadeId, CancellationToken ct) =>
        banco.Oportunidades.AnyAsync(item => item.ContaId == contaId && item.Id == oportunidadeId, ct);

    internal static BriefingLeadLeitura Ler(BriefingOportunidade briefing) => new(
        briefing.ModeloBriefingId,
        briefing.ModeloNome,
        briefing.AplicadoEm,
        briefing.Itens
            .OrderBy(item => item.Ordem)
            .Select(item => new ItemBriefingLeadLeitura(item.Id, item.Secao, item.Pergunta, item.Resposta))
            .ToArray(),
        briefing.TokenLink,
        briefing.LiberadoEm,
        briefing.RespondidoEm,
        briefing.ValidoAte,
        briefing.ConcluidoEm);
}
