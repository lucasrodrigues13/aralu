using System.Text.RegularExpressions;
using Project.Domain.Tarefas;

namespace Project.Domain.Eventos;

/// <summary>
/// Uma linha lida da lista colada ou da planilha (SPEC-012 v3 §8.6 e §8.7). É só leitura: a tela mostra numa grade
/// editável e só grava o que a pessoa confirmar. Responsáveis e serviço vêm como texto; a tela resolve contra as
/// assistentes e o cadastro de serviços.
/// </summary>
public sealed record TarefaImportada(
    string Titulo,
    string? Servico,
    int? PrazoRelativo,
    DateOnly? PrazoData,
    IReadOnlyList<string> Responsaveis,
    PrioridadeTarefa? Prioridade,
    string? Descricao,
    IReadOnlyList<string> Avisos);

public sealed record ResultadoLeituraTarefas(
    IReadOnlyList<TarefaImportada> Tarefas,
    IReadOnlyList<string> LinhasIgnoradas);

/// <summary>Linha da planilha já separada nas colunas da SPEC-012 v3 §8.7.</summary>
public sealed record LinhaPlanilhaTarefa(
    string? Tarefa,
    string? Servico,
    string? Prazo,
    string? Responsaveis,
    string? Prioridade,
    string? Descricao);

/// <summary>Leitura de texto colado e de linhas de planilha (SPEC-012 v3 §8.6 e §8.7).</summary>
public static partial class ImportacaoTarefasModelo
{
    public const int MaximoTitulo = 200;
    public const int MaximoServico = 200;
    public const int MaximoLinhas = 500;

    private static readonly Regex Marcadores = MarcadoresRegex();
    private static readonly Regex PrazoEntreParenteses = PrazoParentesesRegex();

    /// <param name="aceitaData">Falso no modelo (só prazo relativo); verdadeiro no evento.</param>
    public static ResultadoLeituraTarefas LerTexto(string? texto, bool aceitaData)
    {
        var linhas = (texto ?? "")
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n')
            .Split('\n');
        return LerLinhasDeTexto(linhas, aceitaData);
    }

    public static ResultadoLeituraTarefas LerLinhasDeTexto(IEnumerable<string?> linhas, bool aceitaData)
    {
        string? servicoAtual = null;
        var tarefas = new List<TarefaImportada>();
        var ignoradas = new List<string>();
        var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var bruta in linhas)
        {
            if (tarefas.Count >= MaximoLinhas)
            {
                ignoradas.Add("Limite de 500 linhas atingido.");
                break;
            }

            var linha = bruta?.Trim();
            if (string.IsNullOrEmpty(linha))
            {
                continue;
            }

            if (EhTituloDeServico(linha))
            {
                servicoAtual = NormalizarServico(RemoverMarcadores(linha.TrimEnd(':').Trim()));
                continue;
            }

            var (tituloBruto, prazoTexto) = SepararPrazoEntreParenteses(linha);
            var titulo = RemoverMarcadores(tituloBruto).Trim();
            if (string.IsNullOrEmpty(titulo))
            {
                ignoradas.Add(linha);
                continue;
            }

            var avisos = new List<string>();
            titulo = CortarTitulo(titulo, avisos);
            var (relativo, data) = LerPrazo(prazoTexto, aceitaData, avisos);
            if (!vistos.Add(Chave(servicoAtual, titulo)))
            {
                continue;
            }

            tarefas.Add(new TarefaImportada(titulo, servicoAtual, relativo, data, [], null, null, avisos));
        }

        return new ResultadoLeituraTarefas(tarefas, ignoradas);
    }

    public static ResultadoLeituraTarefas LerPlanilha(IEnumerable<LinhaPlanilhaTarefa> linhas, bool aceitaData)
    {
        var tarefas = new List<TarefaImportada>();
        var ignoradas = new List<string>();
        var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var linha in linhas)
        {
            if (tarefas.Count >= MaximoLinhas)
            {
                ignoradas.Add("Limite de 500 linhas atingido.");
                break;
            }

            var titulo = linha.Tarefa?.Trim();
            if (string.IsNullOrEmpty(titulo))
            {
                if (!string.IsNullOrWhiteSpace(linha.Servico) || !string.IsNullOrWhiteSpace(linha.Prazo))
                {
                    ignoradas.Add("Linha sem coluna Tarefa.");
                }

                continue;
            }

            var avisos = new List<string>();
            titulo = CortarTitulo(titulo, avisos);
            var servico = NormalizarServico(linha.Servico);
            var (relativo, data) = LerPrazo(linha.Prazo, aceitaData, avisos);
            var prioridade = LerPrioridade(linha.Prioridade, avisos);
            if (!vistos.Add(Chave(servico, titulo)))
            {
                continue;
            }

            tarefas.Add(new TarefaImportada(
                titulo,
                servico,
                relativo,
                data,
                PartirResponsaveis(linha.Responsaveis),
                prioridade,
                Comum.Texto.Limpo(linha.Descricao),
                avisos));
        }

        return new ResultadoLeituraTarefas(tarefas, ignoradas);
    }

    public static bool EhTituloDeServico(string linha)
    {
        var limpo = linha.Trim();
        if (limpo.EndsWith(':'))
        {
            return true;
        }

        var temLetra = false;
        foreach (var c in limpo)
        {
            if (!char.IsLetter(c))
            {
                continue;
            }

            temLetra = true;
            if (char.IsLower(c))
            {
                return false;
            }
        }

        return temLetra;
    }

    public static string RemoverMarcadores(string linha) => Marcadores.Replace(linha.TrimStart(), "").Trim();

    /// <summary>Responsáveis da célula: separados por ";", "," ou "/".</summary>
    public static IReadOnlyList<string> PartirResponsaveis(string? texto) =>
        (texto ?? "")
            .Split([';', ',', '/'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

    private static (int? Relativo, DateOnly? Data) LerPrazo(string? texto, bool aceitaData, List<string> avisos)
    {
        if (string.IsNullOrWhiteSpace(texto))
        {
            return (null, null);
        }

        if (!PrazoModelo.TentarLerPrazo(texto, aceitaData: true, out var relativo, out var data))
        {
            avisos.Add("Prazo não reconhecido.");
            return (null, null);
        }

        if (data is not null && !aceitaData)
        {
            avisos.Add("Modelo aceita só prazo relativo.");
            return (null, null);
        }

        return (relativo, data);
    }

    private static PrioridadeTarefa? LerPrioridade(string? texto, List<string> avisos)
    {
        var limpo = texto?.Trim().ToLowerInvariant().Replace("é", "e", StringComparison.Ordinal);
        switch (limpo)
        {
            case null or "":
                return null;
            case "baixa":
                return PrioridadeTarefa.Baixa;
            case "media":
                return PrioridadeTarefa.Media;
            case "alta":
                return PrioridadeTarefa.Alta;
            default:
                avisos.Add("Prioridade não reconhecida.");
                return null;
        }
    }

    private static string CortarTitulo(string titulo, List<string> avisos)
    {
        if (titulo.Length <= MaximoTitulo)
        {
            return titulo;
        }

        avisos.Add("Título cortado em 200 caracteres.");
        return titulo[..MaximoTitulo];
    }

    private static (string Titulo, string? Prazo) SepararPrazoEntreParenteses(string linha)
    {
        var match = PrazoEntreParenteses.Match(linha);
        return match.Success ? (linha[..match.Index].TrimEnd(), match.Groups[1].Value.Trim()) : (linha, null);
    }

    private static string? NormalizarServico(string? valor)
    {
        var limpo = valor?.Trim();
        if (string.IsNullOrEmpty(limpo))
        {
            return null;
        }

        return limpo.Length > MaximoServico ? limpo[..MaximoServico] : limpo;
    }

    private static string Chave(string? servico, string titulo) =>
        Comum.Texto.ChaveComparacao(servico ?? "") + "\u001f" + Comum.Texto.ChaveComparacao(titulo);

    [GeneratedRegex(@"^(?:(?:[-*•]|\[[ xX]\]|\d+[.)])\s*)+", RegexOptions.CultureInvariant)]
    private static partial Regex MarcadoresRegex();

    [GeneratedRegex(@"\(([^)]+)\)\s*$", RegexOptions.CultureInvariant)]
    private static partial Regex PrazoParentesesRegex();
}
