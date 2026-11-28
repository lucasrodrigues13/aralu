// Gera public/compartilhar.png (1200x630), a imagem que aparece quando o link é compartilhado.
// Rode com `npm run og` quando o logo ou a frase mudarem.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const raiz = new URL('..', import.meta.url);
const logo = await readFile(new URL('src/assets/aralu.svg', raiz));

const fundo = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#F7F4ED"/>
  <rect x="100" y="420" width="1000" height="1" fill="#C2BDB5"/>
  <text x="100" y="500" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="#0F4D5C">Tudo em dia</text>
  <text x="100" y="548" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#38464B">Sistema para cerimonialistas</text>
</svg>`);

const marca = await sharp(logo, { density: 300 }).resize({ width: 520 }).png().toBuffer();

await sharp(fundo)
  .composite([{ input: marca, left: 92, top: 150 }])
  .png({ compressionLevel: 9 })
  .toFile(new URL('public/compartilhar.png', raiz).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

console.log('public/compartilhar.png gerado');
