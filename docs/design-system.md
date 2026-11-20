# Design system

**Versão 4, 20/11/2026.** O frontend usa o [TailwindAdmin Angular (free)](https://github.com/Tailwind-Admin/free-tailwind-admin-dashboard-template), pasta `tailwind-admin-angular-free`, por inteiro: a mesma base (Tailwind v4 + Angular Material com os overrides do template) e os mesmos padrões de tela dos exemplos dele (Forms, Tables, Badges, Chips, Lists, Menu, Tooltips, Sample page, Dashboard e Login). As cores são as da marca **aralu**. As versões 2 e 3, desenhadas a partir da demo do Apex Dashboard, foram removidas: não há mais classes `gd-*` nem tokens `--gd-*`.

Antes de criar um componente, procure o exemplo equivalente no template (`package/src/app/pages/ui-components`, `components` e `layouts`) e copie a marcação. Só o que o template não tem fica em `styles/_aralu.scss`.

## 1. Regras gerais

1. **Todo cadastro e toda edição abrem em modal** sobre a tela atual. A rota não muda. Ficam como página só: Perfil e Ajustes da conta, telas de detalhe com conteúdo próprio (home do evento, editor de modelo) e telas públicas.
2. Excluir, cancelar e outras ações destrutivas pedem confirmação em modal pequeno.
3. Uma cor primária (petróleo da marca). O dourado é a cor secundária, usada só como destaque. Cor de estado só para estado.
4. Modo claro e modo escuro, com os mesmos componentes.
5. Texto em português, frase curta. Botão diz a ação ("Salvar evento", "Novo convite").
6. Nada de gráfico decorativo sem dado real.

## 2. Onde fica

| Arquivo | O que tem |
|---|---|
| `src/globals.css` | `@import "tailwindcss"`, `@theme` do template (cores `primary`, `secondary`, `error`, `success`, `warning`, `info`, `light-*`, `border`, sombras) e as classes `text-*`, `bg-*`, `bg-light-*` |
| `src/styles/tailwindadmin/` | Cópia de `assets/scss` do template: `_variables`, `override-component/*` (overrides do Material), `theme-variables/*` (claro e escuro), `layouts/*` (sidebar e topbar) e `_container` |
| `src/styles/_aralu.scss` | Só o que o template não traz: logo, barra inferior do celular, tabela HTML no desenho do `mat-table`, calendário da agenda, modal e aviso |
| `src/app/shared/status.ts` | Classes da etiqueta de situação (`STATUS.sucesso`, `alerta`, `erro`, `info`, `primario`, `neutro`) |
| `.postcssrc.json` | Plugin `@tailwindcss/postcss` |

## 3. Tema e cores

- `TemaService` põe `light-theme` ou `dark-theme` no `<html>`, como o template. Escolha salva em `localStorage` (`aralu-tema`); sem escolha, segue `prefers-color-scheme`.
- Marca: petróleo `#104c5b` (primária), dourado `#c9a24c` (secundária), creme `#f6f3ec` (`--mat-sys-surface-bright`, o `bg-light` do template). No escuro a primária clareia para `#3a8c9f` e o fundo vai para `#172429`.
- Estados do template: sucesso `#13deb9`, alerta `#ffae1f`, info `#539bff`, erro `rgb(250 137 107)`.
- Fonte **DM Sans** (`@fontsource-variable/dm-sans`), a mesma do template. Ícones: Material Symbols.
- Raio `--mat-sys-corner-small` = 7px em campo, botão, cartão e menu. Sombra de cartão `--mat-sys-level1`.

## 4. Casca (layout "full" do template)

- `mat-sidenav-container.mainWrapper` com `mat-sidenav.sidebarNav` (270px, borda direita) e `mat-sidenav-content.contentWrapper`.
- Barra lateral: `.branding` com a assinatura aralu, `mat-nav-list.sidebar-list` com `div[mat-subheader]` por grupo e `a[mat-list-item].menu-list-item` por item. Ativo: `.activeMenu` (fundo primário, texto branco). Item ainda não disponível: `.disabled`. Rodapé no bloco `bg-light-primary` do template, com as iniciais, o e-mail e Sair.
- Topo: `mat-toolbar.topbar` (70px) com menu (celular), tema e o botão de perfil com `mat-menu` (Perfil, Minha conta, Sair).
- Conteúdo: `main.pageWrapper` (padding 24px).
- Celular (< 960px): a barra lateral vira gaveta por cima e aparece a barra inferior fixa (Hoje · Eventos · + · Dinheiro · Mais), definida em `_aralu.scss`.

## 5. Padrões de tela

### 5.1. Página de lista

Um cartão do exemplo **Forms/Tables**: cabeçalho `div.p-6` com `mat-card-title` + `mat-card-subtitle` à esquerda e a ação principal (`mat-flat-button`) à direita; corpo em `mat-card-content.border-t.border-border`.

```html
<mat-card class="cardWithShadow">
  <div class="p-6 flex flex-wrap items-center justify-between gap-4">
    <div>
      <mat-card-title class="mb-0">Eventos</mat-card-title>
      <mat-card-subtitle>Acompanhe os eventos da assessoria.</mat-card-subtitle>
    </div>
    <button mat-flat-button><mat-icon>add</mat-icon> Novo evento</button>
  </div>
  <mat-card-content class="border-t border-border"> filtros + tabela </mat-card-content>
</mat-card>
```

Seções secundárias da mesma tela usam o mesmo formato. Blocos dentro de um cartão usam o cartão interno do template: `mat-card.border!.border-border!.shadow-none` com título em `div.p-4`.

### 5.2. Campo de formulário (exemplo Forms)

**O rótulo fica sempre acima da caixa**, fora do `mat-form-field`. Placeholder só com exemplo do que preencher.

```html
<div class="campo">
  <mat-label class="font-semibold mb-2 block">Nome</mat-label>
  <mat-form-field appearance="outline" class="w-full">
    <input matInput aria-label="Nome" placeholder="Ex.: Casamento Ana e Pedro" />
  </mat-form-field>
</div>
```

- Caixa de 37px (override do template). Texto, seleção, data, hora e valor têm a mesma altura; botões também (37px).
- Formulário em grade do Tailwind: `grid grid-cols-12 gap-x-6 gap-y-4` com `col-span-*`, ou `grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4` nos modais.
- `app-campo-data`, `app-campo-hora` e `app-campo-dinheiro` seguem o mesmo formato (rótulo pelo atributo `rotulo`).
- O controle recebe `aria-label` com o texto do rótulo.

### 5.3. Barra de filtros

`form.flex.flex-wrap.items-end.gap-4.mb-6`. Todo campo tem rótulo acima. Larguras: busca `sm:w-64` (com lupa `matIconPrefix`), seleção e texto `sm:w-48` (ou menores quando o conteúdo é curto), data `sm:w-40`. Botões no fim: **Filtrar** (`mat-flat-button`) e **Limpar** (`mat-stroked-button`). Como tudo tem 37px e `items-end`, as caixas e os botões ficam alinhados pela base.

### 5.4. Abas

- **Filtro dentro da tela** (situação, visão): `mat-button-toggle-group` com o override do template (raio 7px), sem o visto (`hideSingleSelectionIndicator` em `app.config.ts`), opção escolhida em fundo primário.
- **Seções** (evento, cadastro com abas): `mat-tab-group` ou `nav[mat-tab-nav-bar]` do Material, alinhadas à esquerda (`MAT_TABS_CONFIG`). As seções do evento ficam num cartão com o botão voltar (`app-evento-abas`).

### 5.5. Tabela (exemplo Tables)

- `table[mat-table].min-w-full` dentro de `div.relative.overflow-auto`. Cabeçalho 14px/600; primeira e última colunas rentes ao cartão.
- Listas montadas à mão usam `table.tabela`, com o mesmo desenho do `mat-table`.
- Texto de apoio na célula: `span.block.text-xs.text-muted`. Valores: `.valor` alinhado à direita (`text-end!`).
- Ações na última coluna (`text-end! whitespace-nowrap`): `mat-icon-button` Editar e Excluir, ou `mat-stroked-button` para a ação da linha e `mat-menu` (`class="cardWithShadow"`) para o resto.

### 5.6. Etiqueta de situação (exemplo Tables / Badges)

`span` com `STATUS.<tipo>`: `rounded font-semibold px-2 py-1 text-xs` + `bg-light-<cor> text-<cor>`.

| Situação | `STATUS` |
|---|---|
| Concluído, confirmado, contratado, pago, recebido | `sucesso` |
| Pendente, a vencer, orçamento, atenção | `alerta` |
| Cancelado, recusado, atrasado, sem fornecedor | `erro` |
| Em andamento, enviado, parcial | `info` |
| Evento, item da marca | `primario` |
| A receber, sem situação | `neutro` |

### 5.7. Número de destaque (exemplo Dashboard › top-cards)

`mat-card.shadow-none.text-center.mb-0!.bg-light-<cor>` com ícone, título `h4.text-sm.font-semibold.text-<cor>` e valor `h6.text-xl.font-semibold.text-<cor>`. Em grade `grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-6`. Quando leva a outra tela, o cartão fica dentro de um `a` e ganha `card-hover`.

### 5.8. Alerta e estado vazio

- Alerta: `div.flex.items-center.gap-3.rounded.p-4.mb-6.bg-light-<cor>.text-<cor>` com ícone, texto e, se houver, um `mat-stroked-button`.
- Vazio: `p.text-center.text-muted.py-10`; com ação, `div.flex.flex-col.items-center.gap-3` e o `mat-flat-button`.

### 5.9. Escolha entre opções

- Poucas opções com ícone (tipo do evento): `mat-chip-listbox` com `mat-chip-option` e `mat-icon[matChipAvatar]` (exemplo Chips).
- Opção com linha de apoio (pacote): `mat-selection-list [multiple]="false"` com `matListItemTitle` e `matListItemLine` (exemplo Lists › single selection), dentro de um cartão interno.

### 5.10. Modal

```html
<h2 mat-dialog-title>Novo cliente</h2>
<p class="text-muted text-sm px-6 -mt-2 mb-4">Descrição opcional.</p>
<mat-dialog-content> campos </mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-stroked-button mat-dialog-close>Cancelar</button>
  <button mat-flat-button>Salvar cliente</button>
</mat-dialog-actions>
```

Override de dialog do template (raio 7px, título 18px/600, padding 20px 24px). `panelClass: 'aralu-dialog'` separa corpo e rodapé com linha. Larguras em `shared/dialog.ts`: 560px (padrão), 448px (confirmação) e 840px (com abas). No celular o modal encosta embaixo.

### 5.11. Aviso (toast)

`MatSnackBar` com `panelClass: 'aralu-toast'`: superfície do cartão com sombra `level1`, ícone na cor do tipo e X para fechar, abaixo da topbar.

### 5.12. Calendário da agenda

Grade de 7 colunas em `.calendario` (`_aralu.scss`), dia de hoje em círculo primário, eventos em `bg-light-primary` e compromissos em `bg-light-info`. Navegação com `mat-icon-button`, "Hoje" em `mat-stroked-button` e vistas em `mat-button-toggle-group`.

## 6. Telas públicas (exemplo Login)

- **Login**: cartão do `side-login` do template, até 960px, em duas colunas: formulário à esquerda (assinatura aralu, título, campos com rótulo acima, links e "Criar conta") e painel petróleo com o ícone da marca à direita (`.painel-marca`). Abaixo de `lg` só o formulário.
- Cadastro, confirmação, senha, reenvio, RSVP e lead: cartão de até 440px centralizado sobre `bg-light`, formulário em `grid gap-4` e botão principal em largura total. A assinatura aralu aparece nas telas de conta; RSVP e lead não a mostram, porque são vistas pelos clientes da assessoria.
- Botão de tema fixo no canto (`.tema-fixo`).
- **Marca** (`public/`): `marca/aralu.svg` (assinatura petróleo), `marca/aralu-claro.svg` (assinatura creme), `marca/aralu-icone.svg` (ícone), `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` e `site.webmanifest`. Vetorizados do PDF "Assinatura com brilho (celebração)", que só tinha imagem. `app-marca` troca a assinatura para a versão creme no modo escuro.

## 7. Acessibilidade

- Contraste mínimo AA para texto; `text-muted` só em texto de apoio.
- Todo botão de ícone tem `aria-label`; todo controle tem `aria-label` com o texto do rótulo.
- Alvo de toque mínimo de 37px; 44px na barra inferior.
