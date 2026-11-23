namespace Project.Domain.Funil;

public enum SituacaoContratoFunil
{
    EmAndamento = 0,
    Assinado = 1,
    Cancelado = 2,
}

public sealed class ContratoFunil
{
    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

    public Guid OportunidadeId { get; set; }

    public string Conteudo { get; set; } = "";

    public SituacaoContratoFunil Situacao { get; set; }

    public DateTimeOffset CriadoEm { get; set; }

    /// <summary>Id do usuário que criou. Nulo nos itens antigos (SPEC-032 §18, passo 1).</summary>
    public string? CriadoPor { get; set; }

    public DateTimeOffset? EnviadoEm { get; set; }

    public DateTimeOffset? AssinadoEm { get; set; }

    public Guid? ModeloId { get; set; }

    /// <summary>Logo e fundo copiados do modelo ao gerar o contrato (SPEC-056): o contrato guarda o próprio vínculo.</summary>
    public Guid? LogoArquivoId { get; set; }

    public Guid? FundoArquivoId { get; set; }

    /// <summary>Contrato gerado de modelo Word: o .docx já preenchido, no armazenamento de arquivos.</summary>
    public Guid? DocumentoArquivoId { get; set; }

    /// <summary>Parcelas a receber do cliente, copiadas do orçamento aprovado ao gerar o contrato (SPEC-040).</summary>
    public List<Project.Domain.Dinheiro.ParcelaContrato> Parcelas { get; set; } = [];
}
