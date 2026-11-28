/** Tamanho máximo aceito pelo servidor para imagens e PDFs da galeria. */
export const LIMITE_ARQUIVO_BYTES = 5 * 1024 * 1024;

/** Imagens acima disso são reprocessadas no navegador antes do envio. */
export const ALVO_IMAGEM_BYTES = 2 * 1024 * 1024;

/** Maior lado depois da redução: nítido em telas grandes e ainda leve. */
const LADO_MAXIMO = 2560;

/**
 * Reduz JPG/PNG maiores que {@link ALVO_IMAGEM_BYTES}: limita o maior lado e regrava em JPEG, baixando a qualidade
 * aos poucos (0,88 → 0,6) até caber. Arquivos dentro do alvo, PDFs e falhas de leitura voltam como vieram.
 */
export async function reduzirImagem(arquivo: File): Promise<File> {
  if (!/^image\/(jpeg|png)$/.test(arquivo.type) || arquivo.size <= ALVO_IMAGEM_BYTES) {
    return arquivo;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    return arquivo;
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return arquivo;
  }
  // PNG com transparência vira JPEG: fundo branco no lugar do transparente.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let melhor: Blob | null = null;
  for (const qualidade of [0.88, 0.8, 0.72, 0.6]) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', qualidade));
    if (!blob) {
      break;
    }
    melhor = blob;
    if (blob.size <= ALVO_IMAGEM_BYTES) {
      break;
    }
  }

  if (!melhor || melhor.size >= arquivo.size) {
    return arquivo;
  }
  const nome = arquivo.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([melhor], nome, { type: 'image/jpeg', lastModified: Date.now() });
}
