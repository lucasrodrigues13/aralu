using Microsoft.EntityFrameworkCore;
using Project.Domain.Assinaturas;
using Project.Infrastructure.Conta;

namespace Project.Infrastructure.Persistencia;

/// <summary>Planos e assinatura (SPEC-062 partes B e D; lote 2.6 do plano).</summary>
public static class MapaAssinaturas
{
    public static void Aplicar(ModelBuilder modelBuilder)
    {
        var plano = modelBuilder.Entity<Plano>();
        plano.ToTable("Planos");
        plano.HasIndex(item => item.Codigo).IsUnique();
        plano.Property(item => item.Codigo).HasMaxLength(40);
        plano.Property(item => item.Nome).HasMaxLength(80);
        plano.Property(item => item.ValorMensal).HasPrecision(12, 2);
        // Sempre exatamente um plano padrão (§10).
        plano.HasIndex(item => item.Padrao).IsUnique().HasFilter("\"Padrao\"");
        plano.HasMany(item => item.Recursos).WithOne().HasForeignKey(item => item.PlanoId).OnDelete(DeleteBehavior.Cascade);
        var lancamento = new DateTimeOffset(2026, 11, 26, 0, 0, 0, TimeSpan.Zero);
        plano.HasData(new Plano
        {
            Id = Plano.ProId,
            Codigo = "pro",
            Nome = "Pro",
            Descricao = "Todos os módulos da plataforma, sem limite de eventos.",
            ValorMensal = 179m,
            Publico = true,
            Padrao = true,
            Ativo = true,
            Ordem = 1,
            CriadoEm = lancamento,
            AtualizadoEm = lancamento,
        });

        var recurso = modelBuilder.Entity<RecursoDoPlano>();
        recurso.ToTable("RecursosPlano").HasKey(item => new { item.PlanoId, item.Recurso });
        recurso.Property(item => item.Recurso).HasConversion<string>().HasMaxLength(40);

        var assinatura = modelBuilder.Entity<Assinatura>();
        assinatura.ToTable("Assinaturas");
        assinatura.HasIndex(item => item.ContaId).IsUnique();
        assinatura.HasIndex(item => item.AsaasSubscriptionId).IsUnique();
        assinatura.Property(item => item.Situacao).HasConversion<string>().HasMaxLength(20);
        assinatura.Property(item => item.FormaPagamento).HasConversion<string>().HasMaxLength(10);
        assinatura.Property(item => item.Valor).HasPrecision(12, 2);
        assinatura.Property(item => item.ValorPersonalizado).HasPrecision(12, 2);
        assinatura.Property(item => item.DescontoPercentual).HasPrecision(5, 2);
        assinatura.Property(item => item.UpgradeValor).HasPrecision(12, 2);
        assinatura.Property(item => item.UpgradeCobrancaId).HasMaxLength(100);
        assinatura.HasOne<Plano>().WithMany().HasForeignKey(item => item.PlanoId).OnDelete(DeleteBehavior.Restrict);

        var cobranca = modelBuilder.Entity<CobrancaAssinatura>();
        cobranca.ToTable("CobrancasAssinatura");
        cobranca.HasIndex(item => item.AsaasPaymentId).IsUnique();
        cobranca.HasIndex(item => new { item.ContaId, item.Vencimento });
        cobranca.Property(item => item.Valor).HasPrecision(12, 2);
        cobranca.Property(item => item.FormaPagamento).HasConversion<string>().HasMaxLength(10);
        cobranca.HasOne<Assinatura>().WithMany().HasForeignKey(item => item.AssinaturaId).OnDelete(DeleteBehavior.Restrict);

        var evento = modelBuilder.Entity<EventoWebhookAsaas>();
        evento.ToTable("EventosWebhookAsaas");
        evento.HasIndex(item => item.AsaasEventId).IsUnique();
        evento.Property(item => item.Payload).HasColumnType("jsonb");

        var documento = modelBuilder.Entity<DocumentoTrial>();
        documento.ToTable("DocumentosTrial");
        documento.HasIndex(item => item.DocumentoHash).IsUnique();

        var aviso = modelBuilder.Entity<AvisoAssinatura>();
        aviso.ToTable("AvisosAssinatura");
        aviso.Property(item => item.Tipo).HasMaxLength(40);
        aviso.HasIndex(item => new { item.ContaId, item.Tipo, item.Referencia }).IsUnique();

        var alteracao = modelBuilder.Entity<AlteracaoAssinatura>();
        alteracao.ToTable("AlteracoesAssinatura");
        alteracao.Property(item => item.ValorAnterior).HasPrecision(12, 2);
        alteracao.Property(item => item.ValorNovo).HasPrecision(12, 2);
        alteracao.HasOne<Assinatura>().WithMany().HasForeignKey(item => item.AssinaturaId).OnDelete(DeleteBehavior.Cascade);
        alteracao.HasOne<Plano>().WithMany().HasForeignKey(item => item.PlanoAnteriorId).OnDelete(DeleteBehavior.Restrict);
        alteracao.HasOne<Plano>().WithMany().HasForeignKey(item => item.PlanoNovoId).OnDelete(DeleteBehavior.Restrict);
        alteracao.HasOne<ApplicationUser>().WithMany().HasForeignKey(item => item.FeitoPorUsuarioId).OnDelete(DeleteBehavior.Restrict);
    }
}
