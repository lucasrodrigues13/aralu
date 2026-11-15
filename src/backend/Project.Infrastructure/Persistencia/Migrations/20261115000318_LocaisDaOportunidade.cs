using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class LocaisDaOportunidade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BairroCerimonia",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BairroRecepcao",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CepCerimonia",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CepRecepcao",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CidadeRecepcao",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EstadoRecepcao",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NumeroCerimonia",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NumeroRecepcao",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaisCerimonia",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaisRecepcao",
                table: "Oportunidades",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BairroCerimonia",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "BairroRecepcao",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "CepCerimonia",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "CepRecepcao",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "CidadeRecepcao",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "EstadoRecepcao",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "NumeroCerimonia",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "NumeroRecepcao",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "PaisCerimonia",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "PaisRecepcao",
                table: "Oportunidades");
        }
    }
}
