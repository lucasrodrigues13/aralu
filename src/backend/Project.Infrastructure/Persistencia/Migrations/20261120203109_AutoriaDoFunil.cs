using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class AutoriaDoFunil : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "TarefasFunil",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "OrcamentosFunil",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CriadoPor",
                table: "ContratosFunil",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "TarefasFunil");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "OrcamentosFunil");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "CriadoPor",
                table: "ContratosFunil");
        }
    }
}
