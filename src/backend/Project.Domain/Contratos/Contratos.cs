using System.Globalization;
using System.Text.RegularExpressions;

namespace Project.Domain.Contratos;

/// <summary>Contrato da conta com campos de mesclagem (SPEC-030 v2).</summary>
public sealed class ContratoConta
{
    public Guid Id { get; set; }

    public string ContaId { get; set; } = "";

    public string Nome { get; set; } = "";

    public string Texto { get; set; } = "";

    public DateTimeOffset CriadoEm { get; set; }

    public DateTimeOffset AtualizadoEm { get; set; }
}

/// <summary>Uma tag: a marca, o que representa (Rotulo), de onde puxa o valor (Fonte) e um exemplo (SPEC-053).</summary>
public sealed record CampoMesclagem(string Marca, string Rotulo, string Fonte, string Exemplo);

/// <summary>Campos de mesclagem e preenchimento do texto (SPEC-030 §6.2).</summary>
public static partial class Mesclagem
{
    public const string Vazio = "________";

    public static readonly IReadOnlyList<CampoMesclagem> Campos =
    [
        new("contratante_nome", "Contratante: nome completo", "Cadastro de clientes (ou dados do contratante da oportunidade), Nome", "Ana Beatriz Souza"),
        new("contratante_documento", "Contratante: CPF ou CNPJ", "Cadastro de clientes (ou dados do contratante da oportunidade), CPF/CNPJ", "123.456.789-00"),
        new("contratante_endereco", "Contratante: endereço", "Cadastro de clientes (ou dados do contratante da oportunidade), CEP, endereço, número, complemento, bairro, cidade e estado", "Rua das Flores, 100 - Centro - São Paulo/SP - CEP 01001-000"),
        new("contratante_email", "Contratante: e-mail", "Cadastro de clientes (ou dados do contratante da oportunidade), E-mail", "ana@email.com"),
        new("contratante_telefone", "Contratante: celular", "Cadastro de clientes (ou dados do contratante da oportunidade), Celular", "+55 11 98888-7777"),
        new("contratante_nascimento", "Contratante: data de nascimento", "Cadastro de clientes (ou dados do contratante da oportunidade), Data de nascimento", "5 de maio de 1990"),
        new("contratante_profissao", "Contratante: profissão", "Cadastro de clientes (ou dados do contratante da oportunidade), Profissão", "Médica"),
        new("contratante_estado_civil", "Contratante: estado civil", "Cadastro de clientes (ou dados do contratante da oportunidade), Estado civil", "Solteiro(a)"),
        new("contratante_nacionalidade", "Contratante: nacionalidade", "Cadastro de clientes (ou dados do contratante da oportunidade), Nacionalidade", "Brasileira"),
        new("contratada_nome", "Contratada: nome da empresa", "Perfil da assessoria, Nome da empresa", "Cerimonial Exemplo"),
        new("contratada_documento", "Contratada: CPF ou CNPJ", "Perfil da assessoria, CPF/CNPJ", "12.345.678/0001-90"),
        new("contratada_endereco", "Contratada: endereço", "Perfil da assessoria, Endereço (CEP, endereço, número, complemento, bairro, cidade e estado)", "Av. Central, 50 - Centro - São Paulo/SP - CEP 01001-000"),
        new("contratada_responsavel", "Contratada: responsável", "Perfil da assessoria, Responsável", "Maria Lima"),
        new("contratada_pix", "Contratada: chave Pix", "Perfil da assessoria, Chave Pix", "contato@cerimonial.com"),
        new("evento_tipo", "Evento: tipo", "Oportunidade do funil, Tipo do evento", "Casamento"),
        new("evento_data", "Evento: data prevista", "Oportunidade do funil, Data prevista", "20 de março de 2027"),
        new("evento_local_cerimonia", "Evento: local da cerimônia", "Oportunidade do funil, Local e endereço da cerimônia", "Igreja Matriz - Rua da Paz, 10 - Centro - São Paulo/SP"),
        new("evento_local_recepcao", "Evento: local da recepção", "Oportunidade do funil, Local e endereço da recepção", "Espaço Jardim - Av. das Flores, 200 - Jardins - São Paulo/SP"),
        new("evento_convidados", "Evento: quantidade de convidados", "Oportunidade do funil, Quantidade de convidados", "150"),
        new("contrato_valor", "Contrato: valor do orçamento aprovado", "Orçamento aprovado, Valor", "R$ 12.000,00"),
        new("contrato_parcelas", "Contrato: parcelas do orçamento aprovado", "Orçamento aprovado, Parcelas (entrada e vencimentos)", "Entrada de R$ 4.000,00 em 10/12/2026; Parcela 2 de R$ 4.000,00 em 10/01/2027"),
        new("data_hoje", "Data de hoje por extenso", "Data em que o contrato é gerado", "18 de novembro de 2026"),
    ];

    /// <summary>Troca cada {{marca}} conhecida pelo valor. Valor vazio vira uma linha em branco; marca desconhecida fica como está.</summary>
    public static string Preencher(string texto, IReadOnlyDictionary<string, string?> valores) =>
        MarcaRegex().Replace(texto, encontrado =>
        {
            var marca = encontrado.Groups[1].Value.ToLowerInvariant();
            if (!Campos.Any(campo => campo.Marca == marca))
            {
                return encontrado.Value;
            }

            return valores.TryGetValue(marca, out var valor) && !string.IsNullOrWhiteSpace(valor) ? valor! : Vazio;
        });

    /// <summary>Valores das marcas contratada_* a partir do perfil; o endereço é montado dos campos estruturados (SPEC-038).</summary>
    public static IReadOnlyDictionary<string, string?> ValoresDaContratada(Perfil.PerfilAssessoria? perfil) =>
        new Dictionary<string, string?>
        {
            ["contratada_nome"] = perfil?.NomeEmpresa,
            ["contratada_documento"] = perfil?.Documento,
            ["contratada_endereco"] = perfil?.EnderecoCompleto(),
            ["contratada_responsavel"] = perfil?.Responsavel,
            ["contratada_pix"] = perfil?.ChavePix,
        };

    public static IReadOnlyDictionary<string, string?> Exemplos() =>
        Campos.ToDictionary(campo => campo.Marca, campo => (string?)campo.Exemplo);

    /// <summary>Endereço em uma linha: "rua, número, complemento - bairro - cidade/UF - CEP x - país". Partes vazias saem.</summary>
    public static string EnderecoEmLinha(string? endereco, string? numero, string? complemento, string? bairro, string? cidade, string? estado, string? cep, string? pais)
    {
        var rua = string.Join(", ", new[] { endereco, numero, complemento }.Where(parte => !string.IsNullOrWhiteSpace(parte)));
        var cidadeEstado = string.Join("/", new[] { cidade, estado }.Where(parte => !string.IsNullOrWhiteSpace(parte)));
        var partes = new[] { rua, bairro, cidadeEstado, string.IsNullOrWhiteSpace(cep) ? null : $"CEP {cep}", pais };
        return string.Join(" - ", partes.Where(parte => !string.IsNullOrWhiteSpace(parte)));
    }

    public static string Real(decimal valor) =>
        valor.ToString("C", CultureInfo.GetCultureInfo("pt-BR"));

    public static string DataExtenso(DateOnly data) =>
        data.ToString("d 'de' MMMM 'de' yyyy", CultureInfo.GetCultureInfo("pt-BR"));

    [GeneratedRegex(@"\{\{\s*([a-zA-Z_]+)\s*\}\}")]
    private static partial Regex MarcaRegex();
}
