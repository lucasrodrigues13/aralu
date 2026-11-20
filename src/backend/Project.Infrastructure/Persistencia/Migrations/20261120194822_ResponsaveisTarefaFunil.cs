using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ResponsaveisTarefaFunil : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ResponsaveisTarefaFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaFunilId = table.Column<Guid>(type: "uuid", nullable: false),
                    Papel = table.Column<string>(type: "text", nullable: false),
                    ReferenciaId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponsaveisTarefaFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResponsaveisTarefaFunil_TarefasFunil_TarefaFunilId",
                        column: x => x.TarefaFunilId,
                        principalTable: "TarefasFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResponsaveisTarefaFunil_TarefaFunilId",
                table: "ResponsaveisTarefaFunil",
                column: "TarefaFunilId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResponsaveisTarefaFunil");
        }
    }
}
