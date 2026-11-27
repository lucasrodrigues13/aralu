using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using Project.Application.Comum;

namespace Project.Infrastructure.Conta;

/// <summary>Motivo do encerramento das sessões de um usuário (A07-001).</summary>
public enum MotivoEncerramento
{
    Sair,
    SenhaRedefinida,
    SenhaTrocada,
}

/// <summary>
/// Revogação de sessão (A07-001): o JWT leva o claim <see cref="ContaClaims.Stamp"/>, um hash curto do security
/// stamp do Identity. Trocar o stamp invalida todos os tokens já emitidos do usuário, em todos os dispositivos.
/// O stamp atual fica 30 s em cache por usuário; <see cref="EncerrarAsync"/> troca o stamp e limpa o cache na hora.
/// </summary>
public sealed class SessaoServico(UserManager<ApplicationUser> usuarios, IMemoryCache cache, LogSeguranca log)
{
    public const string ErroSessaoEncerrada = "sessao_encerrada";
    private static readonly TimeSpan Validade = TimeSpan.FromSeconds(30);

    /// <summary>Hash SHA-256 do stamp, truncado (16 hex): o valor bruto nunca vai no token.</summary>
    public static string HashDoStamp(string stamp) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(stamp)))[..16].ToLowerInvariant();

    /// <summary>Hash do stamp atual do usuário, ou nulo se o usuário não existe mais.</summary>
    public async Task<string?> StampAtualAsync(string usuarioId)
    {
        if (cache.TryGetValue(Chave(usuarioId), out string? guardado))
        {
            return guardado;
        }

        var usuario = await usuarios.FindByIdAsync(usuarioId);
        var hash = usuario is null ? null : HashDoStamp(await usuarios.GetSecurityStampAsync(usuario));
        cache.Set(Chave(usuarioId), hash, Validade);
        return hash;
    }

    /// <summary>Encerra todas as sessões do usuário: troca o stamp e invalida o cache.</summary>
    public async Task EncerrarAsync(ApplicationUser usuario, MotivoEncerramento motivo)
    {
        await usuarios.UpdateSecurityStampAsync(usuario);
        cache.Remove(Chave(usuario.Id));
        RegistrarEncerramento(usuario.Id, motivo);
    }

    /// <summary>
    /// Eventos de segurança do encerramento (A09-001): <c>senha_redefinida</c> ou <c>senha_trocada</c> quando for o
    /// caso, e sempre <c>sessao_encerrada</c>. Só id e motivo, nunca texto digitado (CWE-117).
    /// </summary>
    private void RegistrarEncerramento(string usuarioId, MotivoEncerramento motivo)
    {
        if (motivo == MotivoEncerramento.SenhaRedefinida)
        {
            log.SenhaRedefinida(usuarioId);
        }
        else if (motivo == MotivoEncerramento.SenhaTrocada)
        {
            log.SenhaTrocada(usuarioId);
        }

        log.SessaoEncerrada(usuarioId, NomeDoMotivo(motivo));
    }

    public static string NomeDoMotivo(MotivoEncerramento motivo) => motivo switch
    {
        MotivoEncerramento.SenhaRedefinida => "senha_redefinida",
        MotivoEncerramento.SenhaTrocada => "senha_trocada",
        _ => "sair",
    };

    private static string Chave(string usuarioId) => $"aralu_stamp:{usuarioId}";
}
