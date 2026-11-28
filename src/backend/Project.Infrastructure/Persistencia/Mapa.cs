using Microsoft.EntityFrameworkCore;
using Project.Domain.Clientes;
using Project.Domain.Contratos;
using Project.Domain.Convidados;
using Project.Domain.Equipe;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;
using Project.Domain.Funil;
using Project.Domain.Modelos;
using Project.Domain.Perfil;
using Project.Domain.Tarefas;
using Project.Infrastructure.Conta;

namespace Project.Infrastructure.Persistencia;

public static class Mapa
{
    /// <summary>
    /// Toda entidade com ContaId (Guid) ganha FK RESTRICT para Contas (SPEC-062, RF-110).
    /// Roda depois do Aplicar, para pegar todas as entidades já mapeadas.
    /// </summary>
    public static void LigarContas(ModelBuilder modelBuilder)
    {
        var conta = modelBuilder.Entity<ContaAssessoria>();
        conta.ToTable("Contas");
        conta.HasOne<ApplicationUser>().WithMany().HasForeignKey(item => item.DonoUsuarioId).OnDelete(DeleteBehavior.Restrict);

        var comConta = modelBuilder.Model.GetEntityTypes()
            .Where(tipo => !tipo.IsOwned() && tipo.ClrType != typeof(ContaAssessoria))
            .Where(tipo => tipo.FindProperty("ContaId")?.ClrType == typeof(Guid))
            .Select(tipo => tipo.ClrType)
            .ToList();
        foreach (var tipo in comConta)
        {
            modelBuilder.Entity(tipo)
                .HasOne(typeof(ContaAssessoria))
                .WithMany()
                .HasForeignKey("ContaId")
                .OnDelete(DeleteBehavior.Restrict);
        }

        // A FK já cria um índice por ContaId em cada tabela. Nas listagens mais usadas,
        // o índice composto cobre o filtro por conta e a ordenação da tela.
        modelBuilder.Entity<Evento>().HasIndex(item => new { item.ContaId, item.Data });
        modelBuilder.Entity<Tarefa>().HasIndex(item => new { item.ContaId, item.Prazo });
        modelBuilder.Entity<Cliente>().HasIndex(item => new { item.ContaId, item.Nome });
        modelBuilder.Entity<CompromissoAgenda>().HasIndex(item => new { item.ContaId, item.Data });
        modelBuilder.Entity<Convite>().HasIndex(item => new { item.ContaId, item.EventoId });
    }

    /// <summary>
    /// SPEC-062, lote 2.5: referências que só existiam no código viram FK.
    /// SET NULL quando o registro sobrevive sem o pai; RESTRICT quando apagar o pai perderia algo
    /// importante (documento, contrato, proposta); CASCADE quando o filho não tem uso sem o pai.
    /// Decisões e motivos em docs/banco/fonte/dec.js.
    /// </summary>
    public static void LigarReferencias(ModelBuilder modelBuilder)
    {
        // Arquivos: imagem opcional some sem levar o registro; documento não pode sumir em uso.
        Arquivo<Cliente>(modelBuilder, item => item.FotoId, DeleteBehavior.SetNull);
        Arquivo<Fornecedor>(modelBuilder, item => item.FotoId, DeleteBehavior.SetNull);
        Arquivo<PerfilAssessoria>(modelBuilder, item => item.FotoId, DeleteBehavior.SetNull);
        Arquivo<Evento>(modelBuilder, item => item.ImagemId, DeleteBehavior.SetNull);
        Arquivo<ItemInspiracao>(modelBuilder, item => item.ArquivoId, DeleteBehavior.SetNull);
        Arquivo<ContratoFunil>(modelBuilder, item => item.DocumentoArquivoId, DeleteBehavior.Restrict);
        Arquivo<ContratoFunil>(modelBuilder, item => item.LogoArquivoId, DeleteBehavior.Restrict);
        Arquivo<ContratoFunil>(modelBuilder, item => item.FundoArquivoId, DeleteBehavior.Restrict);
        Arquivo<ContratoConta>(modelBuilder, item => item.LogoArquivoId, DeleteBehavior.Restrict);
        Arquivo<ContratoConta>(modelBuilder, item => item.FundoArquivoId, DeleteBehavior.Restrict);
        Arquivo<ContratoConta>(modelBuilder, item => item.WordArquivoId, DeleteBehavior.Restrict);
        Arquivo<Project.Domain.Dinheiro.ContratoFornecedor>(modelBuilder, item => item.ComprovanteArquivoId, DeleteBehavior.Restrict);
        Arquivo<Project.Domain.Dinheiro.ContratoFornecedor>(modelBuilder, item => item.ContratoAssinadoArquivoId, DeleteBehavior.Restrict);
        Arquivo<Project.Domain.Dinheiro.ParcelaContratoFornecedor>(modelBuilder, item => item.ComprovanteArquivoId, DeleteBehavior.Restrict);
        Arquivo<AnexoTarefa>(modelBuilder, item => item.ArquivoId, DeleteBehavior.Restrict);
        Arquivo<TarefaFunil>(modelBuilder, item => item.AnexoArquivoId, DeleteBehavior.Restrict);
        Arquivo<OrcamentoFornecedor>(modelBuilder, item => item.AnexoId, DeleteBehavior.Restrict);

        // Funil.
        // Proposta e contrato saem com a oportunidade (SPEC-032: a dona exclui tudo no funil). Bloquear ou arquivar
        // é decisão pendente do produto (plano, pendência 9).
        modelBuilder.Entity<ContratoFunil>().HasOne<Oportunidade>().WithMany().HasForeignKey(item => item.OportunidadeId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<OrcamentoFunil>().HasOne<Oportunidade>().WithMany().HasForeignKey(item => item.OportunidadeId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<TarefaFunil>().HasOne<Oportunidade>().WithMany().HasForeignKey(item => item.OportunidadeId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<LeadRsvp>().HasOne<Oportunidade>().WithMany().HasForeignKey(item => item.OportunidadeId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<LeadRsvp>().HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<LeadRsvp>().HasOne<Convite>().WithMany().HasForeignKey(item => item.ConviteId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Oportunidade>().HasOne<Cliente>().WithMany().HasForeignKey(item => item.ClienteId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Oportunidade>().HasOne<ModeloServicoFunil>().WithMany().HasForeignKey(item => item.ModeloServicoFunilId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<OrcamentoFunil>().HasOne<ModeloOrcamentoFunil>().WithMany().HasForeignKey(item => item.ModeloId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<ContratoFunil>().HasOne<ContratoConta>().WithMany().HasForeignKey(item => item.ModeloId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<BriefingOportunidade>().HasOne<ModeloBriefing>().WithMany().HasForeignKey(item => item.ModeloBriefingId).OnDelete(DeleteBehavior.SetNull);

        // Serviços, fornecedores, convites.
        modelBuilder.Entity<ServicoEvento>().HasOne<ServicoConta>().WithMany().HasForeignKey(item => item.ServicoContaId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<ServicoModelo>().HasOne<ServicoConta>().WithMany().HasForeignKey(item => item.ServicoContaId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<FornecedorNoServico>().HasOne<Fornecedor>().WithMany().HasForeignKey(item => item.FornecedorId).OnDelete(DeleteBehavior.Restrict);
        // Convite.PrincipalId fica sem FK de propósito: aponta para um convidado do próprio convite, que por sua vez
        // aponta para o convite. FK nos dois sentidos impede gravar convite e convidados juntos (dependência circular).
        // Os convidados saem em cascata com o convite.
        modelBuilder.Entity<PresencaEvento>().HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PresencaEvento>().HasOne<Convite>().WithMany().HasForeignKey(item => item.ConviteId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void Arquivo<T>(ModelBuilder modelBuilder, System.Linq.Expressions.Expression<Func<T, object?>> coluna, DeleteBehavior regra)
        where T : class =>
        modelBuilder.Entity<T>().HasOne<ArquivoRegistro>().WithMany().HasForeignKey(coluna).OnDelete(regra);

    public static void Aplicar(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PerfilAssessoria>().HasIndex(perfil => perfil.ContaId).IsUnique();

        var modelo = modelBuilder.Entity<ModeloEvento>();
        modelo.Property(item => item.Tipo).HasConversion<string>();
        modelo.HasMany(item => item.Servicos).WithOne().HasForeignKey(servico => servico.ModeloId).OnDelete(DeleteBehavior.Cascade);
        modelo.HasMany(item => item.Tarefas).WithOne().HasForeignKey(tarefa => tarefa.ModeloId).OnDelete(DeleteBehavior.Cascade);
        modelo.HasMany(item => item.Vinculos).WithOne().HasForeignKey(vinculo => vinculo.ModeloId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ServicoModelo>().Property(servico => servico.ValorEstimado).HasPrecision(12, 2);
        modelBuilder.Entity<ServicoModelo>().HasIndex(servico => servico.ServicoContaId);

        var tarefaModelo = modelBuilder.Entity<TarefaModelo>();
        tarefaModelo.Property(item => item.Prioridade).HasConversion<string>();
        tarefaModelo.Property(item => item.Visibilidade).HasConversion<string>();
        tarefaModelo.HasOne<ServicoModelo>().WithMany().HasForeignKey(item => item.ServicoModeloId).OnDelete(DeleteBehavior.SetNull);
        tarefaModelo.HasMany(item => item.Checklist).WithOne().HasForeignKey(item => item.TarefaModeloId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ItemChecklistTarefaModelo>().ToTable("ItensChecklistTarefaModelo");
        modelBuilder.Entity<ItemChecklistTarefaModelo>().Property(item => item.ResponsavelPapel).HasConversion<string>();
        modelBuilder.Entity<VinculoModeloEvento>().Property(vinculo => vinculo.Tipo).HasConversion<string>();

        var evento = modelBuilder.Entity<Evento>();
        evento.Property(item => item.Tipo).HasConversion<string>();
        evento.Property(item => item.Situacao).HasConversion<string>();
        evento.Property(item => item.OrcamentoEstimado).HasPrecision(12, 2);
        evento.OwnsOne(item => item.Cerimonia, local => local.Property<bool>("Persistido").HasDefaultValue(true));
        evento.OwnsOne(item => item.Recepcao, local => local.Property<bool>("Persistido").HasDefaultValue(true));
        evento.HasMany(item => item.Servicos).WithOne().HasForeignKey(servico => servico.EventoId).OnDelete(DeleteBehavior.Cascade);
        evento.HasMany(item => item.Tags).WithMany(tag => tag.Eventos);
        evento.HasOne<ModeloRoteiro>().WithMany().HasForeignKey(item => item.RoteiroId).OnDelete(DeleteBehavior.SetNull);
        evento.HasOne<ModeloCronograma>().WithMany().HasForeignKey(item => item.CronogramaId).OnDelete(DeleteBehavior.SetNull);

        var servicoEvento = modelBuilder.Entity<ServicoEvento>();
        servicoEvento.Ignore(servico => servico.ContratosAtivos);
        servicoEvento.Property(servico => servico.ValorEstimado).HasPrecision(12, 2);
        servicoEvento.Property(servico => servico.ValorContratado).HasPrecision(12, 2);
        servicoEvento.HasMany(servico => servico.Contratos).WithOne().HasForeignKey(contrato => contrato.ServicoId).OnDelete(DeleteBehavior.Cascade);
        servicoEvento.HasMany(servico => servico.Subitens).WithOne().HasForeignKey(item => item.ServicoId).OnDelete(DeleteBehavior.Cascade);
        servicoEvento.HasMany(servico => servico.Fornecedores).WithOne().HasForeignKey(item => item.ServicoId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SubitemServico>().Property(item => item.ValorUnitario).HasPrecision(12, 2);
        modelBuilder.Entity<FornecedorNoServico>().Property(item => item.Etapa).HasConversion<string>();
        modelBuilder.Entity<FornecedorNoServico>().Property(item => item.ValorOrcamento).HasPrecision(12, 2);

        var membro = modelBuilder.Entity<MembroConta>();
        membro.ToTable("MembrosConta", tabela => tabela.HasCheckConstraint(
            "CK_MembrosConta_Grupo",
            "(\"Tipo\" = 'Dono' AND \"GrupoId\" IS NULL) OR (\"Tipo\" = 'Membro' AND \"GrupoId\" IS NOT NULL)"));
        membro.Property(item => item.Situacao).HasConversion<string>().HasMaxLength(20);
        membro.Property(item => item.Tipo).HasConversion<string>().HasMaxLength(10);
        membro.Property(item => item.Nome).HasMaxLength(100);
        membro.HasIndex(item => item.UsuarioId).IsUnique();
        membro.HasOne<ApplicationUser>().WithMany().HasForeignKey(item => item.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        membro.HasOne<GrupoAcesso>().WithMany().HasForeignKey(item => item.GrupoId).OnDelete(DeleteBehavior.Restrict);
        var eventoMembro = modelBuilder.Entity<EventoMembro>();
        eventoMembro.ToTable("EventosMembros").HasKey(item => new { item.EventoId, item.MembroId });
        eventoMembro.HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);
        eventoMembro.HasOne<MembroConta>().WithMany().HasForeignKey(item => item.MembroId).OnDelete(DeleteBehavior.Cascade);
        eventoMembro.HasIndex(item => new { item.ContaId, item.MembroId });

        // Responsáveis e autor que são pessoas da equipe (SPEC-062 Fase 3). RESTRICT: membro nunca é apagado, só desativado.
        modelBuilder.Entity<ResponsavelTarefa>().HasOne<MembroConta>().WithMany().HasForeignKey(item => item.MembroId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ResponsavelTarefa>().ToTable(tabela => tabela.HasCheckConstraint("CK_ResponsavelTarefa_Membro", "\"MembroId\" IS NULL OR \"Papel\" = 'Assistente'"));
        modelBuilder.Entity<ResponsavelTarefaFunil>().HasOne<MembroConta>().WithMany().HasForeignKey(item => item.MembroId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ItemChecklistTarefa>().HasOne<MembroConta>().WithMany().HasForeignKey(item => item.ResponsavelMembroId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<ComentarioTarefa>().HasOne<MembroConta>().WithMany().HasForeignKey(item => item.AutorMembroId).OnDelete(DeleteBehavior.SetNull);

        var grupo = modelBuilder.Entity<GrupoAcesso>();
        grupo.ToTable("GruposAcesso");
        grupo.Property(item => item.Nome).HasMaxLength(GrupoAcesso.NomeMaximo);
        grupo.HasIndex(item => new { item.ContaId, item.Nome }).IsUnique();
        grupo.HasMany(item => item.Permissoes).WithOne().HasForeignKey(item => item.GrupoId).OnDelete(DeleteBehavior.Cascade);
        var permissao = modelBuilder.Entity<PermissaoGrupo>();
        permissao.ToTable("PermissoesGrupo");
        permissao.Property(item => item.Modulo).HasConversion<string>().HasMaxLength(30);
        permissao.HasIndex(item => new { item.GrupoId, item.Modulo }).IsUnique();

        modelBuilder.Entity<TagConta>().HasIndex(tag => new { tag.ContaId, tag.Nome }).IsUnique();

        var tarefa = modelBuilder.Entity<Tarefa>();
        tarefa.Property(item => item.Situacao).HasConversion<string>();
        tarefa.Property(item => item.Visibilidade).HasConversion<string>();
        tarefa.Property(item => item.Prioridade).HasConversion<string>();
        tarefa.HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);
        tarefa.HasOne<ServicoEvento>().WithMany().HasForeignKey(item => item.ServicoEventoId).OnDelete(DeleteBehavior.SetNull);
        tarefa.HasMany(item => item.Responsaveis).WithOne().HasForeignKey(item => item.TarefaId).OnDelete(DeleteBehavior.Cascade);
        tarefa.HasMany(item => item.Checklist).WithOne().HasForeignKey(item => item.TarefaId).OnDelete(DeleteBehavior.Cascade);
        tarefa.HasMany(item => item.Comentarios).WithOne().HasForeignKey(item => item.TarefaId).OnDelete(DeleteBehavior.Cascade);
        tarefa.HasMany(item => item.Anexos).WithOne().HasForeignKey(item => item.TarefaId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<AnexoTarefa>().ToTable("AnexosTarefa");
        modelBuilder.Entity<ResponsavelTarefa>().Property(item => item.Papel).HasConversion<string>();
        modelBuilder.Entity<ResponsavelTarefa>().ToTable("ResponsaveisTarefa");
        modelBuilder.Entity<ItemChecklistTarefa>().ToTable("ItensChecklistTarefa");
        modelBuilder.Entity<ItemChecklistTarefa>().Property(item => item.ResponsavelPapel).HasConversion<string>();
        modelBuilder.Entity<ItemChecklistTarefa>().Ignore(item => item.PrazoMovivel);
        modelBuilder.Entity<ComentarioTarefa>().ToTable("ComentariosTarefa");

        modelBuilder.Entity<Cliente>().Property(cliente => cliente.Papel).HasConversion<string>();
        modelBuilder.Entity<VinculoCliente>().ToTable("ClienteEventos");
        modelBuilder.Entity<VinculoCliente>().HasKey(vinculo => new { vinculo.ClienteId, vinculo.EventoId });
        modelBuilder.Entity<VinculoCliente>().HasOne<Cliente>().WithMany(cliente => cliente.Vinculos).HasForeignKey(vinculo => vinculo.ClienteId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<VinculoCliente>().HasOne<Evento>().WithMany().HasForeignKey(vinculo => vinculo.EventoId).OnDelete(DeleteBehavior.Cascade);

        var linkCliente = modelBuilder.Entity<LinkCliente>();
        linkCliente.ToTable("LinksCliente");
        linkCliente.Property(item => item.Token).HasMaxLength(64);
        linkCliente.HasIndex(item => item.Token).IsUnique();
        linkCliente.HasIndex(item => item.EventoId).IsUnique();
        linkCliente.HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);

        var codigoAcesso = modelBuilder.Entity<CodigoAcessoCliente>();
        codigoAcesso.ToTable("CodigosAcessoCliente");
        codigoAcesso.Property(item => item.Email).HasMaxLength(320);
        codigoAcesso.Property(item => item.CodigoHash).HasMaxLength(64);
        codigoAcesso.HasIndex(item => new { item.LinkId, item.CriadoEm });
        codigoAcesso.HasOne<LinkCliente>().WithMany().HasForeignKey(item => item.LinkId).OnDelete(DeleteBehavior.Cascade);

        var sessaoLink = modelBuilder.Entity<SessaoLinkCliente>();
        sessaoLink.ToTable("SessoesLinkCliente");
        sessaoLink.Property(item => item.TokenHash).HasMaxLength(64);
        sessaoLink.HasIndex(item => new { item.LinkId, item.TokenHash }).IsUnique();
        sessaoLink.HasOne<LinkCliente>().WithMany().HasForeignKey(item => item.LinkId).OnDelete(DeleteBehavior.Cascade);

        var pessoaEquipe = modelBuilder.Entity<PessoaEquipeEvento>();
        pessoaEquipe.ToTable("PessoasEquipeEvento");
        pessoaEquipe.Property(item => item.Nome).HasMaxLength(200);
        pessoaEquipe.Property(item => item.Email).HasMaxLength(320);
        pessoaEquipe.Property(item => item.Telefone).HasMaxLength(40);
        pessoaEquipe.Property(item => item.Funcao).HasMaxLength(120);
        pessoaEquipe.Property(item => item.Token).HasMaxLength(64);
        pessoaEquipe.HasIndex(item => item.Token).IsUnique();
        pessoaEquipe.HasIndex(item => item.EventoId);
        pessoaEquipe.HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);

        var codigoEquipe = modelBuilder.Entity<CodigoAcessoEquipe>();
        codigoEquipe.ToTable("CodigosAcessoEquipe");
        codigoEquipe.Property(item => item.CodigoHash).HasMaxLength(64);
        codigoEquipe.HasIndex(item => new { item.PessoaId, item.CriadoEm });
        codigoEquipe.HasOne<PessoaEquipeEvento>().WithMany().HasForeignKey(item => item.PessoaId).OnDelete(DeleteBehavior.Cascade);

        var sessaoEquipe = modelBuilder.Entity<SessaoEquipe>();
        sessaoEquipe.ToTable("SessoesEquipe");
        sessaoEquipe.Property(item => item.TokenHash).HasMaxLength(64);
        sessaoEquipe.HasIndex(item => new { item.PessoaId, item.TokenHash }).IsUnique();
        sessaoEquipe.HasOne<PessoaEquipeEvento>().WithMany().HasForeignKey(item => item.PessoaId).OnDelete(DeleteBehavior.Cascade);

        var importacao = modelBuilder.Entity<ImportacaoConvidados>();
        importacao.ToTable("ImportacoesConvidados");
        importacao.Property(item => item.NomeArquivo).HasMaxLength(260);
        importacao.Property(item => item.ObservacaoFixa).HasMaxLength(200);
        importacao.Property(item => item.Situacao).HasConversion<string>().HasMaxLength(20);
        importacao.HasIndex(item => new { item.EventoId, item.CriadaEm });
        importacao.HasIndex(item => item.Situacao);
        importacao.HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Convite>().HasIndex(convite => convite.Token).IsUnique();
        modelBuilder.Entity<Convite>().HasOne<Evento>().WithMany().HasForeignKey(convite => convite.EventoId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Convite>().HasMany(convite => convite.Convidados).WithOne().HasForeignKey(convidado => convidado.ConviteId).OnDelete(DeleteBehavior.Cascade);

        var presenca = modelBuilder.Entity<PresencaEvento>();
        presenca.ToTable("PresencasEvento");
        presenca.HasIndex(item => item.ConvidadoId).IsUnique();
        presenca.HasIndex(item => item.EventoId);
        presenca.HasOne<Convidado>().WithMany().HasForeignKey(item => item.ConvidadoId).OnDelete(DeleteBehavior.Cascade);

        var convidado = modelBuilder.Entity<Convidado>();
        convidado.Property(item => item.Situacao).HasConversion<string>();
        convidado.Property(item => item.Genero).HasConversion<string>();
        convidado.Property(item => item.Faixa).HasConversion<string>();
        convidado.Property(item => item.Custo).HasConversion<string>();

        var compromisso = modelBuilder.Entity<CompromissoAgenda>();
        compromisso.Property(item => item.Descricao).HasMaxLength(500);
        compromisso.HasIndex(item => item.EventoId).IsUnique().HasFilter("\"EventoId\" IS NOT NULL");
        compromisso.HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ArquivoRegistro>().Property(arquivo => arquivo.CaminhoRelativo).IsRequired();

        MapearBibliotecas(modelBuilder);
        MapearFornecedores(modelBuilder);
        MapearDinheiro(modelBuilder);
        MapearContratos(modelBuilder);
        MapearFunil(modelBuilder);
    }

    private static void MapearFunil(ModelBuilder modelBuilder)
    {
        var oportunidade = modelBuilder.Entity<Oportunidade>();
        oportunidade.HasIndex(item => item.ContaId);
        oportunidade.HasOne(item => item.EstagioFunil).WithMany().HasForeignKey(item => item.EstagioFunilId).OnDelete(DeleteBehavior.Restrict);
        // Um evento por lead; excluir o evento libera o lead para criar outro.
        oportunidade.HasIndex(item => item.EventoId).IsUnique().HasFilter("\"EventoId\" IS NOT NULL");
        oportunidade.HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.SetNull);

        var estagio = modelBuilder.Entity<EstagioFunil>();
        estagio.ToTable("EstagiosFunil");
        estagio.HasIndex(item => item.ContaId);
        estagio.Property(item => item.Nome).HasMaxLength(EstagiosFunil.TamanhoMaximoNome);
        estagio.Property(item => item.Cor).HasMaxLength(20);
        estagio.Property(item => item.Tipo).HasConversion<string>().HasMaxLength(20);
        // Um Contratado e um Descartado por conta, mesmo se duas requisições criarem os padrões juntas.
        estagio.HasIndex(item => new { item.ContaId, item.Tipo }).IsUnique().HasFilter("\"Tipo\" <> 'Aberto'");
        oportunidade.Property(item => item.TipoEvento).HasConversion<string>();
        oportunidade.Property(item => item.ValorProposta).HasPrecision(12, 2);
        oportunidade.HasMany(item => item.Contatos).WithOne().HasForeignKey(c => c.OportunidadeId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LeadRsvp>().HasIndex(item => item.ContaId);
        modelBuilder.Entity<LeadRsvp>().Property(item => item.Situacao).HasConversion<string>();
        modelBuilder.Entity<MetricasRsvpFunil>().HasIndex(item => item.ContaId).IsUnique();

        var contrato = modelBuilder.Entity<ContratoFunil>();
        contrato.HasIndex(item => item.ContaId);
        contrato.Property(item => item.Situacao).HasConversion<string>();

        var orcamento = modelBuilder.Entity<OrcamentoFunil>();
        orcamento.HasIndex(item => item.ContaId);
        orcamento.Property(item => item.Situacao).HasConversion<string>();
        orcamento.Property(item => item.Valor).HasPrecision(12, 2);
        orcamento.Property(item => item.TokenLink).HasMaxLength(64);
        orcamento.HasIndex(item => item.TokenLink).IsUnique();
        orcamento.Property(item => item.Resposta).HasConversion<string>().HasMaxLength(20);
        orcamento.Property(item => item.RespostaMensagem).HasMaxLength(1000);

        var resposta = modelBuilder.Entity<RespostaPropostaFunil>();
        resposta.HasIndex(item => item.OrcamentoFunilId);
        resposta.Property(item => item.Tipo).HasConversion<string>().HasMaxLength(20);
        resposta.Property(item => item.Mensagem).HasMaxLength(1000);
        resposta.HasOne<OrcamentoFunil>().WithMany().HasForeignKey(item => item.OrcamentoFunilId).OnDelete(DeleteBehavior.Cascade);

        var briefingLead = modelBuilder.Entity<BriefingOportunidade>();
        briefingLead.ToTable("BriefingsOportunidade");
        briefingLead.HasIndex(item => item.OportunidadeId).IsUnique();
        briefingLead.Property(item => item.ModeloNome).HasMaxLength(200);
        briefingLead.Property(item => item.TokenLink).HasMaxLength(64);
        briefingLead.HasIndex(item => item.TokenLink).IsUnique();
        briefingLead.HasOne<Oportunidade>().WithMany().HasForeignKey(item => item.OportunidadeId).OnDelete(DeleteBehavior.Cascade);
        briefingLead.HasMany(item => item.Itens).WithOne().HasForeignKey(item => item.BriefingOportunidadeId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ItemBriefingOportunidade>().ToTable("ItensBriefingOportunidade");

        var codigoBriefing = modelBuilder.Entity<CodigoAcessoBriefing>();
        codigoBriefing.ToTable("CodigosAcessoBriefing");
        codigoBriefing.Property(item => item.Email).HasMaxLength(320);
        codigoBriefing.Property(item => item.CodigoHash).HasMaxLength(64);
        codigoBriefing.HasIndex(item => new { item.BriefingId, item.CriadoEm });
        codigoBriefing.HasOne<BriefingOportunidade>().WithMany().HasForeignKey(item => item.BriefingId).OnDelete(DeleteBehavior.Cascade);

        var sessaoBriefing = modelBuilder.Entity<SessaoBriefing>();
        sessaoBriefing.ToTable("SessoesBriefing");
        sessaoBriefing.Property(item => item.TokenHash).HasMaxLength(64);
        sessaoBriefing.HasIndex(item => new { item.BriefingId, item.TokenHash }).IsUnique();
        sessaoBriefing.HasOne<BriefingOportunidade>().WithMany().HasForeignKey(item => item.BriefingId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ResponsavelTarefaFunil>().ToTable("ResponsaveisTarefaFunil");
        modelBuilder.Entity<ResponsavelTarefaFunil>().Property(item => item.Papel).HasConversion<string>();
        modelBuilder.Entity<TarefaFunil>().HasMany(item => item.Responsaveis).WithOne().HasForeignKey(item => item.TarefaFunilId).OnDelete(DeleteBehavior.Cascade);
        var tarefa = modelBuilder.Entity<TarefaFunil>();
        tarefa.HasIndex(item => item.ContaId);
        tarefa.Property(item => item.Tipo).HasConversion<string>();

        modelBuilder.Entity<ModeloServicoFunil>().HasIndex(item => item.ContaId);
        modelBuilder.Entity<ModeloServicoFunil>().Property(item => item.Descricao).HasMaxLength(200);
        modelBuilder.Entity<ModeloServicoFunil>().Property(item => item.Valor).HasPrecision(12, 2);
        modelBuilder.Entity<ModeloOrcamentoFunil>().HasIndex(item => item.ContaId);
    }

    private static void MapearBibliotecas(ModelBuilder modelBuilder)
    {
        var briefing = modelBuilder.Entity<ModeloBriefing>();
        briefing.HasIndex(item => item.ContaId);
        briefing.HasMany(item => item.Secoes).WithOne().HasForeignKey(secao => secao.ModeloId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SecaoBriefing>().HasMany(secao => secao.Perguntas).WithOne().HasForeignKey(pergunta => pergunta.SecaoId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PerguntaBriefing>().Property(pergunta => pergunta.Tipo).HasConversion<string>();

        var roteiro = modelBuilder.Entity<ModeloRoteiro>();
        roteiro.HasIndex(item => item.ContaId);
        roteiro.HasMany(item => item.Secoes).WithOne().HasForeignKey(secao => secao.ModeloId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<SecaoRoteiro>().HasMany(secao => secao.Itens).WithOne().HasForeignKey(item => item.SecaoId).OnDelete(DeleteBehavior.Cascade);

        var cronograma = modelBuilder.Entity<ModeloCronograma>();
        cronograma.HasIndex(item => item.ContaId);
        cronograma.HasMany(item => item.Itens).WithOne().HasForeignKey(item => item.ModeloId).OnDelete(DeleteBehavior.Cascade);

        var inspiracao = modelBuilder.Entity<ModeloInspiracao>();
        inspiracao.HasIndex(item => item.ContaId);
        inspiracao.HasMany(item => item.Itens).WithOne().HasForeignKey(item => item.GaleriaId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ModeloMensagem>().HasIndex(item => item.ContaId);
    }

    private static void MapearContratos(ModelBuilder modelBuilder)
    {
        var contrato = modelBuilder.Entity<Project.Domain.Contratos.ContratoConta>();
        contrato.ToTable("ContratosConta");
        contrato.HasIndex(item => item.ContaId);
        contrato.Property(item => item.Nome).HasMaxLength(120);
    }

    private static void MapearDinheiro(ModelBuilder modelBuilder)
    {
        var parcelaOrcamento = modelBuilder.Entity<Project.Domain.Dinheiro.ParcelaOrcamento>();
        parcelaOrcamento.ToTable("ParcelasOrcamento");
        parcelaOrcamento.Property(item => item.Valor).HasPrecision(12, 2);
        parcelaOrcamento.HasIndex(item => item.OrcamentoFunilId);
        modelBuilder.Entity<Project.Domain.Funil.OrcamentoFunil>()
            .HasMany(item => item.Parcelas).WithOne().HasForeignKey(item => item.OrcamentoFunilId).OnDelete(DeleteBehavior.Cascade);

        var parcela = modelBuilder.Entity<Project.Domain.Dinheiro.ParcelaContrato>();
        parcela.ToTable("ParcelasContrato");
        parcela.Property(item => item.Valor).HasPrecision(12, 2);
        parcela.Ignore(item => item.Recebido);
        parcela.Ignore(item => item.Saldo);
        parcela.HasIndex(item => item.ContratoFunilId);
        modelBuilder.Entity<Project.Domain.Funil.ContratoFunil>()
            .HasMany(item => item.Parcelas).WithOne().HasForeignKey(item => item.ContratoFunilId).OnDelete(DeleteBehavior.Cascade);
        parcela.HasMany(item => item.Recebimentos).WithOne().HasForeignKey(item => item.ParcelaId).OnDelete(DeleteBehavior.Cascade);

        var contratoFornecedor = modelBuilder.Entity<Project.Domain.Dinheiro.ContratoFornecedor>();
        contratoFornecedor.ToTable("ContratosFornecedor");
        contratoFornecedor.HasIndex(item => item.ServicoId);
        contratoFornecedor.HasIndex(item => item.VinculoId).IsUnique();
        contratoFornecedor.HasOne<FornecedorNoServico>().WithOne().HasForeignKey<Project.Domain.Dinheiro.ContratoFornecedor>(item => item.VinculoId).OnDelete(DeleteBehavior.Cascade);
        contratoFornecedor.HasMany(item => item.Parcelas).WithOne().HasForeignKey(item => item.ContratoFornecedorId).OnDelete(DeleteBehavior.Cascade);

        var parcelaFornecedor = modelBuilder.Entity<Project.Domain.Dinheiro.ParcelaContratoFornecedor>();
        parcelaFornecedor.ToTable("ParcelasContratoFornecedor");
        parcelaFornecedor.Property(item => item.Valor).HasPrecision(12, 2);
        parcelaFornecedor.Property(item => item.Situacao).HasConversion<string>();
        parcelaFornecedor.HasIndex(item => item.ContratoFornecedorId);
        parcelaFornecedor.Property(item => item.ComprovanteNome).HasMaxLength(260);
        parcelaFornecedor.Property(item => item.ComprovanteTipoConteudo).HasMaxLength(100);
        contratoFornecedor.Property(item => item.ComprovanteNome).HasMaxLength(260);
        contratoFornecedor.Property(item => item.ContratoAssinadoNome).HasMaxLength(260);
        contratoFornecedor.Property(item => item.ContratoAssinadoTipoConteudo).HasMaxLength(100);
        contratoFornecedor.Property(item => item.ContratoAssinadoEnviadoPor).HasMaxLength(20);
        contratoFornecedor.Property(item => item.ComprovanteTipoConteudo).HasMaxLength(100);

        var recebimento = modelBuilder.Entity<Project.Domain.Dinheiro.RecebimentoParcela>();
        recebimento.ToTable("RecebimentosParcela");
        recebimento.Property(item => item.Valor).HasPrecision(12, 2);
        recebimento.Property(item => item.Forma).HasConversion<string>();
    }

    private static void MapearFornecedores(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ServicoConta>().HasIndex(servico => new { servico.ContaId, servico.Nome }).IsUnique();
        modelBuilder.Entity<ServicoConta>().Property(servico => servico.Nome).HasMaxLength(200);

        var fornecedor = modelBuilder.Entity<Fornecedor>();
        fornecedor.HasIndex(item => item.ContaId);
        fornecedor.Property(item => item.PrecoDe).HasPrecision(12, 2);
        fornecedor.Property(item => item.PrecoAte).HasPrecision(12, 2);
        fornecedor.HasMany(item => item.Telefones).WithOne().HasForeignKey(telefone => telefone.FornecedorId).OnDelete(DeleteBehavior.Cascade);
        fornecedor.HasMany(item => item.Emails).WithOne().HasForeignKey(email => email.FornecedorId).OnDelete(DeleteBehavior.Cascade);
        fornecedor.HasMany(item => item.Orcamentos).WithOne().HasForeignKey(orcamento => orcamento.FornecedorId).OnDelete(DeleteBehavior.Cascade);
        fornecedor.HasMany(item => item.Servicos).WithOne().HasForeignKey(ligacao => ligacao.FornecedorId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FornecedorServico>().HasKey(ligacao => new { ligacao.FornecedorId, ligacao.ServicoContaId });
        modelBuilder.Entity<FornecedorServico>().HasOne<ServicoConta>().WithMany().HasForeignKey(ligacao => ligacao.ServicoContaId).OnDelete(DeleteBehavior.Restrict);
    }
}
