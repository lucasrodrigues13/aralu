using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class ConvitesDoCasal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ConvidadosLiberado",
                table: "LinksCasal",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DataEnvio",
                table: "Convites",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "Convites",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConvidadosLiberado",
                table: "LinksCasal");

            migrationBuilder.DropColumn(
                name: "DataEnvio",
                table: "Convites");

            migrationBuilder.DropColumn(
                name: "Email",
                table: "Convites");
        }
    }
}
