using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class BriefingDoLead : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BriefingsOportunidade",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<string>(type: "text", nullable: false),
                    OportunidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModeloBriefingId = table.Column<Guid>(type: "uuid", nullable: true),
                    ModeloNome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AplicadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BriefingsOportunidade", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BriefingsOportunidade_Oportunidades_OportunidadeId",
                        column: x => x.OportunidadeId,
                        principalTable: "Oportunidades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItensBriefingOportunidade",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BriefingOportunidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
                    Secao = table.Column<string>(type: "text", nullable: true),
                    Pergunta = table.Column<string>(type: "text", nullable: false),
                    Resposta = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItensBriefingOportunidade", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItensBriefingOportunidade_BriefingsOportunidade_BriefingOpo~",
                        column: x => x.BriefingOportunidadeId,
                        principalTable: "BriefingsOportunidade",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BriefingsOportunidade_OportunidadeId",
                table: "BriefingsOportunidade",
                column: "OportunidadeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItensBriefingOportunidade_BriefingOportunidadeId",
                table: "ItensBriefingOportunidade",
                column: "BriefingOportunidadeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItensBriefingOportunidade");

            migrationBuilder.DropTable(
                name: "BriefingsOportunidade");
        }
    }
}
