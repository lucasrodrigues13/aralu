using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class EstagiosDoFunil : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EstagiosFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Cor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstagiosFunil", x => x.Id);
                });

            migrationBuilder.AddColumn<Guid>(
                name: "EstagioFunilId",
                table: "Oportunidades",
                type: "uuid",
                nullable: true);

            // SPEC-031: cada conta que já tem oportunidade ganha os quatro estágios de antes,
            // e cada lead fica no mesmo estágio em que estava.
            migrationBuilder.Sql("""
                INSERT INTO "EstagiosFunil" ("Id", "ContaId", "Nome", "Cor", "Ordem", "Tipo")
                SELECT gen_random_uuid(), c."ContaId", p.nome, p.cor, p.ordem, p.tipo
                FROM (SELECT DISTINCT "ContaId" FROM "Oportunidades") c
                CROSS JOIN (VALUES
                    ('Contato inicial', 'info', 0, 'Aberto'),
                    ('Orçamento enviado', 'warning', 1, 'Aberto'),
                    ('Contratado', 'success', 2, 'Contratado'),
                    ('Descartado', 'error', 3, 'Descartado')
                ) AS p(nome, cor, ordem, tipo);

                UPDATE "Oportunidades" o
                SET "EstagioFunilId" = e."Id"
                FROM "EstagiosFunil" e
                WHERE e."ContaId" = o."ContaId"
                  AND e."Ordem" = CASE o."Estagio"
                      WHEN 'ContatoInicial' THEN 0
                      WHEN 'OrcamentoEnviado' THEN 1
                      WHEN 'Contratado' THEN 2
                      WHEN 'Descartado' THEN 3
                      ELSE 0
                  END;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "EstagioFunilId",
                table: "Oportunidades",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "Estagio",
                table: "Oportunidades");

            migrationBuilder.CreateIndex(
                name: "IX_Oportunidades_EstagioFunilId",
                table: "Oportunidades",
                column: "EstagioFunilId");

            migrationBuilder.CreateIndex(
                name: "IX_EstagiosFunil_ContaId",
                table: "EstagiosFunil",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_EstagiosFunil_ContaId_Tipo",
                table: "EstagiosFunil",
                columns: new[] { "ContaId", "Tipo" },
                unique: true,
                filter: "\"Tipo\" <> 'Aberto'");

            migrationBuilder.AddForeignKey(
                name: "FK_Oportunidades_EstagiosFunil_EstagioFunilId",
                table: "Oportunidades",
                column: "EstagioFunilId",
                principalTable: "EstagiosFunil",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Estagio",
                table: "Oportunidades",
                type: "text",
                nullable: false,
                defaultValue: "ContatoInicial");

            migrationBuilder.Sql("""
                UPDATE "Oportunidades" o
                SET "Estagio" = CASE
                    WHEN e."Tipo" = 'Contratado' THEN 'Contratado'
                    WHEN e."Tipo" = 'Descartado' THEN 'Descartado'
                    WHEN e."Nome" = 'Orçamento enviado' THEN 'OrcamentoEnviado'
                    ELSE 'ContatoInicial'
                END
                FROM "EstagiosFunil" e
                WHERE e."Id" = o."EstagioFunilId";
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_Oportunidades_EstagiosFunil_EstagioFunilId",
                table: "Oportunidades");

            migrationBuilder.DropIndex(
                name: "IX_Oportunidades_EstagioFunilId",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "EstagioFunilId",
                table: "Oportunidades");

            migrationBuilder.DropTable(
                name: "EstagiosFunil");
        }
    }
}
