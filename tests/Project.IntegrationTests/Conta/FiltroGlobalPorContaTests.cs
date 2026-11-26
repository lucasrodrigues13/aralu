using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Project.Application.Conta;
using Project.Domain.Modelos;
using Project.Infrastructure.Persistencia;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-062, lote 2.4: com uma conta ativa, consulta sem filtro escrito só enxerga essa conta.</summary>
[Collection(ColecaoApi.Nome)]
public class FiltroGlobalPorContaTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public FiltroGlobalPorContaTests(BancoFixture banco)
    {
        _banco = banco;
    }

    [Fact]
    public async Task Consulta_sem_where_so_ve_a_conta_ativa_inclusive_nas_filhas()
    {
        var contaA = await NovaContaAsync();
        var contaB = await NovaContaAsync();
        var modeloA = await NovoModeloAsync(contaA);
        var modeloB = await NovoModeloAsync(contaB);

        await using var comA = Banco(contaA);
        var modelos = await comA.ModelosBriefing.Where(item => item.Id == modeloA || item.Id == modeloB).Select(item => item.Id).ToListAsync();
        var secoes = await comA.Set<SecaoBriefing>().Where(item => item.ModeloId == modeloA || item.ModeloId == modeloB).Select(item => item.ModeloId).ToListAsync();

        Assert.Equal([modeloA], modelos);
        Assert.Equal([modeloA], secoes);
    }

    [Fact]
    public async Task Sem_conta_ativa_o_filtro_fica_desligado()
    {
        var contaA = await NovaContaAsync();
        var contaB = await NovaContaAsync();
        var modeloA = await NovoModeloAsync(contaA);
        var modeloB = await NovoModeloAsync(contaB);

        await using var semConta = Banco(null);
        var total = await semConta.ModelosBriefing.CountAsync(item => item.Id == modeloA || item.Id == modeloB);

        Assert.Equal(2, total);
    }

    private async Task<Guid> NovoModeloAsync(Guid conta)
    {
        var id = Guid.NewGuid();
        await using var banco = Banco(null);
        banco.ModelosBriefing.Add(new ModeloBriefing
        {
            Id = id,
            ContaId = conta,
            Nome = "Briefing",
            CriadoEm = DateTimeOffset.UtcNow,
            Secoes = [new SecaoBriefing { Id = Guid.NewGuid(), Titulo = "Seção" }],
        });
        await banco.SaveChangesAsync();
        return id;
    }

    private async Task<Guid> NovaContaAsync()
    {
        var email = $"filtro-{Guid.NewGuid():N}@exemplo.com";
        var cliente = _banco.Fabrica.CreateClient();
        (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).EnsureSuccessStatusCode();
        await using var banco = Banco(null);
        var usuario = await banco.Users.SingleAsync(item => item.Email == email);
        return Guid.Parse(usuario.Id);
    }

    private AppDbContext Banco(Guid? conta) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(_banco.Conexao).Options, new ContaFixa(conta));

    private sealed class ContaFixa(Guid? conta) : IContaAtual
    {
        public Guid? Id => conta;
    }
}
