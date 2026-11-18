# Design system

**Versão 2, 18/11/2026.** Recomeçado do zero a partir da demo pública [Apex Dashboard (Angular)](https://apex-angular.dashboardpack.com), medida nas telas [Dashboard](https://apex-angular.dashboardpack.com/dashboard), [Orders](https://apex-angular.dashboardpack.com/orders), [Forms](https://apex-angular.dashboardpack.com/forms), [Components](https://apex-angular.dashboardpack.com/ui/components) e no modal "New event" de [Calendar](https://apex-angular.dashboardpack.com/calendar), nos modos claro e escuro. A versão anterior foi descartada.

A demo é feita com spartan-ng e Tailwind. O gevents **não** usa essas bibliotecas nem copia código do template: os valores medidos viram tokens CSS, e os componentes continuam sendo Angular Material (DA-044), reestilizados por esses tokens.

Implementação: `src/frontend/src/styles.scss` e as partes em `src/frontend/src/styles/`.

## 1. Regras gerais

1. **Todo cadastro e toda edição abrem em modal** sobre a tela atual. A rota não muda. Vale para evento, cliente, fornecedor, tarefa, convite, convidado, modelo, compromisso, oportunidade, contrato, orçamento e qualquer entidade nova. Ficam como página só: Perfil e Ajustes da conta, telas de detalhe com conteúdo próprio (home do evento, editor de modelo) e telas públicas.
2. Excluir, cancelar e outras ações destrutivas pedem confirmação em modal pequeno.
3. Uma cor primária (verde). Cor de estado só para estado (sucesso, alerta, erro).
4. Modo claro e modo escuro, com os mesmos componentes. A barra lateral é escura nos dois.
5. Texto em português, frase curta. Botão diz a ação ("Salvar evento", "Novo convite").
6. Nada de gráfico decorativo sem dado real.

## 2. Tema

- A classe `escuro` no `<html>` liga o modo escuro; sem ela vale o claro.
- Escolha salva em `localStorage`, chave `gevents-tema` (`claro` / `escuro`). Sem escolha salva, segue `prefers-color-scheme`.
- O botão de tema fica na barra superior da casca. Nas telas públicas fica fixo no canto superior direito.

## 3. Tokens

### 3.1. Cor

Valores em `oklch`, medidos na demo.

| Token | Uso | Claro | Escuro |
|---|---|---|---|
| `--gd-background` | Fundo da página | `oklch(0.985 0.002 230)` | `oklch(0.075 0 0)` |
| `--gd-foreground` | Texto principal | `oklch(0.155 0.015 230)` | `oklch(0.922 0.005 230)` |
| `--gd-card` | Cartão, modal | `oklch(1 0 0)` | `oklch(0.19 0 0)` |
| `--gd-popover` | Menu, lista suspensa | `oklch(1 0 0)` | `oklch(0.21 0 0)` |
| `--gd-primary` | Ação principal, item ativo, link | `oklch(0.55 0.19 160)` | `oklch(0.55 0.19 160)` |
| `--gd-primary-foreground` | Texto sobre o primário | `oklch(1 0 0)` | `oklch(1 0 0)` |
| `--gd-secondary` | Botão secundário | `oklch(0.96 0.005 230)` | `oklch(0.235 0 0)` |
| `--gd-muted` | Superfície discreta (abas, campo) | `oklch(0.96 0.005 230)` | `oklch(0.235 0 0)` |
| `--gd-muted-foreground` | Texto de apoio, cabeçalho de tabela | `oklch(0.556 0.015 230)` | `oklch(0.556 0.015 230)` |
| `--gd-accent` | Hover de item | `oklch(0.96 0.005 230)` | `oklch(0.235 0 0)` |
| `--gd-border` | Bordas e divisórias | `oklch(0.895 0.005 230)` | `oklch(0.28 0 0)` |
| `--gd-input` | Borda de campo | `oklch(0.86 0.005 230)` | `oklch(0.28 0 0)` |
| `--gd-ring` | Foco | `oklch(0.55 0.19 160)` | `oklch(0.55 0.19 160)` |
| `--gd-success` | Sucesso, concluído, confirmado | `oklch(0.62 0.17 145)` | igual |
| `--gd-warning` | Pendente, atenção | `oklch(0.75 0.175 75)` | igual |
| `--gd-destructive` | Erro, cancelado, excluir | `oklch(0.577 0.245 27.325)` | igual |
| `--gd-info` | Informação, em andamento | `oklch(0.6 0.16 250)` | `oklch(0.62 0.16 250)` |
| `--gd-sidebar` | Fundo da barra lateral | `oklch(0.14 0.015 170)` | `oklch(0.11 0 0)` |
| `--gd-sidebar-foreground` | Texto da barra | `oklch(0.87 0.005 230)` | `oklch(0.9 0.005 230)` |
| `--gd-sidebar-accent` | Item ativo / hover | `oklch(0.2 0.015 170)` | `oklch(0.2 0 0)` |
| `--gd-sidebar-primary` | Texto do item ativo | `oklch(0.6 0.175 160)` | `oklch(0.65 0.19 160)` |
| `--gd-sidebar-border` | Divisórias da barra | `oklch(0.22 0.015 170)` | `oklch(0.26 0 0)` |

Tons de estado em fundo usam a própria cor a **15%** (badge) ou **5%** com borda a 30% (alerta), via `color-mix`.

### 3.2. Tipografia

Fonte **Geist** (`@fontsource-variable/geist`, família `Geist Variable`), reserva `ui-sans-serif, system-ui, sans-serif`. Ícones: Material Symbols do Angular Material, 18px em botão e 20px na barra lateral.

| Papel | Tamanho / peso / entrelinha | Extra |
|---|---|---|
| Título da página (`h1`) | 24px / 700 / 32px | `letter-spacing: -0.6px` |
| Número de destaque | 24px / 700 / 32px | `letter-spacing: -0.6px` |
| Título de cartão | 16px / 600 / 24px | |
| Título de modal | 16px / 700 / 24px | |
| Corpo, célula, campo | 14px / 400 / 20px | |
| Rótulo de campo, botão, item de menu | 14px / 500 / 20px | |
| Apoio, descrição | 14px / 400 em `--gd-muted-foreground` (12px dentro de cartão e modal) | |
| Cabeçalho de tabela, rótulo de número | 12px / 500 / 16px, `--gd-muted-foreground` | |
| Badge | 12px / 500 | |
| Grupo da barra lateral | 10px / 600, caixa alta, `letter-spacing: 1px`, 30% de opacidade | |

### 3.3. Espaço, raio, sombra

- Grade de 4px. Respiro da página: **24px** (16px até 639px). Distância entre blocos: 24px. Entre campos: 16px.
- Raios: campo **10px**, botão **8px**, aba ativa 8px, cartão **14px**, modal **18px**, badge em pílula.
- Cartão: anel de 1px `--gd-foreground` a 10% + sombra `0 1px 2px rgb(0 0 0 / 0.05)`. Sem sombra grande.
- Modal: sombra `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`.
- Foco: anel de 3px `--gd-ring` a 50% e borda `--gd-ring`.

## 4. Casca

### 4.1. Computador (≥ 960px)

- **Barra lateral** fixa, 260px, fundo `--gd-sidebar`.
  - Marca no topo (64px): selo verde 32px raio 10px + nome "gevents" 14px/700 e linha de apoio 10px.
  - Grupos com rótulo (3.2) e itens de **36px**, raio 10px, padding 8px 12px, ícone 20px, gap 12px, texto 14px/500 em `--gd-sidebar-foreground` a 70%. Hover: fundo `--gd-sidebar-accent` a 50%. Ativo: fundo `--gd-sidebar-accent` e texto `--gd-sidebar-primary`.
  - Item ainda não disponível: 40% de opacidade e o selo "Em breve".
  - Rodapé: avatar com iniciais, e-mail e botão Sair.
- **Barra superior** de 64px, fundo `--gd-background` a 80% com desfoque, borda inferior `--gd-border`, padding 0 24px. Esquerda: título da área. Direita: botão de tema e atalho principal ("Novo evento").
- **Conteúdo** com padding 24px e largura total.

### 4.2. Celular (< 960px)

- A barra lateral vira gaveta por cima (85% da largura, máx. 300px), aberta por "Mais" ou pelo botão de menu; fecha pelo X, por toque fora ou ao escolher um item.
- **Barra inferior** fixa de 64px com cinco itens: **Hoje · Eventos · + Novo · Dinheiro · Mais** ([produto-v1.md](produto-v1.md), seção 4). "+ Novo" é um botão verde redondo de 44px no centro e abre o modal de novo evento. O conteúdo ganha 80px de respiro embaixo. Enquanto a tela Hoje e o grupo Dinheiro não existem, os itens mostram "Início" (Dashboards) e "Dinheiro" (Pagamentos).
- Barra superior de 56px.

## 5. Componentes

### 5.1. Cabeçalho de página — `.gd-cabecalho`

Título (`h1`), linha de apoio (`p`, 14px muted, 4px abaixo) e, à direita, a ação principal. Até 639px a ação desce para baixo do título. Margem inferior 24px.

### 5.2. Botões (Material)

| Variante | Material | Visual |
|---|---|---|
| Primário | `mat-flat-button` | Fundo `--gd-primary`, texto branco |
| Secundário | `mat-flat-button class="gd-secundario"` | Fundo `--gd-secondary`, texto `--gd-foreground` |
| Contorno | `mat-stroked-button` | Borda `--gd-border`, fundo transparente |
| Fantasma | `mat-button` | Sem fundo; hover `--gd-accent` |
| Perigo | `mat-flat-button class="gd-perigo"` | Fundo `--gd-destructive` a 20%, texto `--gd-destructive` |
| Ícone | `mat-icon-button` | 36px, raio 8px |

Altura **36px** (32px com `.gd-pequeno`, 40px com `.gd-grande`), raio 8px, padding 0 12px, 14px/500, ícone 18px com gap 6px. Desabilitado: 50% de opacidade.

### 5.3. Cartão — `.gd-painel` ou `mat-card`

Fundo `--gd-card`, raio 14px, anel e sombra de 3.3, padding 24px. Cabeçalho do cartão: título 16px/600 e apoio 12px muted, 4px entre eles, 20px antes do conteúdo. `.gd-painel` com tabela tem padding lateral 24px e a tabela ocupa a largura toda.

### 5.4. Barra de lista — `.gd-barra`

Linha no topo do cartão: abas à esquerda, busca e filtros à direita, margem inferior 16px. Quebra em telas estreitas.

### 5.5. Abas segmentadas — `.gd-abas`

Trilho `--gd-muted`, raio 10px, padding 2px, gap 4px. Aba 28px, padding 6px 12px, 12px/500, texto muted. Ativa (`.ativa`): fundo `--gd-background`, texto `--gd-foreground`, sombra pequena. Usadas para filtro de situação e para navegar entre seções do evento. `mat-tab-group` dentro de modais segue o mesmo desenho.

### 5.6. Busca — `.gd-busca`

Campo de 36px e largura até 320px, ícone de lupa à esquerda (padding-left 36px), placeholder "Buscar…".

### 5.7. Tabela — `table.gd-grade` ou `mat-table`

- Cabeçalho: 12px/500 muted, sem fundo, padding-bottom 12px, borda inferior `--gd-border`.
- Linha: 14px, padding 12px por célula, gap de 16px entre colunas, borda inferior `--gd-border` a 50%, hover `--gd-muted` a 50%.
- Primeira coluna pode ter link em `--gd-primary` 14px/500.
- Pessoa: avatar de iniciais 32px + nome 14px/500 + e-mail 12px muted.
- Valores alinhados à direita, 14px/600.
- Última coluna **Ações** (`.gd-acoes`), à direita: botões de ícone Editar (`edit`) e Excluir (`delete`). Editar abre o modal de edição.
- Em telas estreitas a tabela rola na horizontal dentro do cartão.

### 5.8. Badge de situação — `.gd-status`

Pílula, altura 22px, padding 2px 10px, 12px/500. Variantes: `.ok` (`--gd-success`), `.alerta` (`--gd-warning`), `.erro` (`--gd-destructive`), `.info` (`--gd-info`), `.neutro` (`--gd-muted` + texto foreground). Fundo da própria cor a 15%, texto na cor cheia.

| Situação | Variante |
|---|---|
| Concluído, confirmado, contratado, pago, assinado | `ok` |
| Pendente, a vencer, orçamento, atenção | `alerta` |
| Cancelado, recusado, atrasado, descartado | `erro` |
| Em andamento, enviado | `info` |
| Rascunho, sem situação | `neutro` |

### 5.9. Campo de formulário (Material)

Padrão global: `appearance="outline"`, **rótulo sempre acima do campo**, mensagens de ajuda/erro abaixo só quando existem.

- Rótulo: 14px/500 `--gd-foreground`, 6px acima da caixa.
- Caixa: altura **36px**, raio 10px, borda 1px `--gd-input`, fundo `--gd-muted` a 40% (dentro de modal: `--gd-background`), padding 0 12px, texto 14px. Área de texto: padding 8px 12px, altura mínima 78px.
- Foco: borda `--gd-ring` e anel de 3px a 50%.
- Erro: borda e texto de ajuda em `--gd-destructive`. Ajuda: 12px muted.
- Seleção (`mat-select`), data e hora usam a mesma caixa. Lista suspensa: fundo `--gd-popover`, raio 10px, borda `--gd-border`, opção de 32px.
- Caixa de marcação e alternador: 16px, cor `--gd-primary`. Texto ao lado 14px.
- Grade de formulário (`.gd-campos`): uma coluna; com `.duas` vira duas colunas a partir de 640px (`.inteiro` ocupa a linha toda); gap 16px. Marcações lado a lado em `.gd-marcacoes`. Envio de arquivo em `label.gd-arquivo` com o botão do navegador estilizado como botão de contorno.
- Na barra de filtros (`.gd-filtros`) os campos têm 180px (busca 260px) e podem dispensar o rótulo, usando só o placeholder.

### 5.10. Modal (MatDialog) — `.gd-dialog`

Estrutura obrigatória:

```html
<h2 mat-dialog-title>Novo cliente</h2>
<p class="gd-dialog-descricao">Dados de contato e endereço.</p>   <!-- opcional -->
<mat-dialog-content> … campos … </mat-dialog-content>
<mat-dialog-actions> <button mat-button>Cancelar</button> <button mat-flat-button>Salvar cliente</button> </mat-dialog-actions>
```

- Superfície `--gd-card`, raio **18px**, sombra de 3.3, sem borda.
- Fundo da página: preto a 40% com desfoque de 8px.
- **Cabeçalho**: padding 20px, título 16px/700, descrição 12px muted logo abaixo, linha `--gd-border` separando do corpo. Fecha por Cancelar, Esc ou toque fora.
- **Corpo**: padding 20px, rola sozinho; altura máxima 90% da janela.
- **Rodapé**: padding 16px 20px 20px, borda superior `--gd-border`, botões à direita: Cancelar (fantasma) e a ação primária.
- Larguras: `DIALOG` (padrão) **560px**; `DIALOG_PEQUENO` **448px** (confirmação, campo único); `DIALOG_LARGO` **840px** (cadastros com abas). Sempre `min(largura, 100vw - 32px)`.
- Abas dentro do modal (`mat-tab-group`) usam o desenho de 5.5, logo abaixo do cabeçalho.
- No celular (< 640px), o modal ocupa a largura toda, encostado embaixo, com raio só no topo.
- Confirmação: título com a pergunta, uma frase de consequência, botões "Cancelar" e a ação (`gd-perigo` quando destrói).

### 5.11. Número de destaque — `.gd-numeros` / `.gd-numero`

Grade de cartões (mín. 220px cada, gap 16px). Cartão: rótulo 12px/500 muted, valor 24px/700, apoio 12px muted, ícone em quadrado de 36px raio 10px com o primário a 15%.

### 5.12. Estado vazio — `.gd-vazio`

Centralizado, padding 48px 24px: ícone 40px em círculo `--gd-muted`, título 14px/600, frase 14px muted e, se couber, um botão de ação.

### 5.13. Alerta — `.gd-alerta`

Bloco com borda e raio 10px, padding 16px, ícone + título 14px/600 + texto 14px. Variantes `.ok`, `.alerta`, `.erro`, `.info`: fundo da cor a 5%, borda a 30%. Sem variante: fundo `--gd-muted` a 30% e borda `--gd-border`.

### 5.14. Aviso (toast)

`MatSnackBar` no canto superior direito, 16px da borda lateral e 72px do topo (logo abaixo da barra superior, sem cobrir o tema nem a ação principal — requirements, seção 14, itens 20 e 21). Superfície `--gd-popover`, borda `--gd-border`, raio 10px, sombra do modal, padding 12px 16px, 14px, largura até 360px. Ícone à esquerda na cor do tipo (sucesso, erro). Botão X "Fechar aviso". Some sozinho (4s sucesso, 6s erro).

### 5.15. Avatar — `.gd-avatar`

Círculo 32px (24px em lista densa), fundo primário a 15%, iniciais 12px/600 na cor primária.

### 5.16. Calendário do mês — `.gd-calendario`

Medido na tela Calendar da demo.

- Topo `.gd-calendario-topo`: setas anterior/próximo em volta do título do mês (18px/600), e à direita "Hoje" (botão secundário pequeno) e as vistas em abas segmentadas.
- Grade de 7 colunas, domingo a sábado, com semanas completas. Linhas de 1px feitas com `gap` sobre fundo `--gd-border`, borda de 1px e raio 10px.
- Cabeça dos dias: 11px/500, `--gd-muted-foreground`, fundo `--gd-muted` a 40%.
- Dia: altura mínima 110px, padding 6px 8px, fundo `--gd-card`, hover em `--gd-muted` a 40%. Número num círculo de 24px, 11px/600. Hoje: círculo `--gd-primary` com texto `--gd-primary-foreground`. Dia de outro mês: número a 40%.
- Botão "+" no canto superior direito de cada dia, 24px, ícone de 16px: meio apagado e aceso no hover do dia; sempre aceso no celular e em tela de toque. Abre o modal de criação com a data do dia.
- Item: 10px/500, padding 2px 6px, raio 6px, uma linha com reticências, hora antes do texto a 70%. Cor pelo tipo, fundo da cor a 15%: evento `--gd-primary`, compromisso `--gd-info`. Até 3 por dia; o resto vira "+ N mais", que abre a vista do dia. Clicar no item abre o modal de resumo.
- Legenda abaixo da grade: bolinha de 10px e texto 12px `--gd-muted-foreground`.
- Abaixo de 640px: dia com 72px de altura, "+" abaixo do número e item sem hora.

### 5.17. Resumo em pares — `.gd-resumo`

`<dl>` usado nos modais de resumo. Rótulo (`dt`) 12px/500 `--gd-muted-foreground`, valor (`dd`) 14px. Uma coluna; duas a partir de 640px.

## 6. Telas públicas

Login, cadastro, confirmação, senha, RSVP e lead: cartão central de até 420px sobre `--gd-background`, com a marca acima, título 24px/700, apoio 14px muted, campos e botão primário em largura total. Botão de tema fixo no canto.

## 7. Acessibilidade

- Contraste mínimo AA para texto; `--gd-muted-foreground` só em texto de apoio, nunca em rótulo de campo.
- Todo botão de ícone tem `aria-label`.
- Foco visível em todo controle (anel de 5.9).
- Alvo de toque mínimo de 36px; 44px na barra inferior.
