using Project.Infrastructure.Conta;

namespace Project.Tests.Conta;

public class SenhaComumValidadorTests
{
    [Theory]
    [InlineData("12345678ab")]
    [InlineData("aralu2026!")]
    [InlineData("Casamento2026")]
    [InlineData("senha123!")]
    [InlineData("PASSWORD123")]
    [InlineData("1234567890")]
    [InlineData("flamengo@2025")]
    [InlineData("cerimônial10")]
    public void Recusa_senha_comum_ou_do_dominio(string senha)
        => Assert.True(SenhaComumValidador.EhComum(senha, "pessoa@exemplo.com"));

    [Theory]
    [InlineData("maria.souza", "maria.souza@exemplo.com")]
    [InlineData("Maria.Souza@Exemplo.com", "maria.souza@exemplo.com")]
    public void Recusa_senha_igual_ao_email_ou_a_parte_local(string senha, string email)
        => Assert.True(SenhaComumValidador.EhComum(senha, email));

    [Theory]
    [InlineData("ceu-de-junho-42")]
    [InlineData("tucano azul na janela")]
    [InlineData("aralu-mesa-de-vidro")]
    public void Aceita_senha_boa(string senha)
        => Assert.False(SenhaComumValidador.EhComum(senha, "pessoa@exemplo.com"));

    [Fact]
    public void Motivo_vem_do_codigo_do_identity()
    {
        var curta = new Microsoft.AspNetCore.Identity.IdentityError { Code = "PasswordTooShort" };
        var comum = new Microsoft.AspNetCore.Identity.IdentityError { Code = SenhaComumValidador.CodigoErro };

        Assert.Equal(MotivoSenha.Curta, MotivoSenha.De([curta, comum]));
        Assert.Equal(MotivoSenha.Comum, MotivoSenha.De([comum]));
        Assert.Equal("Use pelo menos 10 caracteres.", MotivoSenha.Mensagem(MotivoSenha.Curta));
        Assert.Equal("Essa senha é muito comum.", MotivoSenha.Mensagem(MotivoSenha.Comum));
    }
}
