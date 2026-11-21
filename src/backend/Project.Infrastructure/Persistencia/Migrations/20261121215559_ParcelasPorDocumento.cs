using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ParcelasPorDocumento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Card #41: os dados de parcelas do casal e de fornecedor são descartados (decidido em 21/11/2026).
            // O "serviço" Assessoria e Organização só guardava as parcelas do casal: sai junto.
            migrationBuilder.Sql("DELETE FROM \"RecebimentosParcela\";");
            migrationBuilder.Sql(
                "DELETE FROM \"ServicoEvento\" s USING \"Eventos\" e " +
                "WHERE e.\"Id\" = s.\"EventoId\" AND s.\"Nome\" = 'Assessoria e Organização' AND s.\"FornecedorContaId\" = e.\"ContaId\";");

            migrationBuilder.DropForeignKey(
                name: "FK_RecebimentosParcela_ParcelasCasal_ParcelaId",
                table: "RecebimentosParcela");

            migrationBuilder.DropTable(
                name: "ParcelasCasal");

            migrationBuilder.DropTable(
                name: "ParcelaServico");

            migrationBuilder.DropColumn(
                name: "ValorContrato",
                table: "Eventos");

            migrationBuilder.CreateTable(
                name: "ContratosFornecedor",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServicoId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContratosFornecedor", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContratosFornecedor_ServicoEvento_ServicoId",
                        column: x => x.ServicoId,
                        principalTable: "ServicoEvento",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParcelasContrato",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContratoFunilId = table.Column<Guid>(type: "uuid", nullable: false),
                    Numero = table.Column<int>(type: "integer", nullable: false),
                    Vencimento = table.Column<DateOnly>(type: "date", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Entrada = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParcelasContrato", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParcelasContrato_ContratosFunil_ContratoFunilId",
                        column: x => x.ContratoFunilId,
                        principalTable: "ContratosFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParcelasOrcamento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrcamentoFunilId = table.Column<Guid>(type: "uuid", nullable: false),
                    Numero = table.Column<int>(type: "integer", nullable: false),
                    Vencimento = table.Column<DateOnly>(type: "date", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Entrada = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParcelasOrcamento", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParcelasOrcamento_OrcamentosFunil_OrcamentoFunilId",
                        column: x => x.OrcamentoFunilId,
                        principalTable: "OrcamentosFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParcelasContratoFornecedor",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContratoFornecedorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Numero = table.Column<int>(type: "integer", nullable: false),
                    Vencimento = table.Column<DateOnly>(type: "date", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Entrada = table.Column<bool>(type: "boolean", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParcelasContratoFornecedor", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParcelasContratoFornecedor_ContratosFornecedor_ContratoForn~",
                        column: x => x.ContratoFornecedorId,
                        principalTable: "ContratosFornecedor",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFornecedor_ServicoId",
                table: "ContratosFornecedor",
                column: "ServicoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasContrato_ContratoFunilId",
                table: "ParcelasContrato",
                column: "ContratoFunilId");

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasContratoFornecedor_ContratoFornecedorId",
                table: "ParcelasContratoFornecedor",
                column: "ContratoFornecedorId");

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasOrcamento_OrcamentoFunilId",
                table: "ParcelasOrcamento",
                column: "OrcamentoFunilId");

            migrationBuilder.AddForeignKey(
                name: "FK_RecebimentosParcela_ParcelasContrato_ParcelaId",
                table: "RecebimentosParcela",
                column: "ParcelaId",
                principalTable: "ParcelasContrato",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RecebimentosParcela_ParcelasContrato_ParcelaId",
                table: "RecebimentosParcela");

            migrationBuilder.DropTable(
                name: "ParcelasContrato");

            migrationBuilder.DropTable(
                name: "ParcelasContratoFornecedor");

            migrationBuilder.DropTable(
                name: "ParcelasOrcamento");

            migrationBuilder.DropTable(
                name: "ContratosFornecedor");

            migrationBuilder.AddColumn<decimal>(
                name: "ValorContrato",
                table: "Eventos",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ParcelasCasal",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Entrada = table.Column<bool>(type: "boolean", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Numero = table.Column<int>(type: "integer", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Vencimento = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParcelasCasal", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParcelasCasal_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParcelaServico",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Entrada = table.Column<bool>(type: "boolean", nullable: false),
                    Numero = table.Column<int>(type: "integer", nullable: false),
                    ServicoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Vencimento = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParcelaServico", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParcelaServico_ServicoEvento_ServicoId",
                        column: x => x.ServicoId,
                        principalTable: "ServicoEvento",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasCasal_EventoId",
                table: "ParcelasCasal",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_ParcelaServico_ServicoId",
                table: "ParcelaServico",
                column: "ServicoId");

            migrationBuilder.AddForeignKey(
                name: "FK_RecebimentosParcela_ParcelasCasal_ParcelaId",
                table: "RecebimentosParcela",
                column: "ParcelaId",
                principalTable: "ParcelasCasal",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
