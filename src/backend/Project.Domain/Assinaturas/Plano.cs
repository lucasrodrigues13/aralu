namespace Project.Domain.Assinaturas;

/// <summary>Recursos que um plano pode liberar (SPEC-062 §9, RF-119). A lista vive no código: cada recurso tem código que o verifica.</summary>
public enum RecursoPlano
{
    LigacoesIa,
    MensagensIa,
    Integracoes,
}

/// <summary>Plano do catálogo mantido pelo Admin da plataforma (RF-118). Não pertence a conta.</summary>
public sealed class Plano
{
    /// <summary>Plano de lançamento: Pro, R$ 179/mês, público e padrão (SPEC-062 §6 parte D).</summary>
    public static readonly Guid ProId = Guid.Parse("6f1d3c2a-0b6e-4d8e-9a51-62a0c3f0a179");

    public Guid Id { get; set; }

    public string Codigo { get; set; } = "";

    public string Nome { get; set; } = "";

    public string? Descricao { get; set; }

    public decimal ValorMensal { get; set; }

    /// <summary>Aparece para o Dono escolher ao assinar.</summary>
    public bool Publico { get; set; }

    /// <summary>Plano do trial e o oferecido primeiro. Sempre existe exatamente um, público e ativo.</summary>
    public bool Padrao { get; set; }

    public bool Ativo { get; set; } = true;

    public int Ordem { get; set; }

    public DateTimeOffset CriadoEm { get; set; }

    public DateTimeOffset AtualizadoEm { get; set; }

    public List<RecursoDoPlano> Recursos { get; set; } = [];
}

/// <summary>Recurso liberado pelo plano, com limite mensal opcional (ex.: minutos de ligação com IA).</summary>
public sealed class RecursoDoPlano
{
    public Guid PlanoId { get; set; }

    public RecursoPlano Recurso { get; set; }

    public int? Limite { get; set; }
}
