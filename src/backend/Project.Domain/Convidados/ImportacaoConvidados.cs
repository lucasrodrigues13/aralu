namespace Project.Domain.Convidados;

/// <summary>
/// Importação de planilha de convidados na fila (SPEC-059 §6.6): o envio grava o arquivo como Pendente e o
/// processamento em segundo plano da própria API passa para Processando e termina em Importado ou Erro.
/// </summary>
public sealed class ImportacaoConvidados
{
    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

    public Guid EventoId { get; set; }

    public string NomeArquivo { get; set; } = "";

    /// <summary>Conteúdo da planilha; esvaziado ao terminar o processamento.</summary>
    public byte[] Arquivo { get; set; } = [];

    /// <summary>Observação gravada nos convites importados pelo link do cliente ("Preenchido pelo casal").</summary>
    public string? ObservacaoFixa { get; set; }

    public SituacaoImportacao Situacao { get; set; } = SituacaoImportacao.Pendente;

    public DateTimeOffset CriadaEm { get; set; }

    public DateTimeOffset? ConcluidaEm { get; set; }

    public int Convites { get; set; }

    public List<string> Erros { get; set; } = [];
}

public enum SituacaoImportacao
{
    Pendente,
    Processando,
    Importado,
    Erro,
}
