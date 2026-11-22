using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class HtmlDeAceiteDoOrcamento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HtmlAceite",
                table: "OrcamentosFunil",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HtmlAceite",
                table: "ModelosOrcamentoFunil",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HtmlAceite",
                table: "OrcamentosFunil");

            migrationBuilder.DropColumn(
                name: "HtmlAceite",
                table: "ModelosOrcamentoFunil");
        }
    }
}
