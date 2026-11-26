namespace Project.Domain.Funil;

/// <summary>
/// Briefing aplicado a um lead (SPEC-031 §6.7, ponto 4): cópia das perguntas de um modelo (SPEC-013)
/// que a dona usa como roteiro da conversa, anotando as respostas. Editar o modelo depois não muda o lead.
/// </summary>
public sealed class BriefingOportunidade
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid OportunidadeId { get; set; }

    /// <summary>Modelo de origem; vira nulo se o modelo for excluído.</summary>
    public Guid? ModeloBriefingId { get; set; }

    public string ModeloNome { get; set; } = "";

    public DateTimeOffset AplicadoEm { get; set; }

    public List<ItemBriefingOportunidade> Itens { get; set; } = [];
}

public sealed class ItemBriefingOportunidade
{
    public Guid Id { get; set; }

    public Guid BriefingOportunidadeId { get; set; }

    public int Ordem { get; set; }

    public string? Secao { get; set; }

    public string Pergunta { get; set; } = "";

    public string? Resposta { get; set; }
}
