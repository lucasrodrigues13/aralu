using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class PrazoDoRsvp : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "PrazoRsvp",
                table: "Eventos",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ExcecaoPrazoRsvp",
                table: "Convites",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "PresencasEvento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConviteId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConvidadoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConfirmadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PresencasEvento", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PresencasEvento_Convidados_ConvidadoId",
                        column: x => x.ConvidadoId,
                        principalTable: "Convidados",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PresencasEvento_ConvidadoId",
                table: "PresencasEvento",
                column: "ConvidadoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PresencasEvento_EventoId",
                table: "PresencasEvento",
                column: "EventoId");

            // Quem já está Confirmado entra na lista de presença (SPEC-054).
            migrationBuilder.Sql(
                "INSERT INTO \"PresencasEvento\" (\"Id\", \"EventoId\", \"ConviteId\", \"ConvidadoId\", \"ConfirmadoEm\") " +
                "SELECT gen_random_uuid(), c.\"EventoId\", v.\"ConviteId\", v.\"Id\", now() " +
                "FROM \"Convidados\" v JOIN \"Convites\" c ON c.\"Id\" = v.\"ConviteId\" " +
                "WHERE v.\"Situacao\" = 'Confirmado';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PresencasEvento");

            migrationBuilder.DropColumn(
                name: "PrazoRsvp",
                table: "Eventos");

            migrationBuilder.DropColumn(
                name: "ExcecaoPrazoRsvp",
                table: "Convites");
        }
    }
}
