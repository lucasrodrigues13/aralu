using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Identity;

namespace Project.Infrastructure.Conta;

/// <summary>
/// Recusa senha comum (A07-002). A lista fica em senhas-comuns.txt, embutida no assembly; a origem está no
/// cabeçalho do arquivo. A comparação é em minúsculas e sem acento. Também recusa: a palavra comum ou um termo
/// do domínio seguido ou precedido só de números e símbolos (senha123!, aralu2026!), senha só de números e
/// símbolos, sequência numérica com até 3 letras (12345678ab) e senha igual ao e-mail ou à parte antes do @.
/// </summary>
public sealed class SenhaComumValidador : IPasswordValidator<ApplicationUser>
{
    public const string CodigoErro = "SenhaComum";

    private static readonly string[] TermosDoDominio =
        ["aralu", "casamento", "casamentos", "cerimonial", "cerimonialista", "assessoria", "assessora",
         "organizadora", "organizador", "noiva", "noivo", "noivos", "wedding"];

    private static readonly Lazy<HashSet<string>> Lista = new(Carregar);

    public Task<IdentityResult> ValidateAsync(UserManager<ApplicationUser> manager, ApplicationUser user, string? password)
        => Task.FromResult(EhComum(password, user.Email ?? user.UserName)
            ? IdentityResult.Failed(new IdentityError { Code = CodigoErro, Description = "Essa senha é muito comum." })
            : IdentityResult.Success);

    public static bool EhComum(string? senha, string? email)
    {
        if (string.IsNullOrEmpty(senha))
        {
            return false;
        }

        var normalizada = Normalizar(senha);
        if (Lista.Value.Contains(normalizada))
        {
            return true;
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            var emailNormalizado = Normalizar(email.Trim());
            var arroba = emailNormalizado.IndexOf('@');
            var local = arroba > 0 ? emailNormalizado[..arroba] : emailNormalizado;
            if (normalizada == emailNormalizado || normalizada == local)
            {
                return true;
            }
        }

        var letras = new string(normalizada.Where(char.IsLetter).ToArray());
        if (letras.Length == 0)
        {
            return true;
        }

        // Palavra comum ou termo do domínio só com números e símbolos em volta.
        var miolo = normalizada.Trim(SoNumeroOuSimbolo(normalizada));
        if (miolo == letras && (Lista.Value.Contains(letras) || TermosDoDominio.Contains(letras)))
        {
            return true;
        }

        var digitos = new string(normalizada.Where(char.IsDigit).ToArray());
        return letras.Length <= 3 && digitos.Length >= 4 && (EhSequencia(digitos) || digitos.Distinct().Count() == 1);
    }

    private static char[] SoNumeroOuSimbolo(string texto) => texto.Where(c => !char.IsLetter(c)).Distinct().ToArray();

    private static bool EhSequencia(string digitos)
    {
        const string crescente = "01234567890";
        const string decrescente = "09876543210";
        return crescente.Contains(digitos, StringComparison.Ordinal) || decrescente.Contains(digitos, StringComparison.Ordinal);
    }

    private static string Normalizar(string texto)
    {
        var decomposto = texto.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var saida = new StringBuilder(decomposto.Length);
        foreach (var c in decomposto)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                saida.Append(c);
            }
        }

        return saida.ToString().Normalize(NormalizationForm.FormC);
    }

    private static HashSet<string> Carregar()
    {
        using var fluxo = typeof(SenhaComumValidador).Assembly.GetManifestResourceStream("Project.Infrastructure.Conta.senhas-comuns.txt")
            ?? throw new InvalidOperationException("A lista de senhas comuns não foi embutida.");
        using var leitor = new StreamReader(fluxo, Encoding.UTF8);
        var lista = new HashSet<string>(StringComparer.Ordinal);
        while (leitor.ReadLine() is { } linha)
        {
            var item = linha.Trim();
            if (item.Length > 0 && !item.StartsWith('#'))
            {
                lista.Add(Normalizar(item));
            }
        }

        return lista;
    }
}

/// <summary>Motivo devolvido ao front quando a senha nova é recusada: <c>curta</c> ou <c>comum</c>.</summary>
public static class MotivoSenha
{
    public const string Curta = "curta";
    public const string Comum = "comum";

    /// <summary>Outra regra do Identity (hoje só a minúscula obrigatória).</summary>
    public const string Regras = "regras";

    public static string De(IEnumerable<IdentityError> erros)
    {
        var codigos = erros.Select(erro => erro.Code).ToList();
        return codigos.Contains(nameof(IdentityErrorDescriber.PasswordTooShort)) ? Curta
            : codigos.Contains(SenhaComumValidador.CodigoErro) ? Comum
            : Regras;
    }

    public static string Mensagem(string motivo) => motivo switch
    {
        Curta => "Use pelo menos 10 caracteres.",
        Comum => "Essa senha é muito comum.",
        _ => "A senha não atende às regras.",
    };
}
