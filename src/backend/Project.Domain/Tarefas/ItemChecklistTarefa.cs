namespace Project.Domain.Tarefas;

public sealed class ItemChecklistTarefa
{
    public Guid Id { get; set; }

    public Guid TarefaId { get; set; }

    public string Texto { get; set; } = "";

    public bool Feito { get; set; }

    /// <summary>Item descartado: continua na lista, riscado. Não conta como feito.</summary>
    public bool Cancelado { get; set; }

    public int Ordem { get; set; }

    /// <summary>Prazo próprio do item (SPEC-003 §6.8). Independe do prazo da tarefa.</summary>
    public DateOnly? Prazo { get; set; }

    /// <summary>Responsável do item: uma pessoa só (dona, casal ou assistente). Nulo = sem responsável.</summary>
    public PapelResponsavel? ResponsavelPapel { get; set; }

    /// <summary>Conta da dona ou id da assistente; nulo para o casal.</summary>
    public string? ResponsavelReferenciaId { get; set; }

    /// <summary>Item que ainda pode andar com a data do evento: aberto (não feito, não cancelado) e com prazo.</summary>
    public bool PrazoMovivel => Prazo is not null && !Feito && !Cancelado;

    /// <summary>Desloca o prazo pela diferença em dias, se o item for movível (SPEC-012 §6.6). Devolve se mudou.</summary>
    public bool DeslocarPrazo(int dias)
    {
        if (!PrazoMovivel || dias == 0)
        {
            return false;
        }

        Prazo = Prazo!.Value.AddDays(dias);
        return true;
    }
}
