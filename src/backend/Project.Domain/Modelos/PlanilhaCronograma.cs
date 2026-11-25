using System.Globalization;
using Project.Domain.Fornecedores;

namespace Project.Domain.Modelos;

public sealed record ItemPlanilhaCronograma(
    string Rotulo,
    string? Descricao,
    DateOnly? Data,
    TimeOnly? Hora,
    string? Responsavel,
    string? RecadoFornecedores);

public sealed record LeituraPlanilhaCronograma(IReadOnlyList<ItemPlanilhaCronograma> Itens, IReadOnlyList<string> Erros);

/// <summary>Planilha de cronograma: aba "Cronograma", um item por linha, na ordem da planilha.</summary>
public static class PlanilhaCronograma
{
    public const string AbaCronograma = "Cronograma";
    public const string MarcaExemplo = "(exemplo)";
    public const int MaximoRotulo = 500;
    public const int MaximoTexto = 4000;

    public static readonly string[] Colunas = ["Item *", "Descrição", "Data", "Hora", "Responsável", "Recado aos fornecedores"];

    public static readonly string[][] Exemplos =
    [
        ["Entrega das flores (exemplo)", "Descrever quais flores e quanto de cada tipo", "", "08:00", "Organizador", "Entrada pela lateral"],
        ["Chegada do buffet (exemplo)", "", "", "14:00", "Assistente", ""],
    ];

    private static readonly string[] FormatosHora = ["H:mm", "HH:mm", "H:mm:ss", "HH:mm:ss", "H'h'mm", "HH'h'mm", "H'h'", "HH'h'"];
    private static readonly string[] FormatosData = ["dd/MM/yyyy", "d/M/yyyy", "dd/MM/yyyy HH:mm", "yyyy-MM-dd"];

    /// <param name="linhas">Linhas da aba Cronograma, com o cabeçalho na primeira.</param>
    public static LeituraPlanilhaCronograma Interpretar(IReadOnlyList<IReadOnlyList<string?>> linhas)
    {
        if (linhas.Count == 0)
        {
            return new([], ["A aba Cronograma está vazia."]);
        }

        var col = Mapear(linhas[0]);
        if (!col.ContainsKey("item"))
        {
            return new([], ["A aba Cronograma precisa da coluna Item. Use a planilha modelo."]);
        }

        var erros = new List<string>();
        var itens = new List<ItemPlanilhaCronograma>();
        for (var i = 1; i < linhas.Count; i++)
        {
            var celulas = linhas[i];
            if (celulas.All(string.IsNullOrWhiteSpace))
            {
                continue;
            }

            var linha = i + 1;
            var rotulo = Celula(celulas, col, "item");
            var descricao = Celula(celulas, col, "descricao");
            var dataTexto = Celula(celulas, col, "data");
            var horaTexto = Celula(celulas, col, "hora");
            var responsavelTexto = Celula(celulas, col, "responsavel");
            var recado = Celula(celulas, col, "recadoaosfornecedores");
            if (rotulo is null)
            {
                erros.Add($"Linha {linha}: informe o item.");
                continue;
            }

            if (rotulo.Contains(MarcaExemplo, StringComparison.OrdinalIgnoreCase))
            {
                erros.Add($"Linha {linha}: apague as linhas de exemplo antes de importar.");
                continue;
            }

            DateOnly? data = null;
            if (dataTexto is not null)
            {
                if (!DateTime.TryParseExact(dataTexto, FormatosData, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia))
                {
                    erros.Add($"Linha {linha}: data inválida. Use o formato 25/12/2026.");
                    continue;
                }

                data = DateOnly.FromDateTime(dia);
            }

            TimeOnly? hora = null;
            if (horaTexto is not null)
            {
                if (!TimeOnly.TryParseExact(horaTexto.ToLowerInvariant(), FormatosHora, CultureInfo.InvariantCulture, DateTimeStyles.None, out var valor))
                {
                    erros.Add($"Linha {linha}: hora inválida. Use o formato 15:30.");
                    continue;
                }

                hora = valor;
            }

            var responsavel = ResponsaveisCronograma.Normalizar(responsavelTexto);
            if (responsavelTexto is not null && responsavel is null)
            {
                erros.Add($"Linha {linha}: responsável deve ser Organizador, Assistente ou Cliente.");
                continue;
            }

            if (rotulo.Length > MaximoRotulo || (descricao?.Length ?? 0) > MaximoTexto || (recado?.Length ?? 0) > MaximoTexto)
            {
                erros.Add($"Linha {linha}: o item pode ter no máximo {MaximoRotulo} caracteres, e a descrição e o recado, {MaximoTexto}.");
                continue;
            }

            itens.Add(new(rotulo, descricao, data, hora, responsavel, recado));
        }

        if (itens.Count == 0 && erros.Count == 0)
        {
            erros.Add("A planilha não tem nenhum item preenchido.");
        }

        return new(erros.Count > 0 ? [] : itens, erros);
    }

    private static Dictionary<string, int> Mapear(IReadOnlyList<string?> cabecalho)
    {
        var mapa = new Dictionary<string, int>();
        for (var i = 0; i < cabecalho.Count; i++)
        {
            mapa.TryAdd(PlanilhaFornecedores.Normalizar(cabecalho[i]).TrimEnd('*'), i);
        }

        return mapa;
    }

    private static string? Celula(IReadOnlyList<string?> celulas, Dictionary<string, int> col, string chave) =>
        col.TryGetValue(chave, out var i) && i < celulas.Count && !string.IsNullOrWhiteSpace(celulas[i])
            ? celulas[i]!.Trim()
            : null;
}
