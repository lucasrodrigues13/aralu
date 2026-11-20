using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class RetornoOrigemDoFunil : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ContatoRepetido",
                table: "Oportunidades",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FonteOutro",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "RetornarEm",
                table: "Oportunidades",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "RetornarHora",
                table: "Oportunidades",
                type: "time without time zone",
                nullable: true);

            // SPEC-031 §6.4: a origem vira lista fechada. O texto que bate com um item vira o item;
            // o resto vira "Outro" com o texto original. "Formulário público" era o padrão do formulário.
            migrationBuilder.Sql("""
                UPDATE "Oportunidades" SET "Fonte" = 'Formulário do site'
                WHERE lower(trim("Fonte")) IN ('formulário público', 'formulario publico', 'formulário do site');

                UPDATE "Oportunidades" o SET "Fonte" = l.item
                FROM (VALUES ('Instagram'), ('Indicação'), ('Google'), ('Página pública'), ('Formulário do site'),
                             ('WhatsApp'), ('Feira ou evento'), ('Fornecedor parceiro'), ('Cliente antigo'), ('Outro')) AS l(item)
                WHERE lower(trim(o."Fonte")) = lower(l.item);

                UPDATE "Oportunidades" SET "FonteOutro" = trim("Fonte"), "Fonte" = 'Outro'
                WHERE "Fonte" IS NOT NULL AND trim("Fonte") <> ''
                  AND "Fonte" NOT IN ('Instagram', 'Indicação', 'Google', 'Página pública', 'Formulário do site',
                                      'WhatsApp', 'Feira ou evento', 'Fornecedor parceiro', 'Cliente antigo', 'Outro');

                UPDATE "Oportunidades" SET "Fonte" = NULL WHERE trim("Fonte") = '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""UPDATE "Oportunidades" SET "Fonte" = "FonteOutro" WHERE "Fonte" = 'Outro' AND "FonteOutro" IS NOT NULL;""");

            migrationBuilder.DropColumn(
                name: "ContatoRepetido",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "FonteOutro",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "RetornarEm",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "RetornarHora",
                table: "Oportunidades");
        }
    }
}
