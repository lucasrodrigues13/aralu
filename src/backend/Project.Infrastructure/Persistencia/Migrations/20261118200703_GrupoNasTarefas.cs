using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class GrupoNasTarefas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Grupo",
                table: "Tarefas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Grupo",
                table: "TarefaModelo",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Grupo",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "Grupo",
                table: "TarefaModelo");
        }
    }
}
