using Project.Application.Negocio;
using Project.Domain.Clientes;
using Project.Domain.Contratos;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Funil;
using Project.Domain.Perfil;

namespace Project.Tests.Negocio;

public class ContratoPreenchimentoTests
{
    private static readonly DateOnly Hoje = new(2026, 11, 21);

    private static Oportunidade Lead() => new()
    {
        Nome = "Casamento Ana",
        ContratanteNome = "Ana Souza",
        ContratanteDocumento = "52998224725",
        ContratanteEstadoCivil = "Solteiro(a)",
        ContratanteNacionalidade = "Brasileira",
        ContratanteEmail = "ana@exemplo.com",
        ContratanteCelular = "(11) 97777-6666",
        ContratanteCep = "01001-000",
        ContratanteEndereco = "Praça da Sé",
        ContratanteNumero = "1",
        ContratanteBairro = "Sé",
        ContratanteCidade = "São Paulo",
        ContratanteEstado = "SP",
        TipoEvento = TipoEvento.Casamento,
        DataPrevista = new DateOnly(2027, 3, 20),
        QuantidadeConvidados = 150,
        LocalCerimonia = "Igreja Matriz",
        EnderecoCerimonia = "Rua da Paz",
        NumeroCerimonia = "10",
        BairroCerimonia = "Centro",
        Cidade = "São Paulo",
        Uf = "SP",
        LocalRecepcao = "Espaço Jardim",
    };

    private static OrcamentoFunil Aprovado() => new()
    {
        Valor = 12000m,
        Parcelas =
        [
            new ParcelaOrcamento { Numero = 2, Vencimento = new DateOnly(2027, 1, 10), Valor = 4000m },
            new ParcelaOrcamento { Numero = 1, Vencimento = new DateOnly(2026, 12, 10), Valor = 8000m, Entrada = true },
        ],
    };

    [Fact]
    public void Sem_cliente_vale_a_oportunidade_e_esta_completa()
    {
        var contratante = ContratoPreenchimento.Contratante(Lead(), null);

        Assert.Equal("Ana Souza", contratante.Nome);
        Assert.Empty(ContratanteRegras.Faltando(contratante));
    }

    [Fact]
    public void Cliente_vale_primeiro_e_a_oportunidade_completa_o_que_falta()
    {
        var cliente = new Cliente { Nome = "Ana Beatriz Souza", Cpf = "11144477735", Email = "", EstadoCivil = "Casado(a)" };

        var contratante = ContratoPreenchimento.Contratante(Lead(), cliente);

        Assert.Equal("Ana Beatriz Souza", contratante.Nome);
        Assert.Equal("11144477735", contratante.Documento);
        Assert.Equal("Casado(a)", contratante.EstadoCivil);
        Assert.Equal("ana@exemplo.com", contratante.Email);
        Assert.Equal("Brasileira", contratante.Nacionalidade);
        Assert.Empty(ContratanteRegras.Faltando(contratante));
    }

    [Fact]
    public void Oportunidade_incompleta_diz_o_que_falta()
    {
        var lead = Lead();
        lead.ContratanteDocumento = null;
        lead.ContratanteEstadoCivil = null;

        Assert.Equal(["CPF/CNPJ", "estado civil"], ContratanteRegras.Faltando(ContratoPreenchimento.Contratante(lead, null)));
    }

    [Fact]
    public void Preenche_todas_as_tags_da_lista_unica()
    {
        var perfil = new PerfilAssessoria { NomeEmpresa = "Cerimonial X", Documento = "12.345.678/0001-90", Responsavel = "Maria", ChavePix = "pix@x.com", Endereco = "Av. Central", Numero = "50", Cidade = "São Paulo", Estado = "SP" };
        var lead = Lead();
        var valores = ContratoPreenchimento.Valores(ContratoPreenchimento.Contratante(lead, null), lead, perfil, Aprovado(), Hoje);
        var texto = string.Join(" | ", Mesclagem.Campos.Select(campo => $"{{{{{campo.Marca}}}}}"));

        var preenchido = Mesclagem.Preencher(texto, valores);

        Assert.DoesNotContain("{{", preenchido);
        Assert.Contains("Ana Souza", preenchido);
        Assert.Contains("529.982.247-25", preenchido);
        Assert.Contains("Praça da Sé, 1 - Sé - São Paulo/SP - CEP 01001-000", preenchido);
        Assert.Contains("Cerimonial X", preenchido);
        Assert.Contains("Casamento", preenchido);
        Assert.Contains("20 de março de 2027", preenchido);
        Assert.Contains("Igreja Matriz - Rua da Paz, 10 - Centro - São Paulo/SP", preenchido);
        Assert.Contains("Espaço Jardim", preenchido);
        Assert.Contains("150", preenchido);
        Assert.Contains("21 de novembro de 2026", preenchido);
    }

    [Fact]
    public void Valor_e_parcelas_vem_do_orcamento_aprovado_em_ordem()
    {
        var lead = Lead();
        var valores = ContratoPreenchimento.Valores(ContratoPreenchimento.Contratante(lead, null), lead, null, Aprovado(), Hoje);

        Assert.Equal(Mesclagem.Real(12000m), valores["contrato_valor"]);
        Assert.Equal(
            $"Entrada de {Mesclagem.Real(8000m)} em 10/12/2026; Parcela 2 de {Mesclagem.Real(4000m)} em 10/01/2027",
            valores["contrato_parcelas"]);
    }

    [Fact]
    public void Orcamento_sem_valor_e_sem_parcelas_deixa_as_tags_em_branco()
    {
        var lead = Lead();
        var valores = ContratoPreenchimento.Valores(ContratoPreenchimento.Contratante(lead, null), lead, null, new OrcamentoFunil(), Hoje);

        Assert.Equal($"{Mesclagem.Vazio} {Mesclagem.Vazio}", Mesclagem.Preencher("{{contrato_valor}} {{contrato_parcelas}}", valores));
    }

    [Theory]
    [InlineData("52998224725", "529.982.247-25")]
    [InlineData("11222333000181", "11.222.333/0001-81")]
    [InlineData(null, null)]
    public void Documento_ganha_mascara_de_cpf_ou_cnpj(string? entrada, string? esperado) =>
        Assert.Equal(esperado, ContratoPreenchimento.MascararDocumento(entrada));
}
