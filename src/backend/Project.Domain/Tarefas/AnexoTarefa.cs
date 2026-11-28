using Project.Domain.Comum;
namespace Project.Domain.Tarefas;

/// <summary>Arquivo de trabalho da tarefa: JPG, JPEG, PNG ou PDF até 5 MB (SPEC-003 §6.6).</summary>
public sealed class AnexoTarefa : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid TarefaId { get; set; }

    public Guid ArquivoId { get; set; }

    public string Nome { get; set; } = "";

    public string TipoConteudo { get; set; } = "";

    public DateTimeOffset EnviadoEm { get; set; }
}
