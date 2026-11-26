namespace Project.Domain.Equipe;

/// <summary>
/// A conta (assessoria) dona de todos os dados de negócio (SPEC-062, RF-110).
/// Nasce no cadastro público, com o mesmo Id do usuário que se cadastrou (o Dono).
/// Todo ContaId do banco aponta para cá.
/// </summary>
public sealed class ContaAssessoria
{
    public Guid Id { get; set; }

    /// <summary>Usuário que criou a conta no cadastro. Na Fase 3 os donos passam a ser os membros com tipo Dono.</summary>
    public string DonoUsuarioId { get; set; } = "";

    public DateTimeOffset CriadaEm { get; set; }
}
