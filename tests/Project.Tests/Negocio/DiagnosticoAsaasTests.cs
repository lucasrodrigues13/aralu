using Project.Infrastructure.Assinaturas;
using Xunit;

namespace Project.Tests.Negocio;

public class DiagnosticoAsaasTests
{
    [Theory]
    [InlineData("production", true, false)]
    [InlineData("Production", true, false)]
    [InlineData("production", false, false)]
    [InlineData("staging", true, true)]
    [InlineData("staging", false, false)]
    [InlineData(null, true, true)]
    [InlineData(null, false, false)]
    public void Diagnostico_so_fica_ativo_fora_de_producao_com_a_flag_ligada(string? ambiente, bool flag, bool esperado)
    {
        var opcoes = new AsaasOpcoes { Ambiente = ambiente, DiagnosticoNoNavegador = flag };

        Assert.Equal(esperado, opcoes.DiagnosticoAtivo);
    }
}
