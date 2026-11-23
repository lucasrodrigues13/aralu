using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ModeloDeContratoEmWord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DocumentoArquivoId",
                table: "ContratosFunil",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Formato",
                table: "ContratosConta",
                type: "text",
                nullable: false,
                defaultValue: "texto");

            migrationBuilder.AddColumn<Guid>(
                name: "WordArquivoId",
                table: "ContratosConta",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WordNome",
                table: "ContratosConta",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DocumentoArquivoId",
                table: "ContratosFunil");

            migrationBuilder.DropColumn(
                name: "Formato",
                table: "ContratosConta");

            migrationBuilder.DropColumn(
                name: "WordArquivoId",
                table: "ContratosConta");

            migrationBuilder.DropColumn(
                name: "WordNome",
                table: "ContratosConta");
        }
    }
}
