using Project.Application.Cep;
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
    string? Pais,
    string? Cep,
    string? Endereco,
    string? Numero,
    string? Complemento,
    string? Bairro,
    string? Cidade,
    string? Estado,
    Guid? FotoId,
    string? ChavePix);

public sealed record SalvarPerfil(
    string? NomeEmpresa,
    string? Responsavel,
    string? Documento,
    string? Celular,
    DateOnly? Nascimento,
    string? Pais,
    string? Cep,
    string? Endereco,
    string? Numero,
    string? Complemento,
    string? Bairro,
    string? Cidade,
    string? Estado,
    string? ChavePix = null);

public sealed class PerfilServico(IDados dados, IConsultaCep consultaCep)
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

        var documento = Documentos.CpfOuCnpj(pedido.Documento);
        if (documento == "")
        {
            return Resultado<PerfilLeitura>.Erro(Codigos.Validacao, "Informe um CPF ou CNPJ válido.");
        }

        var cep = Mascaras.Cep(pedido.Cep);
        if (cep == "")
        {
            return Resultado<PerfilLeitura>.Erro(Codigos.Validacao, "O CEP deve ter 8 dígitos.");
        }

        var perfil = await ObterOuCriarAsync(contaId, ct);
        perfil.NomeEmpresa = TextoLimpo(pedido.NomeEmpresa);
        perfil.Responsavel = TextoLimpo(pedido.Responsavel);
        perfil.Documento = documento;
        perfil.Celular = TextoLimpo(pedido.Celular);
        perfil.Nascimento = pedido.Nascimento;
        perfil.Pais = TextoLimpo(pedido.Pais);
        perfil.Cep = cep;
        perfil.Endereco = TextoLimpo(pedido.Endereco);
        perfil.Numero = TextoLimpo(pedido.Numero);
        perfil.Complemento = TextoLimpo(pedido.Complemento);
        perfil.Bairro = TextoLimpo(pedido.Bairro);
        perfil.Cidade = TextoLimpo(pedido.Cidade);
        perfil.Estado = TextoLimpo(pedido.Estado);
        perfil.ChavePix = TextoLimpo(pedido.ChavePix);
        if (cep is not null && await consultaCep.ConsultarAsync(Mascaras.SoDigitos(cep)!, ct) is { } encontrado)
        {
            perfil.Pais = encontrado.Pais;
            perfil.Endereco = encontrado.Endereco;
            perfil.Estado = encontrado.Estado;
            perfil.Cidade = encontrado.Cidade;
            perfil.Bairro = encontrado.Bairro;
        }

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
        perfil?.Pais,
        perfil?.Cep,
        perfil?.Endereco,
        perfil?.Numero,
        perfil?.Complemento,
        perfil?.Bairro,
        perfil?.Cidade,
        perfil?.Estado,
        perfil?.FotoId,
        perfil?.ChavePix);

    private static string? TextoLimpo(string? valor) => Domain.Comum.Texto.Limpo(valor);
}
