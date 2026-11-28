# 061. Página de aceite rica

**Status: aprovada (25/11/2026, pelo dono do projeto) e implementada; ajustes da implementação na seção 18.** Fonte: conversa de 25/11/2026 com o dono do projeto (mockups aprovados). Estende e **substitui em parte** a [SPEC-057](057-html-do-modelo-de-orcamento-na-tela-de-aceite.md) (itens 8, 12 e 17.3 a 17.7). Reaproveita o padrão do seletor de tags da [SPEC-053](053-seletor-de-tags-do-modelo-de-contrato.md) e o Live Preview da [SPEC-055](055-live-preview-do-modelo-de-contrato.md).

## 1. Identificador e nome

SPEC-061. Página de aceite rica.

## 2. Objetivo

A cerimonialista transforma a apresentação que hoje manda em PDF ou PPT (serviços, como trata a noiva, fotos do dia a dia e do evento) numa **página de aceite própria**, que ela estiliza por inteiro e que leva o cliente ao botão de aceitar. Deve ser fácil: ela leva o PDF a uma IA de preferência com um prompt pronto, cola o HTML no Aralu e o sistema mostra onde entram o logo e as fotos. Quem não quiser montar pode contratar a Aralu para montar a página.

## 3. Requisitos relacionados

RF-075 (funil). Sem RF novo.

## 4. Atores e permissões

Os mesmos da SPEC-057: quem edita modelos de orçamento monta a página; o cliente a vê pelo link da proposta, sem login.

## 5. Pré-condições

Modal "Novo/Editar modelo de orçamento" aberto; orçamento criado a partir do modelo; link da proposta válido.

## 6. Fluxo principal

### 6.1 Modal do modelo de orçamento

1. O modal fica mais largo (~960 px).
2. **Texto da proposta:** os botões soltos de tags dão lugar ao seletor "Inserir tags no cursor" com busca e botão de ajuda (padrão SPEC-053), com 17 tags de dados (seção 11.1).
3. **Tela de aceite (HTML, opcional):** caixa de código em largura total, com o dobro da altura do texto (~360 px), fonte monoespaçada.
   - Botão de ajuda: explica que o campo define **a página de aceite inteira** (fundo, fontes, cores, capa, fotos, seções), que as tags funcionam ali e oferece "Quero que a Aralu monte para mim".
   - Seletor "Inserir tags no HTML", com dois grupos: **Dados** (as 17 tags) e **Componentes** (seção 11.2). Insere no cursor do código.
   - Botão **Gerar com IA**: abre um modal com o passo a passo (copiar o prompt, levar à IA com o PDF ou PPT, colar o resultado) e o botão "Copiar prompt" (seção 11.4).
   - Botão **Live Preview**: abre um **modal próprio** com a página como o cliente vê, com exemplos (destacados em amarelo) no lugar das tags de dados e as mídias já enviadas.
4. **Assistente de mídia:** abaixo do código, lê as tags de componentes do HTML e lista cada espaço (logo, capa, imagem, galeria, carrossel), com onde aparece, tamanho sugerido, situação (preenchido ou vazio) e botão de envio. Galeria e carrossel aceitam várias fotos de uma vez, com reordenação e remoção. Avisa quando falta `{{botoes_resposta}}` (o sistema os coloca no fim) e quando há espaço vazio.
5. As mídias pertencem ao modelo e são gravadas com ele.

### 6.2 Orçamento

Ao criar o orçamento a partir do modelo, o servidor copia o HTML **e a lista de mídias** (referências aos mesmos arquivos). Mudanças posteriores no modelo não alteram orçamentos já criados (regra da SPEC-057).

### 6.3 Página pública

1. Orçamento **com** HTML de aceite: a página vira a página da cerimonialista. O cabeçalho e o cartão padrão do Aralu saem, o HTML ocupa a tela inteira, e os blocos do sistema aparecem onde estiverem as tags de blocos.
2. Se o HTML não tiver `{{botoes_resposta}}`, o sistema acrescenta os botões no fim. Nenhuma proposta fica sem como aceitar.
3. Clicar num botão de resposta abre o fluxo atual (formulário de dados do contrato, dúvida ou recusa) na página do Aralu.
4. Orçamento **sem** HTML: a página fica como hoje.
5. Proposta vencida, cancelada ou já respondida: segue a regra atual (não mostra o HTML quando vencida ou cancelada; respondida mostra o resultado).

## 7. Fluxos alternativos

- Tag de componente sem mídia enviada: o componente não aparece para o cliente. No Live Preview aparece um quadro tracejado "Envie as fotos de …".
- Tag de componente com nome desconhecido ou digitado errado: fica como texto e o assistente avisa.
- Mídia apagada do modelo depois de criado o orçamento: o arquivo continua guardado enquanto algum orçamento o referenciar.

## 8. Regras de negócio (segurança)

O HTML continua sendo **não confiável** (exibido a terceiros), mas agora pode ter estilo. O que muda em relação à SPEC-057:

1. **Isolamento por iframe:** o HTML é exibido dentro de um `<iframe srcdoc>` com `sandbox="allow-top-navigation-by-user-activation allow-popups allow-popups-to-escape-sandbox"`, **sem** `allow-scripts` e **sem** `allow-same-origin`. Não roda script e não acessa cookies nem a página do Aralu. A página que monta o `srcdoc` acrescenta uma CSP (`default-src 'none'; img-src https: <origem da API>; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com`).
2. **Sanitização no servidor continua**, com lista permitida ampliada:
   - Tags novas: `style`, `section`, `header`, `footer`, `main`, `article`, `aside`, `nav`.
   - Atributos novos em todas as tags permitidas: `class`, `id`, `style`.
   - CSS (em `<style>` e em `style=""`): remove `@import` (exceto Google Fonts), `expression(`, `behavior`, `-moz-binding`, `javascript:` e `url()` que não seja `https:` ou da própria API. Máximo de 50.000 caracteres no total do HTML.
   - Continuam proibidos: `script`, `iframe`, `object`, `embed`, `form`, `input`, `link` (exceto Google Fonts), `meta`, `base`, `svg`, `math`, `on*`, `javascript:`, `data:`.
3. **Vídeo e mapa:** só entram pelas tags `{{video:...}}` e `{{mapa:...}}`, que o servidor transforma em iframe de domínio permitido (YouTube nocookie, Vimeo, Google Maps embed). Iframe escrito à mão continua removido.
4. **Botões de resposta:** dentro do iframe são links `target="_top"` para a própria página com `?resposta=aceitar|duvidas|recusar`; a página Angular lê o parâmetro e abre o fluxo. Sem script dentro do iframe.
5. **Mídias públicas só pelo token:** `GET /api/v1/publico/propostas/{token}/midias/{arquivoId}` serve só arquivos da lista do orçamento do token, com `nosniff`. Fora da lista, 404.
6. Sanitização ao gravar e ao servir (defesa em profundidade) e idempotente, como na SPEC-057.

## 9. Validações

- HTML até 50.000 caracteres.
- Mídias: JPG, JPEG, PNG ou WEBP de até 5 MB cada, reduzidas no servidor (mesmo fluxo das inspirações); até 40 fotos por modelo.
- Nome de componente: letras minúsculas, números e `_`, até 40 caracteres.

## 10. Estados

Modelo e orçamento com ou sem HTML; cada espaço de mídia preenchido ou vazio.

## 11. Dados necessários

### 11.1 Tags de dados (17)

`{{nome_oportunidade}}`, `{{nome_contratante}}`, `{{tipo_evento}}`, `{{data_evento}}`, `{{hora_evento}}`, `{{convidados}}`, `{{local_cerimonia}}`, `{{local_recepcao}}`, `{{endereco_cerimonia}}`, `{{endereco_recepcao}}`, `{{valor}}`, `{{validade}}`, `{{servicos_contratados}}`, `{{forma_pagamento}}`, `{{nome_assessoria}}`, `{{telefone_assessoria}}`, `{{link_aceite}}`. Valem no texto e no HTML. Sem o dado, ficam vazias.

### 11.2 Componentes

| Tag | O que vira |
| --- | --- |
| `{{logo}}` | Logo da assessoria (do perfil; pode ser trocado no modelo) |
| `{{imagem:nome}}` | Uma foto (ex.: `capa`, `retrato`) |
| `{{galeria:nome}}` | Grade responsiva de fotos |
| `{{carrossel:nome}}` | Carrossel de fotos em CSS (rolagem com encaixe, setas e pontos por âncoras), sem script |
| `{{video:link}}` | Vídeo do YouTube ou Vimeo |
| `{{mapa:local_cerimonia}}` ou `{{mapa:local_recepcao}}` | Mapa do local |
| `{{depoimentos}}` | Lista de depoimentos cadastrados no modelo |
| `{{botao_whatsapp}}` | Botão para o WhatsApp da assessoria |

Cada componente sai com classes `aralu-*` (ex.: `.aralu-galeria`, `.aralu-carrossel`) que a cerimonialista pode estilizar.

### 11.3 Blocos do sistema

`{{bloco_proposta}}` (texto do orçamento), `{{bloco_valor}}` (valor e parcelas) e `{{botoes_resposta}}` (Aceitar, Tenho dúvidas, Não vou seguir), com as classes `.aralu-proposta`, `.aralu-valor` e `.aralu-botoes`.

### 11.4 Prompt para IA

Texto fixo, mantido no frontend, que pede: HTML único com `<style>` no topo; sem script nem iframe; as tags das seções 11.1 a 11.3 no lugar de dados, fotos e blocos; um nome de galeria ou carrossel por seção de fotos do PDF; `{{botoes_resposta}}` perto do fim; visual responsivo para celular; e só o código como resposta.

### 11.5 Banco

Migration `MidiasDaPaginaDeAceite`: tabela `MidiasAceite` (`Id`, `ContaId`, `ModeloOrcamentoFunilId` ou `OrcamentoFunilId`, `Espaco` (ex.: `logo`, `galeria:bastidores`), `ArquivoId`, `Ordem`). Depoimentos: coluna `DepoimentosAceite` (`jsonb`, lista de `{ texto, autor }`) em `ModelosOrcamentoFunil` e `OrcamentosFunil`. Só acrescenta; nada é apagado.

### 11.6 API

- `POST /api/v1/modelos-orcamento-funil/midias`: envia uma foto e devolve o `arquivoId`.
- `POST` e `PUT /api/v1/modelos-orcamento-funil` aceitam `midias: [{ espaco, arquivoId, ordem }]` e `depoimentos`.
- `GET /api/v1/publico/propostas/{token}` devolve `htmlAceite` já sanitizado, `midias` (com URL pública), `depoimentos` e os dados das tags.
- `GET /api/v1/publico/propostas/{token}/midias/{arquivoId}`: pública (seção 8.5).

## 12. Interface

Conforme os mockups aprovados em 25/11/2026: modal largo; código em largura total; seletores de tags com ajuda; "Gerar com IA"; Live Preview em modal próprio; assistente de mídia em lista abaixo do código. Na página pública, o iframe ocupa a tela inteira (largura total, altura `100vh`) e tem rolagem própria. Como o HTML é a página toda, não há conteúdo do Aralu acima ou abaixo dele; sem script nem `allow-same-origin`, a página Angular não consegue medir a altura do conteúdo, e por isso não tenta. O formulário de resposta abre num painel do Aralu por cima do iframe.

## 13. Erros

- Envio de foto recusado: aviso com o motivo ("Use JPG, PNG ou WEBP de até 5 MB.").
- Falha ao gravar mantém o modelo anterior.

## 14. Critérios de aceite

1. O modal tem o seletor de tags com ajuda no texto e no HTML, com as 17 tags de dados e os componentes.
2. "Gerar com IA" copia o prompt; o HTML que a IA devolve, colado, mostra os espaços de mídia no assistente.
3. Enviar fotos para `{{galeria:x}}` e `{{carrossel:y}}` mostra a galeria e o carrossel no Live Preview e na página do cliente.
4. O HTML com `<style>` muda fundo, fontes e cores da página inteira.
5. Sem `{{botoes_resposta}}`, os botões aparecem no fim; clicar em Aceitar abre o formulário de dados do contrato.
6. `<script>`, `on*`, `javascript:`, iframe escrito à mão e `url()` perigosa somem; o iframe não roda script.
7. Uma mídia de outro orçamento não abre pelo token deste.
8. Orçamento sem HTML: página como hoje.

## 15. Cenários de teste

Unidade: sanitização de CSS (`@import`, `expression`, `url(javascript:)`, `url(data:)`), novas tags e atributos, tags de componentes (nome válido, inválido, sem mídia), vídeo e mapa só de domínios permitidos, inserção de `{{botoes_resposta}}` quando falta, idempotência. Integração: salvar modelo com mídias, criar orçamento, `GET` público com mídias e página, mídia de outro orçamento devolve 404. A página é conferida no navegador (desktop e celular).

## 16. Dependências

SPEC-057, SPEC-053, SPEC-055, SPEC-031 parte C, SPEC-042, SPEC-005 (logo do perfil).

## 17. Pontos para o dono decidir

1. **Escopo:** tudo de uma vez (pedido em 25/11/2026), incluindo vídeo, mapa, depoimentos e WhatsApp.
2. **Modelos prontos de página** ("Elegante", "Praia", "Minimalista"): ficam para uma próxima spec.
3. **Tags novas** (`servicos_contratados`, `forma_pagamento`, `telefone_assessoria`, `nome_contratante`): dependem de dados que precisam ser conferidos na oportunidade e no perfil; sem o dado, a tag fica vazia.
4. **Fontes externas:** só Google Fonts.

## 18. Ajustes feitos na implementação (25/11/2026)

Prevalecem sobre as seções acima onde divergem.

1. **Iframe por `srcdoc`:** o servidor devolve o documento completo em `paginaAceite` no `GET /api/v1/publico/propostas/{token}` (não há rota `/pagina`). A CSP vai numa `<meta http-equiv>` dentro do documento (`default-src 'none'; img-src * data: blob:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com`). O iframe público usa `sandbox="allow-top-navigation-by-user-activation allow-popups allow-popups-to-escape-sandbox"`, e o do Live Preview, `sandbox="allow-popups allow-popups-to-escape-sandbox"`; nenhum tem `allow-scripts` nem `allow-same-origin`. O documento é atribuído a `iframe.srcdoc` pelo código (o `[innerHTML]` do Angular tiraria o CSS).
2. **Endereços resolvidos no navegador:** fotos saem como `aralu-midia:{id}` e botões como `aralu-resposta:{tipo}`. A página pública troca as fotos pelo endereço público do token e os botões por `/proposta/{token}?resposta={tipo}`; o Live Preview baixa as fotos com a sessão e as embute como `data:`.
3. **Vídeo e mapa sem iframe:** dentro de um iframe sem scripts, players embutidos não funcionam. `{{video:...}}` vira a capa do vídeo (YouTube) ou um botão (Vimeo), com link que abre o vídeo em nova aba; `{{mapa:...}}` vira um cartão com nome, endereço e "Ver no mapa" (busca do Google Maps).
4. **Banco:** em vez de tabela `MidiasAceite`, uma coluna `ExtrasAceite` (`text`, JSON com `midias` e `depoimentos`) em `ModelosOrcamentoFunil` e `OrcamentosFunil` (migration `MidiasDaPaginaDeAceite`). O orçamento copia o JSON do modelo ao ser criado.
5. **Fotos:** JPG ou PNG (o armazenamento não aceita WEBP), até 5 MB, reduzidas no navegador antes do envio. Rota `POST /api/v1/modelos-orcamento-funil/midias`. O logo usa a foto do perfil (`FotoId`) quando o modelo não tem foto em `logo`.
6. **Live Preview:** `POST /api/v1/modelos-orcamento-funil/pagina-aceite/previa` recebe o que está no modal (sem salvar) e devolve o documento com exemplos, valor de R$ 8.500,00 e três parcelas fictícias. Alterna largura de computador e celular.
7. **HTML sem nenhum bloco** (como os da SPEC-057): a proposta e o valor entram depois dele, e os botões no fim, para que esses modelos continuem mostrando o texto e o valor. Basta usar qualquer tag de bloco para controlar a posição.
8. **Tag `{{link_aceite}}` trocada por `{{link_whatsapp}}`** (o link da proposta não existe quando o orçamento é criado). `{{link_whatsapp}}` pode ser usada em `href` (`<a href="{{link_whatsapp}}">`); tags dentro de outros atributos recebem só texto, e componentes dentro de atributos somem.
9. **Tags de dados:** `{{servicos_contratados}}` = serviço/produto da oportunidade; `{{forma_pagamento}}` = resumo das parcelas (só na página, onde as parcelas já existem; no texto criado do modelo fica vazia); `{{telefone_assessoria}}` = celular do perfil; `{{hora_evento}}` = hora da cerimônia, ou da recepção, ou da festa.
10. **Cores do modelo:** a cor primária e a secundária viram `--aralu-primaria` e `--aralu-secundaria` no CSS base da página.
11. **Painel de resposta:** com página própria, o formulário de aceite, dúvida ou recusa abre num painel do Aralu por cima da página da assessoria (embaixo no celular, centralizado no computador). A faixa "Você está vendo como assessoria" fica no topo.
