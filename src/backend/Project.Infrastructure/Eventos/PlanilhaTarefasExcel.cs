using System.Text;
using ExcelDataReader;
using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Eventos;

namespace Project.Infrastructure.Eventos;

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
        }

        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        return memoria.ToArray();
    }

    public Resultado<ResultadoLeituraTarefas> Ler(Stream arquivo, string? nomeArquivo)
    {
        var extensao = Path.GetExtension(nomeArquivo ?? "").ToLowerInvariant();
        if (extensao is not ".xlsx" and not ".xls" and not ".csv")
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(
                Codigos.Validacao, "Envie uma planilha .xlsx ou .csv.");
        }

        if (arquivo.CanSeek && arquivo.Length > MaximoBytes)
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(
                Codigos.Validacao, "A planilha tem no máximo 2 MB.");
        }

        try
        {
            if (extensao == ".csv")
            {
                return LerCsv(arquivo);
            }

            using var leitor = ExcelReaderFactory.CreateReader(arquivo);
            return LerLeitor(leitor);
        }
        catch (Exception)
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(
                Codigos.Validacao, "A planilha não pôde ser importada.");
        }
    }

    private static Resultado<ResultadoLeituraTarefas> LerCsv(Stream arquivo)
    {
        using var reader = new StreamReader(arquivo, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var linhasBrutas = new List<string[]>();
        while (reader.ReadLine() is { } linha)
        {
            linhasBrutas.Add(PartirCsv(linha));
        }

        if (linhasBrutas.Count == 0)
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(
                Codigos.Validacao, "A planilha precisa da coluna Tarefa.");
        }

        var cabecalho = linhasBrutas[0].Select(c => (string?)c).ToArray();
        if (!PlanilhaTarefasModelo.TentarMapearCabecalho(cabecalho, out var iTarefa, out var iGrupo, out var iPrazo, out var erro))
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(Codigos.Validacao, erro!);
        }

        var linhas = new List<(string? Grupo, string? Tarefa, string? Prazo)>();
        for (var i = 1; i < linhasBrutas.Count; i++)
        {
            var cols = linhasBrutas[i];
            string? Celula(int? indice) =>
                indice is int idx && idx < cols.Length ? cols[idx] : null;

            var tarefa = Celula(iTarefa);
            var grupo = Celula(iGrupo);
            var prazo = Celula(iPrazo);
            if (string.IsNullOrWhiteSpace(tarefa) && string.IsNullOrWhiteSpace(grupo) && string.IsNullOrWhiteSpace(prazo))
            {
                continue;
            }

            linhas.Add((grupo, tarefa, prazo));
        }

        return Resultado<ResultadoLeituraTarefas>.Sucesso(ImportacaoTarefasModelo.LerPlanilha(linhas));
    }

    private static Resultado<ResultadoLeituraTarefas> LerLeitor(IExcelDataReader leitor)
    {
        if (!leitor.Read())
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(
                Codigos.Validacao, "A planilha precisa da coluna Tarefa.");
        }

        var cabecalho = new string?[leitor.FieldCount];
        for (var i = 0; i < leitor.FieldCount; i++)
        {
            cabecalho[i] = leitor.GetValue(i)?.ToString();
        }

        if (!PlanilhaTarefasModelo.TentarMapearCabecalho(cabecalho, out var iTarefa, out var iGrupo, out var iPrazo, out var erro))
        {
            return Resultado<ResultadoLeituraTarefas>.Erro(Codigos.Validacao, erro!);
        }

        var linhas = new List<(string? Grupo, string? Tarefa, string? Prazo)>();
        while (leitor.Read())
        {
            string? Celula(int? indice) =>
                indice is int idx && idx < leitor.FieldCount ? leitor.GetValue(idx)?.ToString() : null;

            var tarefa = Celula(iTarefa);
            var grupo = Celula(iGrupo);
            var prazo = Celula(iPrazo);
            if (string.IsNullOrWhiteSpace(tarefa) && string.IsNullOrWhiteSpace(grupo) && string.IsNullOrWhiteSpace(prazo))
            {
                continue;
            }

            linhas.Add((grupo, tarefa, prazo));
        }

        return Resultado<ResultadoLeituraTarefas>.Sucesso(ImportacaoTarefasModelo.LerPlanilha(linhas));
    }

    private static string[] PartirCsv(string linha)
    {
        var partes = new List<string>();
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
            else if ((c == ',' || c == ';') && !entreAspas)
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
