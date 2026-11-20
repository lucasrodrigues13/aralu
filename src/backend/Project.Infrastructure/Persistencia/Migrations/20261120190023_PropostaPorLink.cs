using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class PropostaPorLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "AbertoEm",
                table: "OrcamentosFunil",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Resposta",
                table: "OrcamentosFunil",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RespostaEm",
                table: "OrcamentosFunil",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RespostaMensagem",
                table: "OrcamentosFunil",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TokenLink",
                table: "OrcamentosFunil",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ValidoAte",
                table: "OrcamentosFunil",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RespostasPropostaFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<string>(type: "text", nullable: false),
                    OrcamentoFunilId = table.Column<Guid>(type: "uuid", nullable: false),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Mensagem = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RespostasPropostaFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RespostasPropostaFunil_OrcamentosFunil_OrcamentoFunilId",
                        column: x => x.OrcamentoFunilId,
                        principalTable: "OrcamentosFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentosFunil_TokenLink",
                table: "OrcamentosFunil",
                column: "TokenLink",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RespostasPropostaFunil_OrcamentoFunilId",
                table: "RespostasPropostaFunil",
                column: "OrcamentoFunilId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RespostasPropostaFunil");

            migrationBuilder.DropIndex(
                name: "IX_OrcamentosFunil_TokenLink",
                table: "OrcamentosFunil");

            migrationBuilder.DropColumn(
                name: "AbertoEm",
                table: "OrcamentosFunil");

            migrationBuilder.DropColumn(
                name: "Resposta",
                table: "OrcamentosFunil");

            migrationBuilder.DropColumn(
                name: "RespostaEm",
                table: "OrcamentosFunil");

            migrationBuilder.DropColumn(
                name: "RespostaMensagem",
                table: "OrcamentosFunil");

            migrationBuilder.DropColumn(
                name: "TokenLink",
                table: "OrcamentosFunil");

            migrationBuilder.DropColumn(
                name: "ValidoAte",
                table: "OrcamentosFunil");
        }
    }
}
