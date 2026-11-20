namespace Project.Domain.Funil;

/// <summary>Origem do contato em lista fechada (SPEC-031 §6.4, decidida em 20/11/2026).</summary>
public static class OrigensFunil
{
    public const string Outro = "Outro";
    public const string FormularioSite = "Formulário do site";
    public const string PaginaPublica = "Página pública";

    public static readonly string[] Lista =
    [
        "Instagram",
        "Indicação",
        "Google",
        PaginaPublica,
        FormularioSite,
        "WhatsApp",
        "Feira ou evento",
        "Fornecedor parceiro",
        "Cliente antigo",
        Outro,
    ];

    /// <summary>Item da lista com a grafia oficial, ou nulo se o texto não for um item.</summary>
    public static string? Item(string? texto) =>
        texto is null ? null : Lista.FirstOrDefault(item => string.Equals(item, texto.Trim(), StringComparison.OrdinalIgnoreCase));

    /// <summary>Texto para mostrar: o item, ou o texto livre quando é "Outro".</summary>
    public static string? Texto(string? fonte, string? outro) =>
        fonte == Outro && !string.IsNullOrWhiteSpace(outro) ? outro : fonte;
}

/// <summary>Comparação de contatos para o aviso de contato repetido (SPEC-031 §6.5).</summary>
public static class ContatoNormalizado
{
    /// <summary>Só os dígitos, sem o 55 do Brasil na frente. Nulo se curto demais para comparar.</summary>
    public static string? Telefone(string? telefone)
    {
        if (string.IsNullOrWhiteSpace(telefone))
        {
            return null;
        }

        var digitos = new string(telefone.Where(char.IsDigit).ToArray());
        if (digitos.Length >= 12 && digitos.StartsWith("55", StringComparison.Ordinal))
        {
            digitos = digitos[2..];
        }

        return digitos.Length >= 8 ? digitos : null;
    }

    public static string? Email(string? email) =>
        string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
}
