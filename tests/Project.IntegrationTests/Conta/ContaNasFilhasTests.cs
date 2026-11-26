using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Project.Domain.Modelos;
using Project.Infrastructure.Persistencia;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-062: registro filho herda o ContaId do pai ao ser gravado.</summary>
[Collection(ColecaoApi.Nome)]
public class ContaNasFilhasTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public ContaNasFilhasTests(BancoFixture banco)
    {
        _banco = banco;
    }

    [Fact]
    public async Task Filho_e_neto_criados_junto_com_o_pai_herdam_a_conta()
    {
        var conta = await NovaContaAsync();
        var modelo = new ModeloBriefing
        {
            Id = Guid.NewGuid(),
            ContaId = conta,
            Nome = "Briefing de teste",
            CriadoEm = DateTimeOffset.UtcNow,
            Secoes =
            [
                new SecaoBriefing
                {
                    Id = Guid.NewGuid(),
                    Titulo = "Seção",
                    Perguntas = [new PerguntaBriefing { Id = Guid.NewGuid(), Enunciado = "Pergunta?" }],
                },
            ],
        };

        await using (var banco = Banco())
        {
            banco.ModelosBriefing.Add(modelo);
            await banco.SaveChangesAsync();
        }

        await using var leitura = Banco();
        var secao = await leitura.Set<SecaoBriefing>().SingleAsync(item => item.ModeloId == modelo.Id);
        var pergunta = await leitura.Set<PerguntaBriefing>().SingleAsync(item => item.SecaoId == secao.Id);
        Assert.Equal(conta, secao.ContaId);
        Assert.Equal(conta, pergunta.ContaId);
    }

    [Fact]
    public async Task Filho_adicionado_depois_herda_a_conta_do_pai_ja_gravado()
    {
        var conta = await NovaContaAsync();
        var modeloId = Guid.NewGuid();
        await using (var banco = Banco())
        {
            banco.ModelosBriefing.Add(new ModeloBriefing { Id = modeloId, ContaId = conta, Nome = "Briefing", CriadoEm = DateTimeOffset.UtcNow });
            await banco.SaveChangesAsync();
        }

        await using (var banco = Banco())
        {
            banco.Set<SecaoBriefing>().Add(new SecaoBriefing { Id = Guid.NewGuid(), ModeloId = modeloId, Titulo = "Depois" });
            await banco.SaveChangesAsync();
        }

        await using var leitura = Banco();
        Assert.Equal(conta, (await leitura.Set<SecaoBriefing>().SingleAsync(item => item.ModeloId == modeloId)).ContaId);
    }

    [Fact]
    public async Task Filho_sem_pai_e_sem_conta_e_recusado()
    {
        await using var banco = Banco();
        banco.Set<SecaoBriefing>().Add(new SecaoBriefing { Id = Guid.NewGuid(), ModeloId = Guid.NewGuid(), Titulo = "Órfã" });

        var erro = await Assert.ThrowsAsync<InvalidOperationException>(() => banco.SaveChangesAsync());
        Assert.Contains(nameof(SecaoBriefing), erro.Message, StringComparison.Ordinal);
    }

    private async Task<Guid> NovaContaAsync()
    {
        var email = $"filhas-{Guid.NewGuid():N}@exemplo.com";
        var cliente = _banco.Fabrica.CreateClient();
        (await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true })).EnsureSuccessStatusCode();
        await using var banco = Banco();
        var usuario = await banco.Users.SingleAsync(item => item.Email == email);
        return Guid.Parse(usuario.Id);
    }

    private AppDbContext Banco() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(_banco.Conexao).Options);
}
