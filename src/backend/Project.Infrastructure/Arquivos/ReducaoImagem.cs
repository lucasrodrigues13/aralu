using SkiaSharp;

namespace Project.Infrastructure.Arquivos;

/// <summary>
/// Reduz imagens enviadas para economizar disco sem perder a leitura (SPEC-029 §6.6):
/// lado maior até 2000 px, orientação da câmera aplicada, JPEG com qualidade 82 e PNG recomprimido.
/// Só troca o arquivo quando o resultado fica menor.
/// </summary>
public static class ReducaoImagem
{
    public const int LadoMaximo = 2000;
    public const int QualidadeJpeg = 82;

    /// <summary>Devolve os bytes reduzidos, ou null quando não compensa (ou não deu para ler a imagem).</summary>
    public static byte[]? Reduzir(string caminho, bool jpeg)
    {
        try
        {
            using var codec = SKCodec.Create(caminho);
            if (codec is null)
            {
                return null;
            }

            using var original = SKBitmap.Decode(codec);
            if (original is null)
            {
                return null;
            }

            using var orientada = Orientar(original, codec.EncodedOrigin);
            var fonte = orientada ?? original;
            var escala = Math.Min(1.0, (double)LadoMaximo / Math.Max(fonte.Width, fonte.Height));
            var largura = Math.Max(1, (int)Math.Round(fonte.Width * escala));
            var altura = Math.Max(1, (int)Math.Round(fonte.Height * escala));

            using var redimensionada = escala < 1.0
                ? fonte.Resize(new SKImageInfo(largura, altura, fonte.ColorType, fonte.AlphaType), new SKSamplingOptions(SKCubicResampler.Mitchell))
                : null;
            using var imagem = SKImage.FromBitmap(redimensionada ?? fonte);
            using var dados = imagem.Encode(jpeg ? SKEncodedImageFormat.Jpeg : SKEncodedImageFormat.Png, jpeg ? QualidadeJpeg : 100);
            if (dados is null)
            {
                return null;
            }

            var bytes = dados.ToArray();
            var tamanhoOriginal = new FileInfo(caminho).Length;
            return bytes.Length < tamanhoOriginal ? bytes : null;
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static SKBitmap? Orientar(SKBitmap bitmap, SKEncodedOrigin origem)
    {
        var graus = origem switch
        {
            SKEncodedOrigin.BottomRight => 180,
            SKEncodedOrigin.RightTop => 90,
            SKEncodedOrigin.LeftBottom => 270,
            _ => 0,
        };
        if (graus == 0)
        {
            return null;
        }

        var girada = graus == 180
            ? new SKBitmap(bitmap.Width, bitmap.Height, bitmap.ColorType, bitmap.AlphaType)
            : new SKBitmap(bitmap.Height, bitmap.Width, bitmap.ColorType, bitmap.AlphaType);
        using var tela = new SKCanvas(girada);
        tela.Translate(girada.Width / 2f, girada.Height / 2f);
        tela.RotateDegrees(graus);
        tela.Translate(-bitmap.Width / 2f, -bitmap.Height / 2f);
        tela.DrawBitmap(bitmap, 0, 0);
        return girada;
    }
}
