using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

namespace Project.Domain.Contratos;

/// <summary>
/// Modelo de contrato em Word (.docx) enviado pelo organizador: troca as mesmas tags {{marca}} do editor no corpo,
/// cabeçalhos, rodapés e notas, mantendo a formatação do trecho onde a tag está. O Word costuma quebrar o texto
/// em vários "runs" (correção ortográfica, formatação), então a busca é feita no parágrafo inteiro.
/// </summary>
public static partial class MesclagemWord
{
    private static readonly XNamespace W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    private static readonly XNamespace Xml = XNamespace.Xml;

    /// <summary>Confere se os bytes são um .docx legível (zip com word/document.xml).</summary>
    public static bool EhDocx(byte[] arquivo)
    {
        try
        {
            using var zip = new ZipArchive(new MemoryStream(arquivo), ZipArchiveMode.Read);
            var documento = zip.GetEntry("word/document.xml");
            if (documento is null)
            {
                return false;
            }

            using var fluxo = documento.Open();
            _ = XDocument.Load(fluxo);
            return true;
        }
        catch (Exception ex) when (ex is InvalidDataException or System.Xml.XmlException or IOException)
        {
            return false;
        }
    }

    /// <summary>Tags {{...}} encontradas no documento (minúsculas, sem repetição, na ordem em que aparecem).</summary>
    public static IReadOnlyList<string> Tags(byte[] docx)
    {
        var achadas = new List<string>();
        foreach (var texto in TextosDosParagrafos(docx))
        {
            foreach (Match encontrado in MarcaRegex().Matches(texto))
            {
                var marca = encontrado.Groups[1].Value.ToLowerInvariant();
                if (!achadas.Contains(marca))
                {
                    achadas.Add(marca);
                }
            }
        }

        return achadas;
    }

    /// <summary>Texto simples do corpo do documento, um parágrafo por linha (busca, assistente e conferência).</summary>
    public static string Texto(byte[] docx)
    {
        using var zip = new ZipArchive(new MemoryStream(docx), ZipArchiveMode.Read);
        var entrada = zip.GetEntry("word/document.xml");
        if (entrada is null)
        {
            return "";
        }

        using var fluxo = entrada.Open();
        var xml = XDocument.Load(fluxo);
        var linhas = xml.Descendants(W + "p").Where(p => !p.Ancestors(W + "p").Any()).Select(TextoDoParagrafo);
        return string.Join("\n", linhas).Trim();
    }

    /// <summary>
    /// Devolve um novo .docx com cada tag conhecida trocada pelo valor (vazio vira ________; desconhecida fica como está).
    /// Com <paramref name="destacar"/>, o valor trocado ganha marca-texto amarelo (só no Live Preview).
    /// </summary>
    public static byte[] Preencher(byte[] docx, IReadOnlyDictionary<string, string?> valores, bool destacar = false)
    {
        using var saida = new MemoryStream();
        saida.Write(docx);
        using (var zip = new ZipArchive(saida, ZipArchiveMode.Update, leaveOpen: true))
        {
            foreach (var entrada in zip.Entries.Where(EhParteDeTexto).ToArray())
            {
                XDocument xml;
                using (var leitura = entrada.Open())
                {
                    xml = XDocument.Load(leitura, LoadOptions.PreserveWhitespace);
                }

                var mudou = false;
                foreach (var paragrafo in xml.Descendants(W + "p").ToArray())
                {
                    mudou |= TrocarNoParagrafo(paragrafo, valores, destacar);
                }

                if (!mudou)
                {
                    continue;
                }

                var nome = entrada.FullName;
                entrada.Delete();
                var nova = zip.CreateEntry(nome, CompressionLevel.Optimal);
                using var escrita = nova.Open();
                xml.Save(escrita, SaveOptions.DisableFormatting);
            }
        }

        return saida.ToArray();
    }

    private static bool EhParteDeTexto(ZipArchiveEntry entrada) =>
        entrada.FullName.StartsWith("word/", StringComparison.Ordinal)
        && entrada.FullName.EndsWith(".xml", StringComparison.Ordinal)
        && entrada.FullName.IndexOf('/', 5) < 0
        && (entrada.FullName == "word/document.xml"
            || entrada.FullName.StartsWith("word/header", StringComparison.Ordinal)
            || entrada.FullName.StartsWith("word/footer", StringComparison.Ordinal)
            || entrada.FullName is "word/footnotes.xml" or "word/endnotes.xml");

    private static IEnumerable<string> TextosDosParagrafos(byte[] docx)
    {
        using var zip = new ZipArchive(new MemoryStream(docx), ZipArchiveMode.Read);
        foreach (var entrada in zip.Entries.Where(EhParteDeTexto).ToArray())
        {
            XDocument xml;
            using (var fluxo = entrada.Open())
            {
                xml = XDocument.Load(fluxo);
            }

            foreach (var paragrafo in xml.Descendants(W + "p"))
            {
                yield return TextoDoParagrafo(paragrafo);
            }
        }
    }

    /// <summary>Textos (w:t) que pertencem ao próprio parágrafo, sem os de parágrafos aninhados (caixas de texto).</summary>
    private static List<XElement> TextosDe(XElement paragrafo) =>
        paragrafo.Descendants(W + "t").Where(t => t.Ancestors(W + "p").First() == paragrafo).ToList();

    private static string TextoDoParagrafo(XElement paragrafo) =>
        string.Concat(TextosDe(paragrafo).Select(t => t.Value));

    private static bool TrocarNoParagrafo(XElement paragrafo, IReadOnlyDictionary<string, string?> valores, bool destacar)
    {
        var textos = TextosDe(paragrafo);
        if (textos.Count == 0)
        {
            return false;
        }

        var inicios = new int[textos.Count];
        var junto = new StringBuilder();
        for (var i = 0; i < textos.Count; i++)
        {
            inicios[i] = junto.Length;
            junto.Append(textos[i].Value);
        }

        var achados = MarcaRegex().Matches(junto.ToString())
            .Where(encontrado => Mesclagem.Campos.Any(campo => campo.Marca == encontrado.Groups[1].Value.ToLowerInvariant()))
            .ToArray();
        if (achados.Length == 0)
        {
            return false;
        }

        // De trás para frente: mexer num trecho não muda as posições dos trechos anteriores.
        foreach (var encontrado in achados.Reverse())
        {
            var marca = encontrado.Groups[1].Value.ToLowerInvariant();
            var valor = valores.TryGetValue(marca, out var lido) && !string.IsNullOrWhiteSpace(lido)
                ? lido!.Replace("\r", "").Replace('\n', ' ')
                : Mesclagem.Vazio;
            var fim = encontrado.Index + encontrado.Length;
            var primeiro = Indice(inicios, encontrado.Index);
            var ultimo = Indice(inicios, fim - 1);

            var tPrimeiro = textos[primeiro];
            var tUltimo = textos[ultimo];
            var antes = tPrimeiro.Value[..(encontrado.Index - inicios[primeiro])];
            var depois = tUltimo.Value[(fim - inicios[ultimo])..];

            for (var i = primeiro + 1; i < ultimo; i++)
            {
                Definir(textos[i], "");
            }

            if (primeiro == ultimo)
            {
                Definir(tPrimeiro, antes);
                var runValor = InserirRunDepois(tPrimeiro, valor, destacar);
                if (depois.Length > 0)
                {
                    InserirRunDepois(runValor, tPrimeiro, depois);
                }
            }
            else
            {
                Definir(tPrimeiro, antes);
                Definir(tUltimo, depois);
                InserirRunDepois(tPrimeiro, valor, destacar);
            }
        }

        return true;
    }

    private static int Indice(int[] inicios, int posicao)
    {
        for (var i = inicios.Length - 1; i >= 0; i--)
        {
            if (inicios[i] <= posicao)
            {
                return i;
            }
        }

        return 0;
    }

    private static void Definir(XElement t, string valor)
    {
        t.Value = valor;
        t.SetAttributeValue(Xml + "space", "preserve");
    }

    private static XElement NovoRun(XElement? runBase, string texto)
    {
        var run = new XElement(W + "r");
        if (runBase?.Element(W + "rPr") is { } propriedades)
        {
            run.Add(new XElement(propriedades));
        }

        var t = new XElement(W + "t", texto);
        t.SetAttributeValue(Xml + "space", "preserve");
        run.Add(t);
        return run;
    }

    /// <summary>
    /// Divide o run do w:t logo depois dele: o valor entra num run novo com a mesma formatação e o que vinha depois
    /// do w:t no run original (outros textos, tabulações) passa para um run seguinte, mantendo a ordem.
    /// </summary>
    private static XElement InserirRunDepois(XElement t, string valor, bool destacar)
    {
        var run = t.Parent!;
        var runValor = NovoRun(run.Name == W + "r" ? run : null, valor);
        if (destacar)
        {
            var propriedades = runValor.Element(W + "rPr");
            if (propriedades is null)
            {
                propriedades = new XElement(W + "rPr");
                runValor.AddFirst(propriedades);
            }

            propriedades.Element(W + "highlight")?.Remove();
            propriedades.Add(new XElement(W + "highlight", new XAttribute(W + "val", "yellow")));
        }

        if (run.Name != W + "r")
        {
            t.AddAfterSelf(runValor.Element(W + "t"));
            return t;
        }

        var seguintes = t.ElementsAfterSelf().ToArray();
        run.AddAfterSelf(runValor);
        if (seguintes.Length > 0)
        {
            var resto = new XElement(W + "r");
            if (run.Element(W + "rPr") is { } props)
            {
                resto.Add(new XElement(props));
            }

            foreach (var item in seguintes)
            {
                item.Remove();
                resto.Add(item);
            }

            runValor.AddAfterSelf(resto);
        }

        return runValor;
    }

    /// <summary>Texto que vinha depois da tag no mesmo w:t: run próprio, com a formatação do original, logo após o valor.</summary>
    private static void InserirRunDepois(XElement runValor, XElement tOriginal, string depois)
    {
        var runOriginal = tOriginal.Parent!;
        if (runValor.Name != W + "r")
        {
            var t = new XElement(W + "t", depois);
            t.SetAttributeValue(Xml + "space", "preserve");
            runValor.AddAfterSelf(t);
            return;
        }

        runValor.AddAfterSelf(NovoRun(runOriginal.Name == W + "r" ? runOriginal : null, depois));
    }

    [GeneratedRegex(@"\{\{\s*([a-zA-Z_]+)\s*\}\}")]
    private static partial Regex MarcaRegex();
}
