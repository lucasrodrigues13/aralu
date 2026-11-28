using Project.Domain.Clientes;
using Project.Domain.Contratos;
using Project.Domain.Eventos;
using Project.Domain.Funil;
using Project.Domain.Perfil;

namespace Project.Application.Negocio;

/// <summary>
/// Quem é o contratante e quais valores preenchem as tags do contrato do funil (SPEC-050).
/// As tags vêm da lista única <see cref="Mesclagem.Campos"/>.
/// </summary>
public static class ContratoPreenchimento
{
    /// <summary>Dados do contratante: o cliente vale primeiro; o que ele não tem cai para a oportunidade (SPEC-050 §6.2).</summary>
    public static ContratanteDados Contratante(Oportunidade oportunidade, Cliente? cliente)
    {
        var daOportunidade = ContratanteRegras.Ler(oportunidade);
        if (cliente is null)
        {
            return daOportunidade;
        }

        static string? Escolhe(string? primeiro, string? segundo) =>
            string.IsNullOrWhiteSpace(primeiro) ? segundo : primeiro;

        return new ContratanteDados(
            Escolhe(cliente.Nome, daOportunidade.Nome),
            Escolhe(Escolhe(cliente.Cnpj, cliente.Cpf), daOportunidade.Documento),
            cliente.Nascimento ?? daOportunidade.Nascimento,
            Escolhe(cliente.Profissao, daOportunidade.Profissao),
            Escolhe(cliente.EstadoCivil, daOportunidade.EstadoCivil),
            Escolhe(cliente.Nacionalidade, daOportunidade.Nacionalidade),
            Escolhe(cliente.Email, daOportunidade.Email),
            Escolhe(cliente.Celular, daOportunidade.Celular),
            Escolhe(cliente.Cep, daOportunidade.Cep),
            Escolhe(cliente.Endereco, daOportunidade.Endereco),
            Escolhe(cliente.Numero, daOportunidade.Numero),
            Escolhe(cliente.Bairro, daOportunidade.Bairro),
            Escolhe(cliente.Cidade, daOportunidade.Cidade),
            Escolhe(cliente.Estado, daOportunidade.Estado),
            Escolhe(cliente.Complemento, daOportunidade.Complemento),
            Escolhe(cliente.Pais, daOportunidade.Pais));
    }

    /// <summary>Valores de todas as tags do contrato (SPEC-050 §6.3).</summary>
    public static IReadOnlyDictionary<string, string?> Valores(
        ContratanteDados contratante,
        Oportunidade oportunidade,
        PerfilAssessoria? perfil,
        OrcamentoFunil orcamento,
        DateOnly hoje)
    {
        var valores = new Dictionary<string, string?>(Mesclagem.ValoresDaContratada(perfil))
        {
            ["contratante_nome"] = contratante.Nome,
            ["contratante_documento"] = MascararDocumento(contratante.Documento),
            ["contratante_endereco"] = Mesclagem.EnderecoEmLinha(
                contratante.Endereco, contratante.Numero, contratante.Complemento, contratante.Bairro,
                contratante.Cidade, contratante.Estado, contratante.Cep, contratante.Pais),
            ["contratante_email"] = contratante.Email,
            ["contratante_telefone"] = contratante.Celular,
            ["contratante_nascimento"] = contratante.Nascimento is DateOnly nascimento ? Mesclagem.DataExtenso(nascimento) : null,
            ["contratante_profissao"] = contratante.Profissao,
            ["contratante_estado_civil"] = contratante.EstadoCivil,
            ["contratante_nacionalidade"] = contratante.Nacionalidade,
            ["evento_tipo"] = oportunidade.TipoEvento is TipoEvento tipo ? RotuloTipo(tipo) : null,
            ["evento_data"] = oportunidade.DataPrevista is DateOnly data ? Mesclagem.DataExtenso(data) : null,
            ["evento_local_cerimonia"] = Local(
                oportunidade.LocalCerimonia, oportunidade.EnderecoCerimonia, oportunidade.NumeroCerimonia,
                oportunidade.BairroCerimonia, oportunidade.Cidade, oportunidade.Uf),
            ["evento_local_recepcao"] = Local(
                oportunidade.LocalRecepcao, oportunidade.EnderecoRecepcao, oportunidade.NumeroRecepcao,
                oportunidade.BairroRecepcao, oportunidade.CidadeRecepcao, oportunidade.EstadoRecepcao),
            ["evento_convidados"] = oportunidade.QuantidadeConvidados?.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["contrato_valor"] = orcamento.Valor is decimal valor ? Mesclagem.Real(valor) : null,
            ["contrato_parcelas"] = Parcelas(orcamento),
            ["data_hoje"] = Mesclagem.DataExtenso(hoje),
        };
        return valores;
    }

    /// <summary>"Entrada de R$ 500,00 em 10/12/2026; Parcela 2 de R$ 500,00 em 10/01/2027". Sem parcelas, nulo.</summary>
    public static string? Parcelas(OrcamentoFunil orcamento)
    {
        if (orcamento.Parcelas.Count == 0)
        {
            return null;
        }

        return string.Join("; ", orcamento.Parcelas.OrderBy(parcela => parcela.Numero).Select(parcela =>
            $"{(parcela.Entrada ? "Entrada" : $"Parcela {parcela.Numero}")} de {Mesclagem.Real(parcela.Valor)} em {parcela.Vencimento:dd/MM/yyyy}"));
    }

    /// <summary>CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00); outro formato volta como está.</summary>
    public static string? MascararDocumento(string? documento) => documento?.Length switch
    {
        11 => $"{documento[..3]}.{documento[3..6]}.{documento[6..9]}-{documento[9..]}",
        14 => $"{documento[..2]}.{documento[2..5]}.{documento[5..8]}/{documento[8..12]}-{documento[12..]}",
        _ => documento,
    };

    private static string Local(string? nome, string? endereco, string? numero, string? bairro, string? cidade, string? uf)
    {
        var rua = string.Join(", ", new[] { endereco, numero }.Where(parte => !string.IsNullOrWhiteSpace(parte)));
        var cidadeEstado = string.Join("/", new[] { cidade, uf }.Where(parte => !string.IsNullOrWhiteSpace(parte)));
        return string.Join(" - ", new[] { nome, rua, bairro, cidadeEstado }.Where(parte => !string.IsNullOrWhiteSpace(parte)));
    }

    private static string RotuloTipo(TipoEvento tipo) => tipo switch
    {
        TipoEvento.Casamento => "Casamento",
        TipoEvento.QuinzeAnos => "15 anos",
        TipoEvento.Aniversario => "Aniversário",
        TipoEvento.Corporativo => "Corporativo",
        TipoEvento.Formatura => "Formatura",
        _ => tipo.ToString(),
    };
}
