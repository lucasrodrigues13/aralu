using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class TrocaDePlano : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "DowngradeEm",
                table: "Assinaturas",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DowngradePlanoId",
                table: "Assinaturas",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UpgradeCobrancaId",
                table: "Assinaturas",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpgradePedidoEm",
                table: "Assinaturas",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpgradePlanoId",
                table: "Assinaturas",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UpgradeValor",
                table: "Assinaturas",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DowngradeEm",
                table: "Assinaturas");

            migrationBuilder.DropColumn(
                name: "DowngradePlanoId",
                table: "Assinaturas");

            migrationBuilder.DropColumn(
                name: "UpgradeCobrancaId",
                table: "Assinaturas");

            migrationBuilder.DropColumn(
                name: "UpgradePedidoEm",
                table: "Assinaturas");

            migrationBuilder.DropColumn(
                name: "UpgradePlanoId",
                table: "Assinaturas");

            migrationBuilder.DropColumn(
                name: "UpgradeValor",
                table: "Assinaturas");
        }
    }
}
