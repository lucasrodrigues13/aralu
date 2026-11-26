using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Project.Infrastructure.Persistencia;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

/// <summary>SPEC-062, RF-110: o cadastro público cria a conta junto com o login.</summary>
[Collection(ColecaoApi.Nome)]
public class CadastroCriaContaTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public CadastroCriaContaTests(BancoFixture banco)
    {
        _banco = banco;
    }

    [Fact]
    public async Task Cadastro_cria_a_conta_com_o_mesmo_id_do_usuario_dono()
    {
        var email = $"conta-{Guid.NewGuid():N}@exemplo.com";
        var cliente = _banco.Fabrica.CreateClient();

        var resposta = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true });

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        await using var banco = Banco();
        var usuario = await banco.Users.SingleAsync(item => item.Email == email);
        var conta = await banco.Contas.SingleAsync(item => item.DonoUsuarioId == usuario.Id);
        Assert.Equal(Guid.Parse(usuario.Id), conta.Id);

        // T1: o visitante é Dono e a conta nasce com Organizadores e Assistentes.
        var membro = await banco.Membros.IgnoreQueryFilters().SingleAsync(item => item.UsuarioId == usuario.Id);
        Assert.Equal(Project.Domain.Equipe.TipoMembro.Dono, membro.Tipo);
        Assert.Equal(conta.Id, membro.ContaId);
        Assert.Null(membro.GrupoId);
        var grupos = await banco.Grupos.IgnoreQueryFilters().Include(item => item.Permissoes)
            .Where(item => item.ContaId == conta.Id).OrderBy(item => item.Nome).ToListAsync();
        Assert.Equal(["Assistentes", "Organizadores"], grupos.Select(item => item.Nome));
        Assert.False(grupos[0].VeTodosEventos);
        Assert.False(grupos[0].Permite(Project.Domain.Equipe.Modulo.Financeiro, Project.Domain.Equipe.AcaoModulo.Ver));
        Assert.True(grupos[1].Permite(Project.Domain.Equipe.Modulo.Financeiro, Project.Domain.Equipe.AcaoModulo.Excluir));
    }

    [Fact]
    public async Task Cadastro_duplicado_nao_cria_segunda_conta()
    {
        var email = $"conta-{Guid.NewGuid():N}@exemplo.com";
        var cliente = _banco.Fabrica.CreateClient();
        await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true });

        var segunda = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true });

        Assert.Equal(HttpStatusCode.Conflict, segunda.StatusCode);
        await using var banco = Banco();
        var usuario = await banco.Users.SingleAsync(item => item.Email == email);
        Assert.Equal(1, await banco.Contas.CountAsync(item => item.DonoUsuarioId == usuario.Id));
    }

    private AppDbContext Banco() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(_banco.Conexao).Options);
}
