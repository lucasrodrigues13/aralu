using Project.Infrastructure.Arquivos;
using SkiaSharp;

namespace Project.Tests.Negocio;

public class ReducaoImagemTests
{
    [Fact]
    public void Foto_grande_fica_com_lado_maior_de_2000_px_e_menor_em_disco()
    {
        var caminho = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.jpg");
        try
        {
            GravarFoto(caminho, 4000, 3000, SKEncodedImageFormat.Jpeg, 100);

            var reduzida = ReducaoImagem.Reduzir(caminho, jpeg: true);

            Assert.NotNull(reduzida);
            Assert.True(reduzida!.Length < new FileInfo(caminho).Length);
            using var bitmap = SKBitmap.Decode(reduzida);
            Assert.Equal(2000, bitmap.Width);
            Assert.Equal(1500, bitmap.Height);
        }
        finally
        {
            File.Delete(caminho);
        }
    }

    [Fact]
    public void Imagem_pequena_que_nao_encolhe_fica_como_veio()
    {
        var caminho = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.png");
        try
        {
            GravarFoto(caminho, 40, 30, SKEncodedImageFormat.Png, 100, liso: true);

            Assert.Null(ReducaoImagem.Reduzir(caminho, jpeg: false));
        }
        finally
        {
            File.Delete(caminho);
        }
    }

    [Fact]
    public void Arquivo_que_nao_e_imagem_nao_quebra()
    {
        var caminho = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid():N}.jpg");
        try
        {
            File.WriteAllText(caminho, "não sou imagem");
            Assert.Null(ReducaoImagem.Reduzir(caminho, jpeg: true));
        }
        finally
        {
            File.Delete(caminho);
        }
    }

    private static void GravarFoto(string caminho, int largura, int altura, SKEncodedImageFormat formato, int qualidade, bool liso = false)
    {
        using var bitmap = new SKBitmap(largura, altura);
        var aleatorio = new Random(42);
        for (var y = 0; y < altura; y += liso ? altura : 4)
        {
            for (var x = 0; x < largura; x += liso ? largura : 4)
            {
                var cor = liso ? SKColors.White : new SKColor((byte)aleatorio.Next(256), (byte)aleatorio.Next(256), (byte)aleatorio.Next(256));
                for (var dy = 0; dy < (liso ? altura : 4) && y + dy < altura; dy++)
                {
                    for (var dx = 0; dx < (liso ? largura : 4) && x + dx < largura; dx++)
                    {
                        bitmap.SetPixel(x + dx, y + dy, cor);
                    }
                }
            }
        }

        using var imagem = SKImage.FromBitmap(bitmap);
        using var dados = imagem.Encode(formato, qualidade);
        File.WriteAllBytes(caminho, dados.ToArray());
    }
}
