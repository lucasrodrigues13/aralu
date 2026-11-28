using System.Globalization;
using Project.Domain.Fornecedores;

namespace Project.Domain.Modelos;

public sealed record MomentoPlanilhaRoteiro(string Titulo, TimeOnly? Horario, string? Musica, IReadOnlyList<string> Itens);

public sealed record LeituraPlanilhaRoteiro(IReadOnlyList<MomentoPlanilhaRoteiro> Momentos, IReadOnlyList<string> Erros);

/// <summary>
/// Planilha de roteiro: aba "Roteiro", um item por linha com o momento ao lado. Linhas do mesmo momento
/// (sem diferenciar maiúsculas e acentos) formam um momento só, na ordem em que ele aparece pela primeira vez.
/// Horário e música valem para o momento: basta preencher em uma das linhas dele.
/// </summary>
public static class PlanilhaRoteiro
{
    public const string AbaRoteiro = "Roteiro";
    public const string MarcaExemplo = "(exemplo)";
    public const int MaximoTexto = 500;

    public static readonly string[] Colunas = ["Momento *", "Horário", "Música", "Item"];

    public static readonly string[][] Exemplos =
    [
        ["Chegada dos convidados (exemplo)", "15:30", "", "Checar alianças"],
        ["Chegada dos convidados (exemplo)", "", "", "Checar microfone do celebrante"],
        ["Entrada da noiva (exemplo)", "16:00", "Canon em ré", "Checar véu"],
    ];

    private static readonly string[] FormatosHora = ["H:mm", "HH:mm", "H:mm:ss", "HH:mm:ss", "H'h'mm", "HH'h'mm", "H'h'", "HH'h'"];

    /// <param name="linhas">Linhas da aba Roteiro, com o cabeçalho na primeira.</param>
    public static LeituraPlanilhaRoteiro Interpretar(IReadOnlyList<IReadOnlyList<string?>> linhas)
    {
        if (linhas.Count == 0)
        {
            return new([], ["A aba Roteiro está vazia."]);
        }

        var col = Mapear(linhas[0]);
        if (!col.ContainsKey("momento"))
        {
            return new([], ["A aba Roteiro precisa da coluna Momento. Use a planilha modelo."]);
        }

        var erros = new List<string>();
        var ordem = new List<string>();
        var momentos = new Dictionary<string, (string Titulo, TimeOnly? Horario, string? Musica, List<string> Itens)>();
        for (var i = 1; i < linhas.Count; i++)
        {
            var celulas = linhas[i];
            if (celulas.All(string.IsNullOrWhiteSpace))
            {
                continue;
            }

            var linha = i + 1;
            var momento = Celula(celulas, col, "momento");
            var horaTexto = Celula(celulas, col, "horario");
            var musica = Celula(celulas, col, "musica");
            var item = Celula(celulas, col, "item");
            if (momento is null)
            {
                erros.Add($"Linha {linha}: informe o momento.");
                continue;
            }

            if (momento.Contains(MarcaExemplo, StringComparison.OrdinalIgnoreCase))
            {
                erros.Add($"Linha {linha}: apague as linhas de exemplo antes de importar.");
                continue;
            }

            TimeOnly? horario = null;
            if (horaTexto is not null)
            {
                if (!TimeOnly.TryParseExact(horaTexto.ToLowerInvariant(), FormatosHora, CultureInfo.InvariantCulture, DateTimeStyles.None, out var hora))
                {
                    erros.Add($"Linha {linha}: horário inválido. Use o formato 15:30.");
                    continue;
                }

                horario = hora;
            }

            if (momento.Length > MaximoTexto || (item?.Length ?? 0) > MaximoTexto || (musica?.Length ?? 0) > MaximoTexto)
            {
                erros.Add($"Linha {linha}: momento, música e item podem ter no máximo {MaximoTexto} caracteres.");
                continue;
            }

            var chave = PlanilhaFornecedores.Normalizar(momento);
            if (!momentos.TryGetValue(chave, out var atual))
            {
                ordem.Add(chave);
                atual = (momento, horario, musica, []);
            }
            else
            {
                atual = atual with { Horario = atual.Horario ?? horario, Musica = atual.Musica ?? musica };
            }

            if (item is not null)
            {
                atual.Itens.Add(item);
            }

            momentos[chave] = atual;
        }

        var lidos = ordem.Select(chave => momentos[chave]).Select(m => new MomentoPlanilhaRoteiro(m.Titulo, m.Horario, m.Musica, m.Itens)).ToList();
        if (lidos.Count == 0 && erros.Count == 0)
        {
            erros.Add("A planilha não tem nenhum momento preenchido.");
        }

        return new(erros.Count > 0 ? [] : lidos, erros);
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
