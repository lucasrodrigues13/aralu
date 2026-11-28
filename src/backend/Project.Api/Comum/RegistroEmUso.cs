using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Project.Api.Comum;

/// <summary>
/// Exclusão barrada por FK RESTRICT (SPEC-062 Fase 3): vira 409 com mensagem clara, no lugar de erro 500.
/// A mensagem sai da tabela referenciada, lida do nome da restrição (FK_Dependente_Principal_Coluna).
/// </summary>
public static class RegistroEmUso
{
    public const string Codigo = "em_uso";
    private const string ViolacaoDeChaveEstrangeira = "23503";

    public static string? Mensagem(Exception? erro)
    {
        if (erro is not DbUpdateException { InnerException: PostgresException postgres }
            || postgres.SqlState != ViolacaoDeChaveEstrangeira)
        {
            return null;
        }

        var principal = postgres.ConstraintName?.Split('_') is { Length: >= 3 } partes ? partes[2] : "";
        return principal switch
        {
            "Arquivos" => "Este arquivo ainda está em uso e não pode ser apagado.",
            "Fornecedores" => "Este fornecedor está em serviços de eventos. Tire-o dos eventos antes de excluir.",
            "ServicosConta" => "Este serviço está ligado a fornecedores. Tire a ligação antes de excluir.",
            "EstagiosFunil" => "Há oportunidades neste estágio. Mova-as antes de excluir.",
            "GruposAcesso" => "Há membros neste grupo. Mova-os antes de apagá-lo.",
            "Contas" or "AspNetUsers" => "Este registro ainda tem dados ligados e não pode ser excluído.",
            _ => "Este registro está em uso em outro lugar e não pode ser excluído.",
        };
    }
}
