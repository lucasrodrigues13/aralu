using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class FilaDeImportacaoDeConvidados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ImportacoesConvidados",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    NomeArquivo = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    Arquivo = table.Column<byte[]>(type: "bytea", nullable: false),
                    ObservacaoFixa = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Situacao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CriadaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConcluidaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Convites = table.Column<int>(type: "integer", nullable: false),
                    Erros = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportacoesConvidados", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportacoesConvidados_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ImportacoesConvidados_EventoId_CriadaEm",
                table: "ImportacoesConvidados",
                columns: new[] { "EventoId", "CriadaEm" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportacoesConvidados_Situacao",
                table: "ImportacoesConvidados",
                column: "Situacao");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImportacoesConvidados");
        }
    }
}
