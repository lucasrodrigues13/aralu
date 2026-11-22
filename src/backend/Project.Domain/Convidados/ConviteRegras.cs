namespace Project.Domain.Convidados;

public static class ConviteRegras
{
    public static bool TemTelefone(string? celular) => !Comum.Texto.Vazio(celular);

    public static bool PodeSerPrincipal(bool doMesmoConvite, string? celular) =>
        doMesmoConvite && TemTelefone(celular);

    /// <summary>Observação gravada pelo sistema no convite criado pelo link do cliente (SPEC-059).</summary>
    public const string ObservacaoDoCliente = "Preenchido pelo casal";

    /// <summary>E-mail do convite (SPEC-052): formato simples e até 200 caracteres.</summary>
    public static bool EmailValido(string? email) => email is { Length: <= 200 } && Comum.Texto.EmailValido(email);
}
