using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Contratos;

namespace Project.Tests.Negocio;

/// <summary>Logo e imagem de fundo do modelo de contrato (SPEC-056).</summary>
public class LogoEFundoDoModeloTests
{
    private sealed class DadosEmMemoria : IDadosContrato
    {
        public List<ContratoConta> Itens { get; } = [];

        public Task<IReadOnlyList<ContratoConta>> ListarAsync(string contaId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<ContratoConta>>(Itens.Where(item => item.ContaId == contaId).ToArray());

        public Task<ContratoConta?> ObterAsync(string contaId, Guid id, CancellationToken ct) =>
            Task.FromResult(Itens.FirstOrDefault(item => item.Id == id && item.ContaId == contaId));

        public Task InserirAsync(ContratoConta contrato, CancellationToken ct)
        {
            Itens.Add(contrato);
            return Task.CompletedTask;
        }

        public Task RemoverAsync(ContratoConta contrato, CancellationToken ct)
        {
            Itens.Remove(contrato);
            return Task.CompletedTask;
        }

        public Task SalvarAsync(CancellationToken ct) => Task.CompletedTask;
    }

    [Fact]
    public async Task Liga_troca_e_remove_logo_e_fundo_sem_mexer_um_no_outro()
    {
        var dados = new DadosEmMemoria();
        var servico = new ContratoServico(dados);
        var criado = (await servico.SalvarAsync("conta", null, new SalvarContrato("Modelo", "Texto"), default)).Valor!;
        var logo = Guid.NewGuid();
        var fundo = Guid.NewGuid();

        Assert.Null((await servico.DefinirImagemAsync("conta", criado.Id, true, logo, default)).Valor);
        Assert.Null((await servico.DefinirImagemAsync("conta", criado.Id, false, fundo, default)).Valor);
        var lido = (await servico.ObterAsync("conta", criado.Id, default)).Valor!;
        Assert.Equal(logo, lido.LogoArquivoId);
        Assert.Equal(fundo, lido.FundoArquivoId);

        var nova = Guid.NewGuid();
        Assert.Equal(logo, (await servico.DefinirImagemAsync("conta", criado.Id, true, nova, default)).Valor);
        Assert.Equal(nova, (await servico.DefinirImagemAsync("conta", criado.Id, true, null, default)).Valor);
        lido = (await servico.ObterAsync("conta", criado.Id, default)).Valor!;
        Assert.Null(lido.LogoArquivoId);
        Assert.Equal(fundo, lido.FundoArquivoId);
    }

    [Fact]
    public async Task Salvar_nome_e_texto_nao_apaga_logo_nem_fundo()
    {
        var dados = new DadosEmMemoria();
        var servico = new ContratoServico(dados);
        var criado = (await servico.SalvarAsync("conta", null, new SalvarContrato("Modelo", "Texto"), default)).Valor!;
        var logo = Guid.NewGuid();
        await servico.DefinirImagemAsync("conta", criado.Id, true, logo, default);

        var salvo = (await servico.SalvarAsync("conta", criado.Id, new SalvarContrato("Outro nome", "Outro texto"), default)).Valor!;

        Assert.Equal(logo, salvo.LogoArquivoId);
    }

    [Fact]
    public async Task Modelo_de_outra_conta_e_indisponivel()
    {
        var dados = new DadosEmMemoria();
        var servico = new ContratoServico(dados);
        var criado = (await servico.SalvarAsync("conta", null, new SalvarContrato("Modelo", "Texto"), default)).Valor!;

        var resultado = await servico.DefinirImagemAsync("outra", criado.Id, true, Guid.NewGuid(), default);

        Assert.False(resultado.Ok);
        Assert.Equal(Codigos.Indisponivel, resultado.Falha!.Codigo);
    }
}
