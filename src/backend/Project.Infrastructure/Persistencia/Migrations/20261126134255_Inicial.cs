using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Project.Infrastructure.Persistencia.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    UserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RoleId = table.Column<string>(type: "text", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    ClaimType = table.Column<string>(type: "text", nullable: true),
                    ClaimValue = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    ProviderKey = table.Column<string>(type: "text", nullable: false),
                    ProviderDisplayName = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    RoleId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "text", nullable: false),
                    LoginProvider = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                    table.ForeignKey(
                        name: "FK_AspNetUserTokens_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Contas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DonoUsuarioId = table.Column<string>(type: "text", nullable: false),
                    CriadaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Contas_AspNetUsers_DonoUsuarioId",
                        column: x => x.DonoUsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Arquivos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    NomeOriginal = table.Column<string>(type: "text", nullable: false),
                    TipoConteudo = table.Column<string>(type: "text", nullable: false),
                    Tamanho = table.Column<long>(type: "bigint", nullable: false),
                    CaminhoRelativo = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Arquivos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Arquivos_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EstagiosFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Cor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstagiosFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EstagiosFunil_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GruposAcesso",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    VeTodosEventos = table.Column<bool>(type: "boolean", nullable: false),
                    Padrao = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GruposAcesso", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GruposAcesso_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MetricasRsvpFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Visualizacoes = table.Column<int>(type: "integer", nullable: false),
                    CliquesBotao = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MetricasRsvpFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MetricasRsvpFunil_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Modelos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    PermiteGerais = table.Column<bool>(type: "boolean", nullable: false),
                    PermitePlanejamento = table.Column<bool>(type: "boolean", nullable: false),
                    PermiteTarefas = table.Column<bool>(type: "boolean", nullable: false),
                    PermiteServicosFornecedores = table.Column<bool>(type: "boolean", nullable: false),
                    PermiteConvites = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Modelos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Modelos_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ModelosBriefing",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Origem = table.Column<string>(type: "text", nullable: false),
                    Padrao = table.Column<bool>(type: "boolean", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModelosBriefing", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ModelosBriefing_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ModelosCronograma",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModelosCronograma", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ModelosCronograma_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ModelosInspiracao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModelosInspiracao", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ModelosInspiracao_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ModelosMensagem",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModelosMensagem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ModelosMensagem_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ModelosOrcamentoFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    CorPrimaria = table.Column<string>(type: "text", nullable: true),
                    CorSecundaria = table.Column<string>(type: "text", nullable: true),
                    HtmlAceite = table.Column<string>(type: "text", nullable: true),
                    ExtrasAceite = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModelosOrcamentoFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ModelosOrcamentoFunil_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ModelosRoteiro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModelosRoteiro", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ModelosRoteiro_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ModelosServicoFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Descricao = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ModelosServicoFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ModelosServicoFunil_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ServicosConta",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Padrao = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServicosConta", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServicosConta_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tags_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Clientes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Papel = table.Column<string>(type: "text", nullable: true),
                    Nascimento = table.Column<DateOnly>(type: "date", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Ddi = table.Column<string>(type: "text", nullable: false),
                    Celular = table.Column<string>(type: "text", nullable: false),
                    TelefoneFixo = table.Column<string>(type: "text", nullable: true),
                    Cpf = table.Column<string>(type: "text", nullable: true),
                    Cnpj = table.Column<string>(type: "text", nullable: true),
                    Profissao = table.Column<string>(type: "text", nullable: true),
                    EstadoCivil = table.Column<string>(type: "text", nullable: true),
                    Nacionalidade = table.Column<string>(type: "text", nullable: true),
                    InscricaoMunicipal = table.Column<string>(type: "text", nullable: true),
                    Religiao = table.Column<string>(type: "text", nullable: true),
                    Observacao = table.Column<string>(type: "text", nullable: true),
                    Facebook = table.Column<string>(type: "text", nullable: true),
                    Instagram = table.Column<string>(type: "text", nullable: true),
                    Pais = table.Column<string>(type: "text", nullable: true),
                    Cep = table.Column<string>(type: "text", nullable: true),
                    Endereco = table.Column<string>(type: "text", nullable: true),
                    Numero = table.Column<string>(type: "text", nullable: true),
                    Estado = table.Column<string>(type: "text", nullable: true),
                    Cidade = table.Column<string>(type: "text", nullable: true),
                    Bairro = table.Column<string>(type: "text", nullable: true),
                    Complemento = table.Column<string>(type: "text", nullable: true),
                    FotoId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clientes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Clientes_Arquivos_FotoId",
                        column: x => x.FotoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Clientes_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ContratosConta",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    LogoArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    FundoArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    Formato = table.Column<string>(type: "text", nullable: false),
                    WordArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    WordNome = table.Column<string>(type: "text", nullable: true),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    AtualizadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContratosConta", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContratosConta_Arquivos_FundoArquivoId",
                        column: x => x.FundoArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosConta_Arquivos_LogoArquivoId",
                        column: x => x.LogoArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosConta_Arquivos_WordArquivoId",
                        column: x => x.WordArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosConta_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Eventos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    PrimeiroNome = table.Column<string>(type: "text", nullable: true),
                    SegundoNome = table.Column<string>(type: "text", nullable: true),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    Data = table.Column<DateOnly>(type: "date", nullable: true),
                    PrazoRsvp = table.Column<DateOnly>(type: "date", nullable: true),
                    DataEnvioConvites = table.Column<DateOnly>(type: "date", nullable: true),
                    Hora = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    OrcamentoEstimado = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    ConvidadosEstimados = table.Column<int>(type: "integer", nullable: true),
                    TempoFesta = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    InicioCerimonia = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    InicioRecepcao = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    QuantidadePadrinhos = table.Column<int>(type: "integer", nullable: true),
                    QuantidadeDamas = table.Column<int>(type: "integer", nullable: true),
                    NotificarAssessor = table.Column<bool>(type: "boolean", nullable: false),
                    NotificarAssistentes = table.Column<bool>(type: "boolean", nullable: false),
                    NotificarClientes = table.Column<bool>(type: "boolean", nullable: false),
                    SalvarNaAgenda = table.Column<bool>(type: "boolean", nullable: false),
                    ImagemId = table.Column<Guid>(type: "uuid", nullable: true),
                    Cerimonia_Nome = table.Column<string>(type: "text", nullable: true),
                    Cerimonia_Pais = table.Column<string>(type: "text", nullable: true),
                    Cerimonia_Cep = table.Column<string>(type: "text", nullable: true),
                    Cerimonia_Endereco = table.Column<string>(type: "text", nullable: true),
                    Cerimonia_Numero = table.Column<string>(type: "text", nullable: true),
                    Cerimonia_Estado = table.Column<string>(type: "text", nullable: true),
                    Cerimonia_Cidade = table.Column<string>(type: "text", nullable: true),
                    Cerimonia_Bairro = table.Column<string>(type: "text", nullable: true),
                    Cerimonia_Persistido = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Recepcao_Nome = table.Column<string>(type: "text", nullable: true),
                    Recepcao_Pais = table.Column<string>(type: "text", nullable: true),
                    Recepcao_Cep = table.Column<string>(type: "text", nullable: true),
                    Recepcao_Endereco = table.Column<string>(type: "text", nullable: true),
                    Recepcao_Numero = table.Column<string>(type: "text", nullable: true),
                    Recepcao_Estado = table.Column<string>(type: "text", nullable: true),
                    Recepcao_Cidade = table.Column<string>(type: "text", nullable: true),
                    Recepcao_Bairro = table.Column<string>(type: "text", nullable: true),
                    Recepcao_Persistido = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Eventos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Eventos_Arquivos_ImagemId",
                        column: x => x.ImagemId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Eventos_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Fornecedores",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    FotoId = table.Column<Guid>(type: "uuid", nullable: true),
                    RazaoSocial = table.Column<string>(type: "text", nullable: true),
                    Cnpj = table.Column<string>(type: "text", nullable: true),
                    Cpf = table.Column<string>(type: "text", nullable: true),
                    NomeResponsavel = table.Column<string>(type: "text", nullable: true),
                    PrecoDe = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    PrecoAte = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    Site = table.Column<string>(type: "text", nullable: true),
                    Facebook = table.Column<string>(type: "text", nullable: true),
                    Instagram = table.Column<string>(type: "text", nullable: true),
                    Youtube = table.Column<string>(type: "text", nullable: true),
                    Pinterest = table.Column<string>(type: "text", nullable: true),
                    Pais = table.Column<string>(type: "text", nullable: true),
                    Cep = table.Column<string>(type: "text", nullable: true),
                    Endereco = table.Column<string>(type: "text", nullable: true),
                    Numero = table.Column<string>(type: "text", nullable: true),
                    Estado = table.Column<string>(type: "text", nullable: true),
                    Cidade = table.Column<string>(type: "text", nullable: true),
                    Bairro = table.Column<string>(type: "text", nullable: true),
                    Complemento = table.Column<string>(type: "text", nullable: true),
                    Banco = table.Column<string>(type: "text", nullable: true),
                    Agencia = table.Column<string>(type: "text", nullable: true),
                    ContaBancaria = table.Column<string>(type: "text", nullable: true),
                    TitularConta = table.Column<string>(type: "text", nullable: true),
                    TipoConta = table.Column<string>(type: "text", nullable: true),
                    DocumentosBancarios = table.Column<string>(type: "text", nullable: true),
                    PixTipo = table.Column<string>(type: "text", nullable: true),
                    PixChave = table.Column<string>(type: "text", nullable: true),
                    Diferencial = table.Column<string>(type: "text", nullable: true),
                    DiferencialVisivelCliente = table.Column<bool>(type: "boolean", nullable: false),
                    InformacoesGerais = table.Column<string>(type: "text", nullable: true),
                    Portfolio = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Fornecedores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Fornecedores_Arquivos_FotoId",
                        column: x => x.FotoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Fornecedores_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Perfis",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    NomeEmpresa = table.Column<string>(type: "text", nullable: true),
                    Responsavel = table.Column<string>(type: "text", nullable: true),
                    Documento = table.Column<string>(type: "text", nullable: true),
                    Celular = table.Column<string>(type: "text", nullable: true),
                    Nascimento = table.Column<DateOnly>(type: "date", nullable: true),
                    Pais = table.Column<string>(type: "text", nullable: true),
                    Cep = table.Column<string>(type: "text", nullable: true),
                    Endereco = table.Column<string>(type: "text", nullable: true),
                    Numero = table.Column<string>(type: "text", nullable: true),
                    Complemento = table.Column<string>(type: "text", nullable: true),
                    Bairro = table.Column<string>(type: "text", nullable: true),
                    Cidade = table.Column<string>(type: "text", nullable: true),
                    Estado = table.Column<string>(type: "text", nullable: true),
                    FotoId = table.Column<Guid>(type: "uuid", nullable: true),
                    ChavePix = table.Column<string>(type: "text", nullable: true),
                    CapturaLeadRsvp = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Perfis", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Perfis_Arquivos_FotoId",
                        column: x => x.FotoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Perfis_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MembrosConta",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    GrupoId = table.Column<Guid>(type: "uuid", nullable: true),
                    Nome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Celular = table.Column<string>(type: "text", nullable: true),
                    Nascimento = table.Column<DateOnly>(type: "date", nullable: true),
                    Situacao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ConvidadaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PrimeiroAcessoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RemovidaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MembrosConta", x => x.Id);
                    table.CheckConstraint("CK_MembrosConta_Grupo", "(\"Tipo\" = 'Dono' AND \"GrupoId\" IS NULL) OR (\"Tipo\" = 'Membro' AND \"GrupoId\" IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_MembrosConta_AspNetUsers_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MembrosConta_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MembrosConta_GruposAcesso_GrupoId",
                        column: x => x.GrupoId,
                        principalTable: "GruposAcesso",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PermissoesGrupo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    GrupoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Modulo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Ver = table.Column<bool>(type: "boolean", nullable: false),
                    Editar = table.Column<bool>(type: "boolean", nullable: false),
                    Excluir = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PermissoesGrupo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PermissoesGrupo_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PermissoesGrupo_GruposAcesso_GrupoId",
                        column: x => x.GrupoId,
                        principalTable: "GruposAcesso",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VinculoModeloEvento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModeloId = table.Column<Guid>(type: "uuid", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    BibliotecaId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VinculoModeloEvento", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VinculoModeloEvento_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VinculoModeloEvento_Modelos_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "Modelos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SecaoBriefing",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModeloId = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: true),
                    Ordem = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecaoBriefing", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SecaoBriefing_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SecaoBriefing_ModelosBriefing_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "ModelosBriefing",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItemCronograma",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModeloId = table.Column<Guid>(type: "uuid", nullable: false),
                    Rotulo = table.Column<string>(type: "text", nullable: true),
                    Descricao = table.Column<string>(type: "text", nullable: true),
                    Data = table.Column<DateOnly>(type: "date", nullable: true),
                    Hora = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    Responsavel = table.Column<string>(type: "text", nullable: true),
                    RecadoFornecedores = table.Column<string>(type: "text", nullable: true),
                    Ordem = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemCronograma", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemCronograma_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItemCronograma_ModelosCronograma_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "ModelosCronograma",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItemInspiracao",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    GaleriaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    Url = table.Column<string>(type: "text", nullable: true),
                    Ordem = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemInspiracao", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemInspiracao_Arquivos_ArquivoId",
                        column: x => x.ArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ItemInspiracao_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItemInspiracao_ModelosInspiracao_GaleriaId",
                        column: x => x.GaleriaId,
                        principalTable: "ModelosInspiracao",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SecaoRoteiro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModeloId = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: true),
                    Horario = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    Musica = table.Column<string>(type: "text", nullable: true),
                    Ordem = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecaoRoteiro", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SecaoRoteiro_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SecaoRoteiro_ModelosRoteiro_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "ModelosRoteiro",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ServicoModelo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModeloId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServicoContaId = table.Column<Guid>(type: "uuid", nullable: true),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    ValorEstimado = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServicoModelo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServicoModelo_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ServicoModelo_Modelos_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "Modelos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServicoModelo_ServicosConta_ServicoContaId",
                        column: x => x.ServicoContaId,
                        principalTable: "ServicosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ClienteEventos",
                columns: table => new
                {
                    ClienteId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClienteEventos", x => new { x.ClienteId, x.EventoId });
                    table.ForeignKey(
                        name: "FK_ClienteEventos_Clientes_ClienteId",
                        column: x => x.ClienteId,
                        principalTable: "Clientes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClienteEventos_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClienteEventos_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Compromissos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: true),
                    Descricao = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Data = table.Column<DateOnly>(type: "date", nullable: true),
                    Hora = table.Column<TimeOnly>(type: "time without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Compromissos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Compromissos_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Compromissos_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Convites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Observacao = table.Column<string>(type: "text", nullable: true),
                    PrincipalId = table.Column<Guid>(type: "uuid", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    ExcecaoPrazoRsvp = table.Column<bool>(type: "boolean", nullable: false),
                    Token = table.Column<string>(type: "text", nullable: false),
                    AcessadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RespondidoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Convites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Convites_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Convites_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventoTagConta",
                columns: table => new
                {
                    EventosId = table.Column<Guid>(type: "uuid", nullable: false),
                    TagsId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventoTagConta", x => new { x.EventosId, x.TagsId });
                    table.ForeignKey(
                        name: "FK_EventoTagConta_Eventos_EventosId",
                        column: x => x.EventosId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EventoTagConta_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ImportacoesConvidados",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    NomeArquivo = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    Arquivo = table.Column<byte[]>(type: "bytea", nullable: false),
                    ObservacaoFixa = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Situacao = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CriadaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConcluidaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Convites = table.Column<int>(type: "integer", nullable: false),
                    Erros = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportacoesConvidados", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportacoesConvidados_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImportacoesConvidados_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LinksCliente",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FinanceiroLiberado = table.Column<bool>(type: "boolean", nullable: false),
                    ConvidadosLiberado = table.Column<bool>(type: "boolean", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LinksCliente", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LinksCliente_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LinksCliente_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LinksPortaria",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "Oportunidades",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    EstagioFunilId = table.Column<Guid>(type: "uuid", nullable: false),
                    Fonte = table.Column<string>(type: "text", nullable: true),
                    FonteOutro = table.Column<string>(type: "text", nullable: true),
                    RetornarEm = table.Column<DateOnly>(type: "date", nullable: true),
                    RetornarHora = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    ContatoRepetido = table.Column<bool>(type: "boolean", nullable: false),
                    ValorProposta = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    Responsavel = table.Column<string>(type: "text", nullable: false),
                    ServicoProduto = table.Column<string>(type: "text", nullable: true),
                    ModeloServicoFunilId = table.Column<Guid>(type: "uuid", nullable: true),
                    TipoEvento = table.Column<string>(type: "text", nullable: true),
                    QuantidadeConvidados = table.Column<int>(type: "integer", nullable: true),
                    DataPrevista = table.Column<DateOnly>(type: "date", nullable: true),
                    Horarios = table.Column<string>(type: "text", nullable: true),
                    HoraConvite = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    HoraCerimonia = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    HoraRecepcao = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    HoraFesta = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    QuantidadePadrinhos = table.Column<int>(type: "integer", nullable: true),
                    QuantidadeDamas = table.Column<int>(type: "integer", nullable: true),
                    LocalCerimonia = table.Column<string>(type: "text", nullable: true),
                    EnderecoCerimonia = table.Column<string>(type: "text", nullable: true),
                    CepCerimonia = table.Column<string>(type: "text", nullable: true),
                    PaisCerimonia = table.Column<string>(type: "text", nullable: true),
                    NumeroCerimonia = table.Column<string>(type: "text", nullable: true),
                    BairroCerimonia = table.Column<string>(type: "text", nullable: true),
                    LocalRecepcao = table.Column<string>(type: "text", nullable: true),
                    EnderecoRecepcao = table.Column<string>(type: "text", nullable: true),
                    CepRecepcao = table.Column<string>(type: "text", nullable: true),
                    PaisRecepcao = table.Column<string>(type: "text", nullable: true),
                    NumeroRecepcao = table.Column<string>(type: "text", nullable: true),
                    BairroRecepcao = table.Column<string>(type: "text", nullable: true),
                    EstadoRecepcao = table.Column<string>(type: "text", nullable: true),
                    CidadeRecepcao = table.Column<string>(type: "text", nullable: true),
                    Uf = table.Column<string>(type: "text", nullable: true),
                    Cidade = table.Column<string>(type: "text", nullable: true),
                    MotivoDescarte = table.Column<string>(type: "text", nullable: true),
                    ClienteId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: true),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: true),
                    EntradaNoEstagioEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ContratanteNome = table.Column<string>(type: "text", nullable: true),
                    ContratanteDocumento = table.Column<string>(type: "text", nullable: true),
                    ContratanteNascimento = table.Column<DateOnly>(type: "date", nullable: true),
                    ContratanteProfissao = table.Column<string>(type: "text", nullable: true),
                    ContratanteEstadoCivil = table.Column<string>(type: "text", nullable: true),
                    ContratanteNacionalidade = table.Column<string>(type: "text", nullable: true),
                    ContratanteEmail = table.Column<string>(type: "text", nullable: true),
                    ContratanteCelular = table.Column<string>(type: "text", nullable: true),
                    ContratanteCep = table.Column<string>(type: "text", nullable: true),
                    ContratanteEndereco = table.Column<string>(type: "text", nullable: true),
                    ContratanteNumero = table.Column<string>(type: "text", nullable: true),
                    ContratanteBairro = table.Column<string>(type: "text", nullable: true),
                    ContratanteCidade = table.Column<string>(type: "text", nullable: true),
                    ContratanteEstado = table.Column<string>(type: "text", nullable: true),
                    ContratanteComplemento = table.Column<string>(type: "text", nullable: true),
                    ContratantePais = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Oportunidades", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Oportunidades_Clientes_ClienteId",
                        column: x => x.ClienteId,
                        principalTable: "Clientes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Oportunidades_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Oportunidades_EstagiosFunil_EstagioFunilId",
                        column: x => x.EstagioFunilId,
                        principalTable: "EstagiosFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Oportunidades_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Oportunidades_ModelosServicoFunil_ModeloServicoFunilId",
                        column: x => x.ModeloServicoFunilId,
                        principalTable: "ModelosServicoFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ServicoEvento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    ServicoContaId = table.Column<Guid>(type: "uuid", nullable: true),
                    Contratado = table.Column<bool>(type: "boolean", nullable: false),
                    ValorEstimado = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    ValorContratado = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    OcultoParaClient = table.Column<bool>(type: "boolean", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServicoEvento", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServicoEvento_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ServicoEvento_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServicoEvento_ServicosConta_ServicoContaId",
                        column: x => x.ServicoContaId,
                        principalTable: "ServicosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "EmailFornecedor",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    FornecedorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Endereco = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmailFornecedor", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmailFornecedor_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EmailFornecedor_Fornecedores_FornecedorId",
                        column: x => x.FornecedorId,
                        principalTable: "Fornecedores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FornecedorServico",
                columns: table => new
                {
                    FornecedorId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServicoContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FornecedorServico", x => new { x.FornecedorId, x.ServicoContaId });
                    table.ForeignKey(
                        name: "FK_FornecedorServico_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FornecedorServico_Fornecedores_FornecedorId",
                        column: x => x.FornecedorId,
                        principalTable: "Fornecedores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FornecedorServico_ServicosConta_ServicoContaId",
                        column: x => x.ServicoContaId,
                        principalTable: "ServicosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrcamentoFornecedor",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    FornecedorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Link = table.Column<string>(type: "text", nullable: true),
                    AnexoId = table.Column<Guid>(type: "uuid", nullable: true),
                    VisivelClientes = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrcamentoFornecedor", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrcamentoFornecedor_Arquivos_AnexoId",
                        column: x => x.AnexoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrcamentoFornecedor_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrcamentoFornecedor_Fornecedores_FornecedorId",
                        column: x => x.FornecedorId,
                        principalTable: "Fornecedores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TelefoneFornecedor",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    FornecedorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Responsavel = table.Column<string>(type: "text", nullable: true),
                    Ddi = table.Column<string>(type: "text", nullable: true),
                    Numero = table.Column<string>(type: "text", nullable: false),
                    Movel = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TelefoneFornecedor", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TelefoneFornecedor_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TelefoneFornecedor_Fornecedores_FornecedorId",
                        column: x => x.FornecedorId,
                        principalTable: "Fornecedores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventosMembros",
                columns: table => new
                {
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    MembroId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventosMembros", x => new { x.EventoId, x.MembroId });
                    table.ForeignKey(
                        name: "FK_EventosMembros_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EventosMembros_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EventosMembros_MembrosConta_MembroId",
                        column: x => x.MembroId,
                        principalTable: "MembrosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PerguntaBriefing",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    SecaoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Enunciado = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PerguntaBriefing", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PerguntaBriefing_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PerguntaBriefing_SecaoBriefing_SecaoId",
                        column: x => x.SecaoId,
                        principalTable: "SecaoBriefing",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItemRoteiro",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    SecaoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItemRoteiro", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItemRoteiro_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItemRoteiro_SecaoRoteiro_SecaoId",
                        column: x => x.SecaoId,
                        principalTable: "SecaoRoteiro",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TarefaModelo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModeloId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServicoModeloId = table.Column<Guid>(type: "uuid", nullable: true),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: true),
                    PrazoRelativo = table.Column<int>(type: "integer", nullable: true),
                    Prioridade = table.Column<string>(type: "text", nullable: false),
                    Visibilidade = table.Column<string>(type: "text", nullable: false),
                    Responsaveis = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TarefaModelo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TarefaModelo_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TarefaModelo_Modelos_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "Modelos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TarefaModelo_ServicoModelo_ServicoModeloId",
                        column: x => x.ServicoModeloId,
                        principalTable: "ServicoModelo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Convidados",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConviteId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Ddi = table.Column<string>(type: "text", nullable: true),
                    Celular = table.Column<string>(type: "text", nullable: true),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    Mesa = table.Column<string>(type: "text", nullable: true),
                    Genero = table.Column<string>(type: "text", nullable: true),
                    Faixa = table.Column<string>(type: "text", nullable: true),
                    Custo = table.Column<string>(type: "text", nullable: true),
                    Cpf = table.Column<string>(type: "text", nullable: true),
                    Observacao = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Convidados", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Convidados_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Convidados_Convites_ConviteId",
                        column: x => x.ConviteId,
                        principalTable: "Convites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BriefingsOportunidade",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    OportunidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    ModeloBriefingId = table.Column<Guid>(type: "uuid", nullable: true),
                    ModeloNome = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    AplicadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BriefingsOportunidade", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BriefingsOportunidade_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BriefingsOportunidade_ModelosBriefing_ModeloBriefingId",
                        column: x => x.ModeloBriefingId,
                        principalTable: "ModelosBriefing",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_BriefingsOportunidade_Oportunidades_OportunidadeId",
                        column: x => x.OportunidadeId,
                        principalTable: "Oportunidades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContatoOportunidade",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    OportunidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    Telefone = table.Column<string>(type: "text", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Contratante = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContatoOportunidade", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContatoOportunidade_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContatoOportunidade_Oportunidades_OportunidadeId",
                        column: x => x.OportunidadeId,
                        principalTable: "Oportunidades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContratosFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    OportunidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Conteudo = table.Column<string>(type: "text", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: true),
                    EnviadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AssinadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ModeloId = table.Column<Guid>(type: "uuid", nullable: true),
                    LogoArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    FundoArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    DocumentoArquivoId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContratosFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContratosFunil_Arquivos_DocumentoArquivoId",
                        column: x => x.DocumentoArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosFunil_Arquivos_FundoArquivoId",
                        column: x => x.FundoArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosFunil_Arquivos_LogoArquivoId",
                        column: x => x.LogoArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosFunil_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosFunil_ContratosConta_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "ContratosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ContratosFunil_Oportunidades_OportunidadeId",
                        column: x => x.OportunidadeId,
                        principalTable: "Oportunidades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LeadsRsvp",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConviteId = table.Column<Guid>(type: "uuid", nullable: true),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: true),
                    NomeConvite = table.Column<string>(type: "text", nullable: false),
                    NomeEvento = table.Column<string>(type: "text", nullable: false),
                    Telefone = table.Column<string>(type: "text", nullable: true),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    OportunidadeId = table.Column<Guid>(type: "uuid", nullable: true),
                    ContatadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeadsRsvp", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeadsRsvp_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LeadsRsvp_Convites_ConviteId",
                        column: x => x.ConviteId,
                        principalTable: "Convites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LeadsRsvp_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LeadsRsvp_Oportunidades_OportunidadeId",
                        column: x => x.OportunidadeId,
                        principalTable: "Oportunidades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "OrcamentosFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    OportunidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Conteudo = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CriadoPor = table.Column<string>(type: "text", nullable: true),
                    EnviadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    RespondidoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ModeloId = table.Column<Guid>(type: "uuid", nullable: true),
                    HtmlAceite = table.Column<string>(type: "text", nullable: true),
                    ExtrasAceite = table.Column<string>(type: "text", nullable: true),
                    TokenLink = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    ValidoAte = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AbertoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    Resposta = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    RespostaMensagem = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    RespostaEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrcamentosFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrcamentosFunil_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OrcamentosFunil_ModelosOrcamentoFunil_ModeloId",
                        column: x => x.ModeloId,
                        principalTable: "ModelosOrcamentoFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_OrcamentosFunil_Oportunidades_OportunidadeId",
                        column: x => x.OportunidadeId,
                        principalTable: "Oportunidades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TarefasFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    OportunidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Observacao = table.Column<string>(type: "text", nullable: true),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Responsavel = table.Column<string>(type: "text", nullable: false),
                    Prazo = table.Column<DateOnly>(type: "date", nullable: false),
                    Completa = table.Column<bool>(type: "boolean", nullable: false),
                    AnexoArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    CriadoPor = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TarefasFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TarefasFunil_Arquivos_AnexoArquivoId",
                        column: x => x.AnexoArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TarefasFunil_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TarefasFunil_Oportunidades_OportunidadeId",
                        column: x => x.OportunidadeId,
                        principalTable: "Oportunidades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FornecedorNoServico",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServicoId = table.Column<Guid>(type: "uuid", nullable: false),
                    FornecedorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Etapa = table.Column<string>(type: "text", nullable: false),
                    ValorOrcamento = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    Observacoes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FornecedorNoServico", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FornecedorNoServico_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FornecedorNoServico_Fornecedores_FornecedorId",
                        column: x => x.FornecedorId,
                        principalTable: "Fornecedores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FornecedorNoServico_ServicoEvento_ServicoId",
                        column: x => x.ServicoId,
                        principalTable: "ServicoEvento",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SubitemServico",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServicoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: false),
                    Quantidade = table.Column<int>(type: "integer", nullable: false),
                    ValorUnitario = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubitemServico", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubitemServico_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SubitemServico_ServicoEvento_ServicoId",
                        column: x => x.ServicoId,
                        principalTable: "ServicoEvento",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Tarefas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: true),
                    Prazo = table.Column<DateOnly>(type: "date", nullable: true),
                    PrazoRelativo = table.Column<int>(type: "integer", nullable: true),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    ResponsavelContaId = table.Column<string>(type: "text", nullable: false),
                    Visibilidade = table.Column<string>(type: "text", nullable: false),
                    Prioridade = table.Column<string>(type: "text", nullable: false),
                    ServicoEventoId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tarefas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tarefas_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Tarefas_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Tarefas_ServicoEvento_ServicoEventoId",
                        column: x => x.ServicoEventoId,
                        principalTable: "ServicoEvento",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ItensChecklistTarefaModelo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
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
                        name: "FK_ItensChecklistTarefaModelo_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItensChecklistTarefaModelo_TarefaModelo_TarefaModeloId",
                        column: x => x.TarefaModeloId,
                        principalTable: "TarefaModelo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PresencasEvento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConviteId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConvidadoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ConfirmadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CompareceuEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PresencasEvento", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PresencasEvento_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PresencasEvento_Convidados_ConvidadoId",
                        column: x => x.ConvidadoId,
                        principalTable: "Convidados",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PresencasEvento_Convites_ConviteId",
                        column: x => x.ConviteId,
                        principalTable: "Convites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PresencasEvento_Eventos_EventoId",
                        column: x => x.EventoId,
                        principalTable: "Eventos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItensBriefingOportunidade",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    BriefingOportunidadeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
                    Secao = table.Column<string>(type: "text", nullable: true),
                    Pergunta = table.Column<string>(type: "text", nullable: false),
                    Resposta = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItensBriefingOportunidade", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItensBriefingOportunidade_BriefingsOportunidade_BriefingOpo~",
                        column: x => x.BriefingOportunidadeId,
                        principalTable: "BriefingsOportunidade",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ItensBriefingOportunidade_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ParcelasContrato",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContratoFunilId = table.Column<Guid>(type: "uuid", nullable: false),
                    Numero = table.Column<int>(type: "integer", nullable: false),
                    Vencimento = table.Column<DateOnly>(type: "date", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Entrada = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParcelasContrato", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParcelasContrato_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ParcelasContrato_ContratosFunil_ContratoFunilId",
                        column: x => x.ContratoFunilId,
                        principalTable: "ContratosFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParcelasOrcamento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrcamentoFunilId = table.Column<Guid>(type: "uuid", nullable: false),
                    Numero = table.Column<int>(type: "integer", nullable: false),
                    Vencimento = table.Column<DateOnly>(type: "date", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Entrada = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParcelasOrcamento", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParcelasOrcamento_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ParcelasOrcamento_OrcamentosFunil_OrcamentoFunilId",
                        column: x => x.OrcamentoFunilId,
                        principalTable: "OrcamentosFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RespostasPropostaFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrcamentoFunilId = table.Column<Guid>(type: "uuid", nullable: false),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Mensagem = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Em = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RespostasPropostaFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RespostasPropostaFunil_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RespostasPropostaFunil_OrcamentosFunil_OrcamentoFunilId",
                        column: x => x.OrcamentoFunilId,
                        principalTable: "OrcamentosFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ResponsaveisTarefaFunil",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaFunilId = table.Column<Guid>(type: "uuid", nullable: false),
                    Papel = table.Column<string>(type: "text", nullable: false),
                    ReferenciaId = table.Column<string>(type: "text", nullable: false),
                    MembroId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponsaveisTarefaFunil", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResponsaveisTarefaFunil_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResponsaveisTarefaFunil_MembrosConta_MembroId",
                        column: x => x.MembroId,
                        principalTable: "MembrosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResponsaveisTarefaFunil_TarefasFunil_TarefaFunilId",
                        column: x => x.TarefaFunilId,
                        principalTable: "TarefasFunil",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ContratosFornecedor",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServicoId = table.Column<Guid>(type: "uuid", nullable: false),
                    VinculoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Pago = table.Column<bool>(type: "boolean", nullable: false),
                    PagoEm = table.Column<DateOnly>(type: "date", nullable: true),
                    ComprovanteArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    ComprovanteNome = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: true),
                    ComprovanteTipoConteudo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ContratoAssinadoArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    ContratoAssinadoNome = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: true),
                    ContratoAssinadoTipoConteudo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ContratoAssinadoEnviadoPor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    ContratoAssinadoEnviadoEm = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContratosFornecedor", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ContratosFornecedor_Arquivos_ComprovanteArquivoId",
                        column: x => x.ComprovanteArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosFornecedor_Arquivos_ContratoAssinadoArquivoId",
                        column: x => x.ContratoAssinadoArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosFornecedor_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ContratosFornecedor_FornecedorNoServico_VinculoId",
                        column: x => x.VinculoId,
                        principalTable: "FornecedorNoServico",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ContratosFornecedor_ServicoEvento_ServicoId",
                        column: x => x.ServicoId,
                        principalTable: "ServicoEvento",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AnexosTarefa",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArquivoId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "text", nullable: false),
                    TipoConteudo = table.Column<string>(type: "text", nullable: false),
                    EnviadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnexosTarefa", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnexosTarefa_Arquivos_ArquivoId",
                        column: x => x.ArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AnexosTarefa_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AnexosTarefa_Tarefas_TarefaId",
                        column: x => x.TarefaId,
                        principalTable: "Tarefas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ComentariosTarefa",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaId = table.Column<Guid>(type: "uuid", nullable: false),
                    AutorContaId = table.Column<string>(type: "text", nullable: false),
                    AutorMembroId = table.Column<Guid>(type: "uuid", nullable: true),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComentariosTarefa", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComentariosTarefa_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ComentariosTarefa_MembrosConta_AutorMembroId",
                        column: x => x.AutorMembroId,
                        principalTable: "MembrosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ComentariosTarefa_Tarefas_TarefaId",
                        column: x => x.TarefaId,
                        principalTable: "Tarefas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ItensChecklistTarefa",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    Feito = table.Column<bool>(type: "boolean", nullable: false),
                    Cancelado = table.Column<bool>(type: "boolean", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
                    Prazo = table.Column<DateOnly>(type: "date", nullable: true),
                    PrazoRelativo = table.Column<int>(type: "integer", nullable: true),
                    ResponsavelPapel = table.Column<string>(type: "text", nullable: true),
                    ResponsavelReferenciaId = table.Column<string>(type: "text", nullable: true),
                    ResponsavelMembroId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItensChecklistTarefa", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItensChecklistTarefa_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItensChecklistTarefa_MembrosConta_ResponsavelMembroId",
                        column: x => x.ResponsavelMembroId,
                        principalTable: "MembrosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItensChecklistTarefa_Tarefas_TarefaId",
                        column: x => x.TarefaId,
                        principalTable: "Tarefas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ResponsaveisTarefa",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    TarefaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Papel = table.Column<string>(type: "text", nullable: false),
                    ReferenciaId = table.Column<string>(type: "text", nullable: true),
                    MembroId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponsaveisTarefa", x => x.Id);
                    table.CheckConstraint("CK_ResponsavelTarefa_Membro", "\"MembroId\" IS NULL OR \"Papel\" = 'Assistente'");
                    table.ForeignKey(
                        name: "FK_ResponsaveisTarefa_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResponsaveisTarefa_MembrosConta_MembroId",
                        column: x => x.MembroId,
                        principalTable: "MembrosConta",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResponsaveisTarefa_Tarefas_TarefaId",
                        column: x => x.TarefaId,
                        principalTable: "Tarefas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecebimentosParcela",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParcelaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Forma = table.Column<string>(type: "text", nullable: false),
                    Data = table.Column<DateOnly>(type: "date", nullable: false),
                    CriadoEm = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecebimentosParcela", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecebimentosParcela_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RecebimentosParcela_ParcelasContrato_ParcelaId",
                        column: x => x.ParcelaId,
                        principalTable: "ParcelasContrato",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ParcelasContratoFornecedor",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ContaId = table.Column<Guid>(type: "uuid", nullable: false),
                    ContratoFornecedorId = table.Column<Guid>(type: "uuid", nullable: false),
                    Numero = table.Column<int>(type: "integer", nullable: false),
                    Vencimento = table.Column<DateOnly>(type: "date", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Entrada = table.Column<bool>(type: "boolean", nullable: false),
                    Situacao = table.Column<string>(type: "text", nullable: false),
                    PagoEm = table.Column<DateOnly>(type: "date", nullable: true),
                    ComprovanteArquivoId = table.Column<Guid>(type: "uuid", nullable: true),
                    ComprovanteNome = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: true),
                    ComprovanteTipoConteudo = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParcelasContratoFornecedor", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ParcelasContratoFornecedor_Arquivos_ComprovanteArquivoId",
                        column: x => x.ComprovanteArquivoId,
                        principalTable: "Arquivos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ParcelasContratoFornecedor_Contas_ContaId",
                        column: x => x.ContaId,
                        principalTable: "Contas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ParcelasContratoFornecedor_ContratosFornecedor_ContratoForn~",
                        column: x => x.ContratoFornecedorId,
                        principalTable: "ContratosFornecedor",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnexosTarefa_ArquivoId",
                table: "AnexosTarefa",
                column: "ArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_AnexosTarefa_ContaId",
                table: "AnexosTarefa",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_AnexosTarefa_TarefaId",
                table: "AnexosTarefa",
                column: "TarefaId");

            migrationBuilder.CreateIndex(
                name: "IX_Arquivos_ContaId",
                table: "Arquivos",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BriefingsOportunidade_ContaId",
                table: "BriefingsOportunidade",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_BriefingsOportunidade_ModeloBriefingId",
                table: "BriefingsOportunidade",
                column: "ModeloBriefingId");

            migrationBuilder.CreateIndex(
                name: "IX_BriefingsOportunidade_OportunidadeId",
                table: "BriefingsOportunidade",
                column: "OportunidadeId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClienteEventos_ContaId",
                table: "ClienteEventos",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ClienteEventos_EventoId",
                table: "ClienteEventos",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_ContaId_Nome",
                table: "Clientes",
                columns: new[] { "ContaId", "Nome" });

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_FotoId",
                table: "Clientes",
                column: "FotoId");

            migrationBuilder.CreateIndex(
                name: "IX_ComentariosTarefa_AutorMembroId",
                table: "ComentariosTarefa",
                column: "AutorMembroId");

            migrationBuilder.CreateIndex(
                name: "IX_ComentariosTarefa_ContaId",
                table: "ComentariosTarefa",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ComentariosTarefa_TarefaId",
                table: "ComentariosTarefa",
                column: "TarefaId");

            migrationBuilder.CreateIndex(
                name: "IX_Compromissos_ContaId_Data",
                table: "Compromissos",
                columns: new[] { "ContaId", "Data" });

            migrationBuilder.CreateIndex(
                name: "IX_Compromissos_EventoId",
                table: "Compromissos",
                column: "EventoId",
                unique: true,
                filter: "\"EventoId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Contas_DonoUsuarioId",
                table: "Contas",
                column: "DonoUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_ContatoOportunidade_ContaId",
                table: "ContatoOportunidade",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ContatoOportunidade_OportunidadeId",
                table: "ContatoOportunidade",
                column: "OportunidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosConta_ContaId",
                table: "ContratosConta",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosConta_FundoArquivoId",
                table: "ContratosConta",
                column: "FundoArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosConta_LogoArquivoId",
                table: "ContratosConta",
                column: "LogoArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosConta_WordArquivoId",
                table: "ContratosConta",
                column: "WordArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFornecedor_ComprovanteArquivoId",
                table: "ContratosFornecedor",
                column: "ComprovanteArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFornecedor_ContaId",
                table: "ContratosFornecedor",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFornecedor_ContratoAssinadoArquivoId",
                table: "ContratosFornecedor",
                column: "ContratoAssinadoArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFornecedor_ServicoId",
                table: "ContratosFornecedor",
                column: "ServicoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFornecedor_VinculoId",
                table: "ContratosFornecedor",
                column: "VinculoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFunil_ContaId",
                table: "ContratosFunil",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFunil_DocumentoArquivoId",
                table: "ContratosFunil",
                column: "DocumentoArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFunil_FundoArquivoId",
                table: "ContratosFunil",
                column: "FundoArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFunil_LogoArquivoId",
                table: "ContratosFunil",
                column: "LogoArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFunil_ModeloId",
                table: "ContratosFunil",
                column: "ModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_ContratosFunil_OportunidadeId",
                table: "ContratosFunil",
                column: "OportunidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_Convidados_ContaId",
                table: "Convidados",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_Convidados_ConviteId",
                table: "Convidados",
                column: "ConviteId");

            migrationBuilder.CreateIndex(
                name: "IX_Convites_ContaId_EventoId",
                table: "Convites",
                columns: new[] { "ContaId", "EventoId" });

            migrationBuilder.CreateIndex(
                name: "IX_Convites_EventoId",
                table: "Convites",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_Convites_Token",
                table: "Convites",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmailFornecedor_ContaId",
                table: "EmailFornecedor",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_EmailFornecedor_FornecedorId",
                table: "EmailFornecedor",
                column: "FornecedorId");

            migrationBuilder.CreateIndex(
                name: "IX_EstagiosFunil_ContaId",
                table: "EstagiosFunil",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_EstagiosFunil_ContaId_Tipo",
                table: "EstagiosFunil",
                columns: new[] { "ContaId", "Tipo" },
                unique: true,
                filter: "\"Tipo\" <> 'Aberto'");

            migrationBuilder.CreateIndex(
                name: "IX_Eventos_ContaId_Data",
                table: "Eventos",
                columns: new[] { "ContaId", "Data" });

            migrationBuilder.CreateIndex(
                name: "IX_Eventos_ImagemId",
                table: "Eventos",
                column: "ImagemId");

            migrationBuilder.CreateIndex(
                name: "IX_EventosMembros_ContaId_MembroId",
                table: "EventosMembros",
                columns: new[] { "ContaId", "MembroId" });

            migrationBuilder.CreateIndex(
                name: "IX_EventosMembros_MembroId",
                table: "EventosMembros",
                column: "MembroId");

            migrationBuilder.CreateIndex(
                name: "IX_EventoTagConta_TagsId",
                table: "EventoTagConta",
                column: "TagsId");

            migrationBuilder.CreateIndex(
                name: "IX_Fornecedores_ContaId",
                table: "Fornecedores",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_Fornecedores_FotoId",
                table: "Fornecedores",
                column: "FotoId");

            migrationBuilder.CreateIndex(
                name: "IX_FornecedorNoServico_ContaId",
                table: "FornecedorNoServico",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_FornecedorNoServico_FornecedorId",
                table: "FornecedorNoServico",
                column: "FornecedorId");

            migrationBuilder.CreateIndex(
                name: "IX_FornecedorNoServico_ServicoId",
                table: "FornecedorNoServico",
                column: "ServicoId");

            migrationBuilder.CreateIndex(
                name: "IX_FornecedorServico_ContaId",
                table: "FornecedorServico",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_FornecedorServico_ServicoContaId",
                table: "FornecedorServico",
                column: "ServicoContaId");

            migrationBuilder.CreateIndex(
                name: "IX_GruposAcesso_ContaId_Nome",
                table: "GruposAcesso",
                columns: new[] { "ContaId", "Nome" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportacoesConvidados_ContaId",
                table: "ImportacoesConvidados",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportacoesConvidados_EventoId_CriadaEm",
                table: "ImportacoesConvidados",
                columns: new[] { "EventoId", "CriadaEm" });

            migrationBuilder.CreateIndex(
                name: "IX_ImportacoesConvidados_Situacao",
                table: "ImportacoesConvidados",
                column: "Situacao");

            migrationBuilder.CreateIndex(
                name: "IX_ItemCronograma_ContaId",
                table: "ItemCronograma",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemCronograma_ModeloId",
                table: "ItemCronograma",
                column: "ModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemInspiracao_ArquivoId",
                table: "ItemInspiracao",
                column: "ArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemInspiracao_ContaId",
                table: "ItemInspiracao",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemInspiracao_GaleriaId",
                table: "ItemInspiracao",
                column: "GaleriaId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemRoteiro_ContaId",
                table: "ItemRoteiro",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ItemRoteiro_SecaoId",
                table: "ItemRoteiro",
                column: "SecaoId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensBriefingOportunidade_BriefingOportunidadeId",
                table: "ItensBriefingOportunidade",
                column: "BriefingOportunidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensBriefingOportunidade_ContaId",
                table: "ItensBriefingOportunidade",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensChecklistTarefa_ContaId",
                table: "ItensChecklistTarefa",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensChecklistTarefa_ResponsavelMembroId",
                table: "ItensChecklistTarefa",
                column: "ResponsavelMembroId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensChecklistTarefa_TarefaId",
                table: "ItensChecklistTarefa",
                column: "TarefaId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensChecklistTarefaModelo_ContaId",
                table: "ItensChecklistTarefaModelo",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensChecklistTarefaModelo_TarefaModeloId",
                table: "ItensChecklistTarefaModelo",
                column: "TarefaModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_LeadsRsvp_ContaId",
                table: "LeadsRsvp",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_LeadsRsvp_ConviteId",
                table: "LeadsRsvp",
                column: "ConviteId");

            migrationBuilder.CreateIndex(
                name: "IX_LeadsRsvp_EventoId",
                table: "LeadsRsvp",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_LeadsRsvp_OportunidadeId",
                table: "LeadsRsvp",
                column: "OportunidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_LinksCliente_ContaId",
                table: "LinksCliente",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_LinksCliente_EventoId",
                table: "LinksCliente",
                column: "EventoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LinksCliente_Token",
                table: "LinksCliente",
                column: "Token",
                unique: true);

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

            migrationBuilder.CreateIndex(
                name: "IX_MembrosConta_ContaId",
                table: "MembrosConta",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_MembrosConta_GrupoId",
                table: "MembrosConta",
                column: "GrupoId");

            migrationBuilder.CreateIndex(
                name: "IX_MembrosConta_UsuarioId",
                table: "MembrosConta",
                column: "UsuarioId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MetricasRsvpFunil_ContaId",
                table: "MetricasRsvpFunil",
                column: "ContaId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Modelos_ContaId",
                table: "Modelos",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ModelosBriefing_ContaId",
                table: "ModelosBriefing",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ModelosCronograma_ContaId",
                table: "ModelosCronograma",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ModelosInspiracao_ContaId",
                table: "ModelosInspiracao",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ModelosMensagem_ContaId",
                table: "ModelosMensagem",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ModelosOrcamentoFunil_ContaId",
                table: "ModelosOrcamentoFunil",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ModelosRoteiro_ContaId",
                table: "ModelosRoteiro",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ModelosServicoFunil_ContaId",
                table: "ModelosServicoFunil",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_Oportunidades_ClienteId",
                table: "Oportunidades",
                column: "ClienteId");

            migrationBuilder.CreateIndex(
                name: "IX_Oportunidades_ContaId",
                table: "Oportunidades",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_Oportunidades_EstagioFunilId",
                table: "Oportunidades",
                column: "EstagioFunilId");

            migrationBuilder.CreateIndex(
                name: "IX_Oportunidades_EventoId",
                table: "Oportunidades",
                column: "EventoId",
                unique: true,
                filter: "\"EventoId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Oportunidades_ModeloServicoFunilId",
                table: "Oportunidades",
                column: "ModeloServicoFunilId");

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentoFornecedor_AnexoId",
                table: "OrcamentoFornecedor",
                column: "AnexoId");

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentoFornecedor_ContaId",
                table: "OrcamentoFornecedor",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentoFornecedor_FornecedorId",
                table: "OrcamentoFornecedor",
                column: "FornecedorId");

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentosFunil_ContaId",
                table: "OrcamentosFunil",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentosFunil_ModeloId",
                table: "OrcamentosFunil",
                column: "ModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentosFunil_OportunidadeId",
                table: "OrcamentosFunil",
                column: "OportunidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_OrcamentosFunil_TokenLink",
                table: "OrcamentosFunil",
                column: "TokenLink",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasContrato_ContaId",
                table: "ParcelasContrato",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasContrato_ContratoFunilId",
                table: "ParcelasContrato",
                column: "ContratoFunilId");

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasContratoFornecedor_ComprovanteArquivoId",
                table: "ParcelasContratoFornecedor",
                column: "ComprovanteArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasContratoFornecedor_ContaId",
                table: "ParcelasContratoFornecedor",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasContratoFornecedor_ContratoFornecedorId",
                table: "ParcelasContratoFornecedor",
                column: "ContratoFornecedorId");

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasOrcamento_ContaId",
                table: "ParcelasOrcamento",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ParcelasOrcamento_OrcamentoFunilId",
                table: "ParcelasOrcamento",
                column: "OrcamentoFunilId");

            migrationBuilder.CreateIndex(
                name: "IX_Perfis_ContaId",
                table: "Perfis",
                column: "ContaId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Perfis_FotoId",
                table: "Perfis",
                column: "FotoId");

            migrationBuilder.CreateIndex(
                name: "IX_PerguntaBriefing_ContaId",
                table: "PerguntaBriefing",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_PerguntaBriefing_SecaoId",
                table: "PerguntaBriefing",
                column: "SecaoId");

            migrationBuilder.CreateIndex(
                name: "IX_PermissoesGrupo_ContaId",
                table: "PermissoesGrupo",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_PermissoesGrupo_GrupoId_Modulo",
                table: "PermissoesGrupo",
                columns: new[] { "GrupoId", "Modulo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PresencasEvento_ContaId",
                table: "PresencasEvento",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_PresencasEvento_ConvidadoId",
                table: "PresencasEvento",
                column: "ConvidadoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PresencasEvento_ConviteId",
                table: "PresencasEvento",
                column: "ConviteId");

            migrationBuilder.CreateIndex(
                name: "IX_PresencasEvento_EventoId",
                table: "PresencasEvento",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_RecebimentosParcela_ContaId",
                table: "RecebimentosParcela",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_RecebimentosParcela_ParcelaId",
                table: "RecebimentosParcela",
                column: "ParcelaId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsaveisTarefa_ContaId",
                table: "ResponsaveisTarefa",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsaveisTarefa_MembroId",
                table: "ResponsaveisTarefa",
                column: "MembroId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsaveisTarefa_TarefaId",
                table: "ResponsaveisTarefa",
                column: "TarefaId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsaveisTarefaFunil_ContaId",
                table: "ResponsaveisTarefaFunil",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsaveisTarefaFunil_MembroId",
                table: "ResponsaveisTarefaFunil",
                column: "MembroId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponsaveisTarefaFunil_TarefaFunilId",
                table: "ResponsaveisTarefaFunil",
                column: "TarefaFunilId");

            migrationBuilder.CreateIndex(
                name: "IX_RespostasPropostaFunil_ContaId",
                table: "RespostasPropostaFunil",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_RespostasPropostaFunil_OrcamentoFunilId",
                table: "RespostasPropostaFunil",
                column: "OrcamentoFunilId");

            migrationBuilder.CreateIndex(
                name: "IX_SecaoBriefing_ContaId",
                table: "SecaoBriefing",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_SecaoBriefing_ModeloId",
                table: "SecaoBriefing",
                column: "ModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_SecaoRoteiro_ContaId",
                table: "SecaoRoteiro",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_SecaoRoteiro_ModeloId",
                table: "SecaoRoteiro",
                column: "ModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicoEvento_ContaId",
                table: "ServicoEvento",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicoEvento_EventoId",
                table: "ServicoEvento",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicoEvento_ServicoContaId",
                table: "ServicoEvento",
                column: "ServicoContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicoModelo_ContaId",
                table: "ServicoModelo",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicoModelo_ModeloId",
                table: "ServicoModelo",
                column: "ModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicoModelo_ServicoContaId",
                table: "ServicoModelo",
                column: "ServicoContaId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicosConta_ContaId_Nome",
                table: "ServicosConta",
                columns: new[] { "ContaId", "Nome" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SubitemServico_ContaId",
                table: "SubitemServico",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_SubitemServico_ServicoId",
                table: "SubitemServico",
                column: "ServicoId");

            migrationBuilder.CreateIndex(
                name: "IX_Tags_ContaId_Nome",
                table: "Tags",
                columns: new[] { "ContaId", "Nome" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TarefaModelo_ContaId",
                table: "TarefaModelo",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_TarefaModelo_ModeloId",
                table: "TarefaModelo",
                column: "ModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_TarefaModelo_ServicoModeloId",
                table: "TarefaModelo",
                column: "ServicoModeloId");

            migrationBuilder.CreateIndex(
                name: "IX_Tarefas_ContaId_Prazo",
                table: "Tarefas",
                columns: new[] { "ContaId", "Prazo" });

            migrationBuilder.CreateIndex(
                name: "IX_Tarefas_EventoId",
                table: "Tarefas",
                column: "EventoId");

            migrationBuilder.CreateIndex(
                name: "IX_Tarefas_ServicoEventoId",
                table: "Tarefas",
                column: "ServicoEventoId");

            migrationBuilder.CreateIndex(
                name: "IX_TarefasFunil_AnexoArquivoId",
                table: "TarefasFunil",
                column: "AnexoArquivoId");

            migrationBuilder.CreateIndex(
                name: "IX_TarefasFunil_ContaId",
                table: "TarefasFunil",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_TarefasFunil_OportunidadeId",
                table: "TarefasFunil",
                column: "OportunidadeId");

            migrationBuilder.CreateIndex(
                name: "IX_TelefoneFornecedor_ContaId",
                table: "TelefoneFornecedor",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_TelefoneFornecedor_FornecedorId",
                table: "TelefoneFornecedor",
                column: "FornecedorId");

            migrationBuilder.CreateIndex(
                name: "IX_VinculoModeloEvento_ContaId",
                table: "VinculoModeloEvento",
                column: "ContaId");

            migrationBuilder.CreateIndex(
                name: "IX_VinculoModeloEvento_ModeloId",
                table: "VinculoModeloEvento",
                column: "ModeloId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnexosTarefa");

            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "ClienteEventos");

            migrationBuilder.DropTable(
                name: "ComentariosTarefa");

            migrationBuilder.DropTable(
                name: "Compromissos");

            migrationBuilder.DropTable(
                name: "ContatoOportunidade");

            migrationBuilder.DropTable(
                name: "EmailFornecedor");

            migrationBuilder.DropTable(
                name: "EventosMembros");

            migrationBuilder.DropTable(
                name: "EventoTagConta");

            migrationBuilder.DropTable(
                name: "FornecedorServico");

            migrationBuilder.DropTable(
                name: "ImportacoesConvidados");

            migrationBuilder.DropTable(
                name: "ItemCronograma");

            migrationBuilder.DropTable(
                name: "ItemInspiracao");

            migrationBuilder.DropTable(
                name: "ItemRoteiro");

            migrationBuilder.DropTable(
                name: "ItensBriefingOportunidade");

            migrationBuilder.DropTable(
                name: "ItensChecklistTarefa");

            migrationBuilder.DropTable(
                name: "ItensChecklistTarefaModelo");

            migrationBuilder.DropTable(
                name: "LeadsRsvp");

            migrationBuilder.DropTable(
                name: "LinksCliente");

            migrationBuilder.DropTable(
                name: "LinksPortaria");

            migrationBuilder.DropTable(
                name: "MetricasRsvpFunil");

            migrationBuilder.DropTable(
                name: "ModelosMensagem");

            migrationBuilder.DropTable(
                name: "OrcamentoFornecedor");

            migrationBuilder.DropTable(
                name: "ParcelasContratoFornecedor");

            migrationBuilder.DropTable(
                name: "ParcelasOrcamento");

            migrationBuilder.DropTable(
                name: "Perfis");

            migrationBuilder.DropTable(
                name: "PerguntaBriefing");

            migrationBuilder.DropTable(
                name: "PermissoesGrupo");

            migrationBuilder.DropTable(
                name: "PresencasEvento");

            migrationBuilder.DropTable(
                name: "RecebimentosParcela");

            migrationBuilder.DropTable(
                name: "ResponsaveisTarefa");

            migrationBuilder.DropTable(
                name: "ResponsaveisTarefaFunil");

            migrationBuilder.DropTable(
                name: "RespostasPropostaFunil");

            migrationBuilder.DropTable(
                name: "SubitemServico");

            migrationBuilder.DropTable(
                name: "TelefoneFornecedor");

            migrationBuilder.DropTable(
                name: "VinculoModeloEvento");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "Tags");

            migrationBuilder.DropTable(
                name: "ModelosCronograma");

            migrationBuilder.DropTable(
                name: "ModelosInspiracao");

            migrationBuilder.DropTable(
                name: "SecaoRoteiro");

            migrationBuilder.DropTable(
                name: "BriefingsOportunidade");

            migrationBuilder.DropTable(
                name: "TarefaModelo");

            migrationBuilder.DropTable(
                name: "ContratosFornecedor");

            migrationBuilder.DropTable(
                name: "SecaoBriefing");

            migrationBuilder.DropTable(
                name: "Convidados");

            migrationBuilder.DropTable(
                name: "ParcelasContrato");

            migrationBuilder.DropTable(
                name: "Tarefas");

            migrationBuilder.DropTable(
                name: "MembrosConta");

            migrationBuilder.DropTable(
                name: "TarefasFunil");

            migrationBuilder.DropTable(
                name: "OrcamentosFunil");

            migrationBuilder.DropTable(
                name: "ModelosRoteiro");

            migrationBuilder.DropTable(
                name: "ServicoModelo");

            migrationBuilder.DropTable(
                name: "FornecedorNoServico");

            migrationBuilder.DropTable(
                name: "ModelosBriefing");

            migrationBuilder.DropTable(
                name: "Convites");

            migrationBuilder.DropTable(
                name: "ContratosFunil");

            migrationBuilder.DropTable(
                name: "GruposAcesso");

            migrationBuilder.DropTable(
                name: "ModelosOrcamentoFunil");

            migrationBuilder.DropTable(
                name: "Modelos");

            migrationBuilder.DropTable(
                name: "Fornecedores");

            migrationBuilder.DropTable(
                name: "ServicoEvento");

            migrationBuilder.DropTable(
                name: "ContratosConta");

            migrationBuilder.DropTable(
                name: "Oportunidades");

            migrationBuilder.DropTable(
                name: "ServicosConta");

            migrationBuilder.DropTable(
                name: "Clientes");

            migrationBuilder.DropTable(
                name: "EstagiosFunil");

            migrationBuilder.DropTable(
                name: "Eventos");

            migrationBuilder.DropTable(
                name: "ModelosServicoFunil");

            migrationBuilder.DropTable(
                name: "Arquivos");

            migrationBuilder.DropTable(
                name: "Contas");

            migrationBuilder.DropTable(
                name: "AspNetUsers");
        }
    }
}
