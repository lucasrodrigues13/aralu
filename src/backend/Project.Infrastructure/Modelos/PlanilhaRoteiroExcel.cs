using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using ExcelDataReader;
using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Fornecedores;
using Project.Domain.Modelos;

namespace Project.Infrastructure.Modelos;

/// <summary>Planilha de roteiro: modelo para baixar (com exemplos) e leitura da aba Roteiro.</summary>
public sealed class PlanilhaRoteiroExcel : IPlanilhaRoteiro
{
    private const long MaximoBytes = 2 * 1024 * 1024;

    public PlanilhaRoteiroExcel()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public byte[] Modelo()
    {
        using var livro = new XLWorkbook();
        var aba = livro.AddWorksheet(PlanilhaRoteiro.AbaRoteiro);
        for (var i = 0; i < PlanilhaRoteiro.Colunas.Length; i++)
        {
            aba.Cell(1, i + 1).Value = PlanilhaRoteiro.Colunas[i];
        }

        aba.Row(1).Style.Font.Bold = true;
        aba.SheetView.FreezeRows(1);
        aba.Column(2).Style.NumberFormat.Format = "@";
        var exemplos = PlanilhaRoteiro.Exemplos;
        for (var linha = 0; linha < exemplos.Length; linha++)
        {
            for (var coluna = 0; coluna < exemplos[linha].Length; coluna++)
            {
                aba.Cell(linha + 2, coluna + 1).SetValue(exemplos[linha][coluna]);
            }
        }

        var faixa = aba.Range(2, 1, exemplos.Length + 1, PlanilhaRoteiro.Colunas.Length);
        faixa.Style.Font.Italic = true;
        faixa.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFF4CE");
        aba.Columns().AdjustToContents();

        var instrucoes = livro.AddWorksheet("Instruções");
        string[] textos =
        [
            "Como preencher a planilha de roteiro",
            "1. Apague as linhas de exemplo (destacadas em amarelo, com \"(exemplo)\" no momento) antes de importar. Se elas ficarem, a importação é recusada.",
            "2. Um item por linha. Momento é obrigatório; um momento pode ficar sem itens.",
            "3. Repita o nome do momento em cada item dele. Os momentos e os itens entram na ordem da planilha.",
            "4. Horário (no formato 15:30) e Música são opcionais: basta preencher em uma das linhas do momento.",
            "5. Não mude o cabeçalho. Se alguma linha tiver erro, nada é importado e a tela mostra todos os erros, com o número da linha.",
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

    public Resultado<LeituraPlanilhaRoteiro> Ler(Stream arquivo, string? nomeArquivo)
    {
        var extensao = Path.GetExtension(nomeArquivo ?? "").ToLowerInvariant();
        if (extensao is not ".xlsx" and not ".xls")
        {
            return Resultado<LeituraPlanilhaRoteiro>.Erro(Codigos.Validacao, "Envie a planilha modelo em .xlsx.");
        }

        if (arquivo.CanSeek && arquivo.Length > MaximoBytes)
        {
            return Resultado<LeituraPlanilhaRoteiro>.Erro(Codigos.Validacao, "A planilha tem no máximo 2 MB.");
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

            var linhas = abas.FirstOrDefault(a => a.Nome == PlanilhaFornecedores.Normalizar(PlanilhaRoteiro.AbaRoteiro)).Linhas ?? abas[0].Linhas;
            return Resultado<LeituraPlanilhaRoteiro>.Sucesso(PlanilhaRoteiro.Interpretar(linhas));
        }
        catch (Exception)
        {
            return Resultado<LeituraPlanilhaRoteiro>.Erro(Codigos.Validacao, "A planilha não pôde ser lida. Use a planilha modelo.");
        }
    }

    /// <summary>Células de hora do Excel chegam como DateTime em 30/12/1899 ou TimeSpan: viram "HH:mm".</summary>
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
                    DateTime data when data.Year < 1901 => data.ToString("HH:mm", CultureInfo.InvariantCulture),
                    DateTime data => data.ToString("dd/MM/yyyy HH:mm", CultureInfo.InvariantCulture),
                    TimeSpan hora => hora.ToString(@"hh\:mm", CultureInfo.InvariantCulture),
                    var valor => Convert.ToString(valor, CultureInfo.InvariantCulture),
                };
            }

            linhas.Add(celulas);
        }

        return linhas;
    }
}
