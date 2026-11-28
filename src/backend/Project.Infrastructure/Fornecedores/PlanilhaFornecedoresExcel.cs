using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using ExcelDataReader;
using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Fornecedores;

namespace Project.Infrastructure.Fornecedores;

/// <summary>Planilha de fornecedores: modelo para baixar (com exemplos e listas) e leitura das abas.</summary>
public sealed class PlanilhaFornecedoresExcel : IPlanilhaFornecedores
{
    private const long MaximoBytes = 2 * 1024 * 1024;
    private const int LinhasComLista = 1000;

    public PlanilhaFornecedoresExcel()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public byte[] Modelo()
    {
        using var livro = new XLWorkbook();
        Aba(livro, PlanilhaFornecedores.AbaFornecedores, PlanilhaFornecedores.Colunas, PlanilhaFornecedores.Exemplos);
        var bancos = Aba(livro, PlanilhaFornecedores.AbaBancarios, PlanilhaFornecedores.ColunasBancarias, PlanilhaFornecedores.ExemplosBancarios);
        Lista(bancos, PlanilhaFornecedores.ColunasBancarias, "Tipo de conta", PlanilhaFornecedores.TiposConta);
        Lista(bancos, PlanilhaFornecedores.ColunasBancarias, "Tipo de Pix", PlanilhaFornecedores.TiposPix);

        var instrucoes = livro.AddWorksheet("Instruções");
        string[] textos =
        [
            "Como preencher a planilha de fornecedores",
            "1. Apague as linhas de exemplo (destacadas em amarelo, com \"(exemplo)\" no nome) antes de importar. Se elas ficarem, a importação é recusada.",
            "2. Aba Fornecedores: um fornecedor por linha. Nome e Serviços são obrigatórios; separe vários serviços por vírgula (ex.: Buffet, Bar).",
            "3. Serviços que ainda não existem na sua conta são criados na importação.",
            "4. Telefone e e-mail: um de cada por fornecedor. O DDI padrão é 55. Para mais contatos, edite o fornecedor depois.",
            "5. Aba Dados bancários (opcional): uma linha por fornecedor, com o nome escrito igual ao da aba Fornecedores.",
            "6. Tipo de conta e Tipo de Pix: escolha na lista da célula.",
            "7. Não mude o cabeçalho. Fornecedores já cadastrados com o mesmo nome são recusados.",
            "8. Se alguma linha tiver erro, nada é importado e a tela mostra todos os erros, com o número da linha.",
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

    private static IXLWorksheet Aba(XLWorkbook livro, string nome, string[] colunas, string[][] exemplos)
    {
        var aba = livro.AddWorksheet(nome);
        for (var i = 0; i < colunas.Length; i++)
        {
            aba.Cell(1, i + 1).Value = colunas[i];
        }

        aba.Row(1).Style.Font.Bold = true;
        aba.SheetView.FreezeRows(1);
        for (var linha = 0; linha < exemplos.Length; linha++)
        {
            for (var coluna = 0; coluna < exemplos[linha].Length; coluna++)
            {
                // Texto, para o Excel não comer zeros à esquerda de telefone, CEP e conta.
                aba.Cell(linha + 2, coluna + 1).SetValue(exemplos[linha][coluna]);
            }
        }

        var faixa = aba.Range(2, 1, exemplos.Length + 1, colunas.Length);
        faixa.Style.Font.Italic = true;
        faixa.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFF4CE");
        aba.Range(2, 1, LinhasComLista, colunas.Length).Style.NumberFormat.Format = "@";
        aba.Columns().AdjustToContents();
        return aba;
    }

    private static void Lista(IXLWorksheet aba, string[] colunas, string coluna, string[] opcoes)
    {
        var indice = Array.IndexOf(colunas, coluna) + 1;
        var validacao = aba.Range(2, indice, LinhasComLista, indice).CreateDataValidation();
        validacao.List("\"" + string.Join(",", opcoes) + "\"", true);
        validacao.IgnoreBlanks = true;
    }

    public Resultado<LeituraPlanilhaFornecedores> Ler(Stream arquivo, string? nomeArquivo)
    {
        var extensao = Path.GetExtension(nomeArquivo ?? "").ToLowerInvariant();
        if (extensao is not ".xlsx" and not ".xls")
        {
            return Resultado<LeituraPlanilhaFornecedores>.Erro(Codigos.Validacao, "Envie a planilha modelo em .xlsx.");
        }

        if (arquivo.CanSeek && arquivo.Length > MaximoBytes)
        {
            return Resultado<LeituraPlanilhaFornecedores>.Erro(Codigos.Validacao, "A planilha tem no máximo 2 MB.");
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

            var fornecedores = abas.FirstOrDefault(a => a.Nome == PlanilhaFornecedores.Normalizar(PlanilhaFornecedores.AbaFornecedores)).Linhas
                ?? abas[0].Linhas;
            var bancarios = abas.FirstOrDefault(a => a.Nome == PlanilhaFornecedores.Normalizar(PlanilhaFornecedores.AbaBancarios)).Linhas ?? [];
            return Resultado<LeituraPlanilhaFornecedores>.Sucesso(PlanilhaFornecedores.Interpretar(fornecedores, bancarios));
        }
        catch (Exception)
        {
            return Resultado<LeituraPlanilhaFornecedores>.Erro(Codigos.Validacao, "A planilha não pôde ser lida. Use a planilha modelo.");
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
