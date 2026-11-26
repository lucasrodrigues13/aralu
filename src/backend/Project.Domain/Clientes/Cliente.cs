using Project.Domain.Comum;
namespace Project.Domain.Clientes;

public sealed class Cliente : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    public PapelCliente? Papel { get; set; }

    public DateOnly? Nascimento { get; set; }

    public string Email { get; set; } = "";

    public string Ddi { get; set; } = "+55";

    public string Celular { get; set; } = "";

    public string? TelefoneFixo { get; set; }

    public string? Cpf { get; set; }

    public string? Cnpj { get; set; }

    public string? Profissao { get; set; }

    /// <summary>Item de <c>EstadosCivis.Lista</c> (card #43).</summary>
    public string? EstadoCivil { get; set; }

    public string? Nacionalidade { get; set; }

    public string? InscricaoMunicipal { get; set; }

    public string? Religiao { get; set; }

    public string? Observacao { get; set; }

    public string? Facebook { get; set; }

    public string? Instagram { get; set; }

    public string? Pais { get; set; }

    public string? Cep { get; set; }

    public string? Endereco { get; set; }

    public string? Numero { get; set; }

    public string? Estado { get; set; }

    public string? Cidade { get; set; }

    public string? Bairro { get; set; }

    public string? Complemento { get; set; }

    public Guid? FotoId { get; set; }

    public List<VinculoCliente> Vinculos { get; set; } = [];
}

public sealed class VinculoCliente : ITemConta
{

    public Guid ContaId { get; set; }
    public Guid ClienteId { get; set; }

    public Guid EventoId { get; set; }
}
