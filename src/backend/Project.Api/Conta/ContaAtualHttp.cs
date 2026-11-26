using Project.Application.Conta;

namespace Project.Api.Conta;

/// <summary>IContaAtual ligado ao HttpContext do pedido.</summary>
public sealed class ContaAtualHttp(IHttpContextAccessor http) : IContaAtual
{
    public string? Id => ContaAtual.De(http.HttpContext?.User);
}
