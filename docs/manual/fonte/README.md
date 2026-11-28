# Fonte do manual

O manual tem uma fonte só, que serve à tela **Manual de uso** do sistema (menu Principal, rota `/ajuda`) e ao PDF `../manual-de-utilizacao-aralu.pdf`.

- `src/frontend/public/manual/index.html`: o texto do manual inteiro. É servido em `/manual/index.html`.
- `src/frontend/public/manual/shots/`: os prints que o manual usa.
- `docs/manual/fonte/roteiros/`: os scripts puppeteer que capturam os prints (`s01.js` … `s60.js`), os helpers (`h.js`, `h2.js`), o executor `s.js` e o gerador `pdf.js`.
- `docs/manual/fonte/anexos/`: arquivos usados na história (PDFs de contrato, comprovante, logo da assessoria).
- `docs/manual/pendencias.md`: o que mudou no sistema e ainda falta no manual.

Para mudar o texto, edite o `index.html`; a tela do sistema mostra a alteração no próximo deploy. O PDF só precisa ser gerado quando alguém pedir.

## Como refazer prints e PDF

1. Suba o sistema (`just up`, em http://localhost:8080) com a conta da história, `julia@atelieflordelis.test`.
2. `npm install` em `docs/manual/fonte` (instala o puppeteer-core).
3. Abra o Edge com depuração remota:
   `msedge --headless=new --remote-debugging-port=9333 --user-data-dir=prof --disable-extensions --window-size=1366,850 --lang=pt-BR`
4. A partir de `src/frontend/public/manual` (os prints vão para `shots/`): `node ../../../../docs/manual/fonte/roteiros/s.js ./s13.js`.
5. PDF: `node ../../../../docs/manual/fonte/roteiros/s.js ./pdf.js`.

Os roteiros dependem dos dados criados pelos anteriores. Em base nova, rode em ordem.
