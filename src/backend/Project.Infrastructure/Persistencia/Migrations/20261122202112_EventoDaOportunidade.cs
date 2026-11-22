using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class EventoDaOportunidade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "EventoId",
                table: "Oportunidades",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Oportunidades_EventoId",
                table: "Oportunidades",
                column: "EventoId",
                unique: true,
                filter: "\"EventoId\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Oportunidades_Eventos_EventoId",
                table: "Oportunidades",
                column: "EventoId",
                principalTable: "Eventos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Oportunidades_Eventos_EventoId",
                table: "Oportunidades");

            migrationBuilder.DropIndex(
                name: "IX_Oportunidades_EventoId",
                table: "Oportunidades");

            migrationBuilder.DropColumn(
                name: "EventoId",
                table: "Oportunidades");
        }
    }
}
