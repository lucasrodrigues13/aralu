namespace Project.Domain.Eventos;

public static class PlanilhaTarefasModelo
{
    public const string ColunaTarefa = "Tarefa";
    public const string ColunaGrupo = "Grupo";
    public const string ColunaPrazo = "Prazo";

    public static readonly string[] Colunas = [ColunaTarefa, ColunaGrupo, ColunaPrazo];

    /// <summary>
    /// Resolve índices das colunas pelo cabeçalho (ordem livre). Exige a coluna Tarefa.
    /// </summary>
    public static bool TentarMapearCabecalho(
        IReadOnlyList<string?> cabecalho,
        out int tarefa,
        out int? grupo,
        out int? prazo,
        out string? erro)
    {
        tarefa = -1;
        grupo = null;
        prazo = null;
        erro = null;

        for (var i = 0; i < cabecalho.Count; i++)
        {
            var nome = cabecalho[i]?.Trim();
            if (string.IsNullOrEmpty(nome))
            {
                continue;
            }

            if (NomeIgual(nome, ColunaTarefa))
            {
                tarefa = i;
            }
            else if (NomeIgual(nome, ColunaGrupo))
            {
                grupo = i;
            }
            else if (NomeIgual(nome, ColunaPrazo))
            {
                prazo = i;
            }
        }

        if (tarefa < 0)
        {
            erro = "A planilha precisa da coluna Tarefa.";
            return false;
        }

        return true;
    }

    private static bool NomeIgual(string a, string b) =>
        string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
}
