namespace Project.Domain.Eventos;

/// <summary>
/// Link da portaria (SPEC-058): um por evento, sem senha, só para a equipe que autoriza a entrada.
/// Trocar o código desliga o endereço antigo; desativar apaga o link.
/// </summary>
public sealed class LinkPortaria
{
    public Guid Id { get; set; }

    public Guid EventoId { get; set; }

    public string ContaId { get; set; } = "";

    public string Token { get; set; } = "";

    public DateTimeOffset CriadoEm { get; set; }
}
