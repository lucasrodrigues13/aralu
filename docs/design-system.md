# Design system

**Versão 5, 27/11/2026.** O frontend usa o [TailwindAdmin Angular (free)](https://github.com/Tailwind-Admin/free-tailwind-admin-dashboard-template), pasta `tailwind-admin-angular-free`, por inteiro: a mesma base (Tailwind v4 + Angular Material com os overrides do template) e os mesmos padrões de tela dos exemplos dele (Forms, Tables, Badges, Chips, Lists, Menu, Tooltips, Sample page, Dashboard e Login). As cores são as da marca **aralu**. As versões 2 e 3, desenhadas a partir da demo do Apex Dashboard, foram removidas.

Antes de criar um componente, procure o exemplo equivalente no template (`package/src/app/pages/ui-components`, `components` e `layouts`) e copie a marcação. Só o que o template não tem fica em `styles/_aralu.scss`.

## 1. Regras gerais

1. **Todo cadastro e toda edição abrem em modal** sobre a tela atual. A rota não muda. Ficam como página só: Perfil e Ajustes da conta, telas de detalhe com conteúdo próprio (home do evento, editor de modelo) e telas públicas.
2. Excluir, cancelar e outras ações destrutivas pedem confirmação em modal pequeno. O botão de confirmar é vermelho (`botao-perigo`).
3. Uma cor primária (petróleo da marca). O dourado é a cor secundária, usada só como destaque. Cor de estado só para estado.
4. Modo claro e modo escuro, com os mesmos componentes.
5. Texto em português, frase curta. Botão diz a ação ("Salvar evento", "Novo convite").
6. Nada de gráfico decorativo sem dado real.
7. Vocabulário: "Excluir" apaga o registro. "Remover" tira um vínculo ou um item sem apagar o cadastro. "Apagar" e "Tirar" não são usados.

## 2. Onde fica

| Arquivo | O que tem |
|---|---|
| `src/globals.css` | `@import "tailwindcss"`, `@theme` do template (cores `primary`, `secondary`, `error`, `success`, `warning`, `info`, `light-*`, `border`, sombras) e as classes `text-*`, `bg-*`, `bg-light-*` |
| `src/styles/tailwindadmin/` | Cópia de `assets/scss` do template: `_variables`, `override-component/*` (overrides do Material), `theme-variables/*` (claro e escuro), `layouts/*` (sidebar e topbar) e `_container` |
| `src/styles/_aralu.scss` | Só o que o template não traz: logo, barra inferior do celular, tabela HTML no desenho do `mat-table`, calendário da agenda, modal e aviso |
| `src/app/shared/status.ts` | Classes da etiqueta de situação (`STATUS.sucesso`, `alerta`, `erro`, `info`, `primario`, `neutro`) |
| `src/app/shared/fechar-modal.ts` | `app-fechar-modal`: X do topo de todo modal |
| `src/app/shared/estado.ts` | `app-estado`: estado vazio, carregando e de erro |
| `src/app/shared/pagina-publica.ts` | `app-pagina-publica`: casca única das telas públicas (sempre tema claro) |
| `src/app/shared/casca-acesso.ts` | `app-casca-acesso`: cartão largo com painel da marca das telas de acesso |
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

Um cartão do exemplo **Forms/Tables**: cabeçalho `div.p-6` só com `mat-card-title` + `mat-card-subtitle`; corpo em `mat-card-content.border-t.border-border`. A ação principal fica em `div.barra-lista > div.barra-lista-acoes`, dentro do `mat-card-content`, ao lado dos filtros (`div.barra-lista-filtros`). Modelo: `pages/clientes/clientes.page.ts`.

```html
<mat-card class="cardWithShadow">
  <div class="p-6">
    <div>
      <mat-card-title class="mb-0">Clientes</mat-card-title>
      <mat-card-subtitle>Contatos da assessoria e os eventos vinculados.</mat-card-subtitle>
    </div>
  </div>
  <mat-card-content class="border-t border-border">
    <div class="barra-lista">
      <div class="barra-lista-filtros"> busca e filtros </div>
      <div class="barra-lista-acoes">
        <button mat-flat-button type="button" (click)="abrir()">
          <mat-icon>add</mat-icon>
          Novo cliente
        </button>
      </div>
    </div>
    tabela
  </mat-card-content>
</mat-card>
```

Botão principal da lista: criar é "Novo/Nova X" com ícone `add`; vincular algo que já existe é "Adicionar X" com ícone `add`; importar usa o ícone `upload_file`.

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

Filtro de seleção com lista longa (por exemplo, o serviço prestado em Serviços e Fornecedores) usa campo com busca, em vez de `mat-select`: `input[matInput]` com lupa (`matIconPrefix`) e `mat-autocomplete`, primeira opção **Todos**, "Nenhum … encontrado" quando a busca não acha nada e botão de fechar (`matIconSuffix`) para limpar. A busca ignora maiúsculas e acentos (`servicoCombina` / `normalizarBusca`).

### 5.4. Abas

- **Filtro dentro da tela** (situação, visão): `mat-button-toggle-group` com o override do template (raio 7px), sem o visto (`hideSingleSelectionIndicator` em `app.config.ts`), opção escolhida em fundo primário.
- **Seções** (evento, cadastro com abas): `mat-tab-group` ou `nav[mat-tab-nav-bar]` do Material, alinhadas à esquerda (`MAT_TABS_CONFIG`). As seções do evento ficam num cartão com o botão voltar (`app-evento-abas`).

### 5.5. Tabela (exemplo Tables)

- Lista simples usa `table[mat-table].min-w-full` dentro de `div.relative.overflow-auto`. Cabeçalho 14px/600; primeira e última colunas rentes ao cartão.
- Lista montada à mão (agrupada, expansível, dentro de modal) usa `table.tabela`, com o mesmo desenho do `mat-table`. Tabela crua com classes Tailwind (`w-full text-left`, `border-t border-border`) não existe mais. Não converta `mat-table` em `.tabela` nem o contrário.
- Texto de apoio na célula: `span.block.text-xs.text-muted`, fora do link do nome. Valores: `.valor` alinhado à direita (`text-end!`).
- **Nome clicável.** Em toda lista em tabela, o nome do registro (primeira coluna) é clicável com a classe `link-nome` e abre o registro: página de detalhe, visualização ou modal de edição, nessa ordem de preferência. O ícone Editar continua na coluna Ações. Para abrir modal ou visualização:

  ```html
  <button type="button" class="link-nome" (click)="abrir(item)">{{ item.nome }}</button>
  ```

  Para ir a uma página:

  ```html
  <a class="link-nome" [routerLink]="['/eventos', evento.id]">{{ evento.nome }}</a>
  ```

  Se o Editar da linha depende de `@if`, o nome usa a mesma condição. Não use `(click)` na `tr` em tela nova. Ficam sem nome clicável: tabelas de ranking e resumo, tabelas dentro de modal, listas agrupadas e listas cuja linha já abre o registro.
- **Coluna Ações.** Cabeçalho "Ações" sempre visível, alinhado à direita (`text-end! whitespace-nowrap` no `th` e no `td`). Até 3 ações: `mat-icon-button` (com `aria-label` e `matTooltip`, ver seção 7). 4 ou mais: 2 ícones visíveis e as demais no menu "Mais ações". Ordem: ação da linha, Editar, Clonar, Excluir; Excluir é sempre o último.

  ```html
  <button mat-icon-button type="button" aria-label="Mais ações" matTooltip="Mais ações" [matMenuTriggerFor]="mais">
    <mat-icon>more_vert</mat-icon>
  </button>
  <mat-menu #mais="matMenu" class="cardWithShadow">
    <button mat-menu-item type="button" (click)="…"><mat-icon>send</mat-icon> Enviar</button>
    <button mat-menu-item type="button" class="text-error" (click)="…"><mat-icon>delete</mat-icon> Excluir</button>
  </mat-menu>
  ```
- Lista que pode passar de 50 linhas usa a **paginação padrão** (5.5.1).
- Abas: `mat-button-toggle-group` filtra a mesma lista; `mat-tab-group` troca de seção (ver 5.4).

#### 5.5.1. Paginação

Padrão único para todo o sistema, igual ao exemplo [Apps › Employee](https://angular.tailwind-admin.com/apps/employee) do Tailwind Admin: `mat-paginator` logo abaixo da tabela, com botões de primeira e última página (`showFirstLastButtons`) e **50, 100 ou 150 itens por página** (começa em 50). Os textos ficam em português ("Itens por página:", "1 – 50 de 1.961") pelo `PaginadorPtBr`, registrado em `app.config.ts`. Não crie outro paginador nem outros tamanhos de página.

Tudo fica em `shared/paginacao.ts` (`TAMANHOS_PAGINA`, `PaginadorPtBr`, `Paginacao`). Para uma lista que já chega inteira da API:

```ts
protected readonly filtrados = computed(() => /* lista depois dos filtros da tela */);
protected readonly pagina = new Paginacao(this.filtrados);
```

```html
<table mat-table class="min-w-full" [dataSource]="pagina.itens()">…</table>
<mat-paginator showFirstLastButtons aria-label="Páginas de …"
  [length]="pagina.total()" [pageIndex]="pagina.indice()" [pageSize]="pagina.tamanho()"
  [pageSizeOptions]="pagina.tamanhos" (page)="pagina.mudar($event)" />
```

- Ao mudar busca ou filtro, chame `pagina.inicio()` para voltar à primeira página.
- Com a lista vazia, mostre o estado vazio (5.8) no lugar da tabela e do paginador.
- Se uma lista ficar grande demais para vir inteira, a paginação passa para a API. Na tela, o componente e os tamanhos continuam os mesmos.
- Telas com o padrão: Serviços e Fornecedores (abas Fornecedores e Serviços da conta), Clientes, Eventos (só a tabela de eventos), Leads RSVP, Contratos (funil), Orçamentos (funil), Tarefas (funil) e Tarefas (visão em tabela). Ficam fora: listas agrupadas, convidados, gestão financeira e modelos.

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
- Vazio, carregando e erro: componente `app-estado` (`shared/estado.ts`) com `icone`, `titulo` e `texto`; o botão de ação vai dentro dele. Sem ícone e sem texto mostra só o título em cinza, forma usada em "Carregando…". O vazio só aparece depois da primeira resposta da API: a tela guarda um sinal `carregado` e mostra `app-estado titulo="Carregando…"` até ele ser verdadeiro.
- Textos: lista sem registro, título "Nenhum cliente ainda" (ou "Nenhuma tarefa ainda") e como `texto` a dica da tela; busca ou filtro sem resultado, título "Nada encontrado" e texto "Mude a busca ou os filtros."; carregando, "Carregando…" (reticências, não três pontos). Não usa `app-estado`: "Nenhum … encontrado" dentro de `mat-autocomplete`, textos dentro de célula ("Sem responsável") e rótulos de grupo.

### 5.9. Escolha entre opções

- Poucas opções com ícone (tipo do evento): `mat-chip-listbox` com `mat-chip-option` e `mat-icon[matChipAvatar]` (exemplo Chips).
- Opção com linha de apoio (pacote): `mat-selection-list [multiple]="false"` com `matListItemTitle` e `matListItemLine` (exemplo Lists › single selection), dentro de um cartão interno.

### 5.10. Modal

```html
<h2 mat-dialog-title>Novo cliente <app-fechar-modal /></h2>
<p class="text-muted text-sm px-6 -mt-2 mb-4">Descrição opcional.</p>
<mat-dialog-content> campos </mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-stroked-button mat-dialog-close>Cancelar</button>
  <button mat-flat-button>Salvar cliente</button>
</mat-dialog-actions>
```

Override de dialog do template (raio 7px, título 18px/600, padding 20px 24px). `panelClass: 'aralu-dialog'` separa corpo e rodapé com linha. Larguras em `shared/dialog.ts`: 448px (confirmação, `DIALOG_PEQUENO`), 560px (padrão, `DIALOG`), 840px (com abas, `DIALOG_LARGO`), 1100px (em massa, `DIALOG_EM_MASSA`) e 1200px (prévia de documento, `DIALOG_PREVIA`). No celular o modal encosta embaixo.

- **X no topo (todo modal).** `app-fechar-modal` dentro do `h2[mat-dialog-title]`, depois do texto. Quando o botão Cancelar chama um método (por exemplo, pergunta "Sair sem salvar"), use `<app-fechar-modal [manual]="true" (fechar)="mesmoMetodoDoCancelar()" />`.
- **Rodapé.** Sempre `align="end"`. Ordem: ação destrutiva à esquerda (`mat-button` com `class="text-error me-auto"`), Cancelar ou Fechar (`mat-stroked-button`), botões secundários e, por último, um único `mat-flat-button` principal. Modal só de leitura ou ajuda tem um botão: "Fechar".
- **Confirmação destrutiva.** `ConfirmaDialog` com `destrutivo: true` deixa o botão de confirmar vermelho (`botao-perigo`). Vale para Excluir, Remover, Desativar e equivalentes.

### 5.11. Aviso (toast)

`MatSnackBar` com `panelClass: 'aralu-toast'`: superfície do cartão com sombra `level1`, ícone na cor do tipo e X para fechar, abaixo da topbar.

### 5.12. Calendário da agenda

Grade de 7 colunas em `.calendario` (`_aralu.scss`), dia de hoje em círculo primário, eventos em `bg-light-primary` e compromissos em `bg-light-info`. Navegação com `mat-icon-button`, "Hoje" em `mat-stroked-button` e vistas em `mat-button-toggle-group`.

### 5.13. Lista agrupada

Lista montada à mão em acordeão (serviços do evento, contratos, fornecedores, portaria). Usa as classes globais `.grupos-lista`, `.grupo`, `.grupo.aberto`, `.grupo-cabecalho`, `.grupo-texto` e `.seta`, de `_aralu.scss`; o componente não define estilo próprio para isso.

```html
<app-expandir-todos … />
<ul class="grupos-lista">
  <li class="grupo" [class.aberto]="aberto">
    <button type="button" class="grupo-cabecalho" [attr.aria-expanded]="aberto" [attr.aria-controls]="id">
      <mat-icon class="seta">expand_more</mat-icon>
      <span class="grupo-texto"> título e apoio </span>
    </button>
    @if (aberto) { <div [id]="id"> conteúdo </div> }
  </li>
</ul>
```

O cabeçalho inteiro é um `button` com `aria-expanded` e `aria-controls`; a seta fica à esquerda, deitada quando fechado; `app-expandir-todos` fica acima da lista. Quando a lista vem logo abaixo de um cabeçalho de cartão, acrescente `.com-cabecalho`. Linhas expansíveis com seta em `mat-icon-button` (convidados, link do cliente) já têm o mesmo desenho e ficam como estão.

## 6. Telas de acesso e telas públicas

- **Telas de acesso** (entrar, cadastro, esqueci a senha, redefinir senha, confirmar e-mail, reenviar confirmação, convite de assistente): todas usam `app-casca-acesso` (`titulo` e `subtitulo`), o cartão do `side-login` do template, até 960px, em duas colunas: formulário à esquerda (assinatura aralu, título, campos com rótulo acima, links) e painel petróleo com o ícone da marca à direita (`.painel-marca`). Abaixo de `lg` só o formulário. Formulário em `form.grid.grid-cols-1.gap-4`, botão principal `mat-flat-button.w-full`. Erro de campo aparece junto ao campo com `mat-error`; o botão só desabilita enquanto envia. O botão de tema fixo no canto (`.tema-fixo`) aparece só nessas telas.
- **Telas públicas** (RSVP, lead, briefing, proposta, equipe, link do cliente, portaria): todas usam `app-pagina-publica`, sempre no tema claro, sem botão de tema e sem assinatura aralu, porque são vistas pelos clientes da assessoria. Conteúdo em `mat-card.cardWithShadow > mat-card-content`. Link inválido, vencido, concluído e carregando usam `app-estado` dentro de um cartão. Grupos de botões usam `div.acoes-publicas`, com o botão principal por último.
- **Marca** (`public/`): `marca/aralu.svg` (assinatura petróleo), `marca/aralu-claro.svg` (assinatura creme), `marca/aralu-icone.svg` (ícone), `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` e `site.webmanifest`. Vetorizados do PDF "Assinatura com brilho (celebração)", que só tinha imagem. `app-marca` troca a assinatura para a versão creme no modo escuro.

## 7. Acessibilidade

- Contraste mínimo AA para texto; `text-muted` só em texto de apoio.
- Todo botão só de ícone (`mat-icon-button`, inclusive o "Mais ações" com `more_vert`) leva `aria-label` e `matTooltip` com o mesmo texto: o nome da ação, curto ("Editar", "Excluir comprovante", "Mais ações"). Nada de `title` nativo nesses botões, para não aparecerem dois tooltips. Exceção: alça de arrastar (`cdkDragHandle`) fica só com `aria-label`. Todo controle tem `aria-label` com o texto do rótulo.
- `aria-label` e `matTooltip` não levam o nome do registro: "Editar", não "Editar Maria".
- Alvo de toque mínimo de 37px; 44px na barra inferior.
