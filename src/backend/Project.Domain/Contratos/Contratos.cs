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

public sealed record CampoMesclagem(string Marca, string Rotulo, string Exemplo);

/// <summary>Campos de mesclagem e preenchimento do texto (SPEC-030 §6.2).</summary>
public static partial class Mesclagem
{
    public const string Vazio = "________";

    public static readonly IReadOnlyList<CampoMesclagem> Campos =
    [
        new("contratante_nome", "Contratante: nome completo", "Ana Beatriz Souza"),
        new("contratante_documento", "Contratante: CPF ou CNPJ", "123.456.789-00"),
        new("contratante_endereco", "Contratante: endereço", "Rua das Flores, 100 - Centro - São Paulo/SP - CEP 01001-000"),
        new("contratante_email", "Contratante: e-mail", "ana@email.com"),
        new("contratante_telefone", "Contratante: celular", "+55 11 98888-7777"),
        new("contratante_nascimento", "Contratante: data de nascimento", "5 de maio de 1990"),
        new("contratante_profissao", "Contratante: profissão", "Médica"),
        new("contratante_estado_civil", "Contratante: estado civil", "Solteiro(a)"),
        new("contratante_nacionalidade", "Contratante: nacionalidade", "Brasileira"),
        new("contratada_nome", "Contratada: nome da empresa", "Cerimonial Exemplo"),
        new("contratada_documento", "Contratada: CPF ou CNPJ", "12.345.678/0001-90"),
        new("contratada_endereco", "Contratada: endereço", "Av. Central, 50 - Centro - São Paulo/SP - CEP 01001-000"),
        new("contratada_responsavel", "Contratada: responsável", "Maria Lima"),
        new("contratada_pix", "Contratada: chave Pix", "contato@cerimonial.com"),
        new("evento_tipo", "Evento: tipo", "Casamento"),
        new("evento_data", "Evento: data prevista", "20 de março de 2027"),
        new("evento_local_cerimonia", "Evento: local da cerimônia", "Igreja Matriz - Rua da Paz, 10 - Centro - São Paulo/SP"),
        new("evento_local_recepcao", "Evento: local da recepção", "Espaço Jardim - Av. das Flores, 200 - Jardins - São Paulo/SP"),
        new("evento_convidados", "Evento: quantidade de convidados", "150"),
        new("contrato_valor", "Contrato: valor do orçamento aprovado", "R$ 12.000,00"),
        new("contrato_parcelas", "Contrato: parcelas do orçamento aprovado", "Entrada de R$ 4.000,00 em 10/12/2026; Parcela 2 de R$ 4.000,00 em 10/01/2027"),
        new("data_hoje", "Data de hoje por extenso", "18 de novembro de 2026"),
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
