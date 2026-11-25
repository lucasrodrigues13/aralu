using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class MidiasDaPaginaDeAceite : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExtrasAceite",
                table: "OrcamentosFunil",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExtrasAceite",
                table: "ModelosOrcamentoFunil",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExtrasAceite",
                table: "OrcamentosFunil");

            migrationBuilder.DropColumn(
                name: "ExtrasAceite",
                table: "ModelosOrcamentoFunil");
        }
    }
}
