namespace Project.Domain.Convidados;

public static class PlanilhaConvites
{
    public static readonly string[] Colunas =
    [
        "Nome do convite *",
        "DDI",
        "DDD + Telefone para confirmação de presença",
        "Observação do convite",
        "Nome dos convidados *",
        "Gênero",
        "Faixa etária",
        "Custo/pagamento",
        "Situação",
        "Mesa",
    ];

    /// <summary>
    /// Exemplo do modelo (aba "Exemplo", SPEC-059): uma linha por convidado; o nome do convite se repete para agrupar;
    /// o primeiro convidado de cada convite tem telefone (obrigatório), os demais podem ficar sem.
    /// </summary>
    public static readonly string[][] Exemplo =
    [
        ["Família Souza", "+55", "11999990000", "Amigos da noiva", "Maria Souza", "Feminino", "Adulto", "Inteira", "Pendente", "3"],
        ["Família Souza", "", "", "", "João Souza", "Masculino", "Adulto", "Inteira", "Pendente", "3"],
        ["Família Souza", "", "", "", "Pedro Souza", "Masculino", "Criança", "Meia", "Pendente", "3"],
        ["Ana Lima", "+55", "21988887777", "", "Ana Lima", "Feminino", "Adulto", "Inteira", "Pendente", ""],
    ];

    public static bool CabecalhoValido(IReadOnlyList<string?> colunas)
    {
        if (colunas.Count < Colunas.Length)
        {
            return false;
        }

        for (var i = 0; i < Colunas.Length; i++)
        {
            if (!string.Equals(colunas[i]?.Trim(), Colunas[i], StringComparison.Ordinal))
            {
                return false;
            }
        }

        return true;
    }
}
