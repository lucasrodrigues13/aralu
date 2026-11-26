using Project.Domain.Comum;
using Project.Domain.Fornecedores;

namespace Project.Domain.Eventos;

public sealed class Evento : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    /// <summary>Dia de referência de "Para conferir" (SPEC-003 §6.2). Nulo em eventos anteriores a este campo.</summary>
    public DateTimeOffset? CriadoEm { get; set; }

    public string Nome { get; set; } = "";

    public string? PrimeiroNome { get; set; }

    public string? SegundoNome { get; set; }

    public TipoEvento Tipo { get; set; }

    public SituacaoEvento Situacao { get; set; } = SituacaoEvento.EmAndamento;

    public DateOnly? Data { get; set; }

    /// <summary>Data limite para confirmar presença pelo link; vale até o fim do dia. Nulo = sem prazo (SPEC-054).</summary>
    public DateOnly? PrazoRsvp { get; set; }

    /// <summary>Data de envio dos convites, uma só para todos os convites do evento. Nulo = não definida (SPEC-059).</summary>
    public DateOnly? DataEnvioConvites { get; set; }

    public TimeOnly? Hora { get; set; }

    public decimal? OrcamentoEstimado { get; set; }

    public int? ConvidadosEstimados { get; set; }

    public TimeOnly? TempoFesta { get; set; }

    public TimeOnly? InicioCerimonia { get; set; }

    public TimeOnly? InicioRecepcao { get; set; }

    public int? QuantidadePadrinhos { get; set; }

    public int? QuantidadeDamas { get; set; }

    public bool NotificarAssessor { get; set; } = true;

    public bool NotificarAssistentes { get; set; } = true;

    public bool NotificarClientes { get; set; } = true;

    public bool SalvarNaAgenda { get; set; }

    public Guid? ImagemId { get; set; }

    public LocalEvento Cerimonia { get; set; } = new();

    public LocalEvento Recepcao { get; set; } = new();

    public List<TagConta> Tags { get; set; } = [];

    public List<ServicoEvento> Servicos { get; set; } = [];

}

public sealed class LocalEvento
{
    public string? Nome { get; set; }

    public string? Pais { get; set; }

    public string? Cep { get; set; }

    public string? Endereco { get; set; }

    public string? Numero { get; set; }

    public string? Estado { get; set; }

    public string? Cidade { get; set; }

    public string? Bairro { get; set; }
}

public sealed class TagConta : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    public List<Evento> Eventos { get; set; } = [];
}

public sealed class ServicoEvento : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid EventoId { get; set; }

    public string Nome { get; set; } = "";

    public Guid? ServicoContaId { get; set; }

    public string? FornecedorContaId { get; set; }

    public bool Contratado { get; set; }

    public decimal? ValorEstimado { get; set; }

    public decimal? ValorContratado { get; set; }

    public bool OcultoParaClient { get; set; }

    public int Ordem { get; set; }

    /// <summary>Contratos com os fornecedores do serviço (um por vínculo), com as parcelas a pagar (SPEC-040).</summary>
    public List<Project.Domain.Dinheiro.ContratoFornecedor> Contratos { get; set; } = [];

    /// <summary>Contratos dos fornecedores que estão em Contratado: são os pagamentos da aba Dinheiro.</summary>
    public IEnumerable<Project.Domain.Dinheiro.ContratoFornecedor> ContratosAtivos =>
        Contratos.Where(contrato => Fornecedores.Any(vinculo => vinculo.Id == contrato.VinculoId && vinculo.Etapa == EtapaNegociacao.Contratado));

    /// <summary>Valor contratado com o fornecedor do contrato (o valor do vínculo).</summary>
    public decimal ValorDoContrato(Project.Domain.Dinheiro.ContratoFornecedor contrato) =>
        Fornecedores.FirstOrDefault(vinculo => vinculo.Id == contrato.VinculoId)?.ValorOrcamento ?? 0m;

    public List<SubitemServico> Subitens { get; set; } = [];

    public List<FornecedorNoServico> Fornecedores { get; set; } = [];
}

public sealed class SubitemServico : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid ServicoId { get; set; }

    public string Descricao { get; set; } = "";

    public int Quantidade { get; set; } = 1;

    public decimal ValorUnitario { get; set; }
}

public sealed class FornecedorNoServico : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid ServicoId { get; set; }

    public Guid FornecedorId { get; set; }

    public EtapaNegociacao Etapa { get; set; }

    public decimal? ValorOrcamento { get; set; }

    public string? Observacoes { get; set; }
}

public sealed class CompromissoAgenda : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid? EventoId { get; set; }

    public string Descricao { get; set; } = "";

    public DateOnly? Data { get; set; }

    public TimeOnly? Hora { get; set; }
}
