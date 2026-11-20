namespace Project.Domain.Funil;

/// <summary>Papel do estágio no funil (SPEC-031 §8). Só os abertos são configuráveis.</summary>
public enum TipoEstagioFunil
{
    Aberto = 0,
    Contratado = 1,
    Descartado = 2,
}

/// <summary>Estágio do funil de uma conta: nome, cor e ordem escolhidos pela dona.</summary>
public sealed class EstagioFunil
{
    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

    public string Nome { get; set; } = "";

    public string Cor { get; set; } = CoresEstagio.Padrao;

    public int Ordem { get; set; }

    public TipoEstagioFunil Tipo { get; set; }
}

public static class CoresEstagio
{
    public const string Padrao = "info";

    /// <summary>Paleta fechada do tema (tokens de cor do frontend).</summary>
    public static readonly string[] Paleta = ["info", "warning", "success", "error", "primary", "secondary"];

    public static bool Valida(string? cor) => cor is not null && Paleta.Contains(cor);
}

public static class EstagiosFunil
{
    public const string NomeContatoInicial = "Contato inicial";
    public const string NomeOrcamentoEnviado = "Orçamento enviado";
    public const string NomeContratado = "Contratado";
    public const string NomeDescartado = "Descartado";

    public const int MaximoAbertos = 8;
    public const int TamanhoMaximoNome = 40;

    /// <summary>Estágios com que toda conta nasce.</summary>
    public static List<EstagioFunil> Padrao(string contaId) =>
    [
        Novo(contaId, NomeContatoInicial, "info", 0, TipoEstagioFunil.Aberto),
        Novo(contaId, NomeOrcamentoEnviado, "warning", 1, TipoEstagioFunil.Aberto),
        Novo(contaId, NomeContratado, "success", 2, TipoEstagioFunil.Contratado),
        Novo(contaId, NomeDescartado, "error", 3, TipoEstagioFunil.Descartado),
    ];

    /// <summary>Ordem do quadro: abertos pela ordem, depois Contratado e Descartado.</summary>
    public static IReadOnlyList<EstagioFunil> Ordenar(IEnumerable<EstagioFunil> estagios) =>
        estagios.OrderBy(e => e.Tipo == TipoEstagioFunil.Aberto ? 0 : (int)e.Tipo).ThenBy(e => e.Ordem).ToArray();

    private static EstagioFunil Novo(string contaId, string nome, string cor, int ordem, TipoEstagioFunil tipo) =>
        new() { Id = Guid.NewGuid(), ContaId = contaId, Nome = nome, Cor = cor, Ordem = ordem, Tipo = tipo };
}
