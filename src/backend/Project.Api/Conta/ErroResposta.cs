namespace Project.Api.Conta;

public sealed record ErroResposta(string Code, string Message, string? Motivo = null);
