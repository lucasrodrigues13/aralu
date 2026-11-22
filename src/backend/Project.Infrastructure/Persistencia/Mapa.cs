using Microsoft.EntityFrameworkCore;
using Project.Domain.Clientes;
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
    public static void Aplicar(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ApplicationUser>()
            .HasIndex(usuario => usuario.OrganizerId);

        modelBuilder.Entity<PerfilAssessoria>().HasIndex(perfil => perfil.ContaId).IsUnique();

        var modelo = modelBuilder.Entity<ModeloEvento>();
        modelo.Property(item => item.Tipo).HasConversion<string>();
        modelo.HasMany(item => item.Servicos).WithOne().HasForeignKey(servico => servico.ModeloId).OnDelete(DeleteBehavior.Cascade);
        modelo.HasMany(item => item.Tarefas).WithOne().HasForeignKey(tarefa => tarefa.ModeloId).OnDelete(DeleteBehavior.Cascade);
        modelo.HasMany(item => item.Vinculos).WithOne().HasForeignKey(vinculo => vinculo.ModeloId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ServicoModelo>().Property(servico => servico.ValorEstimado).HasPrecision(12, 2);
        modelBuilder.Entity<ServicoModelo>().HasMany(servico => servico.Itens).WithOne().HasForeignKey(item => item.ServicoId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ItemServicoModelo>().Property(item => item.Tipo).HasConversion<string>();
        modelBuilder.Entity<VinculoModeloEvento>().Property(vinculo => vinculo.Tipo).HasConversion<string>();

        var evento = modelBuilder.Entity<Evento>();
        evento.Property(item => item.Tipo).HasConversion<string>();
        evento.Property(item => item.Situacao).HasConversion<string>();
        evento.Property(item => item.OrcamentoEstimado).HasPrecision(12, 2);
        evento.OwnsOne(item => item.Cerimonia, local => local.Property<bool>("Persistido").HasDefaultValue(true));
        evento.OwnsOne(item => item.Recepcao, local => local.Property<bool>("Persistido").HasDefaultValue(true));
        evento.HasMany(item => item.Servicos).WithOne().HasForeignKey(servico => servico.EventoId).OnDelete(DeleteBehavior.Cascade);
        evento.HasMany(item => item.Tags).WithMany(tag => tag.Eventos);

        var servicoEvento = modelBuilder.Entity<ServicoEvento>();
        servicoEvento.Property(servico => servico.ValorEstimado).HasPrecision(12, 2);
        servicoEvento.Property(servico => servico.ValorContratado).HasPrecision(12, 2);
        servicoEvento.HasOne(servico => servico.Contrato).WithOne().HasForeignKey<Project.Domain.Dinheiro.ContratoFornecedor>(contrato => contrato.ServicoId).OnDelete(DeleteBehavior.Cascade);
        servicoEvento.HasMany(servico => servico.Subitens).WithOne().HasForeignKey(item => item.ServicoId).OnDelete(DeleteBehavior.Cascade);
        servicoEvento.HasMany(servico => servico.Fornecedores).WithOne().HasForeignKey(item => item.ServicoId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SubitemServico>().Property(item => item.ValorUnitario).HasPrecision(12, 2);
        modelBuilder.Entity<FornecedorNoServico>().Property(item => item.Etapa).HasConversion<string>();
        modelBuilder.Entity<FornecedorNoServico>().Property(item => item.ValorOrcamento).HasPrecision(12, 2);

        var assistente = modelBuilder.Entity<Assistente>();
        assistente.ToTable("Assistentes");
        assistente.Property(item => item.Situacao).HasConversion<string>();
        assistente.Property(item => item.Nome).HasMaxLength(100);
        assistente.HasIndex(item => item.ContaId);
        assistente.HasIndex(item => item.UsuarioId);
        modelBuilder.Entity<EventoAssistente>().ToTable("EventosAssistentes").HasKey(item => new { item.EventoId, item.AssistenteId });
        modelBuilder.Entity<EventoAssistente>().HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<EventoAssistente>().HasOne<Assistente>().WithMany().HasForeignKey(item => item.AssistenteId).OnDelete(DeleteBehavior.Cascade);

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
        modelBuilder.Entity<VinculoCliente>().HasKey(vinculo => new { vinculo.ClienteId, vinculo.EventoId });
        modelBuilder.Entity<VinculoCliente>().HasOne<Cliente>().WithMany(cliente => cliente.Vinculos).HasForeignKey(vinculo => vinculo.ClienteId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<VinculoCliente>().HasOne<Evento>().WithMany().HasForeignKey(vinculo => vinculo.EventoId).OnDelete(DeleteBehavior.Cascade);

        var linkCliente = modelBuilder.Entity<LinkCliente>();
        linkCliente.ToTable("LinksCliente");
        linkCliente.Property(item => item.ContaId).HasMaxLength(450);
        linkCliente.Property(item => item.Token).HasMaxLength(64);
        linkCliente.HasIndex(item => item.Token).IsUnique();
        linkCliente.HasIndex(item => item.EventoId).IsUnique();
        linkCliente.HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);

        var linkPortaria = modelBuilder.Entity<LinkPortaria>();
        linkPortaria.ToTable("LinksPortaria");
        linkPortaria.Property(item => item.ContaId).HasMaxLength(450);
        linkPortaria.Property(item => item.Token).HasMaxLength(64);
        linkPortaria.HasIndex(item => item.Token).IsUnique();
        linkPortaria.HasIndex(item => item.EventoId).IsUnique();
        linkPortaria.HasOne<Evento>().WithMany().HasForeignKey(item => item.EventoId).OnDelete(DeleteBehavior.Cascade);

        var importacao = modelBuilder.Entity<ImportacaoConvidados>();
        importacao.ToTable("ImportacoesConvidados");
        importacao.Property(item => item.ContaId).HasMaxLength(450);
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
        briefingLead.HasOne<Oportunidade>().WithMany().HasForeignKey(item => item.OportunidadeId).OnDelete(DeleteBehavior.Cascade);
        briefingLead.HasMany(item => item.Itens).WithOne().HasForeignKey(item => item.BriefingOportunidadeId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ItemBriefingOportunidade>().ToTable("ItensBriefingOportunidade");
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
        contratoFornecedor.HasIndex(item => item.ServicoId).IsUnique();
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
