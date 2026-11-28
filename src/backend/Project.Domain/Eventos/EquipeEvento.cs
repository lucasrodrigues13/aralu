using Project.Domain.Comum;
namespace Project.Domain.Eventos;

/// <summary>
/// Pessoa que trabalha no dia do evento sem ser membro da conta (SPEC-067): segurança, buffet, DJ…
/// Tem um link próprio que só abre com código enviado ao e-mail dela e mostra só o que foi marcado.
/// </summary>
public sealed class PessoaEquipeEvento : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid EventoId { get; set; }

    public string Nome { get; set; } = "";

    public string Email { get; set; } = "";

    public string? Telefone { get; set; }

    public string? Funcao { get; set; }

    public bool RecebePortaria { get; set; }

    public bool RecebeRoteiro { get; set; }

    public bool RecebeCronograma { get; set; }

    public string Token { get; set; } = "";

    /// <summary>Última vez que a organizadora enviou ou copiou o link. Abre a validade.</summary>
    public DateTimeOffset? EnviadoEm { get; set; }

    /// <summary>Fim do acesso: dia seguinte ao evento, ou 30 dias depois do envio quando o evento não tem data.</summary>
    public DateTimeOffset? ValidoAte { get; set; }

    public DateTimeOffset? UltimoAcessoEm { get; set; }

    public DateTimeOffset? EncerradoEm { get; set; }

    public DateTimeOffset CriadoEm { get; set; }

    public const int DiasSemData = 30;

    public bool Aberto(DateTimeOffset agora) => EncerradoEm is null && ValidoAte is not null && ValidoAte > agora;

    /// <summary>Validade de um envio feito agora: fim do dia seguinte ao evento (horário de Brasília) ou 30 dias.</summary>
    public static DateTimeOffset Validade(DateOnly? dataEvento, DateTimeOffset agora)
    {
        if (dataEvento is not DateOnly data)
        {
            return agora.AddDays(DiasSemData);
        }

        // Gravado em UTC: o banco (timestamptz) não aceita outro deslocamento.
        var fim = new DateTimeOffset(data.AddDays(2).ToDateTime(TimeOnly.MinValue), TimeSpan.FromHours(-3)).ToUniversalTime();
        return fim > agora ? fim : agora.AddDays(1);
    }
}

/// <summary>Código enviado ao e-mail da pessoa da equipe (SPEC-067, mesmas regras da SPEC-063).</summary>
public sealed class CodigoAcessoEquipe : ITemConta
{
    public Guid Id { get; set; }

    public Guid PessoaId { get; set; }

    public Guid ContaId { get; set; }

    public string CodigoHash { get; set; } = "";

    public DateTimeOffset CriadoEm { get; set; }

    public DateTimeOffset ExpiraEm { get; set; }

    public int Tentativas { get; set; }

    public DateTimeOffset? UsadoEm { get; set; }

    public bool Invalidado { get; set; }
}

/// <summary>Sessão aberta depois do código: só o hash fica no banco; o token vai no cookie.</summary>
public sealed class SessaoEquipe : ITemConta
{
    public Guid Id { get; set; }

    public Guid PessoaId { get; set; }

    public Guid ContaId { get; set; }

    public string TokenHash { get; set; } = "";

    public DateTimeOffset CriadaEm { get; set; }

    public DateTimeOffset ExpiraEm { get; set; }
}
