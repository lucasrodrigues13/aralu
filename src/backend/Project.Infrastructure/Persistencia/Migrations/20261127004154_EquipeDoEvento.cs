using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class EquipeDoEvento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LinksPortaria");

            migrationBuilder.AddColumn<Guid>(
                name: "CronogramaId",
                table: "Eventos",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RoteiroId",
                table: "Eventos",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PessoasEquipeEvento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    Telefone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    Funcao = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    RecebePortaria = table.Column<bool>(type: "boolean", nullable: false),
                    RecebeRoteiro = table.Column<bool>(type: "boolean", nullable: false),
                    RecebeCronograma = table.Column<bool>(type: "boolean", nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    EnviadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ValidoAte = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    UltimoAcessoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    EncerradoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PessoasEquipeEvento", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PessoasEquipeEvento_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PessoasEquipeEvento_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CodigosAcessoEquipe",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PessoaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    CodigoHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiraEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Tentativas = table.Column<int>(type: "integer", nullable: false),
                    UsadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Invalidado = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CodigosAcessoEquipe", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CodigosAcessoEquipe_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CodigosAcessoEquipe_PessoasEquipeEvento_PessoaId",
                        column: x => x.PessoaId,
                        principalTable: "PessoasEquipeEvento",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SessoesEquipe",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PessoaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CriadaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiraEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessoesEquipe", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SessoesEquipe_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SessoesEquipe_PessoasEquipeEvento_PessoaId",
                        column: x => x.PessoaId,
                        principalTable: "PessoasEquipeEvento",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Eventos_CronogramaId",
                table: "Eventos",
                column: "CronogramaId");

            migrationBuilder.CreateIndex(
                name: "IX_Eventos_RoteiroId",
                table: "Eventos",
                column: "RoteiroId");

            migrationBuilder.CreateIndex(
                name: "IX_CodigosAcessoEquipe_ContaId",
                table: "CodigosAcessoEquipe",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_CodigosAcessoEquipe_PessoaId_CriadoEm",
                table: "CodigosAcessoEquipe",
                columns: new[] { "PessoaId", "CriadoEm" });

            migrationBuilder.CreateIndex(
                name: "IX_PessoasEquipeEvento_ContaId",
                table: "PessoasEquipeEvento",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_PessoasEquipeEvento_EventoId",
                table: "PessoasEquipeEvento",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_PessoasEquipeEvento_Token",
                table: "PessoasEquipeEvento",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SessoesEquipe_ContaId",
                table: "SessoesEquipe",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_SessoesEquipe_PessoaId_TokenHash",
                table: "SessoesEquipe",
                columns: new[] { "PessoaId", "TokenHash" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Eventos_ModelosCronograma_CronogramaId",
                table: "Eventos",
                column: "CronogramaId",
                principalTable: "ModelosCronograma",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Eventos_ModelosRoteiro_RoteiroId",
                table: "Eventos",
                column: "RoteiroId",
                principalTable: "ModelosRoteiro",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Eventos_ModelosCronograma_CronogramaId",
                table: "Eventos");

            migrationBuilder.DropForeignKey(
                name: "FK_Eventos_ModelosRoteiro_RoteiroId",
                table: "Eventos");

            migrationBuilder.DropTable(
                name: "CodigosAcessoEquipe");

            migrationBuilder.DropTable(
                name: "SessoesEquipe");

            migrationBuilder.DropTable(
                name: "PessoasEquipeEvento");

            migrationBuilder.DropIndex(
                name: "IX_Eventos_CronogramaId",
                table: "Eventos");

            migrationBuilder.DropIndex(
                name: "IX_Eventos_RoteiroId",
                table: "Eventos");

            migrationBuilder.DropColumn(
                name: "CronogramaId",
                table: "Eventos");

            migrationBuilder.DropColumn(
                name: "RoteiroId",
                table: "Eventos");

            migrationBuilder.CreateTable(
                name: "LinksPortaria",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LinksPortaria", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LinksPortaria_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LinksPortaria_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LinksPortaria_ContaId",
                table: "LinksPortaria",
                column: "ContaId");

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
    }
}
