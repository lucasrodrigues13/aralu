using Project.Domain.Eventos;

namespace Project.Application.Negocio;

/// <summary>Quantidade e valor de um estágio do funil da conta (SPEC-031: estágios configuráveis).</summary>
public sealed record FunilEstagio(
    string Estagio,
    int Quantidade,
    decimal Valor,
    Guid Id = default,
    string Cor = "",
    string Tipo = "");

public sealed record PainelLeitura(
    int EmAndamento,
    int Concluidos,
    int Cancelados,
    IReadOnlyList<EventoAndamento> EventosEmAndamento,
    IReadOnlyList<FunilEstagio> Funil);

public sealed class PainelServico(IDados dados)
{
    /// <summary>Com <paramref name="liberados"/> (Assistente restrita), contagens e eventos em andamento ficam só nos eventos dela.</summary>
    public async Task<PainelLeitura> ObterAsync(Guid contaId, CancellationToken ct, IReadOnlySet<Guid>? liberados = null)
    {
        var contagens = await dados.ContarEventosAsync(contaId, ct, liberados);
        var andamento = await dados.ListarEmAndamentoAsync(contaId, ct);
        if (liberados is not null)
        {
            andamento = andamento.Where(evento => liberados.Contains(evento.Id)).ToArray();
        }

        var funil = await new OportunidadeServico(dados).ContarPorEstagioAsync(contaId, ct);
        return new PainelLeitura(
            Quantidade(contagens, SituacaoEvento.EmAndamento),
            Quantidade(contagens, SituacaoEvento.Concluido),
            Quantidade(contagens, SituacaoEvento.Cancelado),
            andamento,
            funil);
    }

    private static int Quantidade(IReadOnlyList<ContagemSituacao> contagens, SituacaoEvento situacao) =>
        contagens.FirstOrDefault(item => item.Situacao == situacao)?.Quantidade ?? 0;
}
