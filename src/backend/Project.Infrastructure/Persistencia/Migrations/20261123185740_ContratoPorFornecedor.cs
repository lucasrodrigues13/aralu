using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ContratoPorFornecedor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ContratosFornecedor_ServicoId",
                table: "ContratosFornecedor");

            migrationBuilder.AddColumn<Guid>(
                name: "VinculoId",
                table: "ContratosFornecedor",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            // O contrato do serviço passa para o fornecedor contratado (ou, sem contratado, o primeiro fornecedor do serviço).
            migrationBuilder.Sql("""
                UPDATE "ContratosFornecedor" c SET "VinculoId" = v."Id"
                FROM (
                    SELECT DISTINCT ON ("ServicoId") "Id", "ServicoId"
                    FROM "FornecedorNoServico"
                    ORDER BY "ServicoId", ("Etapa" = 'Contratado') DESC, "Id"
                ) v
                WHERE v."ServicoId" = c."ServicoId";
                """);
            migrationBuilder.Sql("""
                DELETE FROM "ContratosFornecedor" WHERE "VinculoId" = '00000000-0000-0000-0000-000000000000';
                """);
            // O valor contratado passa a ser do fornecedor; o do serviço vira a soma dos contratados.
            migrationBuilder.Sql("""
                UPDATE "FornecedorNoServico" v SET "ValorOrcamento" = s."ValorContratado"
                FROM "ServicoEvento" s
                WHERE s."Id" = v."ServicoId" AND v."Etapa" = 'Contratado' AND v."ValorOrcamento" IS NULL;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFornecedor_ServicoId",
                table: "ContratosFornecedor",
                column: "ServicoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFornecedor_VinculoId",
                table: "ContratosFornecedor",
                column: "VinculoId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ContratosFornecedor_FornecedorNoServico_VinculoId",
                table: "ContratosFornecedor",
                column: "VinculoId",
                principalTable: "FornecedorNoServico",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ContratosFornecedor_FornecedorNoServico_VinculoId",
                table: "ContratosFornecedor");

            migrationBuilder.DropIndex(
                name: "IX_ContratosFornecedor_ServicoId",
                table: "ContratosFornecedor");

            migrationBuilder.DropIndex(
                name: "IX_ContratosFornecedor_VinculoId",
                table: "ContratosFornecedor");

            migrationBuilder.DropColumn(
                name: "VinculoId",
                table: "ContratosFornecedor");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFornecedor_ServicoId",
                table: "ContratosFornecedor",
                column: "ServicoId",
                unique: true);
        }
    }
}
