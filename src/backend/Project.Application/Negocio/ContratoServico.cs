using Project.Application.Comum;
using Project.Domain.Contratos;

namespace Project.Application.Negocio;

public sealed record SalvarContrato(string? Nome, string? Texto);

public sealed record ContratoLeitura(Guid Id, string Nome, string Texto, DateTimeOffset AtualizadoEm, Guid? LogoArquivoId = null, Guid? FundoArquivoId = null);

public sealed record ContratoResumo(Guid Id, string Nome, DateTimeOffset AtualizadoEm);

public sealed record CamposContratoLeitura(IReadOnlyList<CampoMesclagem> Campos);

/// <summary>Envio de e-mail simples (texto puro) para mensagens que não são da conta.</summary>
public interface IEnvioEmail
{
    Task EnviarAsync(string email, string assunto, string texto, CancellationToken ct);
}

public interface IDadosContrato
{
    Task<IReadOnlyList<ContratoConta>> ListarAsync(string contaId, CancellationToken ct);

    Task<ContratoConta?> ObterAsync(string contaId, Guid id, CancellationToken ct);

    Task InserirAsync(ContratoConta contrato, CancellationToken ct);

    Task RemoverAsync(ContratoConta contrato, CancellationToken ct);

    Task SalvarAsync(CancellationToken ct);
}

/// <summary>Cadastro de contratos da conta, sem vínculo com modelo de evento nem com evento (SPEC-030 v3).</summary>
public sealed class ContratoServico(IDadosContrato dados)
{
    public CamposContratoLeitura Campos() => new(Mesclagem.Campos);

    public async Task<IReadOnlyList<ContratoResumo>> ListarAsync(string contaId, CancellationToken ct) =>
        (await dados.ListarAsync(contaId, ct))
            .OrderBy(item => item.Nome, StringComparer.CurrentCultureIgnoreCase)
            .Select(item => new ContratoResumo(item.Id, item.Nome, item.AtualizadoEm))
            .ToArray();

    public async Task<Resultado<ContratoLeitura>> ObterAsync(string contaId, Guid id, CancellationToken ct)
    {
        var contrato = await dados.ObterAsync(contaId, id, ct);
        return contrato is null
            ? Resultado<ContratoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.")
            : Resultado<ContratoLeitura>.Sucesso(Ler(contrato));
    }

    public async Task<Resultado<ContratoLeitura>> SalvarAsync(string contaId, Guid? id, SalvarContrato pedido, CancellationToken ct)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null || nome.Length > 120)
        {
            return Resultado<ContratoLeitura>.Erro(Codigos.Validacao, "Informe o nome do contrato (até 120 caracteres).");
        }

        var texto = pedido.Texto?.Trim();
        if (string.IsNullOrEmpty(texto))
        {
            return Resultado<ContratoLeitura>.Erro(Codigos.Validacao, "Informe o texto do contrato.");
        }

        var agora = DateTimeOffset.UtcNow;
        ContratoConta? contrato;
        if (id is Guid existente)
        {
            contrato = await dados.ObterAsync(contaId, existente, ct);
            if (contrato is null)
            {
                return Resultado<ContratoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
            }
        }
        else
        {
            contrato = new ContratoConta { Id = Guid.NewGuid(), ContaId = contaId, CriadoEm = agora };
            await dados.InserirAsync(contrato, ct);
        }

        contrato.Nome = nome;
        contrato.Texto = texto;
        contrato.AtualizadoEm = agora;
        await dados.SalvarAsync(ct);
        return Resultado<ContratoLeitura>.Sucesso(Ler(contrato));
    }

    public async Task<Resultado<bool>> ExcluirAsync(string contaId, Guid id, CancellationToken ct)
    {
        var contrato = await dados.ObterAsync(contaId, id, ct);
        if (contrato is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverAsync(contrato, ct);
        await dados.SalvarAsync(ct);
        return Resultado<bool>.Sucesso(true);
    }

    /// <summary>Liga (ou, com arquivo nulo, desliga) a logo ou o fundo (SPEC-056). Devolve o arquivo ligado antes.</summary>
    public async Task<Resultado<Guid?>> DefinirImagemAsync(string contaId, Guid id, bool logo, Guid? arquivoId, CancellationToken ct)
    {
        var contrato = await dados.ObterAsync(contaId, id, ct);
        if (contrato is null)
        {
            return Resultado<Guid?>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var anterior = logo ? contrato.LogoArquivoId : contrato.FundoArquivoId;
        if (logo)
        {
            contrato.LogoArquivoId = arquivoId;
        }
        else
        {
            contrato.FundoArquivoId = arquivoId;
        }

        contrato.AtualizadoEm = DateTimeOffset.UtcNow;
        await dados.SalvarAsync(ct);
        return Resultado<Guid?>.Sucesso(anterior);
    }

    private static ContratoLeitura Ler(ContratoConta contrato) =>
        new(contrato.Id, contrato.Nome, contrato.Texto, contrato.AtualizadoEm, contrato.LogoArquivoId, contrato.FundoArquivoId);
}
