using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class RgEModeloDoEventoFora : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModeloId",
                table: "Eventos");

            migrationBuilder.DropColumn(
                name: "Rg",
                table: "Convidados");

            migrationBuilder.DropColumn(
                name: "Rg",
                table: "Clientes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ModeloId",
                table: "Eventos",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Rg",
                table: "Convidados",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Rg",
                table: "Clientes",
                type: "text",
                nullable: true);
        }
    }
}
