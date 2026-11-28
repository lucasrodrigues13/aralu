using System.Globalization;
using System.Text;

namespace Project.Domain.Eventos;

/// <summary>Índices das colunas reconhecidas no cabeçalho da planilha de tarefas.</summary>
public sealed record ColunasPlanilhaTarefas(
    int Tarefa,
    int? Servico,
    int? Prazo,
    int? Responsaveis,
    int? Prioridade,
    int? Descricao);

/// <summary>Colunas da planilha de tarefas (SPEC-012 v3 §8.7). A coluna "Grupo" da v2 é lida como Serviço.</summary>
public static class PlanilhaTarefasModelo
{
    public const string ColunaTarefa = "Tarefa";
    public const string ColunaServico = "Serviço";
    public const string ColunaPrazo = "Prazo";
    public const string ColunaResponsaveis = "Responsáveis";
    public const string ColunaPrioridade = "Prioridade";
    public const string ColunaDescricao = "Descrição";

    public static readonly string[] Colunas = [ColunaTarefa, ColunaServico, ColunaPrazo, ColunaResponsaveis, ColunaPrioridade, ColunaDescricao];

    /// <summary>Linhas de exemplo da planilha modelo.</summary>
    public static readonly string[][] Exemplos =
    [
        ["Pedir 3 orçamentos", "Buffet", "6 meses antes", "Organizador", "Alta", "Comparar cardápio e preço por pessoa"],
        ["Degustação", "Buffet", "3 meses antes", "Organizador; Cliente", "Média", ""],
        ["Pedir depoimento", "", "2 semanas depois", "Assistente", "Baixa", ""],
    ];

    /// <summary>Resolve os índices das colunas pelo cabeçalho (ordem livre, sem diferenciar acentos). Exige Tarefa.</summary>
    public static bool TentarMapearCabecalho(IReadOnlyList<string?> cabecalho, out ColunasPlanilhaTarefas colunas, out string? erro)
    {
        int? tarefa = null, servico = null, prazo = null, responsaveis = null, prioridade = null, descricao = null;
        for (var i = 0; i < cabecalho.Count; i++)
        {
            switch (Normalizar(cabecalho[i]))
            {
                case "tarefa":
                    tarefa ??= i;
                    break;
                case "servico":
                    servico = i;
                    break;
                case "grupo":
                    servico ??= i;
                    break;
                case "prazo":
                    prazo ??= i;
                    break;
                case "responsaveis" or "responsavel":
                    responsaveis ??= i;
                    break;
                case "prioridade":
                    prioridade ??= i;
                    break;
                case "descricao":
                    descricao ??= i;
                    break;
            }
        }

        colunas = new ColunasPlanilhaTarefas(tarefa ?? -1, servico, prazo, responsaveis, prioridade, descricao);
        erro = tarefa is null ? "A planilha precisa da coluna Tarefa." : null;
        return tarefa is not null;
    }

    private static string Normalizar(string? texto)
    {
        var limpo = (texto ?? "").Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(limpo.Length);
        foreach (var c in limpo)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        return sb.ToString();
    }
}
