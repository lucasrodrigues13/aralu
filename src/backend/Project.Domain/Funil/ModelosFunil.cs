using Project.Domain.Comum;
namespace Project.Domain.Funil;

public sealed class ModeloServicoFunil : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    public string? Descricao { get; set; }

    public decimal? Valor { get; set; }
}

public sealed class ModeloOrcamentoFunil : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    public string Texto { get; set; } = "";

    public string? CorPrimaria { get; set; }

    public string? CorSecundaria { get; set; }

    /// <summary>HTML (já sanitizado) mostrado ao cliente na tela de aceite da proposta (SPEC-057).</summary>
    public string? HtmlAceite { get; set; }

    /// <summary>Mídias e depoimentos da página de aceite, em JSON (SPEC-061). Ver <c>ExtrasAceite</c>.</summary>
    public string? ExtrasAceite { get; set; }
}
