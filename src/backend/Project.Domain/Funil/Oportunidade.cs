using Project.Domain.Eventos;

namespace Project.Domain.Funil;

public sealed class Oportunidade
{
    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

    public string Nome { get; set; } = "";

    public Guid EstagioFunilId { get; set; }

    public EstagioFunil? EstagioFunil { get; set; }

    /// <summary>Origem do contato: item de <see cref="OrigensFunil.Lista"/>.</summary>
    public string? Fonte { get; set; }

    /// <summary>Texto livre quando a origem é "Outro".</summary>
    public string? FonteOutro { get; set; }

    /// <summary>Quando a dona quer voltar a falar com o lead (SPEC-031 §6.3).</summary>
    public DateOnly? RetornarEm { get; set; }

    public TimeOnly? RetornarHora { get; set; }

    /// <summary>Lead do formulário público com telefone ou e-mail que já existia na conta.</summary>
    public bool ContatoRepetido { get; set; }

    public decimal? ValorProposta { get; set; }

    public string Responsavel { get; set; } = "";

    public string? ServicoProduto { get; set; }

    public Guid? ModeloServicoFunilId { get; set; }

    public TipoEvento? TipoEvento { get; set; }

    public int? QuantidadeConvidados { get; set; }

    public DateOnly? DataPrevista { get; set; }

    /// <summary>Texto livre antigo. Desde a SPEC-031 parte D os horários ficam nos quatro campos abaixo.</summary>
    public string? Horarios { get; set; }

    public TimeOnly? HoraConvite { get; set; }

    public TimeOnly? HoraCerimonia { get; set; }

    public TimeOnly? HoraRecepcao { get; set; }

    public TimeOnly? HoraFesta { get; set; }

    public int? QuantidadePadrinhos { get; set; }

    public int? QuantidadeDamas { get; set; }

    public string? LocalCerimonia { get; set; }

    public string? EnderecoCerimonia { get; set; }

    public string? CepCerimonia { get; set; }

    public string? PaisCerimonia { get; set; }

    public string? NumeroCerimonia { get; set; }

    public string? BairroCerimonia { get; set; }

    public string? LocalRecepcao { get; set; }

    public string? EnderecoRecepcao { get; set; }

    public string? CepRecepcao { get; set; }

    public string? PaisRecepcao { get; set; }

    public string? NumeroRecepcao { get; set; }

    public string? BairroRecepcao { get; set; }

    public string? EstadoRecepcao { get; set; }

    public string? CidadeRecepcao { get; set; }

    public string? Uf { get; set; }

    public string? Cidade { get; set; }

    public string? MotivoDescarte { get; set; }

    /// <summary>Cliente criado a partir do lead ao fechar o negócio.</summary>
    public Guid? ClienteId { get; set; }

    public DateTimeOffset CriadoEm { get; set; }

    /// <summary>Id do usuário que criou. Nulo nos itens antigos e nos leads do formulário público (SPEC-032 §18, passo 1).</summary>
    public string? CriadoPor { get; set; }

    public DateTimeOffset EntradaNoEstagioEm { get; set; }

    public List<ContatoOportunidade> Contatos { get; set; } = [];
}

public sealed class ContatoOportunidade
{
    public Guid Id { get; set; }

    public Guid OportunidadeId { get; set; }

    public string Nome { get; set; } = "";

    public string? Telefone { get; set; }

    public string? Email { get; set; }
}
