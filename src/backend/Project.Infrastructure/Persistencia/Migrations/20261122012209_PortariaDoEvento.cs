using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class PortariaDoEvento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CompareceuEm",
                table: "PresencasEvento",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LinksPortaria",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<string>(type: "character varying(450)", maxLength: 450, nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LinksPortaria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LinksPortaria_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LinksPortaria_EventoId",
                table: "LinksPortaria",
                column: "EventoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LinksPortaria_Token",
                table: "LinksPortaria",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LinksPortaria");

            migrationBuilder.DropColumn(
                name: "CompareceuEm",
                table: "PresencasEvento");
        }
    }
}
