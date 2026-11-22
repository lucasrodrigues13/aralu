using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
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

public sealed class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<PerfilAssessoria> Perfis => Set<PerfilAssessoria>();

    public DbSet<ModeloEvento> Modelos => Set<ModeloEvento>();

    public DbSet<Assistente> Assistentes => Set<Assistente>();

    public DbSet<EventoAssistente> EventosAssistentes => Set<EventoAssistente>();

    public DbSet<Evento> Eventos => Set<Evento>();

    public DbSet<TagConta> Tags => Set<TagConta>();

    public DbSet<Tarefa> Tarefas => Set<Tarefa>();

    public DbSet<Cliente> Clientes => Set<Cliente>();

    public DbSet<VinculoCliente> Vinculos => Set<VinculoCliente>();

    public DbSet<LinkCasal> LinksCasal => Set<LinkCasal>();

    public DbSet<LinkPortaria> LinksPortaria => Set<LinkPortaria>();

    public DbSet<Convite> Convites => Set<Convite>();

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
        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        Mapa.Aplicar(modelBuilder);
    }
}
