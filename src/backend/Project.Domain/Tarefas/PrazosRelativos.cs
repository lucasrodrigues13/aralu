namespace Project.Domain.Tarefas;

/// <summary>Prazo relativo à data do evento (SPEC-012 v3 §8.1): dias, negativo = antes, 0 = no dia, positivo = depois.</summary>
public static class PrazosRelativos
{
    public const int LimiteDias = 999 * 30;

    /// <summary>Prazo efetivo: data do evento + deslocamento. Sem data do evento ou sem deslocamento, nulo.</summary>
    public static DateOnly? Efetivo(DateOnly? dataEvento, int? deslocamento) =>
        dataEvento is DateOnly data && deslocamento is int dias ? data.AddDays(dias) : null;

    /// <summary>Deslocamento de uma data exata em relação à data do evento.</summary>
    public static int? DeDataExata(DateOnly? dataEvento, DateOnly? prazo) =>
        dataEvento is DateOnly data && prazo is DateOnly valor ? valor.DayNumber - data.DayNumber : null;

    public static bool Valido(int? deslocamento) => deslocamento is null || Math.Abs(deslocamento.Value) <= LimiteDias;

    /// <summary>Recalcula o prazo efetivo das tarefas e itens relativos depois que a data do evento mudou.</summary>
    public static void Recalcular(Tarefa tarefa, DateOnly? dataEvento)
    {
        if (tarefa.PrazoRelativo is not null)
        {
            tarefa.Prazo = Efetivo(dataEvento, tarefa.PrazoRelativo);
        }

        foreach (var item in tarefa.Checklist.Where(item => item.PrazoRelativo is not null))
        {
            item.Prazo = Efetivo(dataEvento, item.PrazoRelativo);
        }
    }
}
