using Project.Domain.Fornecedores;

namespace Project.Domain.Modelos;

public sealed record SecaoPlanilhaBriefing(string Titulo, string? Descricao, IReadOnlyList<string> Perguntas);

public sealed record LeituraPlanilhaBriefing(IReadOnlyList<SecaoPlanilhaBriefing> Secoes, IReadOnlyList<string> Erros);

/// <summary>
/// Planilha de briefing: aba "Briefing", uma pergunta por linha com a seção ao lado. Linhas da mesma seção
/// (sem diferenciar maiúsculas e acentos) formam uma seção só, na ordem em que a seção aparece pela primeira vez.
/// </summary>
public static class PlanilhaBriefing
{
    public const string AbaBriefing = "Briefing";
    public const string MarcaExemplo = "(exemplo)";
    public const int MaximoTexto = 500;

    public static readonly string[] Colunas = ["Seção *", "Pergunta *", "Descrição da seção"];

    public static readonly string[][] Exemplos =
    [
        ["Conhecendo o casal (exemplo)", "Onde e como se conheceram?", "Perguntas para abrir a conversa"],
        ["Conhecendo o casal (exemplo)", "Há quanto tempo estão juntos?", ""],
        ["Sobre o casamento (exemplo)", "Tem um número estimado de convidados?", ""],
    ];

    /// <param name="linhas">Linhas da aba Briefing, com o cabeçalho na primeira.</param>
    public static LeituraPlanilhaBriefing Interpretar(IReadOnlyList<IReadOnlyList<string?>> linhas)
    {
        if (linhas.Count == 0)
        {
            return new([], ["A aba Briefing está vazia."]);
        }

        var col = Mapear(linhas[0]);
        if (!col.ContainsKey("secao") || !col.ContainsKey("pergunta"))
        {
            return new([], ["A aba Briefing precisa das colunas Seção e Pergunta. Use a planilha modelo."]);
        }

        var erros = new List<string>();
        var ordem = new List<string>();
        var secoes = new Dictionary<string, (string Titulo, string? Descricao, List<string> Perguntas)>();
        for (var i = 1; i < linhas.Count; i++)
        {
            var celulas = linhas[i];
            if (celulas.All(string.IsNullOrWhiteSpace))
            {
                continue;
            }

            var linha = i + 1;
            var secao = Celula(celulas, col, "secao");
            var pergunta = Celula(celulas, col, "pergunta");
            var descricao = Celula(celulas, col, "descricaodasecao") ?? Celula(celulas, col, "descricao");
            if (secao is null)
            {
                erros.Add($"Linha {linha}: informe a seção.");
                continue;
            }

            if (secao.Contains(MarcaExemplo, StringComparison.OrdinalIgnoreCase))
            {
                erros.Add($"Linha {linha}: apague as linhas de exemplo antes de importar.");
                continue;
            }

            if (pergunta is null)
            {
                erros.Add($"Linha {linha}: informe a pergunta.");
                continue;
            }

            if (secao.Length > MaximoTexto || pergunta.Length > MaximoTexto)
            {
                erros.Add($"Linha {linha}: seção e pergunta podem ter no máximo {MaximoTexto} caracteres.");
                continue;
            }

            var chave = PlanilhaFornecedores.Normalizar(secao);
            if (!secoes.TryGetValue(chave, out var atual))
            {
                ordem.Add(chave);
                atual = (secao, descricao, []);
            }
            else if (atual.Descricao is null && descricao is not null)
            {
                atual = atual with { Descricao = descricao };
            }

            atual.Perguntas.Add(pergunta);
            secoes[chave] = atual;
        }

        var lidas = ordem.Select(chave => secoes[chave]).Select(s => new SecaoPlanilhaBriefing(s.Titulo, s.Descricao, s.Perguntas)).ToList();
        if (lidas.Count == 0 && erros.Count == 0)
        {
            erros.Add("A planilha não tem nenhuma pergunta preenchida.");
        }

        return new(erros.Count > 0 ? [] : lidas, erros);
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
