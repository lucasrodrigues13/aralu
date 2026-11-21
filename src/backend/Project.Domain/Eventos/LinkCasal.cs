namespace Project.Domain.Eventos;

/// <summary>Link do casal (SPEC-046): um por evento, sem senha. Trocar o código desliga o endereço antigo.</summary>
public sealed class LinkCasal
{
    public Guid Id { get; set; }

    public Guid EventoId { get; set; }

    public string ContaId { get; set; } = "";

    public string Token { get; set; } = "";

    /// <summary>Quando liberado, o casal acompanha e atualiza os pagamentos a fornecedores do evento.</summary>
    public bool FinanceiroLiberado { get; set; }

    public DateTimeOffset CriadoEm { get; set; }
}
