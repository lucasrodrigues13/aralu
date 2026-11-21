using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <summary>
    /// SPEC-034: CPF e CNPJ passam a ser gravados sem máscara e em maiúsculas. Não muda o esquema
    /// (as colunas já são texto); só tira pontos, barra e traço do que já está gravado. Valor que,
    /// limpo, não tem 11 ou 14 caracteres fica como está, para não perder dado digitado em texto livre.
    /// </summary>
    public partial class DocumentosSemMascara : Migration
    {
        private static string Limpo(string coluna) =>
            $"UPPER(REGEXP_REPLACE(\"{coluna}\", '[^0-9A-Za-z]', '', 'g'))";

        private static string Normalizar(string tabela, string coluna, string extra = "") =>
            $"UPDATE \"{tabela}\" SET \"{coluna}\" = {Limpo(coluna)} " +
            $"WHERE \"{coluna}\" IS NOT NULL{extra} " +
            $"AND LENGTH(REGEXP_REPLACE(\"{coluna}\", '[^0-9A-Za-z]', '', 'g')) IN (11, 14) " +
            $"AND \"{coluna}\" <> {Limpo(coluna)};";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(Normalizar("Clientes", "Cpf"));
            migrationBuilder.Sql(Normalizar("Clientes", "Cnpj"));
            migrationBuilder.Sql(Normalizar("Convidados", "Cpf"));
            migrationBuilder.Sql(Normalizar("Fornecedores", "Cpf"));
            migrationBuilder.Sql(Normalizar("Fornecedores", "Cnpj"));
            migrationBuilder.Sql(Normalizar("Fornecedores", "DocumentosBancarios"));
            migrationBuilder.Sql(Normalizar("Fornecedores", "PixChave", " AND \"PixTipo\" IN ('Cpf', 'Cnpj')"));
            migrationBuilder.Sql(Normalizar("Perfis", "Documento"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // A máscara não é recuperável de forma segura (o formato depende de ser CPF ou CNPJ e
            // de quem digitou); como a máscara é só de exibição, desfazer não restaura nada.
        }
    }
}
