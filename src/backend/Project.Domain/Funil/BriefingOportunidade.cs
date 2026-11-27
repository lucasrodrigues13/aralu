using Project.Domain.Comum;
namespace Project.Domain.Funil;

/// <summary>
/// Briefing aplicado a um lead (SPEC-031 §6.7, ponto 4): cópia das perguntas de um modelo (SPEC-013)
/// que a dona usa como roteiro da conversa, anotando as respostas. Editar o modelo depois não muda o lead.
/// </summary>
public sealed class BriefingOportunidade : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid OportunidadeId { get; set; }

    /// <summary>Modelo de origem; vira nulo se o modelo for excluído.</summary>
    public Guid? ModeloBriefingId { get; set; }

    public string ModeloNome { get; set; } = "";

    public DateTimeOffset AplicadoEm { get; set; }

    /// <summary>Token do link público do briefing (SPEC-066). Nasce na primeira liberação e não muda depois.</summary>
    public string? TokenLink { get; set; }

    /// <summary>Quando preenchido, o cliente pode abrir e responder pelo link (SPEC-066).</summary>
    public DateTimeOffset? LiberadoEm { get; set; }

    /// <summary>Última vez que o cliente salvou respostas pelo link.</summary>
    public DateTimeOffset? RespondidoEm { get; set; }

    /// <summary>Fim da liberação: depois disso o link fecha sozinho (SPEC-066 §5).</summary>
    public DateTimeOffset? ValidoAte { get; set; }

    /// <summary>O cliente clicou em "Concluir": o link fecha e as respostas ficam com a organizadora.</summary>
    public DateTimeOffset? ConcluidoEm { get; set; }

    public const int DiasDeValidade = 7;

    /// <summary>O cliente consegue abrir e responder agora.</summary>
    public bool AbertoParaCliente(DateTimeOffset agora) =>
        LiberadoEm is not null && ConcluidoEm is null && (ValidoAte is null || ValidoAte > agora);

    public List<ItemBriefingOportunidade> Itens { get; set; } = [];
}

public sealed class ItemBriefingOportunidade : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid BriefingOportunidadeId { get; set; }

    public int Ordem { get; set; }

    public string? Secao { get; set; }

    public string Pergunta { get; set; } = "";

    public string? Resposta { get; set; }
}

/// <summary>Código enviado ao e-mail do lead para abrir o briefing (SPEC-066, mesmas regras da SPEC-063).</summary>
public sealed class CodigoAcessoBriefing : ITemConta
{
    public Guid Id { get; set; }

    public Guid BriefingId { get; set; }

    public Guid ContaId { get; set; }

    public string Email { get; set; } = "";

    public string CodigoHash { get; set; } = "";

    public DateTimeOffset CriadoEm { get; set; }

    public DateTimeOffset ExpiraEm { get; set; }

    public int Tentativas { get; set; }

    public DateTimeOffset? UsadoEm { get; set; }

    public bool Invalidado { get; set; }
}

/// <summary>Sessão aberta depois do código: o navegador guarda o token, o banco só o hash.</summary>
public sealed class SessaoBriefing : ITemConta
{
    public Guid Id { get; set; }

    public Guid BriefingId { get; set; }

    public Guid ContaId { get; set; }

    public string TokenHash { get; set; } = "";

    public DateTimeOffset CriadaEm { get; set; }

    public DateTimeOffset ExpiraEm { get; set; }
}
