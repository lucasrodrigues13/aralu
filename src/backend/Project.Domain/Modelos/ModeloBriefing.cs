using Project.Domain.Comum;
namespace Project.Domain.Modelos;

public sealed class ModeloBriefing : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    public string Origem { get; set; } = "GestaoEventos";

    public bool Padrao { get; set; }

    public DateTimeOffset CriadoEm { get; set; }

    public List<SecaoBriefing> Secoes { get; set; } = [];
}

public sealed class SecaoBriefing : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid ModeloId { get; set; }

    public string Titulo { get; set; } = "";

    public string? Descricao { get; set; }

    public int Ordem { get; set; }

    public List<PerguntaBriefing> Perguntas { get; set; } = [];
}

public enum TipoPerguntaBriefing
{
    TextoCurto = 0,
}

public sealed class PerguntaBriefing : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid SecaoId { get; set; }

    public string Enunciado { get; set; } = "";

    public TipoPerguntaBriefing Tipo { get; set; } = TipoPerguntaBriefing.TextoCurto;

    public int Ordem { get; set; }
}
