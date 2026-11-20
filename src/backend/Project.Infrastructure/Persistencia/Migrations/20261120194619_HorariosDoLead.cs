using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class HorariosDoLead : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<TimeOnly>(
                name: "HoraCerimonia",
                table: "Oportunidades",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "HoraConvite",
                table: "Oportunidades",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "HoraFesta",
                table: "Oportunidades",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "HoraRecepcao",
                table: "Oportunidades",
                type: "time without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HoraCerimonia",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "HoraConvite",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "HoraFesta",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "HoraRecepcao",
                table: "Oportunidades");
        }
    }
}
