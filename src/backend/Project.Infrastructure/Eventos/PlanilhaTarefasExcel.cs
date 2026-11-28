using System.Globalization;
using System.Text;
using ExcelDataReader;
using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Eventos;

namespace Project.Infrastructure.Eventos;

/// <summary>Planilha de tarefas (SPEC-012 v3 §8.7): modelo para baixar e leitura de .xlsx/.csv.</summary>
public sealed class PlanilhaTarefasExcel : IPlanilhaTarefasModelo
{
    private const long MaximoBytes = 2 * 1024 * 1024;

    public PlanilhaTarefasExcel()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public byte[] Modelo()
    {
        using var livro = new ClosedXML.Excel.XLWorkbook();
        var aba = livro.AddWorksheet("Tarefas");
        for (var i = 0; i < PlanilhaTarefasModelo.Colunas.Length; i++)
        {
            aba.Cell(1, i + 1).Value = PlanilhaTarefasModelo.Colunas[i];
            aba.Cell(1, i + 1).Style.Font.Bold = true;
        }

        for (var linha = 0; linha < PlanilhaTarefasModelo.Exemplos.Length; linha++)
        {
            var valores = PlanilhaTarefasModelo.Exemplos[linha];
            for (var coluna = 0; coluna < valores.Length; coluna++)
            {
                aba.Cell(linha + 2, coluna + 1).Value = valores[coluna];
            }
        }

        aba.Columns().AdjustToContents();
        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        return memoria.ToArray();
    }

    public Resultado<ResultadoLeituraTarefas> Ler(Stream arquivo, string? nomeArquivo, bool aceitaData)
    {
        var extensao = Path.GetExtension(nomeArquivo ?? "").ToLowerInvariant();
        if (extensao is not ".xlsx" and not ".xls" and not ".csv")
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(Codigos.Validacao, "Envie uma planilha .xlsx ou .csv.");
        }

        if (arquivo.CanSeek && arquivo.Length > MaximoBytes)
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(Codigos.Validacao, "A planilha tem no máximo 2 MB.");
        }

        try
        {
            var linhas = extensao == ".csv" ? LerCsv(arquivo) : LerExcel(arquivo);
            if (linhas.Count == 0)
            {
                return Resultado<ResultadoLeituraTarefas>.Erro(Codigos.Validacao, "A planilha precisa da coluna Tarefa.");
            }

            if (!PlanilhaTarefasModelo.TentarMapearCabecalho(linhas[0], out var colunas, out var erro))
            {
                return Resultado<ResultadoLeituraTarefas>.Erro(Codigos.Validacao, erro!);
            }

            var dados = new List<LinhaPlanilhaTarefa>();
            for (var i = 1; i < linhas.Count; i++)
            {
                var celulas = linhas[i];
                string? Celula(int? indice) => indice is int idx && idx >= 0 && idx < celulas.Count ? celulas[idx] : null;
                var linha = new LinhaPlanilhaTarefa(
                    Celula(colunas.Tarefa),
                    Celula(colunas.Servico),
                    Celula(colunas.Prazo),
                    Celula(colunas.Responsaveis),
                    Celula(colunas.Prioridade),
                    Celula(colunas.Descricao));
                if (celulas.All(string.IsNullOrWhiteSpace))
                {
                    continue;
                }

                dados.Add(linha);
            }

            return Resultado<ResultadoLeituraTarefas>.Sucesso(ImportacaoTarefasModelo.LerPlanilha(dados, aceitaData));
        }
        catch (Exception)
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(Codigos.Validacao, "A planilha não pôde ser importada.");
        }
    }

    private static List<IReadOnlyList<string?>> LerExcel(Stream arquivo)
    {
        using var leitor = ExcelReaderFactory.CreateReader(arquivo);
        var linhas = new List<IReadOnlyList<string?>>();
        while (leitor.Read())
        {
            var celulas = new string?[leitor.FieldCount];
            for (var i = 0; i < leitor.FieldCount; i++)
            {
                celulas[i] = leitor.GetValue(i) switch
                {
                    null => null,
                    DateTime data => data.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
                    var valor => Convert.ToString(valor, CultureInfo.InvariantCulture),
                };
            }

            linhas.Add(celulas);
        }

        return linhas;
    }

    private static List<IReadOnlyList<string?>> LerCsv(Stream arquivo)
    {
        using var reader = new StreamReader(arquivo, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var linhas = new List<IReadOnlyList<string?>>();
        char? separador = null;
        while (reader.ReadLine() is { } linha)
        {
            // O separador sai do cabeçalho: o Excel em português salva CSV com ";".
            separador ??= linha.Count(c => c == ';') > linha.Count(c => c == ',') ? ';' : ',';
            linhas.Add(PartirCsv(linha, separador.Value));
        }

        return linhas;
    }

    private static string?[] PartirCsv(string linha, char separador)
    {
        var partes = new List<string?>();
        var atual = new StringBuilder();
        var entreAspas = false;
        for (var i = 0; i < linha.Length; i++)
        {
            var c = linha[i];
            if (c == '"')
            {
                if (entreAspas && i + 1 < linha.Length && linha[i + 1] == '"')
                {
                    atual.Append('"');
                    i++;
                }
                else
                {
                    entreAspas = !entreAspas;
                }
            }
            else if (c == separador && !entreAspas)
            {
                partes.Add(atual.ToString());
                atual.Clear();
            }
            else
            {
                atual.Append(c);
            }
        }

        partes.Add(atual.ToString());
        return partes.ToArray();
    }
}
