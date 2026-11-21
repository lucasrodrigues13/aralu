using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class DadosDoContratante : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContratanteBairro",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteCelular",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteCep",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteCidade",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteComplemento",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteDocumento",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteEmail",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteEndereco",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteEstado",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteEstadoCivil",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteNacionalidade",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "ContratanteNascimento",
                table: "Oportunidades",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteNome",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteNumero",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratantePais",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratanteProfissao",
                table: "Oportunidades",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Contratante",
                table: "ContatoOportunidade",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "EstadoCivil",
                table: "Clientes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Nacionalidade",
                table: "Clientes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContratanteBairro",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteCelular",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteCep",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteCidade",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteComplemento",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteDocumento",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteEmail",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteEndereco",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteEstado",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteEstadoCivil",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteNacionalidade",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteNascimento",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteNome",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteNumero",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratantePais",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "ContratanteProfissao",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "Contratante",
                table: "ContatoOportunidade");

            migrationBuilder.DropColumn(
                name: "EstadoCivil",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "Nacionalidade",
                table: "Clientes");
        }
    }
}
