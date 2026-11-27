using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

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
public sealed class SessaoServico(UserManager<ApplicationUser> usuarios, IMemoryCache cache, ILogger<SessaoServico> log)
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
    /// Ponto único do evento de segurança <c>sessao_encerrada</c>. O Lote 9 (log de segurança) troca este corpo
    /// pelo registro estruturado; só campos estruturados, nunca texto digitado pelo usuário (CWE-117).
    /// </summary>
    private void RegistrarEncerramento(string usuarioId, MotivoEncerramento motivo) =>
        log.LogInformation("sessao_encerrada {UsuarioId} {Motivo}", usuarioId, motivo);

    private static string Chave(string usuarioId) => $"aralu_stamp:{usuarioId}";
}
