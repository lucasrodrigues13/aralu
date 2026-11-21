using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class QuemEnviouOContratoDoFornecedor : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "ContratoAssinadoEnviadoEm",
                table: "ContratosFornecedor",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContratoAssinadoEnviadoPor",
                table: "ContratosFornecedor",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContratoAssinadoEnviadoEm",
                table: "ContratosFornecedor");

            migrationBuilder.DropColumn(
                name: "ContratoAssinadoEnviadoPor",
                table: "ContratosFornecedor");
        }
    }
}
