using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Project.Application.Conta;
using Project.Domain.Equipe;
using Project.Infrastructure.Persistencia;

namespace Project.Infrastructure.Conta;

/// <summary>Resultado do cadastro público: sucesso, e-mail duplicado, senha fraca ou falha interna.</summary>
public enum ResultadoCadastro
{
    Criado,
    Duplicado,
    SenhaInvalida,
    Falhou,
}

/// <summary>
/// Cria, numa transação só, o login Organizer e a conta (SPEC-062, RF-110).
/// A conta usa o mesmo Id do usuário: o ContaId gravado nos dados continua igual ao id do dono.
/// </summary>
public sealed class CadastroDeConta(AppDbContext banco, UserManager<ApplicationUser> usuarios)
{
    public async Task<ResultadoCadastro> CriarDonoAsync(ApplicationUser usuario, string senha, CancellationToken ct)
    {
        await using var transacao = await banco.Database.BeginTransactionAsync(ct);
        var criado = await usuarios.CreateAsync(usuario, senha);
        if (!criado.Succeeded)
        {
            return criado.Errors.Any(erro => erro.Code is "DuplicateUserName" or "DuplicateEmail")
                ? ResultadoCadastro.Duplicado
                : ResultadoCadastro.SenhaInvalida;
        }

        var papel = await usuarios.AddToRoleAsync(usuario, Papeis.Organizer);
        if (!papel.Succeeded)
        {
            return ResultadoCadastro.Falhou;
        }

        banco.Contas.Add(new ContaAssessoria
        {
            Id = Guid.Parse(usuario.Id),
            DonoUsuarioId = usuario.Id,
            CriadaEm = DateTimeOffset.UtcNow,
        });
        await banco.SaveChangesAsync(ct);
        await transacao.CommitAsync(ct);
        return ResultadoCadastro.Criado;
    }
}
