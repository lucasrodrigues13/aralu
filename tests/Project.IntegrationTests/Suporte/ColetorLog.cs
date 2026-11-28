using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Project.IntegrationTests.Suporte;

/// <summary>Registro capturado: categoria, evento, mensagem formatada e campos estruturados.</summary>
public sealed record EntradaLog(string Categoria, EventId Evento, string Mensagem, IReadOnlyDictionary<string, string?> Campos);

public sealed class ColetorLog : ILoggerProvider
{
    private readonly ConcurrentQueue<EntradaLog> _entradas = new();

    public IReadOnlyCollection<string> Linhas => _entradas.Select(item => item.Mensagem).ToArray();

    public IReadOnlyCollection<EntradaLog> Entradas => _entradas.ToArray();

    public ILogger CreateLogger(string categoryName) => new Registrador(categoryName, _entradas);

    public void Dispose()
    {
    }

    private sealed class Registrador(string categoria, ConcurrentQueue<EntradaLog> entradas) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var campos = state is IEnumerable<KeyValuePair<string, object?>> pares
                ? pares.GroupBy(par => par.Key).ToDictionary(grupo => grupo.Key, grupo => grupo.Last().Value?.ToString())
                : new Dictionary<string, string?>();
            entradas.Enqueue(new EntradaLog(categoria, eventId, formatter(state, exception), campos));
        }
    }
}
