function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Abre o contrato numa janela limpa e chama a impressão do navegador (dá para salvar em PDF). */
export function imprimirContrato(titulo: string, texto: string, empresa: string | null): void {
  const janela = window.open('', '_blank');
  if (!janela) return;
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapar(titulo)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.6; }
  header { border-bottom: 1px solid #ccc; margin-bottom: 24px; padding-bottom: 8px; }
  h1 { font-size: 20px; margin: 0; }
  p.empresa { margin: 4px 0 0; color: #555; font-size: 13px; }
  .texto { white-space: pre-wrap; font-size: 14px; }
</style></head><body>
<header><h1>${escapar(titulo)}</h1>${empresa ? `<p class="empresa">${escapar(empresa)}</p>` : ''}</header>
<div class="texto">${escapar(texto)}</div>
</body></html>`);
  janela.document.close();
  janela.focus();
  janela.print();
}
