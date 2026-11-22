using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <summary>
    /// O cliente não entra mais na plataforma (acesso só pelo link público com token) e o link
    /// deixa de se chamar "do casal": tabela renomeada sem perder os links já gerados, e os valores
    /// gravados como "Casal" passam a "Cliente".
    /// </summary>
    public partial class ClienteSemAcessoELinkDoCliente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Clientes_UsuarioId",
                table: "Clientes");

            migrationBuilder.DropColumn(name: "AcessoPlataforma", table: "Clientes");
            migrationBuilder.DropColumn(name: "PermiteAnexos", table: "Clientes");
            migrationBuilder.DropColumn(name: "PermiteContrato", table: "Clientes");
            migrationBuilder.DropColumn(name: "PermiteConvidados", table: "Clientes");
            migrationBuilder.DropColumn(name: "PermiteMapa", table: "Clientes");
            migrationBuilder.DropColumn(name: "PermiteParcelas", table: "Clientes");
            migrationBuilder.DropColumn(name: "PermiteRsvp", table: "Clientes");
            migrationBuilder.DropColumn(name: "PermiteTarefas", table: "Clientes");
            migrationBuilder.DropColumn(name: "UsuarioId", table: "Clientes");

            migrationBuilder.RenameTable(name: "LinksCasal", newName: "LinksCliente");
            migrationBuilder.Sql("""ALTER TABLE "LinksCliente" RENAME CONSTRAINT "PK_LinksCasal" TO "PK_LinksCliente";""");
            migrationBuilder.Sql("""ALTER TABLE "LinksCliente" RENAME CONSTRAINT "FK_LinksCasal_Eventos_EventoId" TO "FK_LinksCliente_Eventos_EventoId";""");
            migrationBuilder.RenameIndex(name: "IX_LinksCasal_EventoId", table: "LinksCliente", newName: "IX_LinksCliente_EventoId");
            migrationBuilder.RenameIndex(name: "IX_LinksCasal_Token", table: "LinksCliente", newName: "IX_LinksCliente_Token");

            Trocar(migrationBuilder, "Casal", "Cliente", "Preenchido pelo casal", "Preenchido pelo cliente");

            // Contas antigas com papel "Client" deixam de ter papel: o login já recusa quem não é da equipe.
            migrationBuilder.Sql("""DELETE FROM "AspNetUserRoles" WHERE "RoleId" IN (SELECT "Id" FROM "AspNetRoles" WHERE "Name" = 'Client');""");
            migrationBuilder.Sql("""DELETE FROM "AspNetRoles" WHERE "Name" = 'Client';""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            Trocar(migrationBuilder, "Cliente", "Casal", "Preenchido pelo cliente", "Preenchido pelo casal");

            migrationBuilder.RenameIndex(name: "IX_LinksCliente_Token", table: "LinksCliente", newName: "IX_LinksCasal_Token");
            migrationBuilder.RenameIndex(name: "IX_LinksCliente_EventoId", table: "LinksCliente", newName: "IX_LinksCasal_EventoId");
            migrationBuilder.Sql("""ALTER TABLE "LinksCliente" RENAME CONSTRAINT "FK_LinksCliente_Eventos_EventoId" TO "FK_LinksCasal_Eventos_EventoId";""");
            migrationBuilder.Sql("""ALTER TABLE "LinksCliente" RENAME CONSTRAINT "PK_LinksCliente" TO "PK_LinksCasal";""");
            migrationBuilder.RenameTable(name: "LinksCliente", newName: "LinksCasal");

            migrationBuilder.AddColumn<bool>(name: "AcessoPlataforma", table: "Clientes", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<bool>(name: "PermiteAnexos", table: "Clientes", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<bool>(name: "PermiteContrato", table: "Clientes", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<bool>(name: "PermiteConvidados", table: "Clientes", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<bool>(name: "PermiteMapa", table: "Clientes", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<bool>(name: "PermiteParcelas", table: "Clientes", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<bool>(name: "PermiteRsvp", table: "Clientes", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<bool>(name: "PermiteTarefas", table: "Clientes", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<string>(name: "UsuarioId", table: "Clientes", type: "text", nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_UsuarioId",
                table: "Clientes",
                column: "UsuarioId");
        }

        private static void Trocar(MigrationBuilder migrationBuilder, string de, string para, string observacaoDe, string observacaoPara)
        {
            migrationBuilder.Sql($"""UPDATE "ResponsaveisTarefa" SET "Papel" = '{para}' WHERE "Papel" = '{de}';""");
            migrationBuilder.Sql($"""UPDATE "ResponsaveisTarefaFunil" SET "Papel" = '{para}' WHERE "Papel" = '{de}';""");
            migrationBuilder.Sql($"""UPDATE "ItensChecklistTarefa" SET "ResponsavelPapel" = '{para}' WHERE "ResponsavelPapel" = '{de}';""");
            migrationBuilder.Sql($"""UPDATE "Tarefas" SET "Visibilidade" = '{para}' WHERE "Visibilidade" = '{de}';""");
            migrationBuilder.Sql($"""UPDATE "ContratosFornecedor" SET "ContratoAssinadoEnviadoPor" = '{para}' WHERE "ContratoAssinadoEnviadoPor" = '{de}';""");
            migrationBuilder.Sql($"""UPDATE "Convites" SET "Observacao" = '{observacaoPara}' WHERE "Observacao" = '{observacaoDe}';""");
            migrationBuilder.Sql($"""UPDATE "ImportacoesConvidados" SET "ObservacaoFixa" = '{observacaoPara}' WHERE "ObservacaoFixa" = '{observacaoDe}';""");
        }
    }
}
