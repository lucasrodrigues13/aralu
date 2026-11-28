using ClosedXML.Excel;
using Project.Application.Negocio;

namespace Project.Infrastructure.Eventos;

/// <summary>Planejamento de budget em Excel (SPEC-029 §6.6, RF-097).</summary>
public sealed class PlanilhaBudgetExcel : IPlanilhaBudget
{
    private const string FormatoReal = "\"R$\" #,##0.00";

    public byte[] Gerar(string evento, decimal budget, IReadOnlyList<LinhaPlanilhaBudget> linhas)
    {
        using var livro = new XLWorkbook();
        var aba = livro.AddWorksheet("Orçamento");
        aba.Cell(1, 1).Value = evento;
        aba.Cell(1, 1).Style.Font.Bold = true;
        aba.Cell(2, 1).Value = "Orçamento do evento";
        aba.Cell(2, 2).Value = budget;
        aba.Cell(2, 2).Style.NumberFormat.Format = FormatoReal;

        aba.Cell(4, 1).Value = "Serviço";
        aba.Cell(4, 2).Value = "Estimado";
        aba.Cell(4, 3).Value = "Contratado";
        aba.Range(4, 1, 4, 3).Style.Font.Bold = true;

        var linha = 5;
        foreach (var item in linhas)
        {
            aba.Cell(linha, 1).Value = item.Servico;
            aba.Cell(linha, 2).Value = item.Estimado;
            aba.Cell(linha, 3).Value = item.Contratado;
            linha++;
        }

        aba.Cell(linha, 1).Value = "Total";
        aba.Cell(linha, 1).Style.Font.Bold = true;
        aba.Cell(linha, 2).Value = linhas.Sum(item => item.Estimado);
        aba.Cell(linha, 3).Value = linhas.Sum(item => item.Contratado);
        aba.Range(5, 2, linha, 3).Style.NumberFormat.Format = FormatoReal;
        aba.Columns().AdjustToContents();

        using var memoria = new MemoryStream();
        livro.SaveAs(memoria);
        return memoria.ToArray();
    }
}
