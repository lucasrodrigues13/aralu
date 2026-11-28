using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Project.Application.Comum;
using Project.Domain.Assinaturas;
using Project.Infrastructure.Persistencia;

namespace Project.Infrastructure.Assinaturas;

public sealed record RecursoLeitura(string Recurso, int? Limite);

public sealed record PlanoLeitura(Guid Id, string Codigo, string Nome, string? Descricao, decimal ValorMensal, bool Publico, bool Padrao, bool Ativo, int Ordem, int Contas, IReadOnlyList<RecursoLeitura> Recursos);

public sealed record PlanoPedido(string? Codigo, string? Nome, string? Descricao, decimal? ValorMensal, bool? Publico, bool? Padrao, bool? Ativo, int? Ordem, IReadOnlyList<RecursoLeitura>? Recursos);

public sealed record AlteracaoLeitura(string Tipo, string? PlanoAnterior, string? PlanoNovo, decimal? ValorAnterior, decimal? ValorNovo, string? Detalhe, string Motivo, string FeitoPor, DateTimeOffset FeitoEm);

public sealed record ContaAssinaturaLeitura(
    Guid ContaId,
    string Situacao,
    Guid PlanoId,
    string Plano,
    decimal ValorDoPlano,
    decimal ValorCobrado,
    decimal? ValorPersonalizado,
    decimal? DescontoPercentual,
    DateOnly? DescontoAte,
    DateTimeOffset TrialTerminaEm,
    DateOnly? ProximoVencimento,
    bool Assinada,
    IReadOnlyList<AlteracaoLeitura> Historico);

public sealed record AjustePedido(Guid? PlanoId, decimal? Valor, decimal? Percentual, DateOnly? Ate, DateOnly? TrialAte, bool? Remover, string? Motivo);

/// <summary>Parte D da SPEC-062: catálogo de planos (RF-118, RF-119) e enquadramento de contas pelo Admin (RF-120, R13).</summary>
public sealed class PlanosAdminServico(AppDbContext banco, IAsaas asaas, ILogger<PlanosAdminServico> logs)
{
    public async Task<IReadOnlyList<PlanoLeitura>> ListarAsync(CancellationToken ct)
    {
        var planos = await banco.Planos.AsNoTracking().Include(item => item.Recursos).OrderBy(item => item.Ordem).ThenBy(item => item.Nome).ToListAsync(ct);
        var contas = await banco.Assinaturas.AsNoTracking().IgnoreQueryFilters()
            .GroupBy(item => item.PlanoId)
            .Select(grupo => new { grupo.Key, Total = grupo.Count() })
            .ToDictionaryAsync(item => item.Key, item => item.Total, ct);
        return planos.Select(plano => Ler(plano, contas.GetValueOrDefault(plano.Id))).ToList();
    }

    /// <summary>Planos que o Dono pode escolher (§6 B1): os públicos e ativos, ou só o plano em que o Admin enquadrou a conta.</summary>
    public async Task<IReadOnlyList<PlanoLeitura>> ParaAssinarAsync(Guid contaId, CancellationToken ct)
    {
        var assinatura = await banco.Assinaturas.AsNoTracking().IgnoreQueryFilters().FirstOrDefaultAsync(item => item.ContaId == contaId, ct);
        var planos = await banco.Planos.AsNoTracking().Include(item => item.Recursos).OrderBy(item => item.Ordem).ToListAsync(ct);
        var enquadrada = assinatura is not null
            && (assinatura.ValorPersonalizado is not null || assinatura.DescontoPercentual is not null
                || planos.Any(plano => plano.Id == assinatura.PlanoId && !plano.Padrao));
        return (enquadrada ? planos.Where(plano => plano.Id == assinatura!.PlanoId) : planos.Where(plano => plano.Publico && plano.Ativo))
            .Select(plano => Ler(plano, 0))
            .ToList();
    }

    public async Task<Resultado<PlanoLeitura>> SalvarAsync(Guid? id, PlanoPedido pedido, DateTimeOffset agora, CancellationToken ct)
    {
        var plano = id is Guid existente
            ? await banco.Planos.Include(item => item.Recursos).FirstOrDefaultAsync(item => item.Id == existente, ct)
            : new Plano { Id = Guid.NewGuid(), CriadoEm = agora };
        if (plano is null)
        {
            return Resultado<PlanoLeitura>.Erro(Codigos.Indisponivel, "Plano não encontrado.");
        }

        var codigo = Domain.Comum.Texto.Limpo(pedido.Codigo)?.ToLowerInvariant();
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (codigo is null || codigo.Length > 40 || nome is null || nome.Length > 80)
        {
            return Resultado<PlanoLeitura>.Erro(Codigos.Validacao, "Informe o código (até 40) e o nome (até 80 caracteres).");
        }

        if (pedido.ValorMensal is not decimal valor || valor < 0)
        {
            return Resultado<PlanoLeitura>.Erro(Codigos.Validacao, "O valor mensal deve ser maior ou igual a zero.");
        }

        if (await banco.Planos.AnyAsync(item => item.Codigo == codigo && item.Id != plano.Id, ct))
        {
            return Resultado<PlanoLeitura>.Erro(Codigos.Validacao, "Já existe um plano com este código.");
        }

        var publico = pedido.Publico ?? plano.Publico;
        var ativo = pedido.Ativo ?? (id is null || plano.Ativo);
        var padrao = pedido.Padrao ?? plano.Padrao;
        // Sempre exatamente um padrão, público e ativo (§10, §14).
        if (plano.Padrao && (!padrao || !publico || !ativo))
        {
            return Resultado<PlanoLeitura>.Erro(Codigos.Validacao, "Escolha outro plano padrão antes.");
        }

        if (padrao && (!publico || !ativo))
        {
            return Resultado<PlanoLeitura>.Erro(Codigos.Validacao, "O plano padrão precisa ser público e ativo.");
        }

        var recursos = new List<RecursoDoPlano>();
        foreach (var item in pedido.Recursos ?? [])
        {
            if (!Enum.TryParse<RecursoPlano>(item.Recurso, ignoreCase: true, out var recurso) || !Enum.IsDefined(recurso))
            {
                return Resultado<PlanoLeitura>.Erro(Codigos.Validacao, $"Recurso desconhecido: {item.Recurso}.");
            }

            if (item.Limite is < 0)
            {
                return Resultado<PlanoLeitura>.Erro(Codigos.Validacao, "O limite do recurso não pode ser negativo.");
            }

            recursos.Add(new RecursoDoPlano { PlanoId = plano.Id, Recurso = recurso, Limite = item.Limite });
        }

        if (padrao && !plano.Padrao)
        {
            // Novo padrão: o anterior deixa de ser. Gravado antes por causa do índice único de padrão.
            await banco.Planos.Where(item => item.Padrao).ExecuteUpdateAsync(set => set.SetProperty(item => item.Padrao, false), ct);
        }

        plano.Codigo = codigo;
        plano.Nome = nome;
        plano.Descricao = Domain.Comum.Texto.Limpo(pedido.Descricao);
        // Mudar o preço vale para assinaturas novas; quem já assina guarda o próprio valor (R14, T19).
        plano.ValorMensal = valor;
        plano.Publico = publico;
        plano.Ativo = ativo;
        plano.Padrao = padrao;
        plano.Ordem = pedido.Ordem ?? plano.Ordem;
        plano.AtualizadoEm = agora;
        plano.Recursos.Clear();
        plano.Recursos.AddRange(recursos);
        if (id is null)
        {
            banco.Planos.Add(plano);
        }

        await banco.SaveChangesAsync(ct);
        return Resultado<PlanoLeitura>.Sucesso(Ler(plano, 0));
    }

    public async Task<ContaAssinaturaLeitura?> ContaAsync(Guid contaId, CancellationToken ct)
    {
        var assinatura = await banco.Assinaturas.AsNoTracking().IgnoreQueryFilters().FirstOrDefaultAsync(item => item.ContaId == contaId, ct);
        if (assinatura is null)
        {
            return null;
        }

        var planos = await banco.Planos.AsNoTracking().ToDictionaryAsync(item => item.Id, ct);
        var plano = planos[assinatura.PlanoId];
        var historico = await banco.AlteracoesAssinatura.AsNoTracking().IgnoreQueryFilters()
            .Where(item => item.AssinaturaId == assinatura.Id)
            .OrderByDescending(item => item.FeitoEm)
            .Join(banco.Users, item => item.FeitoPorUsuarioId, usuario => usuario.Id, (item, usuario) => new { item, usuario.Email })
            .ToListAsync(ct);
        var hoje = DateOnly.FromDateTime(Relogio.AgoraUtc);
        return new ContaAssinaturaLeitura(
            contaId,
            assinatura.Situacao.ToString(),
            plano.Id,
            plano.Nome,
            plano.ValorMensal,
            Assinatura.ValorCobrado(plano.ValorMensal, assinatura.ValorPersonalizado, assinatura.DescontoPercentual, assinatura.DescontoAte, assinatura.ProximoVencimento ?? hoje),
            assinatura.ValorPersonalizado,
            assinatura.DescontoPercentual,
            assinatura.DescontoAte,
            assinatura.TrialTerminaEm,
            assinatura.ProximoVencimento,
            assinatura.AsaasSubscriptionId is not null,
            historico.Select(h => new AlteracaoLeitura(
                h.item.Tipo,
                h.item.PlanoAnteriorId is Guid a ? planos.GetValueOrDefault(a)?.Nome : null,
                h.item.PlanoNovoId is Guid n ? planos.GetValueOrDefault(n)?.Nome : null,
                h.item.ValorAnterior,
                h.item.ValorNovo,
                h.item.Detalhe,
                h.item.Motivo,
                h.Email ?? "",
                h.item.FeitoEm)).ToList());
    }

    /// <summary>
    /// Trocar plano, dar valor personalizado ou desconto, estender o trial (§6 D4). Motivo obrigatório; tudo vai ao histórico (R13, T22).
    /// Quem já assina passa a pagar o novo valor na próxima cobrança do Asaas (§6 D6).
    /// </summary>
    public async Task<Resultado<ContaAssinaturaLeitura>> AjustarAsync(Guid contaId, string tipo, AjustePedido pedido, string adminId, DateTimeOffset agora, CancellationToken ct)
    {
        var motivo = Domain.Comum.Texto.Limpo(pedido.Motivo);
        if (motivo is null)
        {
            return Resultado<ContaAssinaturaLeitura>.Erro(Codigos.Validacao, "Informe o motivo da alteração.");
        }

        var assinatura = await banco.Assinaturas.IgnoreQueryFilters().FirstOrDefaultAsync(item => item.ContaId == contaId, ct);
        if (assinatura is null)
        {
            return Resultado<ContaAssinaturaLeitura>.Erro(Codigos.Indisponivel, "Conta sem assinatura.");
        }

        var hoje = DateOnly.FromDateTime(agora.UtcDateTime);
        var planoAtual = await banco.Planos.AsNoTracking().FirstAsync(item => item.Id == assinatura.PlanoId, ct);
        var valorAntes = Assinatura.ValorCobrado(planoAtual.ValorMensal, assinatura.ValorPersonalizado, assinatura.DescontoPercentual, assinatura.DescontoAte, assinatura.ProximoVencimento ?? hoje);
        var registro = new AlteracaoAssinatura
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            AssinaturaId = assinatura.Id,
            Tipo = tipo,
            PlanoAnteriorId = assinatura.PlanoId,
            PlanoNovoId = assinatura.PlanoId,
            ValorAnterior = valorAntes,
            Motivo = motivo,
            FeitoPorUsuarioId = adminId,
            FeitoEm = agora,
        };

        var planoNovo = planoAtual;
        var tinhaDowngrade = false;
        switch (tipo)
        {
            case "Plano":
                planoNovo = pedido.PlanoId is Guid planoId ? await banco.Planos.AsNoTracking().FirstOrDefaultAsync(item => item.Id == planoId, ct) : null;
                if (planoNovo is null)
                {
                    return Resultado<ContaAssinaturaLeitura>.Erro(Codigos.Validacao, "Escolha o plano.");
                }

                // SPEC-065: a troca pelo Admin descarta upgrade pendente (remove a cobrança avulsa) e downgrade agendado.
                if (assinatura.UpgradeCobrancaId is { } upgrade)
                {
                    try
                    {
                        await asaas.RemoverCobrancaAsync(upgrade, [], ct);
                    }
                    catch (ErroAsaas erro)
                    {
                        logs.LogWarning("Cobrança de upgrade {Cobranca} não removida no Asaas: {Erro}", upgrade, erro.Message);
                    }
                }

                tinhaDowngrade = assinatura.DowngradePlanoId is not null;
                assinatura.DescartarTroca();

                // Inclusive não público (ex.: "Fundadores", T17).
                assinatura.PlanoId = planoNovo.Id;
                registro.PlanoNovoId = planoNovo.Id;
                break;
            case "Valor":
                if (pedido.Remover == true)
                {
                    assinatura.ValorPersonalizado = null;
                    registro.Detalhe = "Valor personalizado removido.";
                    break;
                }

                if (pedido.Valor is not decimal valor || valor < 0)
                {
                    return Resultado<ContaAssinaturaLeitura>.Erro(Codigos.Validacao, "O valor personalizado deve ser maior ou igual a zero.");
                }

                assinatura.ValorPersonalizado = valor;
                break;
            case "Desconto":
                if (pedido.Remover == true)
                {
                    assinatura.DescontoPercentual = null;
                    assinatura.DescontoAte = null;
                    registro.Detalhe = "Desconto removido.";
                    break;
                }

                if (pedido.Percentual is not decimal percentual || percentual < 1 || percentual > 100)
                {
                    return Resultado<ContaAssinaturaLeitura>.Erro(Codigos.Validacao, "O desconto deve ficar entre 1% e 100%.");
                }

                if (pedido.Ate is DateOnly ate && ate <= hoje)
                {
                    return Resultado<ContaAssinaturaLeitura>.Erro(Codigos.Validacao, "A data de fim do desconto precisa ser no futuro.");
                }

                assinatura.DescontoPercentual = percentual;
                assinatura.DescontoAte = pedido.Ate;
                registro.Detalhe = pedido.Ate is DateOnly fim ? $"{percentual:0.##}% até {fim:dd/MM/yyyy}" : $"{percentual:0.##}% sem data de fim";
                break;
            case "Trial":
                if (pedido.TrialAte is not DateOnly novoFim || novoFim < hoje)
                {
                    return Resultado<ContaAssinaturaLeitura>.Erro(Codigos.Validacao, "Informe a nova data de fim do trial, a partir de hoje.");
                }

                var antes = assinatura.TrialTerminaEm;
                // O trial vale até o fim do dia escolhido.
                assinatura.TrialTerminaEm = new DateTimeOffset(novoFim.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
                if (assinatura.Situacao == SituacaoAssinatura.Expirada)
                {
                    assinatura.Situacao = SituacaoAssinatura.Trial;
                }

                registro.Detalhe = $"Trial de {antes.AddDays(-1):dd/MM/yyyy} para {novoFim:dd/MM/yyyy}";
                break;
            default:
                return Resultado<ContaAssinaturaLeitura>.Erro(Codigos.Validacao, "Alteração desconhecida.");
        }

        var valorDepois = Assinatura.ValorCobrado(planoNovo.ValorMensal, assinatura.ValorPersonalizado, assinatura.DescontoPercentual, assinatura.DescontoAte, assinatura.ProximoVencimento ?? hoje);
        registro.ValorNovo = valorDepois;
        assinatura.Valor = valorDepois;
        assinatura.AtualizadaEm = agora;
        banco.AlteracoesAssinatura.Add(registro);
        await banco.SaveChangesAsync(ct);

        if (assinatura.AsaasSubscriptionId is { } asaasId && (valorDepois != valorAntes || tinhaDowngrade))
        {
            try
            {
                await asaas.AtualizarValorAsync(asaasId, valorDepois, [], ct);
            }
            catch (ErroAsaas erro)
            {
                logs.LogError("Valor da conta {Conta} mudou para {Valor}, mas o Asaas recusou a atualização: {Erro}", contaId, valorDepois, erro.Message);
                return Resultado<ContaAssinaturaLeitura>.Erro(AssinaturaServico.ErroAsaasCodigo, $"Gravado aqui, mas o Asaas recusou o novo valor: {erro.Message}");
            }
        }

        return Resultado<ContaAssinaturaLeitura>.Sucesso((await ContaAsync(contaId, ct))!);
    }

    private static PlanoLeitura Ler(Plano plano, int contas) => new(
        plano.Id, plano.Codigo, plano.Nome, plano.Descricao, plano.ValorMensal, plano.Publico, plano.Padrao, plano.Ativo, plano.Ordem, contas,
        plano.Recursos.Select(item => new RecursoLeitura(item.Recurso.ToString(), item.Limite)).ToList());
}
