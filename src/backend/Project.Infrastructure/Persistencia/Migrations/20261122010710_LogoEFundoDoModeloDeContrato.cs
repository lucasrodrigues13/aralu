using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class LogoEFundoDoModeloDeContrato : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "FundoArquivoId",
                table: "ContratosFunil",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LogoArquivoId",
                table: "ContratosFunil",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FundoArquivoId",
                table: "ContratosConta",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LogoArquivoId",
                table: "ContratosConta",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FundoArquivoId",
                table: "ContratosFunil");

            migrationBuilder.DropColumn(
                name: "LogoArquivoId",
                table: "ContratosFunil");

            migrationBuilder.DropColumn(
                name: "FundoArquivoId",
                table: "ContratosConta");

            migrationBuilder.DropColumn(
                name: "LogoArquivoId",
                table: "ContratosConta");
        }
    }
}
