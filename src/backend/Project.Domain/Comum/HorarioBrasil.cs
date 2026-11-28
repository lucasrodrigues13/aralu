namespace Project.Domain.Comum;

/// <summary>
/// Datas do negócio no horário de Brasília. O relógio do sistema é UTC, e das 21h à meia-noite a data UTC
/// já é o dia seguinte: "hoje", vencimentos, prazos e períodos pagos sempre passam por aqui.
/// </summary>
public static class HorarioBrasil
{
    public static readonly TimeZoneInfo Fuso = LerFuso();

    /// <summary>Data do momento em Brasília: 10/03 às 01:30 UTC é 09/03 (22:30 em Brasília).</summary>
    public static DateOnly Data(DateTimeOffset momento) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(momento, Fuso).DateTime);

    private static TimeZoneInfo LerFuso()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.CreateCustomTimeZone("BRT", TimeSpan.FromHours(-3), "BRT", "BRT");
        }
    }
}
