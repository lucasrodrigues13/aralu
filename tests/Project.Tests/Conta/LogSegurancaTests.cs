using Microsoft.Extensions.Logging;
using Project.Application.Comum;

namespace Project.Tests.Conta;

/// <summary>A09-001: eventos de segurança com EventId fixo, campos estruturados e nada sensível.</summary>
public class LogSegurancaTests
{
    [Fact]
    public void Eventos_saem_na_categoria_aralu_seguranca_com_event_id_fixo()
    {
        var (log, coletor) = Criar();

        log.LoginFalhou("ana.souza@gmail.com", "10.0.0.1", MotivoLoginFalhou.Inexistente);
        log.LoginFalhou("ana.souza@gmail.com", "10.0.0.1", MotivoLoginFalhou.Senha);
        log.LoginFalhou("ana.souza@gmail.com", "10.0.0.1", MotivoLoginFalhou.SemMembro);
        log.LoginBloqueado("u1", "ana.souza@gmail.com", "10.0.0.1");
        log.LoginOk("u1", "10.0.0.1");
        log.SenhaRedefinida("u1");
        log.SenhaTrocada("u1");
        log.SessaoEncerrada("u1", "sair");
        log.AdminOperouConta("admin1", "dona1", "GET", "/api/v1/eventos");
        log.RateLimit("login", "10.0.0.1", "/api/v1/conta/entrar");
        log.CodigoLinkEsgotado("link_cliente", Guid.Empty);

        Assert.All(coletor.Entradas, item => Assert.Equal(LogSeguranca.Categoria, item.Categoria));
        Assert.Equal(
            [9001, 9001, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9008, 9009],
            coletor.Entradas.Select(item => item.Evento.Id));
        Assert.Equal(
            ["inexistente", "senha", "sem_membro"],
            coletor.Entradas.Take(3).Select(item => item.Campos["Motivo"]));
        Assert.Equal("an***@gmail.com", coletor.Entradas.First().Campos["Email"]);
        Assert.DoesNotContain(coletor.Entradas, item => item.Mensagem.Contains("ana.souza", StringComparison.Ordinal));
        var admin = coletor.Entradas.Single(item => item.Evento.Name == "admin_operou_conta");
        Assert.Equal("admin1", admin.Campos["AdminId"]);
        Assert.Equal("dona1", admin.Campos["ContaId"]);
        Assert.Equal("GET", admin.Campos["Metodo"]);
        Assert.Equal("/api/v1/eventos", admin.Campos["Rota"]);
    }

    [Fact]
    public void Entrada_com_quebra_de_linha_nao_forja_outra_linha_de_log()
    {
        var (log, coletor) = Criar();

        log.LoginFalhou("x\r\n2026-01-01 login_ok admin@aralu.com@ex.com", "1.1.1.1\n", MotivoLoginFalhou.Inexistente);
        log.RateLimit("login" + (char)0x2028, null, "/rota\r\nfalsa");

        Assert.All(coletor.Entradas, item =>
        {
            Assert.DoesNotContain('\n', item.Mensagem);
            Assert.DoesNotContain('\r', item.Mensagem);
            Assert.DoesNotContain((char)0x2028, item.Mensagem);
        });
        Assert.Equal("-", coletor.Entradas.Last().Campos["Ip"]);
        Assert.True(LogSeguranca.Limpo(new string('a', 5000)).Length <= 200);
    }

    [Fact]
    public void Email_sem_arroba_ou_vazio_nao_vaza()
    {
        Assert.Equal("***", LogSeguranca.EmailMascarado("senha-colada-no-campo"));
        Assert.Equal("-", LogSeguranca.EmailMascarado(null));
        Assert.Equal("-", LogSeguranca.EmailMascarado("  "));
    }

    private static (LogSeguranca Log, Coletor Coletor) Criar()
    {
        var coletor = new Coletor();
        var fabrica = LoggerFactory.Create(builder => builder.SetMinimumLevel(LogLevel.Trace).AddProvider(coletor));
        return (new LogSeguranca(fabrica), coletor);
    }

    private sealed record Entrada(string Categoria, EventId Evento, string Mensagem, IReadOnlyDictionary<string, string?> Campos);

    private sealed class Coletor : ILoggerProvider
    {
        public List<Entrada> Entradas { get; } = [];

        public ILogger CreateLogger(string categoryName) => new Registrador(categoryName, Entradas);

        public void Dispose()
        {
        }

        private sealed class Registrador(string categoria, List<Entrada> entradas) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
            {
                var campos = ((IEnumerable<KeyValuePair<string, object?>>)state!)
                    .ToDictionary(par => par.Key, par => par.Value?.ToString());
                entradas.Add(new Entrada(categoria, eventId, formatter(state, exception), campos));
            }
        }
    }
}
