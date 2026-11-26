using Project.Domain.Comum;
namespace Project.Domain.Funil;

public enum SituacaoOrcamentoFunil
{
    EmAndamento = 0,
    Respondido = 1,
    Cancelado = 2,
}

/// <summary>Resposta do lead pela página pública da proposta (SPEC-031 §6.6).</summary>
public enum RespostaProposta
{
    Aceitar = 0,
    Duvidas = 1,
    Recusar = 2,
}

public sealed class OrcamentoFunil : ITemConta
{
    /// <summary>Validade padrão da proposta, em dias (SPEC-064 R2).</summary>
    public const int DiasPadrao = 30;

    public const int DiasMinimo = 1;

    public const int DiasMaximo = 180;

    public const string MensagemDias = "A validade da proposta vai de 1 a 180 dias.";

    private static readonly TimeZoneInfo Fuso = LerFuso();

    /// <summary>Dias de validade do último envio (SPEC-064 §7: o reenvio vem com esse valor).</summary>
    public int? DiasValidade { get; set; }

    public static bool DiasValidos(int dias) => dias is >= DiasMinimo and <= DiasMaximo;

    /// <summary>Último dia em que a proposta vale, no horário de Brasília: enviada em 10/03 com 7 dias, 17/03.</summary>
    public static DateOnly UltimoDia(DateTimeOffset envio, int dias) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(envio, Fuso).DateTime).AddDays(dias);

    /// <summary>A proposta vale até o fim do último dia (SPEC-064 R1): o limite é a meia-noite seguinte, em Brasília.</summary>
    public static DateTimeOffset ValidoAteDe(DateTimeOffset envio, int dias)
    {
        var meiaNoite = UltimoDia(envio, dias).AddDays(1).ToDateTime(TimeOnly.MinValue);
        return new DateTimeOffset(meiaNoite, Fuso.GetUtcOffset(meiaNoite)).ToUniversalTime();
    }

    /// <summary>Último dia de validade para mostrar (<see cref="ValidoAte"/> é a meia-noite seguinte).</summary>
    public static DateOnly UltimoDiaDe(DateTimeOffset validoAte) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(validoAte.AddTicks(-1), Fuso).DateTime);

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

    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid OportunidadeId { get; set; }

    public string Conteudo { get; set; } = "";

    public decimal? Valor { get; set; }

    public SituacaoOrcamentoFunil Situacao { get; set; }

    public DateTimeOffset CriadoEm { get; set; }

    /// <summary>Id do usuário que criou. Nulo nos itens antigos (SPEC-032 §18, passo 1).</summary>
    public string? CriadoPor { get; set; }

    public DateTimeOffset? EnviadoEm { get; set; }

    public DateTimeOffset? RespondidoEm { get; set; }

    public Guid? ModeloId { get; set; }

    /// <summary>Cópia (sanitizada) do HTML de aceite do modelo, feita ao criar o orçamento (SPEC-057).</summary>
    public string? HtmlAceite { get; set; }

    /// <summary>Mídias e depoimentos da página de aceite, em JSON (SPEC-061). Ver <c>ExtrasAceite</c>.</summary>
    public string? ExtrasAceite { get; set; }

    /// <summary>Token aleatório do link da proposta. Nasce no primeiro envio e não muda.</summary>
    public string? TokenLink { get; set; }

    public DateTimeOffset? ValidoAte { get; set; }

    /// <summary>Primeira abertura do link pelo lead (a dona logada não conta).</summary>
    public DateTimeOffset? AbertoEm { get; set; }

    /// <summary>Última resposta do lead. O histórico fica em <see cref="RespostaPropostaFunil"/>.</summary>
    public RespostaProposta? Resposta { get; set; }

    public string? RespostaMensagem { get; set; }

    public DateTimeOffset? RespostaEm { get; set; }

    /// <summary>Parcelas combinadas no orçamento (SPEC-040). Vazio = sem parcelamento.</summary>
    public List<Project.Domain.Dinheiro.ParcelaOrcamento> Parcelas { get; set; } = [];

    public bool LinkValido(DateTimeOffset agora) =>
        TokenLink is not null && ValidoAte is DateTimeOffset ate && agora < ate;
}

/// <summary>Cada resposta do lead à proposta, na ordem em que chegou. Não é editável.</summary>
public sealed class RespostaPropostaFunil : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid OrcamentoFunilId { get; set; }

    public RespostaProposta Tipo { get; set; }

    public string? Mensagem { get; set; }

    public DateTimeOffset Em { get; set; }
}
