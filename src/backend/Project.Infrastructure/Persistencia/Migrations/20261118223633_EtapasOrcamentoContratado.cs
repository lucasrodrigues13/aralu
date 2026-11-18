using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <summary>RF-059: a negociação passa a ter duas etapas, Orçamento e Contratado.</summary>
    public partial class EtapasOrcamentoContratado : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "FornecedorNoServico"
                SET "Etapa" = 'Orcamento'
                WHERE "Etapa" IN ('Recomendado', 'OrcamentoSolicitado', 'OrcamentoRecebido');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "FornecedorNoServico"
                SET "Etapa" = 'Recomendado'
                WHERE "Etapa" = 'Orcamento';
                """);
        }
    }
}
