using System.Text;
using System.Text.RegularExpressions;

namespace Project.Domain.Eventos;

public sealed record TarefaImportada(string Titulo, string? Grupo, int? DiasAntes, string? Aviso);

public sealed record ResultadoLeituraTarefas(
    IReadOnlyList<TarefaImportada> Tarefas,
    IReadOnlyList<string> LinhasIgnoradas);

/// <summary>Leitura de texto colado e de linhas de planilha (SPEC-012 §8.3 e §8.4).</summary>
public static partial class ImportacaoTarefasModelo
{
    public const int MaximoTitulo = 200;
    public const int MaximoGrupo = 80;
    public const int MaximoLinhas = 500;

    private static readonly Regex Marcadores = MarcadoresRegex();
    private static readonly Regex PrazoEntreParenteses = PrazoParentesesRegex();

    public static ResultadoLeituraTarefas LerTexto(string? texto)
    {
        var linhas = (texto ?? "")
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n')
            .Split('\n');
        return LerLinhasDeTexto(linhas);
    }

    public static ResultadoLeituraTarefas LerLinhasDeTexto(IEnumerable<string?> linhas)
    {
        string? grupoAtual = null;
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

            if (EhTituloDeGrupo(linha))
            {
                grupoAtual = NormalizarGrupo(linha.TrimEnd(':').Trim());
                continue;
            }

            var (tituloBruto, prazoTexto) = SepararPrazoEntreParenteses(linha);
            var titulo = RemoverMarcadores(tituloBruto).Trim();
            if (string.IsNullOrEmpty(titulo))
            {
                ignoradas.Add(linha);
                continue;
            }

            string? aviso = null;
            if (titulo.Length > MaximoTitulo)
            {
                titulo = titulo[..MaximoTitulo];
                aviso = "Título cortado em 200 caracteres.";
            }

            int? dias = null;
            if (prazoTexto is not null)
            {
                if (!PrazoModelo.TentarLer(prazoTexto, out dias))
                {
                    aviso = JuntarAvisos(aviso, "Prazo ilegível; tarefa sem prazo.");
                    dias = null;
                }
            }

            var chave = Chave(grupoAtual, titulo);
            if (!vistos.Add(chave))
            {
                continue;
            }

            tarefas.Add(new TarefaImportada(titulo, grupoAtual, dias, aviso));
        }

        return new ResultadoLeituraTarefas(tarefas, ignoradas);
    }

    /// <summary>
    /// Lê linhas já mapeadas da planilha (cabeçalho reconhecido). Prazo sem parênteses.
    /// </summary>
    public static ResultadoLeituraTarefas LerPlanilha(IEnumerable<(string? Grupo, string? Tarefa, string? Prazo)> linhas)
    {
        var tarefas = new List<TarefaImportada>();
        var ignoradas = new List<string>();
        var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var (grupoBruto, tarefaBruta, prazoBruto) in linhas)
        {
            if (tarefas.Count >= MaximoLinhas)
            {
                ignoradas.Add("Limite de 500 linhas atingido.");
                break;
            }

            var titulo = tarefaBruta?.Trim();
            if (string.IsNullOrEmpty(titulo))
            {
                if (!string.IsNullOrWhiteSpace(grupoBruto) || !string.IsNullOrWhiteSpace(prazoBruto))
                {
                    ignoradas.Add("Linha sem coluna Tarefa.");
                }

                continue;
            }

            string? aviso = null;
            if (titulo.Length > MaximoTitulo)
            {
                titulo = titulo[..MaximoTitulo];
                aviso = "Título cortado em 200 caracteres.";
            }

            var grupo = NormalizarGrupo(grupoBruto);
            int? dias = null;
            if (!string.IsNullOrWhiteSpace(prazoBruto))
            {
                if (!PrazoModelo.TentarLer(prazoBruto, out dias))
                {
                    aviso = JuntarAvisos(aviso, "Prazo ilegível; tarefa sem prazo.");
                    dias = null;
                }
            }

            var chave = Chave(grupo, titulo);
            if (!vistos.Add(chave))
            {
                continue;
            }

            tarefas.Add(new TarefaImportada(titulo, grupo, dias, aviso));
        }

        return new ResultadoLeituraTarefas(tarefas, ignoradas);
    }

    public static bool EhTituloDeGrupo(string linha)
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

    private static (string Titulo, string? Prazo) SepararPrazoEntreParenteses(string linha)
    {
        var match = PrazoEntreParenteses.Match(linha);
        if (!match.Success)
        {
            return (linha, null);
        }

        return (linha[..match.Index].TrimEnd(), match.Groups[1].Value.Trim());
    }

    private static string? NormalizarGrupo(string? valor)
    {
        var limpo = valor?.Trim();
        if (string.IsNullOrEmpty(limpo))
        {
            return null;
        }

        return limpo.Length > MaximoGrupo ? limpo[..MaximoGrupo] : limpo;
    }

    private static string Chave(string? grupo, string titulo)
    {
        var sb = new StringBuilder();
        sb.Append(grupo ?? "");
        sb.Append('\u001f');
        sb.Append(titulo);
        return sb.ToString();
    }

    private static string JuntarAvisos(string? a, string b) => string.IsNullOrEmpty(a) ? b : $"{a} {b}";

    [GeneratedRegex(@"^(?:(?:[-*•]|\[[ xX]\]|\d+[.)])\s*)+", RegexOptions.CultureInvariant)]
    private static partial Regex MarcadoresRegex();

    [GeneratedRegex(@"\(([^)]+)\)\s*$", RegexOptions.CultureInvariant)]
    private static partial Regex PrazoParentesesRegex();
}
