using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class DataDeEnvioDosConvitesNoEvento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DataEnvio",
                table: "Convites");

            migrationBuilder.AddColumn<DateOnly>(
                name: "DataEnvioConvites",
                table: "Eventos",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DataEnvioConvites",
                table: "Eventos");

            migrationBuilder.AddColumn<DateOnly>(
                name: "DataEnvio",
                table: "Convites",
                type: "date",
                nullable: true);
        }
    }
}
