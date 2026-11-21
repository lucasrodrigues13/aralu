using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class LimpezaDoLegado : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Convites_Grupos_GrupoId",
                table: "Convites");

            migrationBuilder.DropTable(
                name: "ContratosDoEvento");

            migrationBuilder.DropTable(
                name: "ContratosDoModelo");

            migrationBuilder.DropTable(
                name: "Grupos");

            migrationBuilder.DropTable(
                name: "LinksLeituraContrato");

            migrationBuilder.DropTable(
                name: "LocalTransfer");

            migrationBuilder.DropIndex(
                name: "IX_Convites_GrupoId",
                table: "Convites");

            migrationBuilder.DropColumn(
                name: "TransferAtivo",
                table: "Eventos");

            migrationBuilder.DropColumn(
                name: "GrupoId",
                table: "Convites");

            migrationBuilder.DropColumn(
                name: "LocalOrigem",
                table: "Convites");

            migrationBuilder.DropColumn(
                name: "UsaTransfer",
                table: "Convites");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "TransferAtivo",
                table: "Eventos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "GrupoId",
                table: "Convites",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LocalOrigem",
                table: "Convites",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "UsaTransfer",
                table: "Convites",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ContratosDoEvento",
                columns: table => new
                {
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContratoId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContratosDoEvento", x => new { x.EventoId, x.ContratoId });
                    table.ForeignKey(
                        name: "FK_ContratosDoEvento_ContratosConta_ContratoId",
                        column: x => x.ContratoId,
                        principalTable: "ContratosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ContratosDoEvento_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContratosDoModelo",
                columns: table => new
                {
                    ModeloId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContratoId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContratosDoModelo", x => new { x.ModeloId, x.ContratoId });
                    table.ForeignKey(
                        name: "FK_ContratosDoModelo_ContratosConta_ContratoId",
                        column: x => x.ContratoId,
                        principalTable: "ContratosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ContratosDoModelo_Modelos_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "Modelos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Grupos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Grupos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LinksLeituraContrato",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<string>(type: "text", nullable: false),
                    ContratoId = table.Column<Guid>(type: "uuid", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExpiraEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Token = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LinksLeituraContrato", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LinksLeituraContrato_ContratosConta_ContratoId",
                        column: x => x.ContratoId,
                        principalTable: "ContratosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LinksLeituraContrato_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LocalTransfer",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocalTransfer", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LocalTransfer_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Convites_GrupoId",
                table: "Convites",
                column: "GrupoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosDoEvento_ContratoId",
                table: "ContratosDoEvento",
                column: "ContratoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosDoModelo_ContratoId",
                table: "ContratosDoModelo",
                column: "ContratoId");

            migrationBuilder.CreateIndex(
                name: "IX_LinksLeituraContrato_ContratoId",
                table: "LinksLeituraContrato",
                column: "ContratoId");

            migrationBuilder.CreateIndex(
                name: "IX_LinksLeituraContrato_EventoId",
                table: "LinksLeituraContrato",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_LinksLeituraContrato_Token",
                table: "LinksLeituraContrato",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LocalTransfer_EventoId",
                table: "LocalTransfer",
                column: "EventoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Convites_Grupos_GrupoId",
                table: "Convites",
                column: "GrupoId",
                principalTable: "Grupos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
