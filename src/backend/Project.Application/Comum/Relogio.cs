namespace Project.Application.Comum;

/// <summary>
/// Hora atual do sistema. Em produção é sempre o relógio real (<see cref="TimeProvider.System"/>).
/// Só o ambiente E2E (flag <c>Testes:RelogioControlavel</c>) troca por um relógio que pode ser avançado,
/// para os testes cumprirem prazos, vencimentos e jobs nas datas certas.
/// O token de login (JWT) continua no relógio real: a validação do ASP.NET usa a hora da máquina.
/// </summary>
public static class Relogio
{
    public static TimeProvider Provedor { get; private set; } = TimeProvider.System;

    public static DateTimeOffset Agora => Provedor.GetUtcNow();

    public static DateTime AgoraUtc => Provedor.GetUtcNow().UtcDateTime;

    /// <summary>Data de hoje no horário de Brasília (não em UTC): vencimentos, prazos e períodos pagos.</summary>
    public static DateOnly Hoje => Project.Domain.Comum.HorarioBrasil.Data(Agora);

    /// <summary>Chamado uma única vez na inicialização da API.</summary>
    public static void Usar(TimeProvider provedor) => Provedor = provedor;
}

/// <summary>Relógio do ambiente E2E: anda junto com o real, a partir de um deslocamento que o teste ajusta.</summary>
public sealed class RelogioControlavel : TimeProvider
{
    private long _deslocamentoTicks;

    public TimeSpan Deslocamento => TimeSpan.FromTicks(Interlocked.Read(ref _deslocamentoTicks));

    public override DateTimeOffset GetUtcNow() => TimeProvider.System.GetUtcNow() + Deslocamento;

    public void Avancar(TimeSpan quanto) => Interlocked.Add(ref _deslocamentoTicks, quanto.Ticks);

    public void Definir(DateTimeOffset momento) =>
        Interlocked.Exchange(ref _deslocamentoTicks, (momento - TimeProvider.System.GetUtcNow()).Ticks);

    public void Zerar() => Interlocked.Exchange(ref _deslocamentoTicks, 0);
}
