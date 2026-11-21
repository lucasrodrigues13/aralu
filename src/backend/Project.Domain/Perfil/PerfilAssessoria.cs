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

    public string? Pais { get; set; }

    /// <summary>No formato 00000-000, como no cadastro de cliente.</summary>
    public string? Cep { get; set; }

    /// <summary>Logradouro.</summary>
    public string? Endereco { get; set; }

    public string? Numero { get; set; }

    public string? Complemento { get; set; }

    public string? Bairro { get; set; }

    public string? Cidade { get; set; }

    public string? Estado { get; set; }

    public Guid? FotoId { get; set; }

    /// <summary>Chave Pix usada no "Cobrar" (RF-088, SPEC-029).</summary>
    public string? ChavePix { get; set; }

    public bool CapturaLeadRsvp { get; set; } = true;

    /// <summary>Endereço em uma linha, montado dos campos estruturados (tag contratada_endereco, SPEC-038).</summary>
    public string EnderecoCompleto()
    {
        return Contratos.Mesclagem.EnderecoEmLinha(Endereco, Numero, Complemento, Bairro, Cidade, Estado, Cep, Pais);
    }
}
