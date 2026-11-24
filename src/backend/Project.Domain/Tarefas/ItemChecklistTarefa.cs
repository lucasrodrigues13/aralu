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

    /// <summary>Prazo próprio do item (SPEC-003 §6.8): data exata, ou o prazo efetivo do item relativo.</summary>
    public DateOnly? Prazo { get; set; }

    /// <summary>Prazo relativo do item: dias em relação à data do evento. Nulo = data exata ou sem prazo.</summary>
    public int? PrazoRelativo { get; set; }

    /// <summary>Responsável do item: uma pessoa só (dona, cliente ou assistente). Nulo = sem responsável.</summary>
    public PapelResponsavel? ResponsavelPapel { get; set; }

    /// <summary>Conta da dona ou id da assistente; nulo para o cliente.</summary>
    public string? ResponsavelReferenciaId { get; set; }

    /// <summary>Item com data exata que ainda pode andar com a data do evento: aberto e com prazo. O relativo anda sozinho.</summary>
    public bool PrazoMovivel => Prazo is not null && PrazoRelativo is null && !Feito && !Cancelado;

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
