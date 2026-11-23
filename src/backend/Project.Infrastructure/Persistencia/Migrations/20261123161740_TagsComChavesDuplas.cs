using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <summary>Padrão único de tags: os modelos salvos trocam #nome_tag por {{nome_tag}} (só as tags conhecidas).</summary>
    public partial class TagsComChavesDuplas : Migration
    {
        private const string Mensagem = "nome_da_empresa|nome_evento|tipo_evento|data_evento|hora_evento|local_cerimonia|local_recepcao|endereco_cerimonia|endereco_recepcao|convite|link_convite|link_unico|nome_convidados|mesa_dos_convidados|site_url|prazo_rsvp|qr_code";
        private const string Orcamento = "nome_oportunidade|tipo_evento|data_evento|convidados|local_cerimonia|local_recepcao|valor|validade|nome_assessoria";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($@"
UPDATE ""ModelosMensagem"" SET ""Texto"" = regexp_replace(""Texto"", '#({Mensagem})\y', '{{{{\1}}}}', 'gi') WHERE ""Texto"" ~* '#({Mensagem})\y';
UPDATE ""ModelosOrcamentoFunil"" SET ""Texto"" = regexp_replace(""Texto"", '#({Orcamento})\y', '{{{{\1}}}}', 'gi') WHERE ""Texto"" ~* '#({Orcamento})\y';
UPDATE ""ModelosOrcamentoFunil"" SET ""HtmlAceite"" = regexp_replace(""HtmlAceite"", '#({Orcamento})\y', '{{{{\1}}}}', 'gi') WHERE ""HtmlAceite"" ~* '#({Orcamento})\y';
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql($@"
UPDATE ""ModelosMensagem"" SET ""Texto"" = regexp_replace(""Texto"", '\{{\{{({Mensagem})\}}\}}', '#\1', 'gi');
UPDATE ""ModelosOrcamentoFunil"" SET ""Texto"" = regexp_replace(""Texto"", '\{{\{{({Orcamento})\}}\}}', '#\1', 'gi');
UPDATE ""ModelosOrcamentoFunil"" SET ""HtmlAceite"" = regexp_replace(""HtmlAceite"", '\{{\{{({Orcamento})\}}\}}', '#\1', 'gi');
");
        }
    }
}
