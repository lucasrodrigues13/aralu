using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class EnderecoEstruturadoDoPerfil : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bairro",
                table: "Perfis",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cep",
                table: "Perfis",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cidade",
                table: "Perfis",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Complemento",
                table: "Perfis",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Estado",
                table: "Perfis",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Numero",
                table: "Perfis",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Pais",
                table: "Perfis",
                type: "text",
                nullable: true);

            // O texto livre antigo não vira campos sozinho; é descartado (SPEC-038 §8).
            migrationBuilder.Sql("UPDATE \"Perfis\" SET \"Endereco\" = NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Bairro",
                table: "Perfis");

            migrationBuilder.DropColumn(
                name: "Cep",
                table: "Perfis");

            migrationBuilder.DropColumn(
                name: "Cidade",
                table: "Perfis");

            migrationBuilder.DropColumn(
                name: "Complemento",
                table: "Perfis");

            migrationBuilder.DropColumn(
                name: "Estado",
                table: "Perfis");

            migrationBuilder.DropColumn(
                name: "Numero",
                table: "Perfis");

            migrationBuilder.DropColumn(
                name: "Pais",
                table: "Perfis");
        }
    }
}
