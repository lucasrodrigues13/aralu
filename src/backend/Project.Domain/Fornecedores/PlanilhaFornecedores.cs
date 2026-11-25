using System.Globalization;
using System.Text;

namespace Project.Domain.Fornecedores;

/// <summary>Um fornecedor lido da planilha, já com os dados bancários da segunda aba (quando houver).</summary>
public sealed record FornecedorPlanilha(
    int Linha,
    string Nome,
    IReadOnlyList<string> Servicos,
    string? NomeResponsavel,
    string? Ddi,
    string? Telefone,
    string? Email,
    string? Cnpj,
    string? Cpf,
    string? RazaoSocial,
    decimal? PrecoDe,
    decimal? PrecoAte,
    string? Site,
    string? Instagram,
    string? Cep,
    string? Endereco,
    string? Numero,
    string? Bairro,
    string? Cidade,
    string? Estado)
{
    public string? Banco { get; init; }
    public string? Agencia { get; init; }
    public string? ContaBancaria { get; init; }
    public string? TipoConta { get; init; }
    public string? TitularConta { get; init; }
    public string? DocumentoTitular { get; init; }
    public string? PixTipo { get; init; }
    public string? PixChave { get; init; }
}

public sealed record LeituraPlanilhaFornecedores(IReadOnlyList<FornecedorPlanilha> Fornecedores, IReadOnlyList<string> Erros);

/// <summary>
/// Planilha de fornecedores: aba "Fornecedores" (um por linha) e aba opcional "Dados bancários", ligada pelo nome do
/// fornecedor. O cabeçalho é reconhecido sem diferenciar maiúsculas e acentos, em qualquer ordem.
/// </summary>
public static class PlanilhaFornecedores
{
    public const string AbaFornecedores = "Fornecedores";
    public const string AbaBancarios = "Dados bancários";
    public const string MarcaExemplo = "(exemplo)";

    public static readonly string[] Colunas =
    [
        "Nome *", "Serviços *", "Nome do responsável", "DDI", "Telefone", "E-mail", "CNPJ", "CPF", "Razão social",
        "Preço de", "Preço até", "Site", "Instagram", "CEP", "Endereço", "Número", "Bairro", "Cidade", "Estado",
    ];

    public static readonly string[] ColunasBancarias =
    [
        "Fornecedor *", "Banco", "Agência", "Conta", "Tipo de conta", "Titular da conta", "CPF/CNPJ do titular", "Tipo de Pix", "Chave Pix",
    ];

    public static readonly string[] TiposConta = ["Corrente", "Pagamento", "Poupança"];

    public static readonly string[] TiposPix = ["CPF", "CNPJ", "E-mail", "Telefone celular", "Chave aleatória"];

    public static readonly string[][] Exemplos =
    [
        ["Buffet Sabor & Arte (exemplo)", "Buffet, Bar", "Carla Mendes", "55", "11999990000", "contato@saborearte.com.br", "", "", "Sabor e Arte Eventos Ltda", "8000", "15000", "saborearte.com.br", "@saborearte", "01310-100", "Av. Paulista", "1000", "Bela Vista", "São Paulo", "SP"],
        ["Foto Luz (exemplo)", "Fotografia", "Rafael Lima", "55", "21988887777", "", "", "", "", "", "", "", "@fotoluz", "", "", "", "", "Rio de Janeiro", "RJ"],
    ];

    public static readonly string[][] ExemplosBancarios =
    [
        ["Buffet Sabor & Arte (exemplo)", "341 - Itaú Unibanco S.A.", "1234", "56789-0", "Corrente", "Sabor e Arte Eventos Ltda", "", "E-mail", "financeiro@saborearte.com.br"],
    ];

    /// <param name="fornecedores">Linhas da aba Fornecedores, com o cabeçalho na primeira.</param>
    /// <param name="bancarios">Linhas da aba Dados bancários (vazia quando a aba não existe).</param>
    public static LeituraPlanilhaFornecedores Interpretar(
        IReadOnlyList<IReadOnlyList<string?>> fornecedores, IReadOnlyList<IReadOnlyList<string?>> bancarios)
    {
        var erros = new List<string>();
        if (fornecedores.Count == 0)
        {
            return new([], ["A aba Fornecedores está vazia."]);
        }

        var col = Mapear(fornecedores[0]);
        if (!col.ContainsKey("nome") || !col.ContainsKey("servicos"))
        {
            return new([], ["A aba Fornecedores precisa das colunas Nome e Serviços. Use a planilha modelo."]);
        }

        var lidos = new List<FornecedorPlanilha>();
        var porNome = new Dictionary<string, int>();
        for (var i = 1; i < fornecedores.Count; i++)
        {
            var celulas = fornecedores[i];
            if (celulas.All(string.IsNullOrWhiteSpace))
            {
                continue;
            }

            var linha = i + 1;
            string? C(string chave) => Celula(celulas, col, chave);
            var nome = C("nome");
            if (nome is null)
            {
                erros.Add($"Linha {linha}: informe o nome do fornecedor.");
                continue;
            }

            if (nome.Contains(MarcaExemplo, StringComparison.OrdinalIgnoreCase))
            {
                erros.Add($"Linha {linha}: apague as linhas de exemplo antes de importar.");
                continue;
            }

            var chaveNome = Normalizar(nome);
            if (porNome.ContainsKey(chaveNome))
            {
                erros.Add($"Linha {linha}: o fornecedor \"{nome}\" aparece mais de uma vez na planilha.");
                continue;
            }

            var servicos = Lista(C("servicos"));
            if (servicos.Count == 0)
            {
                erros.Add($"Linha {linha}: informe ao menos um serviço de \"{nome}\".");
                continue;
            }

            var precoDe = Decimal(C("precode"), linha, "Preço de", erros);
            var precoAte = Decimal(C("precoate"), linha, "Preço até", erros);
            var email = C("e-mail") ?? C("email");
            porNome[chaveNome] = lidos.Count;
            lidos.Add(new FornecedorPlanilha(
                linha, nome, servicos, C("nomedoresponsavel") ?? C("responsavel"),
                Digitos(C("ddi")), Digitos(C("telefone")), email, C("cnpj"), C("cpf"), C("razaosocial"),
                precoDe, precoAte, C("site"), C("instagram"), C("cep"), C("endereco"), C("numero"), C("bairro"),
                C("cidade"), C("estado")));
        }

        LerBancarios(bancarios, lidos, porNome, erros);
        return new(lidos, erros);
    }

    private static void LerBancarios(
        IReadOnlyList<IReadOnlyList<string?>> linhas, List<FornecedorPlanilha> lidos, Dictionary<string, int> porNome, List<string> erros)
    {
        if (linhas.Count < 2)
        {
            return;
        }

        var col = Mapear(linhas[0]);
        if (!col.ContainsKey("fornecedor"))
        {
            erros.Add("A aba Dados bancários precisa da coluna Fornecedor. Use a planilha modelo.");
            return;
        }

        var vistos = new HashSet<string>();
        for (var i = 1; i < linhas.Count; i++)
        {
            var celulas = linhas[i];
            if (celulas.All(string.IsNullOrWhiteSpace))
            {
                continue;
            }

            var linha = i + 1;
            string? C(string chave) => Celula(celulas, col, chave);
            var nome = C("fornecedor");
            if (nome is null)
            {
                erros.Add($"Dados bancários, linha {linha}: informe o nome do fornecedor.");
                continue;
            }

            if (nome.Contains(MarcaExemplo, StringComparison.OrdinalIgnoreCase))
            {
                erros.Add($"Dados bancários, linha {linha}: apague as linhas de exemplo antes de importar.");
                continue;
            }

            var chave = Normalizar(nome);
            if (!porNome.TryGetValue(chave, out var indice))
            {
                erros.Add($"Dados bancários, linha {linha}: \"{nome}\" não está na aba Fornecedores.");
                continue;
            }

            if (!vistos.Add(chave))
            {
                erros.Add($"Dados bancários, linha {linha}: \"{nome}\" já tem dados bancários em outra linha.");
                continue;
            }

            var tipoConta = C("tipodeconta");
            string? tipoContaValido = null;
            if (tipoConta is not null)
            {
                tipoContaValido = TiposConta.FirstOrDefault(t => Normalizar(t) == Normalizar(tipoConta));
                if (tipoContaValido is null)
                {
                    erros.Add($"Dados bancários, linha {linha}: tipo de conta deve ser Corrente, Pagamento ou Poupança.");
                }
            }

            var tipoPix = C("tipodepix");
            var pixChave = C("chavepix");
            string? pixValido = null;
            if (tipoPix is not null)
            {
                pixValido = TipoPix(tipoPix);
                if (pixValido is null)
                {
                    erros.Add($"Dados bancários, linha {linha}: tipo de Pix deve ser CPF, CNPJ, E-mail, Telefone celular ou Chave aleatória.");
                }
            }
            else if (pixChave is not null)
            {
                erros.Add($"Dados bancários, linha {linha}: informe o tipo de Pix da chave.");
            }

            lidos[indice] = lidos[indice] with
            {
                Banco = C("banco"),
                Agencia = C("agencia"),
                ContaBancaria = C("conta"),
                TipoConta = tipoContaValido,
                TitularConta = C("titulardaconta") ?? C("titular"),
                DocumentoTitular = C("cpf/cnpjdotitular") ?? C("documentodotitular"),
                PixTipo = pixValido,
                PixChave = pixChave,
            };
        }
    }

    private static string? TipoPix(string texto) => Normalizar(texto) switch
    {
        "cpf" => "Cpf",
        "cnpj" => "Cnpj",
        "e-mail" or "email" => "Email",
        "telefone" or "telefonecelular" or "celular" => "Telefone",
        "chavealeatoria" or "aleatoria" => "Aleatoria",
        _ => null,
    };

    private static Dictionary<string, int> Mapear(IReadOnlyList<string?> cabecalho)
    {
        var mapa = new Dictionary<string, int>();
        for (var i = 0; i < cabecalho.Count; i++)
        {
            mapa.TryAdd(Normalizar(cabecalho[i]).TrimEnd('*'), i);
        }

        return mapa;
    }

    private static string? Celula(IReadOnlyList<string?> celulas, Dictionary<string, int> col, string chave) =>
        col.TryGetValue(chave, out var i) && i < celulas.Count && !string.IsNullOrWhiteSpace(celulas[i])
            ? celulas[i]!.Trim()
            : null;

    private static List<string> Lista(string? texto)
    {
        var vistos = new HashSet<string>();
        return (texto ?? "")
            .Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(nome => vistos.Add(Normalizar(nome)))
            .ToList();
    }

    private static string? Digitos(string? texto)
    {
        var digitos = new string((texto ?? "").Where(char.IsDigit).ToArray());
        return digitos.Length == 0 ? null : digitos;
    }

    /// <summary>Aceita "1.500,00", "1500,5", "R$ 1500" e o número que o Excel grava ("1500.5").</summary>
    public static decimal? Decimal(string? texto, int linha, string coluna, List<string> erros)
    {
        if (texto is null)
        {
            return null;
        }

        var limpo = texto.Replace("R$", "", StringComparison.OrdinalIgnoreCase).Replace(" ", "");
        if (limpo.Contains(','))
        {
            limpo = limpo.Replace(".", "").Replace(',', '.');
        }

        if (decimal.TryParse(limpo, NumberStyles.Number, CultureInfo.InvariantCulture, out var valor) && valor >= 0)
        {
            return valor;
        }

        erros.Add($"Linha {linha}: \"{coluna}\" deve ser um valor maior ou igual a zero.");
        return null;
    }

    /// <summary>Minúsculas, sem acentos e sem espaços: "Nome do responsável" vira "nomedoresponsavel".</summary>
    public static string Normalizar(string? texto)
    {
        var limpo = (texto ?? "").Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(limpo.Length);
        foreach (var c in limpo)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark && !char.IsWhiteSpace(c))
            {
                sb.Append(c);
            }
        }

        return sb.ToString();
    }
}
