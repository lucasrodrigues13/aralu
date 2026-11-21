using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ContratoAssinadoDoFornecedor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ContratoAssinadoArquivoId",
                table: "ContratosFornecedor",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratoAssinadoNome",
                table: "ContratosFornecedor",
                type: "character varying(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratoAssinadoTipoConteudo",
                table: "ContratosFornecedor",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            // SPEC-045: a aba Dinheiro deixa de criar o contrato no primeiro uso; todo serviço contratado já precisa ter um.
            migrationBuilder.Sql("""
                INSERT INTO "ContratosFornecedor" ("Id", "ServicoId", "Pago")
                SELECT gen_random_uuid(), s."Id", FALSE
                FROM "ServicoEvento" s
                WHERE s."Contratado" AND NOT EXISTS (SELECT 1 FROM "ContratosFornecedor" c WHERE c."ServicoId" = s."Id");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContratoAssinadoArquivoId",
                table: "ContratosFornecedor");

            migrationBuilder.DropColumn(
                name: "ContratoAssinadoNome",
                table: "ContratosFornecedor");

            migrationBuilder.DropColumn(
                name: "ContratoAssinadoTipoConteudo",
                table: "ContratosFornecedor");
        }
    }
}
