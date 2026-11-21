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
        new("contratante_endereco", "Contratante: endereço", "Rua das Flores, 100 - Centro, São Paulo/SP"),
        new("contratante_email", "Contratante: e-mail", "ana@email.com"),
        new("contratante_telefone", "Contratante: telefone", "+55 (11) 98888-7777"),
        new("contratada_nome", "Contratada: nome da empresa", "Cerimonial Exemplo"),
        new("contratada_documento", "Contratada: CPF ou CNPJ", "12.345.678/0001-90"),
        new("contratada_endereco", "Contratada: endereço", "Av. Central, 50, São Paulo/SP"),
        new("contratada_responsavel", "Contratada: responsável", "Maria Lima"),
        new("contratada_pix", "Contratada: chave Pix", "contato@cerimonial.com"),
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

    public static string Real(decimal valor) =>
        valor.ToString("C", CultureInfo.GetCultureInfo("pt-BR"));

    public static string DataExtenso(DateOnly data) =>
        data.ToString("d 'de' MMMM 'de' yyyy", CultureInfo.GetCultureInfo("pt-BR"));

    [GeneratedRegex(@"\{\{\s*([a-zA-Z_]+)\s*\}\}")]
    private static partial Regex MarcaRegex();
}
