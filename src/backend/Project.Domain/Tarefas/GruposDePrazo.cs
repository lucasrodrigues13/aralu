namespace Project.Domain.Tarefas;

/// <summary>
/// Grupos da SPEC-003 §6.2. O domingo é o fim da semana, como o texto da spec.
/// O fuso da conta e o encaixe de prazo vencido depois da criação do evento ficam na §17:
/// quem não entra em nenhum grupo volta nulo.
/// </summary>
public static class GruposDePrazo
{
    public static GrupoPrazo? Classificar(SituacaoTarefa situacao, DateOnly? prazo, DateOnly? eventoCriadoEm, DateOnly hoje)
    {
        if (situacao == SituacaoTarefa.Concluida)
        {
            return GrupoPrazo.Feitas;
        }

        if (prazo is null)
        {
            return GrupoPrazo.SemPrazo;
        }

        if (eventoCriadoEm is DateOnly criado && prazo.Value < criado)
        {
            return GrupoPrazo.ParaConferir;
        }

        var domingo = Domingo(hoje);
        if (prazo.Value >= hoje && prazo.Value <= domingo)
        {
            return GrupoPrazo.EstaSemana;
        }

        if (prazo.Value > domingo)
        {
            return GrupoPrazo.Depois;
        }

        return null;
    }

    public static DateOnly Domingo(DateOnly hoje)
    {
        var dias = ((int)DayOfWeek.Sunday - (int)hoje.DayOfWeek + 7) % 7;
        return hoje.AddDays(dias);
    }
}
