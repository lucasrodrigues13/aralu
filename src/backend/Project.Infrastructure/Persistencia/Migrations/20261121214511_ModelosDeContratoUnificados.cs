using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ModelosDeContratoUnificados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Os modelos de contrato do funil passam para a tela única (ContratosConta), com o mesmo Id:
            // ContratoFunil.ModeloId continua apontando para o modelo. #nome_oportunidade vira a tag do contratante.
            migrationBuilder.Sql(@"
INSERT INTO ""ContratosConta"" (""Id"", ""ContaId"", ""Nome"", ""Texto"", ""CriadoEm"", ""AtualizadoEm"")
SELECT ""Id"", ""ContaId"", LEFT(""Nome"", 120),
       regexp_replace(""Texto"", '#nome_oportunidade', '{{contratante_nome}}', 'gi'),
       now(), now()
FROM ""ModelosContratoFunil""
WHERE NOT EXISTS (SELECT 1 FROM ""ContratosConta"" c WHERE c.""Id"" = ""ModelosContratoFunil"".""Id"");
");

            migrationBuilder.DropTable(
                name: "ModelosContratoFunil");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ModelosContratoFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<string>(type: "text", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModelosContratoFunil", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ModelosContratoFunil_ContaId",
                table: "ModelosContratoFunil",
                column: "ContaId");
        }
    }
}
