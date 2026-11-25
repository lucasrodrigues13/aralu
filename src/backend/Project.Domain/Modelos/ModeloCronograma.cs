namespace Project.Domain.Modelos;

public sealed class ModeloCronograma
{
    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

    public string Titulo { get; set; } = "";

    public string? Descricao { get; set; }

    public List<ItemCronograma> Itens { get; set; } = [];
}

public sealed class ItemCronograma
{
    public Guid Id { get; set; }

    public Guid ModeloId { get; set; }

    public string? Rotulo { get; set; }

    public string? Descricao { get; set; }

    public DateOnly? Data { get; set; }

    public TimeOnly? Hora { get; set; }

    public string? Responsavel { get; set; }

    public string? RecadoFornecedores { get; set; }

    public int Ordem { get; set; }
}

/// <summary>
/// Responsável de um item de cronograma: só papéis (Organizer, Assistente, Cliente), como no modelo de evento.
/// Aceita também os rótulos em português; qualquer outro texto vira vazio.
/// </summary>
public static class ResponsaveisCronograma
{
    public static readonly string[] Papeis = ["Organizer", "Assistente", "Cliente"];

    public static string? Normalizar(string? texto)
    {
        var chave = Project.Domain.Fornecedores.PlanilhaFornecedores.Normalizar(texto);
        return chave switch
        {
            "organizer" or "organizador" or "organizadora" => "Organizer",
            "assistente" => "Assistente",
            "cliente" => "Cliente",
            _ => null,
        };
    }
}
