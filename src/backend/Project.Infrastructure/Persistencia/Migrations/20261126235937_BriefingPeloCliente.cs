using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class BriefingPeloCliente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ConcluidoEm",
                table: "BriefingsOportunidade",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LiberadoEm",
                table: "BriefingsOportunidade",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "RespondidoEm",
                table: "BriefingsOportunidade",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TokenLink",
                table: "BriefingsOportunidade",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ValidoAte",
                table: "BriefingsOportunidade",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CodigosAcessoBriefing",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BriefingId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    CodigoHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiraEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Tentativas = table.Column<int>(type: "integer", nullable: false),
                    UsadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Invalidado = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodigosAcessoBriefing", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodigosAcessoBriefing_BriefingsOportunidade_BriefingId",
                        column: x => x.BriefingId,
                        principalTable: "BriefingsOportunidade",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CodigosAcessoBriefing_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SessoesBriefing",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BriefingId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CriadaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiraEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessoesBriefing", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessoesBriefing_BriefingsOportunidade_BriefingId",
                        column: x => x.BriefingId,
                        principalTable: "BriefingsOportunidade",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SessoesBriefing_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BriefingsOportunidade_TokenLink",
                table: "BriefingsOportunidade",
                column: "TokenLink",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CodigosAcessoBriefing_BriefingId_CriadoEm",
                table: "CodigosAcessoBriefing",
                columns: new[] { "BriefingId", "CriadoEm" });

            migrationBuilder.CreateIndex(
                name: "IX_CodigosAcessoBriefing_ContaId",
                table: "CodigosAcessoBriefing",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_SessoesBriefing_BriefingId_TokenHash",
                table: "SessoesBriefing",
                columns: new[] { "BriefingId", "TokenHash" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessoesBriefing_ContaId",
                table: "SessoesBriefing",
                column: "ContaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CodigosAcessoBriefing");

            migrationBuilder.DropTable(
                name: "SessoesBriefing");

            migrationBuilder.DropIndex(
                name: "IX_BriefingsOportunidade_TokenLink",
                table: "BriefingsOportunidade");

            migrationBuilder.DropColumn(
                name: "ConcluidoEm",
                table: "BriefingsOportunidade");

            migrationBuilder.DropColumn(
                name: "LiberadoEm",
                table: "BriefingsOportunidade");

            migrationBuilder.DropColumn(
                name: "RespondidoEm",
                table: "BriefingsOportunidade");

            migrationBuilder.DropColumn(
                name: "TokenLink",
                table: "BriefingsOportunidade");

            migrationBuilder.DropColumn(
                name: "ValidoAte",
                table: "BriefingsOportunidade");
        }
    }
}
