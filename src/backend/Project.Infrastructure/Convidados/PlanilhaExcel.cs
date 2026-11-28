using System.Text;
using ClosedXML.Excel;
using ExcelDataReader;
using Project.Application.Comum;
using Project.Application.Convidados;
using Project.Domain.Convidados;

namespace Project.Infrastructure.Convidados;

public sealed class PlanilhaExcel : IPlanilhaConvites
{
    private const int LinhasComLista = 1000;

    public PlanilhaExcel()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    /// <summary>
    /// Modelo de importação (SPEC-059): a aba "Convidados" é a que se importa. Vem com dois convites de exemplo (destacados
    /// e com a orientação de apagá-los), listas suspensas em Gênero, Faixa etária e Situação, e a aba "Instruções".
    /// </summary>
    public byte[] Modelo()
    {
        using var livro = new XLWorkbook();
        var aba = livro.AddWorksheet("Convidados");
        for (var i = 0; i < PlanilhaConvites.Colunas.Length; i++)
        {
            aba.Cell(1, i + 1).Value = PlanilhaConvites.Colunas[i];
        }

        aba.Row(1).Style.Font.Bold = true;
        aba.SheetView.FreezeRows(1);
        aba.Cell(1, 1).CreateComment().AddText(PlanilhaConvites.Orientacao);

        for (var linha = 0; linha < PlanilhaConvites.Exemplo.Length; linha++)
        {
            for (var coluna = 0; coluna < PlanilhaConvites.Exemplo[linha].Length; coluna++)
            {
                aba.Cell(linha + 2, coluna + 1).Value = PlanilhaConvites.Exemplo[linha][coluna];
            }
        }

        var exemplos = aba.Range(2, 1, PlanilhaConvites.Exemplo.Length + 1, PlanilhaConvites.Colunas.Length);
        exemplos.Style.Font.Italic = true;
        exemplos.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFF4CE");

        Lista(aba, "Convidado principal *", PlanilhaConvites.SimNao);
        Lista(aba, "Gênero", PlanilhaConvites.Generos);
        Lista(aba, "Faixa etária", PlanilhaConvites.Faixas);
        Lista(aba, "Situação", PlanilhaConvites.Situacoes);
        aba.Columns().AdjustToContents();

        var instrucoes = livro.AddWorksheet("Instruções");
        string[] textos =
        [
            "Como preencher a planilha de convidados",
            "1. Apague as linhas de exemplo (destacadas em amarelo, com \"(exemplo)\" no nome do convite) antes de importar. Se elas ficarem, a importação é recusada.",
            "2. Uma linha por convidado. Quem recebe junto fica em linhas com o mesmo nome do convite, escrito igual.",
            "3. Em Convidado principal, marque Sim para um convidado por convite: ele recebe as comunicações e precisa de DDI e telefone. Nos demais, deixe Não; o telefone deles é opcional.",
            "4. Nome do convite e nome do convidado são obrigatórios em todas as linhas. A observação do convite vai na primeira linha dele.",
            "5. Gênero, faixa etária e situação são opcionais; escolha na lista da célula.",
            "6. Não mude o cabeçalho. Só a aba Convidados é importada.",
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

    private static void Lista(IXLWorksheet aba, string coluna, string[] opcoes)
    {
        var indice = Array.IndexOf(PlanilhaConvites.Colunas, coluna) + 1;
        var validacao = aba.Range(2, indice, LinhasComLista, indice).CreateDataValidation();
        validacao.List("\"" + string.Join(",", opcoes) + "\"", true);
        validacao.IgnoreBlanks = true;
    }

    public Resultado<IReadOnlyList<LinhaPlanilha>> Ler(Stream arquivo, string? nomeArquivo)
    {
        var extensao = Path.GetExtension(nomeArquivo ?? "").ToLowerInvariant();
        if (extensao is not ".xlsx" and not ".xls")
        {
            return Resultado<IReadOnlyList<LinhaPlanilha>>.Erro(Codigos.Validacao, "Envie uma planilha .xlsx ou .xls.");
        }

        try
        {
            using var leitor = ExcelReaderFactory.CreateReader(arquivo);
            if (!leitor.Read())
            {
                return Resultado<IReadOnlyList<LinhaPlanilha>>.Erro(Codigos.Validacao, "A planilha não tem as colunas do modelo.");
            }

            var cabecalho = Enumerable.Range(0, leitor.FieldCount).Select(i => leitor.GetValue(i)?.ToString()).ToArray();
            var faltam = PlanilhaConvites.ColunasQueFaltam(cabecalho);
            if (faltam.Count > 0)
            {
                return Resultado<IReadOnlyList<LinhaPlanilha>>.Erro(
                    Codigos.Validacao,
                    $"A planilha não tem as colunas do modelo (falta: {string.Join(", ", faltam)}). Baixe o modelo de novo.");
            }

            var posicoes = PlanilhaConvites.MapearCabecalho(cabecalho)!;

            var linhas = new List<LinhaPlanilha>();
            var numero = 1;
            while (leitor.Read())
            {
                numero++;
                string? Celula(int coluna) => posicoes[coluna] < leitor.FieldCount ? leitor.GetValue(posicoes[coluna])?.ToString() : null;
                if (Enumerable.Range(0, posicoes.Length).All(coluna => string.IsNullOrWhiteSpace(Celula(coluna))))
                {
                    continue;
                }

                linhas.Add(new LinhaPlanilha(
                    Celula(0), Celula(1), Celula(2), Celula(3), Celula(4), Celula(5), Celula(6), Celula(7), Celula(8), numero));
            }

            return Resultado<IReadOnlyList<LinhaPlanilha>>.Sucesso(linhas);
        }
        catch (Exception)
        {
            return Resultado<IReadOnlyList<LinhaPlanilha>>.Erro(Codigos.Validacao, "A planilha não pôde ser importada.");
        }
    }
}
