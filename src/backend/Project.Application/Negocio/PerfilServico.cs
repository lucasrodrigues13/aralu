using Project.Application.Comum;
using Project.Domain.Perfil;

namespace Project.Application.Negocio;

public sealed record PerfilLeitura(
    string Email,
    string? NomeEmpresa,
    string? Responsavel,
    string? Documento,
    string? Celular,
    DateOnly? Nascimento,
    string? Endereco,
    Guid? FotoId,
    string? ChavePix);

public sealed record SalvarPerfil(
    string? NomeEmpresa,
    string? Responsavel,
    string? Documento,
    string? Celular,
    DateOnly? Nascimento,
    string? Endereco,
    string? ChavePix = null);

public sealed class PerfilServico(IDados dados)
{
    public async Task<PerfilLeitura> ObterAsync(string contaId, string email, CancellationToken ct)
    {
        var perfil = await dados.ObterPerfilAsync(contaId, ct);
        return Ler(email, perfil);
    }

    public async Task<Resultado<PerfilLeitura>> SalvarAsync(
        string contaId,
        string email,
        SalvarPerfil pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        if (pedido.Nascimento is DateOnly nascimento && nascimento > hoje)
        {
            return Resultado<PerfilLeitura>.Erro(Codigos.Validacao, "A data de nascimento não pode ser futura.");
        }

        var perfil = await ObterOuCriarAsync(contaId, ct);
        perfil.NomeEmpresa = TextoLimpo(pedido.NomeEmpresa);
        perfil.Responsavel = TextoLimpo(pedido.Responsavel);
        perfil.Documento = TextoLimpo(pedido.Documento);
        perfil.Celular = TextoLimpo(pedido.Celular);
        perfil.Nascimento = pedido.Nascimento;
        perfil.Endereco = TextoLimpo(pedido.Endereco);
        perfil.ChavePix = TextoLimpo(pedido.ChavePix);
        await dados.SalvarPerfilAsync(perfil, ct);
        return Resultado<PerfilLeitura>.Sucesso(Ler(email, perfil));
    }

    public async Task<Resultado<Guid?>> GuardarFotoAsync(string contaId, Guid fotoId, CancellationToken ct)
    {
        var perfil = await ObterOuCriarAsync(contaId, ct);
        var anterior = perfil.FotoId;
        perfil.FotoId = fotoId;
        await dados.SalvarPerfilAsync(perfil, ct);
        return Resultado<Guid?>.Sucesso(anterior);
    }

    public async Task<Resultado<Guid?>> RemoverFotoAsync(string contaId, CancellationToken ct)
    {
        var perfil = await dados.ObterPerfilAsync(contaId, ct);
        if (perfil?.FotoId is not Guid anterior)
        {
            return Resultado<Guid?>.Sucesso(null);
        }

        perfil.FotoId = null;
        await dados.SalvarPerfilAsync(perfil, ct);
        return Resultado<Guid?>.Sucesso(anterior);
    }

    private async Task<PerfilAssessoria> ObterOuCriarAsync(string contaId, CancellationToken ct)
    {
        return await dados.ObterPerfilAsync(contaId, ct) ?? new PerfilAssessoria
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
        };
    }

    private static PerfilLeitura Ler(string email, PerfilAssessoria? perfil) => new(
        email,
        perfil?.NomeEmpresa,
        perfil?.Responsavel,
        perfil?.Documento,
        perfil?.Celular,
        perfil?.Nascimento,
        perfil?.Endereco,
        perfil?.FotoId,
        perfil?.ChavePix);

    private static string? TextoLimpo(string? valor) => Domain.Comum.Texto.Limpo(valor);
}
