namespace Project.Domain.Funil;

public enum TipoTarefaFunil
{
    Reuniao = 0,
    Ligacao = 1,
    Email = 2,
    Tarefa = 3,
}

public sealed class TarefaFunil
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid OportunidadeId { get; set; }

    public string Titulo { get; set; } = "";

    public string? Observacao { get; set; }

    public TipoTarefaFunil Tipo { get; set; }

    public string Responsavel { get; set; } = "";

    public DateOnly Prazo { get; set; }

    public bool Completa { get; set; }

    public Guid? AnexoArquivoId { get; set; }

    /// <summary>Id do usuário que criou (dona ou assistente). Nulo nos itens antigos (SPEC-032 §18, passo 1).</summary>
    public string? CriadoPor { get; set; }

    /// <summary>Dona e assistentes responsáveis (SPEC-031 §6.7, ponto 3). Vazio em tarefas antigas: vale <see cref="Responsavel"/>.</summary>
    public List<ResponsavelTarefaFunil> Responsaveis { get; set; } = [];
}

public sealed class ResponsavelTarefaFunil
{
    public Guid Id { get; set; }

    public Guid TarefaFunilId { get; set; }

    /// <summary>Organizer (a dona) ou Assistente.</summary>
    public Project.Domain.Tarefas.PapelResponsavel Papel { get; set; }

    /// <summary>Id da conta (dona) ou da assistente.</summary>
    public string ReferenciaId { get; set; } = "";
}
