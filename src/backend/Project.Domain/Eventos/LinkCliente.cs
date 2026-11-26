using Project.Domain.Comum;
namespace Project.Domain.Eventos;

/// <summary>Link do cliente (SPEC-046): um por evento, sem senha. Trocar o código desliga o endereço antigo.</summary>
public sealed class LinkCliente : ITemConta
{
    public Guid Id { get; set; }

    public Guid EventoId { get; set; }

    public Guid ContaId { get; set; }

    public string Token { get; set; } = "";

    /// <summary>Quando liberado, o cliente acompanha e atualiza os pagamentos a fornecedores do evento.</summary>
    public bool FinanceiroLiberado { get; set; }

    /// <summary>Quando ligado, o cliente vê e cadastra os convites do evento (SPEC-052).</summary>
    public bool ConvidadosLiberado { get; set; }

    public DateTimeOffset CriadoEm { get; set; }
}
