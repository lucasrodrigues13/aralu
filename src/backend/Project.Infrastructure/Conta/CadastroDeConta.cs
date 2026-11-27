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
    SenhaCurta,
    SenhaComum,
    Falhou,
}

/// <summary>
/// Cria, numa transação só, o login, a conta, o Dono, os grupos padrão e o trial de 14 dias (SPEC-062, RF-110, T1).
/// A conta usa o mesmo Id do usuário: o ContaId gravado nos dados continua igual ao id do dono.
/// </summary>
public sealed class CadastroDeConta(AppDbContext banco, UserManager<ApplicationUser> usuarios)
{
    /// <summary>Versão dos termos de uso e da política de privacidade em vigor. Trocar ao publicar o texto final.</summary>
    public const string VersaoTermos = "2026-11-provisoria";

    public async Task<ResultadoCadastro> CriarDonoAsync(ApplicationUser usuario, string senha, CancellationToken ct)
    {
        await using var transacao = await banco.Database.BeginTransactionAsync(ct);
        var criado = await usuarios.CreateAsync(usuario, senha);
        if (!criado.Succeeded)
        {
            return criado.Errors.Any(erro => erro.Code is "DuplicateUserName" or "DuplicateEmail")
                ? ResultadoCadastro.Duplicado
                : MotivoSenha.De(criado.Errors) switch
                {
                    MotivoSenha.Curta => ResultadoCadastro.SenhaCurta,
                    MotivoSenha.Comum => ResultadoCadastro.SenhaComum,
                    _ => ResultadoCadastro.SenhaInvalida,
                };
        }

        var papel = await usuarios.AddToRoleAsync(usuario, Papeis.Organizer);
        if (!papel.Succeeded)
        {
            return ResultadoCadastro.Falhou;
        }

        var contaId = Guid.Parse(usuario.Id);
        var agora = DateTimeOffset.UtcNow;
        banco.Contas.Add(new ContaAssessoria { Id = contaId, DonoUsuarioId = usuario.Id, CriadaEm = agora, AceiteTermosEm = agora, VersaoTermos = VersaoTermos });
        banco.Grupos.AddRange(GruposPadrao.Criar(contaId));
        // Trial de 14 dias no plano padrão (R1, RF-115).
        var plano = await banco.Planos.AsNoTracking().SingleAsync(item => item.Padrao, ct);
        banco.Assinaturas.Add(Project.Domain.Assinaturas.Assinatura.NovoTrial(contaId, plano, agora));
        banco.Membros.Add(new MembroConta
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            UsuarioId = usuario.Id,
            Tipo = TipoMembro.Dono,
            Nome = usuario.Email ?? "",
            Email = usuario.Email ?? "",
            Situacao = SituacaoMembro.Ativa,
            ConvidadaEm = agora,
            PrimeiroAcessoEm = agora,
        });
        await banco.SaveChangesAsync(ct);
        await transacao.CommitAsync(ct);
        return ResultadoCadastro.Criado;
    }
}
