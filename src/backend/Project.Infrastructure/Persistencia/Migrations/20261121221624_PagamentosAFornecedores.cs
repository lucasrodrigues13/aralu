using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class PagamentosAFornecedores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ComprovantesEvento");

            migrationBuilder.DropTable(
                name: "LancamentosEvento");

            migrationBuilder.AddColumn<Guid>(
                name: "ComprovanteArquivoId",
                table: "ParcelasContratoFornecedor",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComprovanteNome",
                table: "ParcelasContratoFornecedor",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComprovanteTipoConteudo",
                table: "ParcelasContratoFornecedor",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "PagoEm",
                table: "ParcelasContratoFornecedor",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ComprovanteArquivoId",
                table: "ContratosFornecedor",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComprovanteNome",
                table: "ContratosFornecedor",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComprovanteTipoConteudo",
                table: "ContratosFornecedor",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Pago",
                table: "ContratosFornecedor",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "PagoEm",
                table: "ContratosFornecedor",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ComprovanteArquivoId",
                table: "ParcelasContratoFornecedor");

            migrationBuilder.DropColumn(
                name: "ComprovanteNome",
                table: "ParcelasContratoFornecedor");

            migrationBuilder.DropColumn(
                name: "ComprovanteTipoConteudo",
                table: "ParcelasContratoFornecedor");

            migrationBuilder.DropColumn(
                name: "PagoEm",
                table: "ParcelasContratoFornecedor");

            migrationBuilder.DropColumn(
                name: "ComprovanteArquivoId",
                table: "ContratosFornecedor");

            migrationBuilder.DropColumn(
                name: "ComprovanteNome",
                table: "ContratosFornecedor");

            migrationBuilder.DropColumn(
                name: "ComprovanteTipoConteudo",
                table: "ContratosFornecedor");

            migrationBuilder.DropColumn(
                name: "Pago",
                table: "ContratosFornecedor");

            migrationBuilder.DropColumn(
                name: "PagoEm",
                table: "ContratosFornecedor");

            migrationBuilder.CreateTable(
                name: "ComprovantesEvento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ArquivoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Descricao = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    EnviadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    TipoConteudo = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComprovantesEvento", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComprovantesEvento_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LancamentosEvento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Categoria = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Data = table.Column<DateOnly>(type: "date", nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: true),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LancamentosEvento", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LancamentosEvento_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ComprovantesEvento_EventoId",
                table: "ComprovantesEvento",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_LancamentosEvento_EventoId",
                table: "LancamentosEvento",
                column: "EventoId");
        }
    }
}
