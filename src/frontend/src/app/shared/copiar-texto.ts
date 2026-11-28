/**
 * Copia o texto inteiro para a área de transferência e devolve se deu certo.
 * Em http fora de localhost (sem contexto seguro) o `navigator.clipboard` não existe;
 * aí cai no plano B de selecionar um campo escondido e usar `execCommand('copy')`.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Permissão negada: tenta o plano B.
    }
  }
  return copiarPorSelecao(texto);
}

function copiarPorSelecao(texto: string): boolean {
  const campo = document.createElement('textarea');
  campo.value = texto;
  campo.setAttribute('readonly', '');
  campo.style.position = 'fixed';
  campo.style.opacity = '0';
  document.body.appendChild(campo);
  campo.select();
  campo.setSelectionRange(0, texto.length);
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    campo.remove();
  }
}
