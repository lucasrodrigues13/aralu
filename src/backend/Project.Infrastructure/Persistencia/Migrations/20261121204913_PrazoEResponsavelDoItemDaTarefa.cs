using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class PrazoEResponsavelDoItemDaTarefa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "Prazo",
                table: "ItensChecklistTarefa",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponsavelPapel",
                table: "ItensChecklistTarefa",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponsavelReferenciaId",
                table: "ItensChecklistTarefa",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Prazo",
                table: "ItensChecklistTarefa");

            migrationBuilder.DropColumn(
                name: "ResponsavelPapel",
                table: "ItensChecklistTarefa");

            migrationBuilder.DropColumn(
                name: "ResponsavelReferenciaId",
                table: "ItensChecklistTarefa");
        }
    }
}
