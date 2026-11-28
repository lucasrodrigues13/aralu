# Regras de design da Aralu

Resumo operacional do [Manual da marca v1.0](aralu_manual-da-marca_v1.0.pdf) (20/11/2026). O PDF é a fonte da verdade; este arquivo é o que se consulta no dia a dia ao desenhar tela, e-mail ou peça. Seções entre parênteses, como (04.3), apontam para o capítulo do manual.

> Aviso do manual: os arquivos de logo são definitivos no desenho, mas só valem para registro e impressão depois da busca do nome no INPI.

## 1. Em uma página

- **Promessa:** Tudo em dia. **Conceito:** Luz do dia: cada evento à vista, com clareza, para trabalhar tranquila.
- **Para quem:** cerimonialistas autônomas e com equipe, que tocam vários eventos ao mesmo tempo pelo celular.
- **Personalidade:** Cuidador com traço de Sábio. Clara, tranquila, confiável, prestativa, descomplicada. O cuidado aparece em ação concreta, nunca em palavra de carinho.
- **Cinco testes antes de publicar qualquer peça, tela ou texto (02.5):**
  1. **Simples antes de completo.** Se precisa de explicação, simplifique antes de explicar.
  2. **Mostrar, não enfeitar.** Cada elemento informa ou orienta.
  3. **O automático se explica.** Lembrete, mensagem programada e ação automática dizem o que fizeram, quando e como desfazer.
  4. **Ela é a protagonista.** Na frente do cliente, a marca é a da cerimonialista.
  5. **Uma luz por vez.** Uma ação principal por tela, um destaque por peça.

## 2. Nome e escrita

- "Aralu" no texto, com inicial maiúscula e artigo feminino ("a Aralu avisa"). "aralu" em minúsculas só no logo. Nunca "AraLu", "ARALU", "Aralú", "o Aralu".
- Funções com inicial maiúscula quando nomeiam a área: Painel, Eventos, Tarefas, Fornecedores, Pagamentos, Clientes, Mensagens, Assistente.
- "Clientes", não "noivos". A IA é a função **Assistente**, sem nome próprio, mascote ou ícone de brilho.
- Na área do cliente: nome e logo da cerimonialista; a Aralu entra só como "com tecnologia Aralu" / "Enviado com Aralu".

## 3. Logo (03)

- Logotipo: "aralu" em Playfair Display 500, minúsculas, com a estrela de quatro pontas como único ponto de luz.
- Versões: **principal** (horizontal, padrão), **vertical**, **assinatura com frase** ("Tudo em dia" em Red Hat Text 500) e **símbolo** ("a" + estrela, para avatar, ícone e favicon).
- Cores: **positiva** (Petróleo + Dourado 700) sobre fundo claro; **negativa** (Creme + Dourado 500) sobre Petróleo ou Noite; uma cor (petróleo, preto ou branco), com a estrela na mesma cor das letras.
- Área de proteção: X (altura do "a") em volta do logo; X/2 no símbolo e em barras de interface.
- Tamanho mínimo em tela: logotipo e vertical 80 px de largura; assinatura com frase 140 px; símbolo 32 px; "a" reforçado sem estrela de 16 a 24 px.
- Sobre foto: só em área calma; se não houver, faixa sólida de Creme ou Petróleo.
- **Nunca:** esticar, girar, trocar a fonte, usar a estrela sozinha, repetir a estrela, mudar as cores, aplicar sombra/brilho/degradê, usar só contorno, usar sem contraste.

## 4. Cor (04)

### 4.1. Paleta

| Cor | HEX | Papel |
|---|---|---|
| Petróleo (700) | `#0F4D5C` | Cor da marca: logo, títulos, ação principal, fundos de destaque |
| Creme (neutro 50) | `#F7F4ED` | O papel: fundo principal das peças e da página |
| Dourado 700 | `#A67C2E` | Ponto de luz sobre fundo claro: só a estrela e destaques raros. **Nunca texto** |
| Dourado 500 | `#E2BE6A` | O mesmo ponto de luz sobre Petróleo e Noite. Nunca sobre fundo claro |
| Noite | `#00171F` | Fundo profundo para peças de impacto |
| Céu | `#DDF1F7` | Apoio claro e frio: faixas de informação, selecionados |
| Areia | `#ECE4D5` | Apoio claro e quente: blocos de conteúdo |
| Tinta (neutro 900) | `#132328` | Texto principal |

**Proporção nas peças de marca:** 60% Creme/Areia/Branco, 30% Petróleo e Noite, 8% Céu, ~2% Dourado. **No app** os neutros dominam, Petróleo marca a ação principal e o Dourado aparece só no logo e no estado "Tudo em dia".

### 4.2. Escalas (OKLCH)

| Tom | Petróleo | Neutro | Dourado |
|---|---|---|---|
| 0 | | `#FFFFFF` | |
| 25 | | `#FBFAF6` | |
| 50 | `#EEF9FC` | `#F7F4ED` | |
| 100 | `#DDF1F7` | `#EDE9E1` | `#FBEFD6` |
| 200 | `#BEE2ED` | `#DDD8D0` | |
| 300 | `#90C8D9` | `#C2BDB5` | `#F2D492` |
| 400 | `#5AA4B9` | `#858A8B` | |
| 500 | `#2C8096` | `#677172` | `#E2BE6A` |
| 600 | `#156578` | `#515D61` | |
| 700 | `#0F4D5C` | `#38464B` | `#A67C2E` |
| 800 | `#033743` | `#243338` | |
| 900 | `#00252F` | `#132328` | |
| 950 | `#00171F` | `#071519` | |

### 4.3. Estados (04.4)

Estado é **cor + ícone + palavra**; a cor só reforça (em daltonismo, sucesso, alerta e erro viram o mesmo tom). Texto de estado usa o tom 700 sobre o fundo 50.

| Estado | 50 (fundo) | 600 | 700 (texto) | Escuro |
|---|---|---|---|---|
| Sucesso | `#ECF9EF` | `#186F3B` | `#03572A` | `#94CEA3` |
| Alerta | `#FFF2E9` | `#A05000` | `#823D00` | `#EFAD80` |
| Erro | `#FFF0EE` | `#B02B27` | `#8E1818` | `#FF9C91` |
| Informação | `#EDF6FF` | `#295CA5` | `#194685` | `#97C0FD` |

### 4.4. Tokens de função (08.2)

A interface usa o nome da função, nunca o tom direto. Nunca escreva HEX direto no código das telas.

| Token | Claro | Escuro |
|---|---|---|
| `cor.fundo.pagina` | `#F7F4ED` | `#071519` |
| `cor.fundo.superficie` | `#FFFFFF` | `#132328` |
| `cor.fundo.superficie-2` | `#EDE9E1` | `#243338` |
| `cor.texto.principal` | `#132328` | `#F7F4ED` |
| `cor.texto.secundario` | `#38464B` | `#C2BDB5` |
| `cor.texto.terciario` | `#677172` | `#858A8B` |
| `cor.texto.link` | `#0F4D5C` | `#90C8D9` |
| `cor.borda.campo` | `#858A8B` | `#677172` |
| `cor.borda.divisoria` | `#DDD8D0` | `#243338` |
| `cor.acao.principal` | `#0F4D5C` | `#90C8D9` |
| `cor.texto.sobre-marca` | `#FFFFFF` | `#071519` |
| `cor.foco` | `#2C8096` | `#90C8D9` |
| `cor.fundo.inverso` | `#132328` | `#EDE9E1` |
| `cor.marca.estrela` | `#A67C2E` | `#E2BE6A` |

### 4.5. Contraste (04.5)

WCAG 2.2 AA: texto 4,5:1; texto grande (24 px, ou 18,5 px em negrito), ícone, borda de campo e foco 3:1. Combinações já medidas para texto de qualquer tamanho: Tinta, Neutro 700 ou Petróleo sobre Branco/Creme; Neutro 600 sobre Branco; Branco ou Creme sobre Petróleo; Creme sobre Noite; Petróleo sobre Céu ou Areia. Dourado e Neutro 400 só como elemento gráfico (ícone, borda, estrela). Combinação nova precisa ser medida.

## 5. Tipografia (05)

- **Playfair Display 500**: a voz da marca. Só em momentos de marca: logo, capa, título de campanha, citação, título curto do login e o estado "Tudo em dia". Itálico só em citação. **Nunca** em botão, campo, lista ou texto corrido.
- **Red Hat Text 400/500/600**: a voz do trabalho. Interface, textos, tabelas, botões, documentos. Algarismos tabulares em datas e valores.
- Escala da interface (base 16 px, entrelinha múltipla de 4, nada abaixo de 12 px):

| Token | Tamanho/entrelinha | Peso | Uso |
|---|---|---|---|
| `texto.legenda` | 12/16 | 500 | Legendas, horários |
| `texto.pequeno` | 14/20 | 400 | Texto secundário, ajuda de campo |
| `texto.base` | 16/24 | 400 | Corpo, campos, mensagens |
| `texto.forte` | 16/24 | 600 | Nome de tarefa, botões, links de ação |
| `titulo.p` | 18/26 | 600 | Título de cartão e grupo |
| `titulo.m` | 22/28 | 600 | Título de seção |
| `titulo.g` | 28/34 | 600 | Título da tela |
| `numero` | 32/36 | 600 | Números de painel, sempre tabulares |

- Texto corrido com 45 a 75 caracteres por linha. Campo de formulário com 16 px ou mais.
- Pilhas de reserva:
  - Web: `"Red Hat Text", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`
  - Títulos de marca na web: `"Playfair Display", Georgia, "Times New Roman", serif`
  - **E-mail (HTML): `Arial, Helvetica, sans-serif`; logo sempre como imagem.**
  - Documentos sem as fontes, Google Docs e Canva: Georgia nos títulos, Arial no texto.
- **Erros:** Playfair em botão ou texto corrido; caixa-alta em frase longa; cinza claro sem contraste; espaçamento apertado; algarismos proporcionais em coluna de valores; terceira fonte.

## 6. Elementos visuais (06)

Três elementos, todos tirados do logo. O resto é espaço.

- **Linha do horizonte:** separa a mensagem (acima) da assinatura e da ação (abaixo). A 2/3 da altura nas peças. Uma por peça. 1 px em tela; Neutro 300 `#C2BDB5` sobre claro, Petróleo 500 `#2C8096` sobre escuro. Nunca como sublinhado de título, curva, tracejada ou com degradê.
- **Régua de dias:** traços com espaço igual, um por dia (ou por etapa); o mais longo abre a semana. Nunca vertical, em círculo ou colorida.
- **Ponto de luz:** círculo dourado que marca o "agora" (hoje, etapa atual, "Tudo em dia"). Um por peça ou tela, sempre com texto ao lado. Nunca em botão, aviso, contador, marcador de lista ou piscando.
- **Ícones:** Phosphor Icons 2.1. 16 px Bold (listas densas), 20 px Regular (ao lado de texto), 24 px Regular (navegação), 32 px Light (destaques), 48 px Light (estados vazios). Cor Neutro 700; ativo Petróleo 700; Dourado nunca. Ícones de função: Painel `house`, Eventos `calendar-blank`, Tarefas `list-checks`, Fornecedores `storefront`, Pagamentos `wallet`, Clientes `users`, Mensagens `paper-plane-tilt`, Assistente `chat-teardrop-dots`.
- **Fotografia:** luz natural de uma fonte, gente trabalhando, eventos variados, pessoas reais e diversas. Nunca casal se beijando, alianças, buquê, confete, banco de imagem posado, filtro ou Petróleo por cima da foto, tela com dado real de cliente.
- **Ilustração:** não usamos ilustração de personagem. Estado vazio = ícone 48 px Light Petróleo 500 + linha do horizonte + título + uma frase + uma ação, alinhado à esquerda.
- **Grid das peças:** módulo u = lado menor ÷ 24; margem 2u; colunas separadas por 1u.
- **Movimento:** 100 ms (toque), 200 ms (peças pequenas), 300 ms (painéis e telas); nada na interface passa de 300 ms. Entrada `cubic-bezier(0.2, 0, 0, 1)`, saída `cubic-bezier(0.3, 0, 1, 1)`. Sem quique, elástico ou giro. Respeitar "reduzir movimento".

## 7. Voz e linguagem (07)

Uma colega experiente: calma, direta, com o dado na mão. Mais séria que leve; "você", sem gíria e sem "prezada".

**Sete regras de escrita:**

1. Toda frase leva um dado concreto (data, nome, valor).
2. Primeiro o que importa, depois o resto.
3. Botão diz a ação, com verbo: "Salvar tarefa", não "OK".
4. Uma ideia por frase; até 20 palavras na interface.
5. Sem culpa e sem alarme.
6. O automático se explica.
7. Palavra do setor, não de sistema.

**Palavras:** evento (não projeto/job), clientes (não os noivos), fornecedor (não parceiro), tarefa (não pendência), prazo/vence (não deadline/expira), pagamento/parcela (não transação), painel (não dashboard), entrar/sair (não login/logout), enviar arquivo (não upload), equipe (não time/staff), dia do evento (não grande dia).

**Nunca:** Ops!, Oba!, Eba!; querida, amada, linda; URGENTE, ATENÇÃO; revolucionário, inovador, completo, inteligente; "usuário"; "clique aqui". "Tudo em dia" só quando for verdade, nunca em erro, atraso ou cobrança.

**Tom por momento:** primeiro acesso acolhe em uma linha e mostra o primeiro passo; rotina é breve; prazo chegando avisa e oferece a ação; atraso é calmo, sem culpa, com saída; dia do evento é o mais curto possível; erro do sistema assume o erro e preserva o trabalho; conquista é uma frase sem exagero.

**Formatos (07.9):**

| Item | Assim | Não assim |
|---|---|---|
| Datas | qui., 26/11 na interface · 26/11/2026 em documentos · 26 de novembro em texto corrido | 26/11/26 · 11/26 |
| Dias da semana | seg., ter., qua., qui., sex., sáb., dom. | Seg · SEG |
| Horas | 9h · 14h30 em texto e mensagens · 14:30 em campos e tabelas | 14:30h · 2 pm · 14hs |
| Dinheiro | R$ 1.200,00 (R$ 1,2 mil só em gráficos) | R$1200 · 1.200 reais |
| Números | algarismos: 3 tarefas | três tarefas |
| Ordinais | 2ª parcela · 3º evento | 2a parcela |
| Maiúsculas | só a primeira letra: Criar evento | Criar Evento · CRIAR EVENTO |
| Pontuação | sem ponto em títulos, botões e rótulos; no máximo uma exclamação; sem reticências | Salvar. · Pronto!!! · Carregando... |
| Emoji | nunca na interface, no Assistente ou em e-mail do sistema | |
| Links | o texto diz o destino: Ver tarefas da semana | clique aqui · saiba mais |

**Linguagem inclusiva:** "Boas-vindas", não "Bem-vinda"; sem x, @ ou "e" neutro; não presumir o casal nem o tipo de evento; evitar termos com carga (lista negra, denegrir).

## 8. Produto digital (08)

- Na interface, quem aparece é o evento. A marca vive na cor das ações, na voz dos textos e em dois momentos: a chegada (login, boas-vindas) e o "Tudo em dia".
- Logo em: login, boas-vindas, menu lateral no computador, **e-mails**. Nunca na barra de topo de cada tela.
- Um botão principal por tela. Ações principais na metade de baixo no celular.
- **Medidas:** espaço em múltiplos de 4 (4, 8, 12, 16, 24, 32, 48, 64). Margem lateral 16 px; entre cartões 12 px; dentro do cartão 16 px.
- **Cantos:** 4 px (tags), **8 px (botões, campos, cartões)**, 16 px (folhas, confirmação). Nunca pílula.
- **Sombra:** cartão não tem sombra, tem contorno de 1 px. Sombra só no que flutua: `0 1px 2px rgb(7 21 25 / 8%), 0 6px 20px rgb(7 21 25 / 12%)`.
- **Tamanhos:** alvo mínimo 44 px; campo e botão 48 px; botão compacto 40 px (só em lista densa); barra de topo 56 px; barra de abas 64 px.
- **Layout:** celular primeiro (360 px). Celular até 599 px: 4 colunas, margem 16 px, abas embaixo. Tablet 600–1023 px: 8 colunas, 24 px, trilho lateral. Computador 1024 px+: 12 colunas, 32 px, menu lateral com logo. Leitura até 720 px de largura; tabelas até 1200 px.
- **Botões e campos:** verbo no começo; perigo só para o que apaga, sempre com confirmação; rótulo sempre acima do campo; placeholder mostra o formato; erro ao sair do campo, com ícone e frase de correção; R$ fixo à esquerda.
- **Etiquetas:** ícone + palavra, nunca só cor; no máximo uma por linha; contorno de 1 px.
- **Alertas e avisos:** alerta na página para o que continua valendo; aviso temporário com Desfazer por 5 s (nunca para erro); confirmação só antes do que não tem volta. `role="status"` em alertas e avisos; `role="dialog"` na confirmação, com foco no botão menos perigoso.
- **Acessibilidade:** anel de foco de 2 px a 2 px de distância; funciona com texto em 200%; ícone sozinho tem rótulo; estado nunca só por cor.

## 9. E-mails enviados pelo sistema

O manual não tem um capítulo de e-mail transacional; estas regras aplicam o que ele define para e-mail (05.4, 08.1, 09.7) e para voz (07). Implementação em `src/backend/Project.Infrastructure/Conta/EmailModelo.cs`.

### 9.1. Estrutura

1. **Topo:** logo positivo (Petróleo + Dourado 700) em PNG, exibido com 120 px de largura e arquivo com o dobro do tamanho, hospedado em `{PublicUrl}/marca/aralu-email.png`. Nunca anexado.
2. **Cartão** branco com contorno de 1 px Neutro 200 e cantos de 8 px, sobre fundo Creme, até 560 px de largura.
3. **Título** curto, em Arial 22/28 negrito, cor Tinta. Sem ponto final.
4. **Texto** em Arial 16/24, Tinta ou Neutro 700. Uma ideia por parágrafo, com o dado concreto (nome, prazo, empresa).
5. **Um botão** principal: Petróleo `#0F4D5C`, texto branco, 48 px de altura, cantos de 8 px, verbo no começo ("Confirmar e-mail"). Feito com tabela (funciona no Outlook).
6. **Link alternativo** abaixo do botão, em texto pequeno, para quem não consegue tocar no botão.
7. **Nota** em texto pequeno Neutro 600 (validade do link, "se não foi você, ignore").
8. **Linha do horizonte** (1 px Neutro 300) separando a mensagem da assinatura.
9. **Rodapé:** "Aralu · Tudo em dia" e o motivo do e-mail, em 12 px Neutro 600.

### 9.2. Regras

- HTML em tabelas, estilos na própria linha, `Arial, Helvetica, sans-serif`. Sem fontes da web, sem imagens de fundo, sem SVG.
- Sempre `multipart/alternative`: versão em texto puro com o mesmo conteúdo e o link completo.
- Preheader (texto de prévia oculto) com a frase que resume o e-mail.
- Dourado só na estrela do logo. Nada de ponto de luz, emoji ou caixa-alta no e-mail.
- Assunto curto, com o dado: "Confirme seu e-mail na Aralu", "Convite de Assessoria X para ser assistente".
- Quando o e-mail é enviado **em nome da cerimonialista** (para clientes ou fornecedores), o nome da assessoria assina e a Aralu aparece no máximo no rodapé, "Enviado com Aralu" (07.8). Os e-mails da conta (confirmação, senha) são da própria Aralu.
- Modo escuro dos programas de e-mail: fundos e textos com cor explícita; o logo PNG tem fundo transparente e funciona sobre o Creme.

## 10. Diferenças entre o manual e o app atual

O app (ver [design-system.md](../design-system.md)) foi construído antes do manual. Pontos a alinhar quando a interface for revisada:

| Item | App hoje | Manual |
|---|---|---|
| Petróleo | `#104c5b` | `#0F4D5C` |
| Dourado | `#c9a24c` | `#A67C2E` (claro) / `#E2BE6A` (escuro) |
| Creme | `#f6f3ec` | `#F7F4ED` |
| Fundo escuro | `#172429` | `#071519` (neutro 950) |
| Fonte | DM Sans | Red Hat Text (+ Playfair só em marca) |
| Ícones | Material Symbols | Phosphor Icons |
| Estados | cores do template (`#13deb9`, `#ffae1f`…) | famílias da seção 4.3 |
| Cantos | 7 px | 8 px |
| Cartões | sombra `--mat-sys-level1` | contorno de 1 px, sem sombra |
| Botão/campo | 37 px | 48 px (40 px em lista densa) |
