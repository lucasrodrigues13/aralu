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

public sealed class OrcamentoFunil
{
    /// <summary>Validade do link da proposta (SPEC-031 §17, ponto 10).</summary>
    public static readonly TimeSpan ValidadeLink = TimeSpan.FromDays(30);

    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

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
public sealed class RespostaPropostaFunil
{
    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

    public Guid OrcamentoFunilId { get; set; }

    public RespostaProposta Tipo { get; set; }

    public string? Mensagem { get; set; }

    public DateTimeOffset Em { get; set; }
}
