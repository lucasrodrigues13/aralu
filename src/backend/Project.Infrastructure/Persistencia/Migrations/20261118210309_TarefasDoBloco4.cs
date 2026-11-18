using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class TarefasDoBloco4 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Prioridade",
                table: "Tarefas",
                type: "text",
                nullable: false,
                defaultValue: "Media");

            migrationBuilder.AddColumn<Guid>(
                name: "ServicoEventoId",
                table: "Tarefas",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Visibilidade",
                table: "Tarefas",
                type: "text",
                nullable: false,
                defaultValue: "SoEu");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CriadoEm",
                table: "Eventos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ComentariosTarefa",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaId = table.Column<Guid>(type: "uuid", nullable: false),
                    AutorContaId = table.Column<string>(type: "text", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComentariosTarefa", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComentariosTarefa_Tarefas_TarefaId",
                        column: x => x.TarefaId,
                        principalTable: "Tarefas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItensChecklistTarefa",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    Feito = table.Column<bool>(type: "boolean", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItensChecklistTarefa", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItensChecklistTarefa_Tarefas_TarefaId",
                        column: x => x.TarefaId,
                        principalTable: "Tarefas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ResponsaveisTarefa",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Papel = table.Column<string>(type: "text", nullable: false),
                    ReferenciaId = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponsaveisTarefa", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResponsaveisTarefa_Tarefas_TarefaId",
                        column: x => x.TarefaId,
                        principalTable: "Tarefas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tarefas_ServicoEventoId",
                table: "Tarefas",
                column: "ServicoEventoId");

            migrationBuilder.CreateIndex(
                name: "IX_ComentariosTarefa_TarefaId",
                table: "ComentariosTarefa",
                column: "TarefaId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensChecklistTarefa_TarefaId",
                table: "ItensChecklistTarefa",
                column: "TarefaId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsaveisTarefa_TarefaId",
                table: "ResponsaveisTarefa",
                column: "TarefaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tarefas_ServicoEvento_ServicoEventoId",
                table: "Tarefas",
                column: "ServicoEventoId",
                principalTable: "ServicoEvento",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql("""
                INSERT INTO "ResponsaveisTarefa" ("Id", "TarefaId", "Papel", "ReferenciaId")
                SELECT gen_random_uuid(), "Id", 'Organizer', "ResponsavelContaId"
                FROM "Tarefas";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tarefas_ServicoEvento_ServicoEventoId",
                table: "Tarefas");

            migrationBuilder.DropTable(
                name: "ComentariosTarefa");

            migrationBuilder.DropTable(
                name: "ItensChecklistTarefa");

            migrationBuilder.DropTable(
                name: "ResponsaveisTarefa");

            migrationBuilder.DropIndex(
                name: "IX_Tarefas_ServicoEventoId",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "Prioridade",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "ServicoEventoId",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "Visibilidade",
                table: "Tarefas");

            migrationBuilder.DropColumn(
                name: "CriadoEm",
                table: "Eventos");
        }
    }
}
