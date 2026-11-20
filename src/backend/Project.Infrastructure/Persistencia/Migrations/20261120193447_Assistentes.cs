using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class Assistentes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Assistentes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<string>(type: "text", nullable: false),
                    UsuarioId = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Celular = table.Column<string>(type: "text", nullable: true),
                    Nascimento = table.Column<DateOnly>(type: "date", nullable: true),
                    PodeVerFinanceiro = table.Column<bool>(type: "boolean", nullable: false),
                    SomenteDela = table.Column<bool>(type: "boolean", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    ConvidadaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PrimeiroAcessoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RemovidaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assistentes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EventosAssistentes",
                columns: table => new
                {
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssistenteId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventosAssistentes", x => new { x.EventoId, x.AssistenteId });
                    table.ForeignKey(
                        name: "FK_EventosAssistentes_Assistentes_AssistenteId",
                        column: x => x.AssistenteId,
                        principalTable: "Assistentes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EventosAssistentes_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Assistentes_ContaId",
                table: "Assistentes",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_Assistentes_UsuarioId",
                table: "Assistentes",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_EventosAssistentes_AssistenteId",
                table: "EventosAssistentes",
                column: "AssistenteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventosAssistentes");

            migrationBuilder.DropTable(
                name: "Assistentes");
        }
    }
}
