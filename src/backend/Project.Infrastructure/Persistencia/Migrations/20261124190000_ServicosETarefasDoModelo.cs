using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <summary>
    /// SPEC-012 v3 / SPEC-003 v5: tarefa do modelo no formato da tarefa do evento, prazo relativo, checklist do modelo,
    /// serviço do modelo ligado ao cadastro, fim do grupo e dos itens tipados do serviço do modelo (migração na §8.10).
    /// Escrita à mão (sem o arquivo Designer); o snapshot foi atualizado junto.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20261124190000_ServicosETarefasDoModelo")]
    public partial class ServicosETarefasDoModelo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ServicoContaId",
                table: "ServicoModelo",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Descricao",
                table: "TarefaModelo",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PrazoRelativo",
                table: "TarefaModelo",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Prioridade",
                table: "TarefaModelo",
                type: "text",
                nullable: false,
                defaultValue: "Media");

            migrationBuilder.AddColumn<string>(
                name: "Visibilidade",
                table: "TarefaModelo",
                type: "text",
                nullable: false,
                defaultValue: "SoEu");

            migrationBuilder.AddColumn<string>(
                name: "Responsaveis",
                table: "TarefaModelo",
                type: "text",
                nullable: false,
                defaultValue: "Organizer");

            migrationBuilder.AddColumn<Guid>(
                name: "ServicoModeloId",
                table: "TarefaModelo",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PrazoRelativo",
                table: "Tarefas",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PrazoRelativo",
                table: "ItensChecklistTarefa",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ItensChecklistTarefaModelo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaModeloId = table.Column<Guid>(type: "uuid", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
                    PrazoRelativo = table.Column<int>(type: "integer", nullable: true),
                    ResponsavelPapel = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItensChecklistTarefaModelo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItensChecklistTarefaModelo_TarefaModelo_TarefaModeloId",
                        column: x => x.TarefaModeloId,
                        principalTable: "TarefaModelo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // 1. "Dias antes" vira prazo relativo antes.
            migrationBuilder.Sql("""
                UPDATE "TarefaModelo" SET "PrazoRelativo" = -"DiasAntes" WHERE "DiasAntes" IS NOT NULL;
                """);

            // 2. Serviço do modelo que não existe no cadastro da conta passa a existir.
            migrationBuilder.Sql("""
                INSERT INTO "ServicosConta" ("Id", "ContaId", "Nome", "Padrao")
                SELECT gen_random_uuid(), x."ContaId", x."Nome", FALSE
                FROM (
                    SELECT DISTINCT ON (m."ContaId", lower(btrim(s."Nome"))) m."ContaId", left(btrim(s."Nome"), 200) AS "Nome"
                    FROM "ServicoModelo" s
                    JOIN "Modelos" m ON m."Id" = s."ModeloId"
                    WHERE btrim(s."Nome") <> ''
                      AND NOT EXISTS (
                          SELECT 1 FROM "ServicosConta" c
                          WHERE c."ContaId" = m."ContaId" AND lower(c."Nome") = lower(btrim(s."Nome")))
                    ORDER BY m."ContaId", lower(btrim(s."Nome"))
                ) x;
                """);

            // 3. Serviço do modelo ligado ao cadastro pelo nome.
            migrationBuilder.Sql("""
                UPDATE "ServicoModelo" s SET "ServicoContaId" = c."Id"
                FROM "Modelos" m, "ServicosConta" c
                WHERE m."Id" = s."ModeloId" AND c."ContaId" = m."ContaId" AND lower(c."Nome") = lower(btrim(s."Nome"));
                """);

            // 4. Itens tipados do checklist antigo viram tarefas do serviço, sem prazo.
            migrationBuilder.Sql("""
                INSERT INTO "TarefaModelo" ("Id", "ModeloId", "Titulo", "ServicoModeloId", "Prioridade", "Visibilidade", "Responsaveis")
                SELECT gen_random_uuid(), s."ModeloId", left(btrim(i."Texto"), 200), s."Id", 'Media', 'SoEu', 'Organizer'
                FROM "ItemServicoModelo" i
                JOIN "ServicoModelo" s ON s."Id" = i."ServicoId"
                WHERE btrim(i."Texto") <> '';
                """);

            // 5. Grupo igual ao nome de um serviço vira o vínculo com o serviço (modelo e evento).
            migrationBuilder.Sql("""
                UPDATE "TarefaModelo" t SET "ServicoModeloId" = s."Id"
                FROM "ServicoModelo" s
                WHERE t."ServicoModeloId" IS NULL AND t."Grupo" IS NOT NULL
                  AND s."ModeloId" = t."ModeloId" AND lower(btrim(s."Nome")) = lower(btrim(t."Grupo"));
                """);
            migrationBuilder.Sql("""
                UPDATE "Tarefas" t SET "ServicoEventoId" = s."Id"
                FROM "ServicoEvento" s
                WHERE t."ServicoEventoId" IS NULL AND t."Grupo" IS NOT NULL
                  AND s."EventoId" = t."EventoId" AND lower(btrim(s."Nome")) = lower(btrim(t."Grupo"));
                """);

            migrationBuilder.DropTable(
                name: "ItemServicoModelo");

            migrationBuilder.DropColumn(
                name: "DiasAntes",
                table: "TarefaModelo");

            migrationBuilder.DropColumn(
                name: "Grupo",
                table: "TarefaModelo");

            migrationBuilder.DropColumn(
                name: "Grupo",
                table: "Tarefas");

            migrationBuilder.CreateIndex(
                name: "IX_ServicoModelo_ServicoContaId",
                table: "ServicoModelo",
                column: "ServicoContaId");

            migrationBuilder.CreateIndex(
                name: "IX_TarefaModelo_ServicoModeloId",
                table: "TarefaModelo",
                column: "ServicoModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensChecklistTarefaModelo_TarefaModeloId",
                table: "ItensChecklistTarefaModelo",
                column: "TarefaModeloId");

            migrationBuilder.AddForeignKey(
                name: "FK_TarefaModelo_ServicoModelo_ServicoModeloId",
                table: "TarefaModelo",
                column: "ServicoModeloId",
                principalTable: "ServicoModelo",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TarefaModelo_ServicoModelo_ServicoModeloId",
                table: "TarefaModelo");

            migrationBuilder.DropTable(
                name: "ItensChecklistTarefaModelo");

            migrationBuilder.DropIndex(
                name: "IX_ServicoModelo_ServicoContaId",
                table: "ServicoModelo");

            migrationBuilder.DropIndex(
                name: "IX_TarefaModelo_ServicoModeloId",
                table: "TarefaModelo");

            migrationBuilder.AddColumn<int>(
                name: "DiasAntes",
                table: "TarefaModelo",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Grupo",
                table: "TarefaModelo",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Grupo",
                table: "Tarefas",
                type: "text",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "TarefaModelo" SET "DiasAntes" = GREATEST(-"PrazoRelativo", 0) WHERE "PrazoRelativo" IS NOT NULL;
                """);

            migrationBuilder.CreateTable(
                name: "ItemServicoModelo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ServicoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemServicoModelo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemServicoModelo_ServicoModelo_ServicoId",
                        column: x => x.ServicoId,
                        principalTable: "ServicoModelo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ItemServicoModelo_ServicoId",
                table: "ItemServicoModelo",
                column: "ServicoId");

            migrationBuilder.DropColumn(name: "ServicoContaId", table: "ServicoModelo");
            migrationBuilder.DropColumn(name: "Descricao", table: "TarefaModelo");
            migrationBuilder.DropColumn(name: "PrazoRelativo", table: "TarefaModelo");
            migrationBuilder.DropColumn(name: "Prioridade", table: "TarefaModelo");
            migrationBuilder.DropColumn(name: "Visibilidade", table: "TarefaModelo");
            migrationBuilder.DropColumn(name: "Responsaveis", table: "TarefaModelo");
            migrationBuilder.DropColumn(name: "ServicoModeloId", table: "TarefaModelo");
            migrationBuilder.DropColumn(name: "PrazoRelativo", table: "Tarefas");
            migrationBuilder.DropColumn(name: "PrazoRelativo", table: "ItensChecklistTarefa");
        }
    }
}
