using Project.Domain.Comum;
using Project.Domain.Tarefas;

namespace Project.Domain.Eventos;

public sealed class ModeloEvento : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    public TipoEvento Tipo { get; set; }

    public bool PermiteGerais { get; set; } = true;

    public bool PermitePlanejamento { get; set; } = true;

    public bool PermiteTarefas { get; set; } = true;

    public bool PermiteServicosFornecedores { get; set; } = true;

    public bool PermiteConvites { get; set; } = true;

    public List<ServicoModelo> Servicos { get; set; } = [];

    public List<TarefaModelo> Tarefas { get; set; } = [];

    public List<VinculoModeloEvento> Vinculos { get; set; } = [];
}

/// <summary>Serviço do modelo: ligado ao serviço do cadastro da conta (SPEC-012 v3 §8.4). O nome fica guardado para exibição.</summary>
public sealed class ServicoModelo : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid ModeloId { get; set; }

    /// <summary>Serviço do cadastro da conta (ServicosConta). Nulo só em dado antigo ou serviço removido do cadastro.</summary>
    public Guid? ServicoContaId { get; set; }

    public string Nome { get; set; } = "";

    public decimal? ValorEstimado { get; set; }
}

/// <summary>Tarefa do modelo: mesmo formato da tarefa do evento, sem data exata, situação, comentários e anexos (SPEC-012 v3 §8.2).</summary>
public sealed class TarefaModelo : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid ModeloId { get; set; }

    /// <summary>Serviço do mesmo modelo. Nulo = "Sem serviço".</summary>
    public Guid? ServicoModeloId { get; set; }

    public string Titulo { get; set; } = "";

    public string? Descricao { get; set; }

    /// <summary>Dias em relação à data do evento: negativo = antes, 0 = no dia, positivo = depois. Nulo = sem prazo.</summary>
    public int? PrazoRelativo { get; set; }

    public PrioridadeTarefa Prioridade { get; set; } = PrioridadeTarefa.Media;

    public VisibilidadeTarefa Visibilidade { get; set; } = VisibilidadeTarefa.SoEu;

    /// <summary>Papéis responsáveis, separados por vírgula (ex.: "Organizer,Cliente"). Ao menos um.</summary>
    public string Responsaveis { get; set; } = nameof(PapelResponsavel.Organizer);

    public List<ItemChecklistTarefaModelo> Checklist { get; set; } = [];

    public IReadOnlyList<PapelResponsavel> Papeis() => PapeisResponsaveis.Ler(Responsaveis);
}

/// <summary>Item da checklist da tarefa do modelo: sem feito/cancelado; prazo só relativo; responsável por papel.</summary>
public sealed class ItemChecklistTarefaModelo : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid TarefaModeloId { get; set; }

    public string Texto { get; set; } = "";

    public int Ordem { get; set; }

    public int? PrazoRelativo { get; set; }

    public PapelResponsavel? ResponsavelPapel { get; set; }
}

/// <summary>Leitura e escrita da lista de papéis guardada em texto.</summary>
public static class PapeisResponsaveis
{
    public static IReadOnlyList<PapelResponsavel> Ler(string? texto) =>
        (texto ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(parte => Enum.TryParse<PapelResponsavel>(parte, out var papel) ? papel : (PapelResponsavel?)null)
            .OfType<PapelResponsavel>()
            .Distinct()
            .ToArray();

    public static string Escrever(IEnumerable<PapelResponsavel> papeis) =>
        string.Join(',', papeis.Distinct().Select(papel => papel.ToString()));
}

public enum TipoVinculoModelo
{
    Briefing = 0,
    Roteiro = 1,
    Inspiracao = 2,
    Mensagem = 3,
}

public sealed class VinculoModeloEvento : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid ModeloId { get; set; }

    public TipoVinculoModelo Tipo { get; set; }

    public Guid BibliotecaId { get; set; }
}
