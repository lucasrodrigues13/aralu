namespace Project.IntegrationTests.Suporte;

/// <summary>Dados do contratante completos (SPEC-049 §6.4), para gerar contrato do funil (SPEC-050).</summary>
public static class ContratanteDeTeste
{
    public static readonly object Completo = new
    {
        nome = "Maria da Silva",
        documento = "529.982.247-25",
        estadoCivil = "Solteiro(a)",
        nacionalidade = "Brasileira",
        email = "maria@exemplo.com",
        celular = "11977776666",
        cep = "01001-000",
        endereco = "Praça da Sé",
        numero = "1",
        bairro = "Sé",
        cidade = "São Paulo",
        estado = "SP",
    };
}
