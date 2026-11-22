namespace Project.Domain.Convidados;

/// <summary>Planilha de importação de convidados (SPEC-010, revisada pela SPEC-059).</summary>
public static class PlanilhaConvites
{
    /// <summary>Colunas do modelo. Mesa e custo saíram (SPEC-059): ficam só para edição nas telas.</summary>
    public static readonly string[] Colunas =
    [
        "Nome do convite *",
        "DDI",
        "DDD + Telefone para confirmação de presença",
        "Observação do convite",
        "Nome dos convidados *",
        "Convidado principal *",
        "Gênero",
        "Faixa etária",
        "Situação",
    ];

    /// <summary>Colunas de modelos antigos que a importação aceita e ignora.</summary>
    public static readonly string[] ColunasIgnoradas = ["Custo/pagamento", "Mesa"];

    public static readonly string[] SimNao = ["Sim", "Não"];

    public static readonly string[] Generos = ["Masculino", "Feminino"];

    public static readonly string[] Faixas = ["Adulto", "Adolescente", "Criança", "Criança de colo", "Idoso"];

    public static readonly string[] Situacoes = ["Pendente", "Confirmado", "Não comparecerá"];

    public const string Orientacao =
        "As linhas abaixo do cabeçalho são exemplos: apague-as antes de importar. "
        + "Uma linha por convidado; repita o nome do convite nas linhas de quem recebe junto. "
        + "Marque Sim em Convidado principal para um convidado por convite (quem recebe as comunicações); ele precisa de DDI e telefone.";

    /// <summary>
    /// Exemplos que já vêm preenchidos no modelo (SPEC-059): dois convites, um com três convidados. Ficam na aba que se
    /// importa, com a orientação para apagá-los; a importação recusa a planilha se eles continuarem lá.
    /// </summary>
    public static readonly string[][] Exemplo =
    [
        ["Família Souza (exemplo)", "+55", "11999990000", "Amigos da noiva", "Maria Souza", "Sim", "Feminino", "Adulto", "Pendente"],
        ["Família Souza (exemplo)", "", "", "", "João Souza", "Não", "Masculino", "Adulto", "Pendente"],
        ["Família Souza (exemplo)", "", "", "", "Pedro Souza", "Não", "Masculino", "Criança", "Pendente"],
        ["Ana Lima (exemplo)", "+55", "21988887777", "", "Ana Lima", "Sim", "Feminino", "Adulto", "Pendente"],
    ];

    /// <summary>Sim ou Não (vazio = Não); nulo para qualquer outro valor.</summary>
    public static bool? LerSimNao(string? valor)
    {
        var texto = valor?.Trim();
        if (string.IsNullOrEmpty(texto) || string.Equals(texto, "Não", StringComparison.OrdinalIgnoreCase) || string.Equals(texto, "Nao", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return string.Equals(texto, "Sim", StringComparison.OrdinalIgnoreCase) ? true : null;
    }

    /// <summary>Linha de exemplo do modelo que o usuário esqueceu de apagar (mesmo convite e convidado do exemplo).</summary>
    public static bool LinhaDeExemplo(string? convite, string? convidado) =>
        Exemplo.Any(linha =>
            string.Equals(linha[0], convite?.Trim(), StringComparison.OrdinalIgnoreCase)
            && string.Equals(linha[4], convidado?.Trim(), StringComparison.OrdinalIgnoreCase));

    /// <summary>
    /// Posição de cada coluna do modelo no cabeçalho lido, pelo nome e em qualquer ordem. Colunas a mais (como Mesa e
    /// Custo/pagamento de modelos antigos) são ignoradas. Nulo se faltar alguma coluna do modelo.
    /// </summary>
    public static int[]? MapearCabecalho(IReadOnlyList<string?> cabecalho) =>
        ColunasQueFaltam(cabecalho).Count == 0 ? Posicoes(cabecalho) : null;

    /// <summary>Colunas do modelo que não estão no cabeçalho lido.</summary>
    public static IReadOnlyList<string> ColunasQueFaltam(IReadOnlyList<string?> cabecalho) =>
        Colunas.Where(coluna => !cabecalho.Any(lida => string.Equals(lida?.Trim(), coluna, StringComparison.Ordinal))).ToArray();

    private static int[]? Posicoes(IReadOnlyList<string?> cabecalho)
    {
        var posicoes = new int[Colunas.Length];
        for (var i = 0; i < Colunas.Length; i++)
        {
            posicoes[i] = -1;
            for (var j = 0; j < cabecalho.Count; j++)
            {
                if (string.Equals(cabecalho[j]?.Trim(), Colunas[i], StringComparison.Ordinal))
                {
                    posicoes[i] = j;
                    break;
                }
            }

            if (posicoes[i] < 0)
            {
                return null;
            }
        }

        return posicoes;
    }
}
