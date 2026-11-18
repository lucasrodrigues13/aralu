namespace Project.Domain.Perfil;

public sealed class PerfilAssessoria
{
    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

    public string? NomeEmpresa { get; set; }

    public string? Responsavel { get; set; }

    public string? Documento { get; set; }

    public string? Celular { get; set; }

    public DateOnly? Nascimento { get; set; }

    public string? Endereco { get; set; }

    public Guid? FotoId { get; set; }

    /// <summary>Chave Pix usada no "Cobrar" (RF-088, SPEC-029).</summary>
    public string? ChavePix { get; set; }

    public bool CapturaLeadRsvp { get; set; } = true;
}
