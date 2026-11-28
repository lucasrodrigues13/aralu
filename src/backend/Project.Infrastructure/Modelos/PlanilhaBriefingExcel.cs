using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using ExcelDataReader;
using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Fornecedores;
using Project.Domain.Modelos;

namespace Project.Infrastructure.Modelos;

/// <summary>Planilha de briefing: modelo para baixar (com exemplos) e leitura da aba Briefing.</summary>
public sealed class PlanilhaBriefingExcel : IPlanilhaBriefing
{
    private const long MaximoBytes = 2 * 1024 * 1024;

    public PlanilhaBriefingExcel()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public byte[] Modelo()
    {
        using var livro = new XLWorkbook();
        var aba = livro.AddWorksheet(PlanilhaBriefing.AbaBriefing);
        for (var i = 0; i < PlanilhaBriefing.Colunas.Length; i++)
        {
            aba.Cell(1, i + 1).Value = PlanilhaBriefing.Colunas[i];
        }

        aba.Row(1).Style.Font.Bold = true;
        aba.SheetView.FreezeRows(1);
        var exemplos = PlanilhaBriefing.Exemplos;
        for (var linha = 0; linha < exemplos.Length; linha++)
        {
            for (var coluna = 0; coluna < exemplos[linha].Length; coluna++)
            {
                aba.Cell(linha + 2, coluna + 1).SetValue(exemplos[linha][coluna]);
            }
        }

        var faixa = aba.Range(2, 1, exemplos.Length + 1, PlanilhaBriefing.Colunas.Length);
        faixa.Style.Font.Italic = true;
        faixa.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFF4CE");
        aba.Columns().AdjustToContents();

        var instrucoes = livro.AddWorksheet("Instruções");
        string[] textos =
        [
            "Como preencher a planilha de briefing",
            "1. Apague as linhas de exemplo (destacadas em amarelo, com \"(exemplo)\" na seção) antes de importar. Se elas ficarem, a importação é recusada.",
            "2. Uma pergunta por linha. Seção e Pergunta são obrigatórias.",
            "3. Repita o nome da seção em cada pergunta dela. As seções e as perguntas entram na ordem da planilha.",
            "4. Descrição da seção é opcional: basta preencher em uma das linhas da seção.",
            "5. Todas as perguntas entram como texto curto.",
            "6. Não mude o cabeçalho. Se alguma linha tiver erro, nada é importado e a tela mostra todos os erros, com o número da linha.",
        ];
        for (var i = 0; i < textos.Length; i++)
        {
            instrucoes.Cell(i + 1, 1).Value = textos[i];
        }

        instrucoes.Cell(1, 1).Style.Font.Bold = true;
        instrucoes.Column(1).Width = 120;

        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        return memoria.ToArray();
    }

    public Resultado<LeituraPlanilhaBriefing> Ler(Stream arquivo, string? nomeArquivo)
    {
        var extensao = Path.GetExtension(nomeArquivo ?? "").ToLowerInvariant();
        if (extensao is not ".xlsx" and not ".xls")
        {
            return Resultado<LeituraPlanilhaBriefing>.Erro(Codigos.Validacao, "Envie a planilha modelo em .xlsx.");
        }

        if (arquivo.CanSeek && arquivo.Length > MaximoBytes)
        {
            return Resultado<LeituraPlanilhaBriefing>.Erro(Codigos.Validacao, "A planilha tem no máximo 2 MB.");
        }

        try
        {
            using var leitor = ExcelReaderFactory.CreateReader(arquivo);
            var abas = new List<(string Nome, List<IReadOnlyList<string?>> Linhas)>();
            do
            {
                abas.Add((PlanilhaFornecedores.Normalizar(leitor.Name), LerAba(leitor)));
            }
            while (leitor.NextResult());

            var linhas = abas.FirstOrDefault(a => a.Nome == PlanilhaFornecedores.Normalizar(PlanilhaBriefing.AbaBriefing)).Linhas ?? abas[0].Linhas;
            return Resultado<LeituraPlanilhaBriefing>.Sucesso(PlanilhaBriefing.Interpretar(linhas));
        }
        catch (Exception)
        {
            return Resultado<LeituraPlanilhaBriefing>.Erro(Codigos.Validacao, "A planilha não pôde ser lida. Use a planilha modelo.");
        }
    }

    private static List<IReadOnlyList<string?>> LerAba(IExcelDataReader leitor)
    {
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
}
