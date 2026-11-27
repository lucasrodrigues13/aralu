using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Project.Domain.Clientes;
using Project.Domain.Comum;
using Project.Domain.Convidados;
using Project.Domain.Equipe;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;
using Project.Domain.Funil;
using Project.Domain.Modelos;
using Project.Domain.Perfil;
using Project.Domain.Tarefas;
using Project.Application.Conta;
using Project.Infrastructure.Conta;

namespace Project.Infrastructure.Persistencia;

public sealed class AppDbContext : IdentityDbContext<ApplicationUser>
{
    private readonly IContaAtual? _contaAtual;

    /// <summary>
    /// contaAtual vem da API (pedido HTTP). Sem ele (testes, ferramentas de migration, endpoints públicos)
    /// o filtro global por conta fica desligado e valem só os filtros escritos em cada consulta.
    /// </summary>
    public AppDbContext(DbContextOptions<AppDbContext> options, IContaAtual? contaAtual = null)
        : base(options)
    {
        _contaAtual = contaAtual;
    }

    /// <summary>Conta usada pelo filtro global (SPEC-062). Nulo desliga o filtro.</summary>
    private Guid? ContaFiltro => _contaAtual?.Id;

    public DbSet<ContaAssessoria> Contas => Set<ContaAssessoria>();

    public DbSet<Project.Domain.Assinaturas.Plano> Planos => Set<Project.Domain.Assinaturas.Plano>();

    public DbSet<Project.Domain.Assinaturas.Assinatura> Assinaturas => Set<Project.Domain.Assinaturas.Assinatura>();

    public DbSet<Project.Domain.Assinaturas.CobrancaAssinatura> CobrancasAssinatura => Set<Project.Domain.Assinaturas.CobrancaAssinatura>();

    public DbSet<Project.Domain.Assinaturas.EventoWebhookAsaas> EventosWebhookAsaas => Set<Project.Domain.Assinaturas.EventoWebhookAsaas>();

    public DbSet<Project.Domain.Assinaturas.DocumentoTrial> DocumentosTrial => Set<Project.Domain.Assinaturas.DocumentoTrial>();

    public DbSet<Project.Domain.Assinaturas.AlteracaoAssinatura> AlteracoesAssinatura => Set<Project.Domain.Assinaturas.AlteracaoAssinatura>();

    public DbSet<Project.Domain.Assinaturas.AvisoAssinatura> AvisosAssinatura => Set<Project.Domain.Assinaturas.AvisoAssinatura>();

    public DbSet<PerfilAssessoria> Perfis => Set<PerfilAssessoria>();

    public DbSet<ModeloEvento> Modelos => Set<ModeloEvento>();

    public DbSet<MembroConta> Membros => Set<MembroConta>();

    public DbSet<EventoMembro> EventosMembros => Set<EventoMembro>();

    public DbSet<GrupoAcesso> Grupos => Set<GrupoAcesso>();

    public DbSet<PermissaoGrupo> PermissoesGrupo => Set<PermissaoGrupo>();

    public DbSet<Evento> Eventos => Set<Evento>();

    public DbSet<TagConta> Tags => Set<TagConta>();

    public DbSet<Tarefa> Tarefas => Set<Tarefa>();

    public DbSet<Cliente> Clientes => Set<Cliente>();

    public DbSet<VinculoCliente> Vinculos => Set<VinculoCliente>();

    public DbSet<LinkCliente> LinksCliente => Set<LinkCliente>();

    public DbSet<CodigoAcessoCliente> CodigosAcessoCliente => Set<CodigoAcessoCliente>();

    public DbSet<SessaoLinkCliente> SessoesLinkCliente => Set<SessaoLinkCliente>();

    public DbSet<LinkPortaria> LinksPortaria => Set<LinkPortaria>();

    public DbSet<Convite> Convites => Set<Convite>();

    public DbSet<ImportacaoConvidados> ImportacoesConvidados => Set<ImportacaoConvidados>();

    public DbSet<Convidado> Convidados => Set<Convidado>();

    public DbSet<PresencaEvento> PresencasEvento => Set<PresencaEvento>();

    public DbSet<CompromissoAgenda> Compromissos => Set<CompromissoAgenda>();

    public DbSet<ArquivoRegistro> Arquivos => Set<ArquivoRegistro>();

    public DbSet<ModeloBriefing> ModelosBriefing => Set<ModeloBriefing>();

    public DbSet<ModeloRoteiro> ModelosRoteiro => Set<ModeloRoteiro>();

    public DbSet<ModeloCronograma> ModelosCronograma => Set<ModeloCronograma>();

    public DbSet<ModeloInspiracao> ModelosInspiracao => Set<ModeloInspiracao>();

    public DbSet<ModeloMensagem> ModelosMensagem => Set<ModeloMensagem>();

    public DbSet<ServicoConta> ServicosConta => Set<ServicoConta>();

    public DbSet<Fornecedor> Fornecedores => Set<Fornecedor>();

    public DbSet<Oportunidade> Oportunidades => Set<Oportunidade>();

    public DbSet<EstagioFunil> EstagiosFunil => Set<EstagioFunil>();

    public DbSet<BriefingOportunidade> BriefingsOportunidade => Set<BriefingOportunidade>();

    public DbSet<CodigoAcessoBriefing> CodigosAcessoBriefing => Set<CodigoAcessoBriefing>();

    public DbSet<SessaoBriefing> SessoesBriefing => Set<SessaoBriefing>();

    public DbSet<LeadRsvp> LeadsRsvp => Set<LeadRsvp>();

    public DbSet<MetricasRsvpFunil> MetricasRsvpFunil => Set<MetricasRsvpFunil>();

    public DbSet<ContratoFunil> ContratosFunil => Set<ContratoFunil>();

    public DbSet<OrcamentoFunil> OrcamentosFunil => Set<OrcamentoFunil>();

    public DbSet<RespostaPropostaFunil> RespostasPropostaFunil => Set<RespostaPropostaFunil>();

    public DbSet<TarefaFunil> TarefasFunil => Set<TarefaFunil>();

    public DbSet<ModeloServicoFunil> ModelosServicoFunil => Set<ModeloServicoFunil>();

    public DbSet<ModeloOrcamentoFunil> ModelosOrcamentoFunil => Set<ModeloOrcamentoFunil>();


    /// <summary>
    /// Mantém a lista de presença (SPEC-054): cada convidado que passa a Confirmado ganha uma entrada com id único;
    /// quem deixa de estar Confirmado perde a entrada. Convidado removido leva a entrada junto (cascata do banco).
    /// </summary>
    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        await SincronizarPresencasAsync(cancellationToken);
        await PreencherContaAsync(cancellationToken);
        PreencherMembros();
        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    /// <summary>
    /// SPEC-062: registro novo sem ContaId herda a conta do registro pai (pela FK).
    /// Os registros raiz já chegam com ContaId; as filhas (itens, parcelas, seções...) herdam aqui.
    /// Roda em passadas até não mudar mais, para cobrir neto criado junto com o filho.
    /// </summary>
    /// <summary>
    /// Responsável que é uma pessoa da equipe (papel Assistente com id) ganha a FK para MembrosConta (SPEC-062 Fase 3).
    /// Responsável por papel (Organizer, Equipe, todas as assistentes, Cliente) fica sem membro.
    /// </summary>
    private void PreencherMembros()
    {
        static Guid? Membro(PapelResponsavel? papel, string? referencia) =>
            papel == PapelResponsavel.Assistente && Guid.TryParse(referencia, out var id) ? id : null;

        foreach (var entrada in ChangeTracker.Entries().Where(item => item.State is EntityState.Added or EntityState.Modified))
        {
            switch (entrada.Entity)
            {
                case ResponsavelTarefa item:
                    item.MembroId = Membro(item.Papel, item.ReferenciaId);
                    break;
                case ResponsavelTarefaFunil item:
                    item.MembroId = Membro(item.Papel, item.ReferenciaId);
                    break;
                case ItemChecklistTarefa item:
                    item.ResponsavelMembroId = Membro(item.ResponsavelPapel, item.ResponsavelReferenciaId);
                    break;
            }
        }
    }

    private async Task PreencherContaAsync(CancellationToken ct)
    {
        bool mudou;
        do
        {
            mudou = false;
            var pendentes = ChangeTracker.Entries<ITemConta>()
                .Where(entrada => entrada.State == EntityState.Added && entrada.Entity.ContaId == Guid.Empty)
                .ToList();
            foreach (var entrada in pendentes)
            {
                var conta = await ContaDoPaiAsync(entrada, ct);
                if (conta is not null)
                {
                    entrada.Entity.ContaId = conta.Value;
                    mudou = true;
                }
            }
        }
        while (mudou);

        var semConta = ChangeTracker.Entries<ITemConta>()
            .FirstOrDefault(entrada => entrada.State == EntityState.Added && entrada.Entity.ContaId == Guid.Empty);
        if (semConta is not null)
        {
            throw new InvalidOperationException(
                $"{semConta.Metadata.ClrType.Name} sem ContaId e sem registro pai de onde herdar a conta.");
        }
    }

    private async Task<Guid?> ContaDoPaiAsync(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<ITemConta> entrada, CancellationToken ct)
    {
        foreach (var chave in entrada.Metadata.GetForeignKeys())
        {
            var tipoPai = chave.PrincipalEntityType.ClrType;
            if (tipoPai == typeof(ContaAssessoria) || !typeof(ITemConta).IsAssignableFrom(tipoPai))
            {
                continue;
            }

            var valores = chave.Properties.Select(propriedade => entrada.Property(propriedade.Name).CurrentValue).ToArray();
            if (valores.Any(valor => valor is null))
            {
                continue;
            }

            if (await FindAsync(tipoPai, valores, ct) is ITemConta pai && pai.ContaId != Guid.Empty)
            {
                return pai.ContaId;
            }
        }

        return null;
    }

    private async Task SincronizarPresencasAsync(CancellationToken ct)
    {
        var criar = new List<Convidado>();
        var sair = new List<Guid>();
        foreach (var entrada in ChangeTracker.Entries<Convidado>())
        {
            var convidado = entrada.Entity;
            if (entrada.State == EntityState.Added)
            {
                if (convidado.Situacao == SituacaoConvidado.Confirmado)
                {
                    criar.Add(convidado);
                }
            }
            else if (entrada.State == EntityState.Modified)
            {
                var situacao = entrada.Property(item => item.Situacao);
                if (!situacao.IsModified || Equals(situacao.OriginalValue, situacao.CurrentValue))
                {
                    continue;
                }

                if (convidado.Situacao == SituacaoConvidado.Confirmado)
                {
                    criar.Add(convidado);
                }
                else
                {
                    sair.Add(convidado.Id);
                }
            }
        }

        if (sair.Count > 0)
        {
            var existentes = await PresencasEvento.Where(item => sair.Contains(item.ConvidadoId)).ToListAsync(ct);
            PresencasEvento.RemoveRange(existentes);
        }

        if (criar.Count == 0)
        {
            return;
        }

        var ids = criar.Select(item => item.Id).ToArray();
        var jaTem = (await PresencasEvento.Where(item => ids.Contains(item.ConvidadoId)).Select(item => item.ConvidadoId).ToListAsync(ct)).ToHashSet();
        var agora = DateTimeOffset.UtcNow;
        foreach (var convidado in criar.Where(item => !jaTem.Contains(item.Id)))
        {
            var eventoId = ChangeTracker.Entries<Convite>().FirstOrDefault(item => item.Entity.Id == convidado.ConviteId)?.Entity.EventoId
                ?? await Convites.Where(item => item.Id == convidado.ConviteId).Select(item => item.EventoId).FirstOrDefaultAsync(ct);
            PresencasEvento.Add(new PresencaEvento
            {
                Id = Guid.NewGuid(),
                EventoId = eventoId,
                ConviteId = convidado.ConviteId,
                ConvidadoId = convidado.Id,
                ConfirmadoEm = agora,
            });
        }
    }

    /// <summary>
    /// Filtro global (SPEC-062, RF-110): em pedido autenticado, toda consulta a tabela de negócio
    /// só enxerga a conta do usuário. É a segunda camada; os filtros escritos em cada consulta continuam.
    /// </summary>
    private void FiltrarPorConta(ModelBuilder modelBuilder)
    {
        var metodo = typeof(AppDbContext).GetMethod(nameof(FiltrarEntidade), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var tipos = modelBuilder.Model.GetEntityTypes()
            .Where(tipo => !tipo.IsOwned() && typeof(ITemConta).IsAssignableFrom(tipo.ClrType))
            .Select(tipo => tipo.ClrType)
            .ToList();
        foreach (var tipo in tipos)
        {
            metodo.MakeGenericMethod(tipo).Invoke(this, [modelBuilder]);
        }
    }

    private void FiltrarEntidade<T>(ModelBuilder modelBuilder)
        where T : class, ITemConta =>
        modelBuilder.Entity<T>().HasQueryFilter(item => ContaFiltro == null || item.ContaId == ContaFiltro);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        Mapa.Aplicar(modelBuilder);
        MapaAssinaturas.Aplicar(modelBuilder);
        Mapa.LigarContas(modelBuilder);
        Mapa.LigarReferencias(modelBuilder);
        FiltrarPorConta(modelBuilder);
    }
}
