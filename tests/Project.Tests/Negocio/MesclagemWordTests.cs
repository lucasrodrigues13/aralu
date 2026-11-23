using System.IO.Compression;
using System.Text;
using Project.Domain.Contratos;

namespace Project.Tests.Negocio;

/// <summary>Modelo de contrato em Word: troca das tags dentro do .docx.</summary>
public class MesclagemWordTests
{
    private const string Ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

    private static byte[] Docx(string corpo, string? rodape = null)
    {
        using var memoria = new MemoryStream();
        using (var zip = new ZipArchive(memoria, ZipArchiveMode.Create, leaveOpen: true))
        {
            void Escrever(string nome, string xml)
            {
                using var escrita = new StreamWriter(zip.CreateEntry(nome).Open(), new UTF8Encoding(false));
                escrita.Write(xml);
            }

            Escrever("[Content_Types].xml", "<?xml version=\"1.0\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"/>");
            Escrever("word/document.xml", $"<?xml version=\"1.0\"?><w:document xmlns:w=\"{Ns}\"><w:body>{corpo}</w:body></w:document>");
            if (rodape is not null)
            {
                Escrever("word/footer1.xml", $"<?xml version=\"1.0\"?><w:ftr xmlns:w=\"{Ns}\">{rodape}</w:ftr>");
            }
        }

        return memoria.ToArray();
    }

    private static string Ler(byte[] docx, string parte)
    {
        using var zip = new ZipArchive(new MemoryStream(docx), ZipArchiveMode.Read);
        using var leitura = new StreamReader(zip.GetEntry(parte)!.Open());
        return leitura.ReadToEnd();
    }

    private static readonly Dictionary<string, string?> Valores = new()
    {
        ["contratante_nome"] = "Ana Souza",
        ["contrato_valor"] = "R$ 10,00",
    };

    [Fact]
    public void Troca_tag_quebrada_em_varios_runs_mantendo_o_texto_em_volta()
    {
        var docx = Docx("<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Eu, {{contra</w:t></w:r><w:proofErr/><w:r><w:t>tante_nome}}, aceito.</w:t></w:r></w:p>");

        var preenchido = MesclagemWord.Preencher(docx, Valores);

        Assert.Equal("Eu, Ana Souza, aceito.", MesclagemWord.Texto(preenchido));
        Assert.Contains("<w:b />", Ler(preenchido, "word/document.xml").Replace("<w:b/>", "<w:b />"));
    }

    [Fact]
    public void Troca_varias_tags_no_mesmo_run_e_no_rodape_e_deixa_desconhecida()
    {
        var docx = Docx(
            "<w:p><w:r><w:t>{{contratante_nome}} paga {{ contrato_valor }} e {{nao_existe}}; data {{data_hoje}}</w:t><w:tab/><w:t>fim</w:t></w:r></w:p>",
            "<w:p><w:r><w:t>Assinado: {{contratante_nome}}</w:t></w:r></w:p>");

        var preenchido = MesclagemWord.Preencher(docx, Valores);

        Assert.Equal($"Ana Souza paga R$ 10,00 e {{{{nao_existe}}}}; data {Mesclagem.Vazio}fim", MesclagemWord.Texto(preenchido));
        Assert.Contains("Assinado: ", Ler(preenchido, "word/footer1.xml"));
        Assert.Contains("Ana Souza", Ler(preenchido, "word/footer1.xml"));
        Assert.Contains("<w:tab", Ler(preenchido, "word/document.xml"));
    }

    [Fact]
    public void Lista_tags_e_destaca_no_preview()
    {
        var docx = Docx("<w:p><w:r><w:t>{{contratante_nome}} {{xyz}} {{CONTRATANTE_NOME}}</w:t></w:r></w:p>");

        Assert.Equal(["contratante_nome", "xyz"], MesclagemWord.Tags(docx));
        Assert.Contains("highlight", Ler(MesclagemWord.Preencher(docx, Valores, destacar: true), "word/document.xml"));
        Assert.DoesNotContain("highlight", Ler(MesclagemWord.Preencher(docx, Valores), "word/document.xml"));
    }

    [Fact]
    public void Reconhece_docx_e_recusa_outro_arquivo()
    {
        Assert.True(MesclagemWord.EhDocx(Docx("<w:p/>")));
        Assert.False(MesclagemWord.EhDocx(Encoding.UTF8.GetBytes("não é zip")));
    }
}
