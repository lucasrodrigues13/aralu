# Plano de padronização de interface

**Status:** aprovado para execução em 27/11/2026. **Arquivo temporário:** é apagado na fase 9, quando `docs/design-system.md` (versão 5) passa a ser a única fonte.

Este plano padroniza listas, modais, botões, estados e telas sem login. Não cria tela, não muda regra de negócio, não toca na API.

## Como usar este plano

1. Execute **uma fase por sessão**, na ordem. Cada fase termina em um commit na branch `staging`.
2. Antes de editar, leia a fase inteira e a seção "Regras de execução".
3. Ao terminar a fase, marque os itens com `[x]` neste arquivo, no mesmo commit.
4. Se algo aqui não bater com o código (arquivo mudou, classe não existe, comportamento diferente do descrito), **pare e pergunte**. Não escolha um caminho por conta própria.

## Regras de execução (valem para todas as fases)

1. **Só o que está listado.** Não refatore, não renomeie, não "aproveite para melhorar" nada fora dos itens da fase.
2. **Nenhuma biblioteca nova.** Só Angular Material, Tailwind e o que já está em `package.json`.
3. **Nenhum componente compartilhado novo além destes quatro:** `app-fechar-modal`, `app-estado`, `app-pagina-publica`, `app-casca-acesso`. Se achar que precisa de outro, pare e pergunte.
4. **Nenhuma classe CSS global nova além das listadas** em cada fase. Estilo global só em `src/frontend/src/styles/_aralu.scss`.
5. **Não crie `styles:` novo em componente** para algo que este plano resolve com classe global ou componente compartilhado. Ao migrar uma tela, apague do `styles:` dela as regras que ficaram sem uso.
6. **Não mude comportamento:** handlers `(click)`, condições `@if`, chamadas de API, validações, rotas e `data-teste` ficam como estão. Só muda marcação, classe, texto e ordem quando o item pedir.
7. **Textos:** só os listados. Tags e parâmetros continuam no formato `{{nome_tag}}`.
8. **Testes:** antes de mudar texto, `aria-label` ou classe, procure o valor antigo nos `*.spec.ts` (`src/frontend/src/app`) e ajuste o teste no mesmo commit. Seletores usados hoje pelos testes: `[data-teste=…]`, `[aria-label=…]`, `tr.linha-tarefa`, `mat-card-title`, `mat-button-toggle-group`, `h2`, `button[type=submit]`.
9. **Build e testes:** rode `npm --prefix src/frontend test` e `npm --prefix src/frontend run build` ao fim de cada fase que tocar `src/`. A fase 0 (só documentação) não roda.
10. **Conferência visual:** nas fases 1 a 8, abra as telas alteradas no navegador (configuração `frontend` de `.claude/launch.json`, porta 4200) no claro e no escuro, em largura de computador e de celular (375px). As telas públicas são conferidas só no claro.
11. **Specs:** se uma spec em `docs/specs/` cita um texto ou comportamento de interface que a fase mudou, atualize a spec no mesmo commit. Não crie spec nova.
12. **Commit:** um por fase, mensagem `refactor(ui): fase N - <nome da fase>`.

## Decisões tomadas (não reabrir)

| # | Tema | Decisão |
|---|------|---------|
| D1 | Onde vive o padrão | `docs/design-system.md` versão 5. Não há spec nova para esta padronização. |
| D2 | Tabela | Lista simples usa `table[mat-table]`. Lista montada à mão (agrupada, expansível, dentro de modal) usa `table.tabela`. Tabela crua com classes Tailwind deixa de existir. Não converta `mat-table` em `.tabela` nem o contrário. |
| D3 | Coluna Ações | Cabeçalho "Ações" sempre visível, alinhado à direita. Até 3 ações: ícones. 4 ou mais: 2 ícones + menu "Mais ações". Excluir é sempre o último. |
| D4 | X do modal | Todo modal tem o X no topo, pelo componente `app-fechar-modal`. |
| D5 | Rodapé do modal | Sempre `align="end"`. Ordem: destrutivo à esquerda, Cancelar ou Fechar, secundários, e um único botão principal por último. |
| D6 | Confirmação destrutiva | Botão de confirmar em vermelho (`botao-perigo`). |
| D7 | Vocabulário | "Excluir" apaga o registro. "Remover" tira um vínculo ou um item sem apagar o cadastro. "Apagar" e "Tirar" não são usados. |
| D8 | Botão principal da lista | Fica em `.barra-lista-acoes`. Criar: "Novo/Nova X" com ícone `add`. Vincular algo que já existe: "Adicionar X" com ícone `add`. Importar: ícone `upload_file`. |
| D9 | Abas | Sem mudança. `mat-button-toggle-group` filtra a mesma lista; `mat-tab-group` troca de seção. |
| D10 | Estado vazio e carregando | Componente `app-estado`. O vazio só aparece depois da primeira resposta da API. |
| D11 | Paginação | `Paginacao` de `shared/paginacao.ts` nas listas da fase 6. |
| D12 | Telas de acesso | Todas usam o cartão largo com painel da marca, pelo componente `app-casca-acesso`. |
| D13 | Telas públicas | Uma casca única, `app-pagina-publica`, sempre no tema claro, sem botão de tema e sem assinatura aralu. |
| D14 | Erro de campo | Nas telas de acesso, erro aparece junto ao campo com `mat-error`. O botão só desabilita enquanto envia. |
| D15 | Nome clicável | Em toda lista em tabela, o nome do registro (primeira coluna) é clicável com a classe `link-nome` e abre o registro: a página de detalhe, a visualização ou o modal de edição, nessa ordem de preferência. O ícone Editar continua na coluna Ações. |

---

## Fase 0 — Documentação (sem código)

Objetivo: o padrão escrito passa a refletir as decisões acima antes de qualquer tela mudar.

- [x] `docs/design-system.md`: mudar o cabeçalho para **Versão 5, 27/11/2026** e aplicar:
  - §1 regra 2: acrescentar "O botão de confirmar é vermelho (`botao-perigo`)". Acrescentar regra 7 com o vocabulário D7.
  - §2 tabela "Onde fica": incluir `shared/fechar-modal.ts`, `shared/estado.ts`, `shared/pagina-publica.ts`, `shared/casca-acesso.ts`.
  - §5.1: trocar o exemplo. A ação principal fica em `div.barra-lista > div.barra-lista-acoes`, dentro do `mat-card-content`; o cabeçalho `div.p-6` tem só título e subtítulo. Copiar a marcação de `pages/clientes/clientes.page.ts`. Incluir a regra D8.
  - §5.5: reescrever os itens de tabela conforme D2, D3 e D15, com o exemplo de menu da fase 3.4 e a marcação do nome clicável da fase 3.5.
  - §5.5.1: trocar "Primeira tela com o padrão…" pela lista de telas da fase 6.
  - §5.8: substituir o item "Vazio" pela descrição de `app-estado` (fase 1) e pelos textos da fase 5.
  - §5.10: novo exemplo com `app-fechar-modal` e as regras D4 e D5. Larguras: 448, 560, 840, 1100 (em massa) e 1200 (prévia).
  - Nova §5.13 "Lista agrupada": marcação e classes da fase 4.
  - §6: reescrever conforme D12 e D13 (fases 7 e 8). Remover "Botão de tema fixo no canto" para as públicas; ele continua só nas telas de acesso.
  - §7: manter. Acrescentar: "`aria-label` e `matTooltip` não levam o nome do registro".
- [x] `.cursor/rules/frontend.mdc`: apagar toda menção a `gd-*`, `--gd-*`, Apex e `gd-dialog-descricao`. O arquivo passa a dizer que a fonte é `docs/design-system.md` versão 5 e a resumir D2 a D14 em uma linha cada.

Pronto quando: os dois arquivos não citam `gd-` e descrevem todos os padrões D1 a D14.

---

## Fase 1 — Peças compartilhadas

Objetivo: criar as peças e os estilos globais. **Nenhuma tela é migrada nesta fase**, exceto `confirma-dialog.ts`.

### 1.1 `src/frontend/src/app/shared/fechar-modal.ts`

- [x] Componente standalone, seletor `app-fechar-modal`.
- Entrada `manual = input(false)`. Saída `fechar = output<void>()`.
- Template: um `button mat-icon-button type="button"` com `aria-label="Fechar"`, `matTooltip="Fechar"` e `<mat-icon>close</mat-icon>`.
- No clique: se `manual()` for `false`, chama `inject(MatDialogRef).close()`; se for `true`, só emite `fechar`.
- Uso padrão, **dentro** do título:

```html
<h2 mat-dialog-title>Novo cliente <app-fechar-modal /></h2>
```

- Uso quando o botão Cancelar do modal chama um método (por exemplo, pergunta "Sair sem salvar"): `<app-fechar-modal [manual]="true" (fechar)="mesmoMetodoDoCancelar()" />`.

### 1.2 `src/frontend/src/app/shared/estado.ts`

- [x] Componente standalone, seletor `app-estado`.
- Entradas: `icone = input<string>()`, `titulo = input.required<string>()`, `texto = input<string>()`.
- Template: `div.flex.flex-col.items-center.gap-2.text-center.py-10` com, nesta ordem: `mat-icon` (só se `icone()`; 40px, cor `var(--mat-sys-outline)`), `p.font-semibold.m-0` com o título, `p.text-sm.text-muted.m-0` com o texto (só se houver) e `<ng-content />` para um botão de ação.
- Sem ícone e sem texto, mostra só o título em `text-muted` sem negrito: é a forma usada para "Carregando…".

### 1.3 `src/frontend/src/app/shared/pagina-publica.ts`

- [x] Componente standalone, seletor `app-pagina-publica`.
- Entradas: `empresa = input<string | null>()`, `titulo = input<string>()`, `subtitulo = input<string>()`, `estreita = input(false)`.
- Host: `display: block; min-height: 100vh;` com a classe `bg-light`.
- Template: `main` com `max-width: 720px` (480px quando `estreita()`), `margin: 0 auto`, `padding: 24px 16px 48px`, `display: grid; gap: 12px`. Dentro, um `header` (só se houver `titulo()`) com `span.block.text-sm.font-semibold.text-primary` (empresa, se houver), `h1` de 22px/600 com `overflow-wrap: anywhere` e `span.block.text-sm.text-muted` (subtítulo, se houver), borda inferior `1px solid var(--mat-sys-outline-variant)` e `padding-bottom: 12px`. Depois, `<ng-content />`.
- No construtor chama `TemaService.fixarClaro()`; no `ngOnDestroy` chama `TemaService.restaurar()`.

### 1.4 `src/frontend/src/app/core/tema.service.ts`

- [x] Acrescentar dois métodos, sem mudar os existentes:
  - `fixarClaro()`: põe `light-theme` e tira `dark-theme` do `<html>`, **sem** gravar em `localStorage` e **sem** mudar o sinal `escuro`.
  - `restaurar()`: reaplica as classes conforme o valor atual de `escuro()`.

### 1.5 `src/frontend/src/app/shared/casca-acesso.ts`

- [x] Componente standalone, seletor `app-casca-acesso`. É a marcação atual de `pages/entrar/entrar.page.ts` (cartão `max-w-[960px]`, grade de 12 colunas, painel `.painel-marca` à direita), extraída sem mudança de desenho.
- Entradas: `titulo = input.required<string>()`, `subtitulo = input<string>()`.
- Coluna esquerda: `app-marca [altura]="44"`, `h3.text-2xl.font-semibold.mt-8!` com o título, `p.text-muted.mt-1` com o subtítulo (se houver) e `div.mt-8` com `<ng-content />`.
- Coluna direita: o painel da marca exatamente como está hoje no Entrar (ícone 120px, a frase e o parágrafo).

### 1.6 `src/frontend/src/app/shared/dialog.ts`

- [x] Acrescentar `DIALOG_PREVIA = { ...BASE, width: 'min(1200px, calc(100vw - 32px))', maxHeight: '95vh' }` com o comentário "Prévia de documento: 1200px".

### 1.7 `src/frontend/src/app/shared/confirma-dialog.ts`

- [x] `ConfirmaDados` ganha `destrutivo?: boolean`.
- [x] Template: título com `<app-fechar-modal [manual]="true" (fechar)="ref.close(false)" />`; `mat-dialog-actions align="end"`; o botão de confirmar recebe `[class.botao-perigo]="dados.destrutivo"`.

### 1.8 `src/frontend/src/styles/_aralu.scss`

- [x] Na seção "Modal": `.aralu-dialog .mat-mdc-dialog-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }`.
- [x] Na seção "Modal": `.mat-mdc-unelevated-button.botao-perigo:not(:disabled) { --mat-button-filled-container-color: var(--mat-sys-error); --mat-button-filled-label-text-color: var(--mat-sys-on-error); }`.
- [x] Nova seção "Lista agrupada", com as regras hoje repetidas em `pages/dinheiro/evento-dinheiro.page.ts` (linhas 153 a 160 do `styles:`), renomeadas assim:

| Classe hoje (no componente) | Classe global nova |
|---|---|
| `.servicos-lista` | `.grupos-lista` |
| `.servico` | `.grupo` |
| `.servico.aberto` | `.grupo.aberto` |
| `.servico-cabecalho` | `.grupo-cabecalho` |
| `.servico-texto` | `.grupo-texto` |
| `.seta` (dentro do cabeçalho) | `.grupo-cabecalho .seta` |
| `.com-cabecalho` | `.grupos-lista.com-cabecalho` |

- [x] Na seção "Tabela HTML…", a classe do nome clicável (vale para `button` e para `a`):
  - `.link-nome { background: none; border: 0; padding: 0; font: inherit; font-weight: 600; color: var(--mat-sys-primary); cursor: pointer; text-align: start; text-decoration: none; overflow-wrap: anywhere; }`
  - `.link-nome:hover { text-decoration: underline; }`
  - `.link-nome:focus-visible { outline: 2px solid var(--mat-sys-primary); outline-offset: 2px; border-radius: 2px; }`
- [x] Na seção "Telas públicas":
  - `body:has(app-pagina-publica) app-tema.tema-fixo { display: none; }`
  - `.acoes-publicas { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 16px; }`
  - `@media (max-width: 559px) { .acoes-publicas { flex-direction: column-reverse; } .acoes-publicas > * { width: 100%; min-height: 44px; } }`

Pronto quando: build e testes passam; um modal de confirmação qualquer mostra o X alinhado à direita do título, no claro e no escuro, sem quebrar a altura do título.

---

## Fase 2 — Modais

Objetivo: todos os modais com a mesma estrutura. São 74 modais em 55 arquivos (`grep -rl "mat-dialog-title" src/frontend/src/app`).

### 2.1 Em todos os modais

- [x] Incluir `<app-fechar-modal />` dentro do `h2[mat-dialog-title]`, depois do texto. Onde o botão Cancelar chama um método em vez de `mat-dialog-close` ou `ref.close()`, usar a forma `[manual]="true"` com o mesmo método.
- [x] `pages/contratos/contratos.page.ts` linha ~302: remover o `div.topo` e o botão X feito à mão do "Live Preview"; usar `app-fechar-modal` e apagar a regra `.topo` do `styles:` se ficar sem uso.
- [x] `<mat-dialog-actions>` sem `align` recebe `align="end"`: `pages/agenda/agenda.page.ts` (3), `pages/eventos/evento-form.page.ts`, `pages/eventos/evento-home.page.ts`, `pages/eventos/novo-evento.dialog.ts`, `shared/data-convites.dialog.ts`, `shared/importacoes.dialog.ts`, `shared/planilha-instrucoes.dialog.ts`, `shared/presencas.dialog.ts`.

### 2.2 Regras do rodapé

1. "Cancelar" (há alteração a descartar) e "Fechar" (modal de leitura) são sempre `mat-stroked-button`.
2. Só um `mat-flat-button` por rodapé, e ele é o último.
3. Ação destrutiva no rodapé: `mat-button` com `class="text-error me-auto"`, primeiro da lista (fica à esquerda).
4. Modal só de leitura ou ajuda tem um único botão: "Fechar", `mat-stroked-button`. "Entendi" e "Pronto" viram "Fechar".

### 2.3 Correções por arquivo

A coluna "Fica" lista os botões na ordem final. S = `mat-stroked-button`, F = `mat-flat-button`, T = `mat-button`.

| Arquivo | Modal | Fica |
|---|---|---|
| `pages/eventos/equipe-evento.dialog.ts` | equipe | Cancelar passa de T para S |
| `pages/eventos/salvar-como-modelo.dialog.ts` | salvar como modelo | S Cancelar, S Salvar e abrir, F Salvar |
| `pages/dinheiro/parcelar-pagamento.dialog.ts` | parcelar | S Cancelar, S Refazer parcelamento, F Salvar parcelamento |
| `pages/contratos-funil/contratos-funil.page.ts` | ver contrato | S Fechar, S Baixar Word, F Imprimir |
| `pages/modelos-briefing/briefing-editor.dialog.ts` | editor | S Cancelar, S Clonar, F Salvar |
| `pages/contratos/contratos.page.ts` | Live Preview | S Fechar |
| `pages/contratos/contratos.page.ts` | Como usar as tags | S Fechar, F Copiar todas as tags |
| `pages/contratos/contratos.page.ts` | modelo escrito / Word | S Fechar, F Usar este exemplo no texto (onde existir) |
| `pages/modelos-mensagens/modelos-mensagens.page.ts` | Como usar as tags | S Fechar |
| `pages/modelos-funil/pagina-aceite.ts` | os dois de botão único | S Fechar; "Voltar ao editor" mantém o texto e vira S |
| `pages/modelos-inspiracoes/inspiracao-visualizar.dialog.ts` | visualizar | S Fechar |
| `shared/presencas.dialog.ts` | presenças | S Fechar |
| `pages/eventos/evento-home.page.ts` | Clientes do evento | S Fechar (era "Pronto"). Se "Pronto" grava algo além de fechar, pare e pergunte |
| `pages/oportunidades/oportunidades.page.ts` | retorno | o botão T do meio vira S |
| `pages/orcamentos-funil/orcamentos-funil.page.ts` | registrar resposta | Cancelar passa de T para S |
| `pages/orcamentos-funil/orcamentos-funil.page.ts` | editar orçamento | S Cancelar, S Live Preview, F Salvar |
| `pages/eventos/link-cliente.dialog.ts` | link do cliente | T erro Desativar link (`me-auto`), S Fechar, S Trocar link, F Gerar link |
| `pages/agenda/agenda.page.ts` | compromisso | Excluir ganha `me-auto` |
| `pages/oportunidades/briefing-lead.dialog.ts` | briefing do lead | Remover briefing ganha `text-error me-auto` |

### 2.4 Larguras

- [x] `pages/contratos/contratos.page.ts` ~635, `pages/modelos-funil/pagina-aceite.ts` ~578 e `pages/contratos-funil/contratos-funil.page.ts` ~296: trocar `{ ...DIALOG_LARGO, width: …, maxHeight: … }` por `{ ...DIALOG_PREVIA, data: … }`.
- [x] `pages/fornecedores/fornecedor-form.dialog.ts`: apagar `export const DIALOG_FORNECEDOR` e usar `DIALOG_LARGO` nos pontos que a importam.

### 2.5 Confirmações

- [x] Em toda chamada `open(ConfirmaDialog, …)` cujo `confirmar` seja `'Excluir'`, `'Remover'`, `'Desativar'`, `'Desativar acesso'`, `'Cancelar assinatura'` ou `'Apagar grupo'`: acrescentar `destrutivo: true` em `data`.
- [x] Toda chamada `open(ConfirmaDialog, …)` passa a usar `...DIALOG_PEQUENO` (algumas hoje abrem sem tamanho).

Pronto quando: `grep -rn "<mat-dialog-actions>" src/frontend/src/app` não retorna nada; todo arquivo com `mat-dialog-title` contém `app-fechar-modal`; nenhum rodapé tem dois `mat-flat-button`.

---

## Fase 3 — Tabelas, coluna Ações e nome clicável

### 3.1 Tabelas cruas viram `table.tabela`

Trocar `class="w-full text-left"` (ou `w-full text-sm`) por `class="tabela"` e **remover** das células `th` e `td` as classes `py-3`, `pr-4`, `font-semibold`, `border-t`, `border-border` e do `tr` as classes `border-t border-border` e `text-muted text-sm`. Tirar o `div.overflow-x-auto` que envolve a tabela.

- [x] `pages/grupos/grupos.page.ts`
- [x] `pages/assistentes/assistentes.page.ts`
- [x] `pages/admin/planos-admin.page.ts`
- [x] `pages/assinatura/assinatura.page.ts` (~171)
- [x] `pages/grupos/grupo-form.dialog.ts` (~41)
- [x] `shared/presencas.dialog.ts`
- [x] `pages/contratos/contratos.page.ts` (~60 e ~242)
- [x] `pages/modelos-mensagens/modelos-mensagens.page.ts` (~61)

### 3.2 Cabeçalho da coluna

- [x] Onde há `<span class="sr-only">Ações</span>` (grupos, assistentes, planos-admin): trocar por `Ações` visível, com `class="text-end! whitespace-nowrap"` no `th` e no `td`.

### 3.3 Tooltip e `aria-label`

- [x] `pages/grupos/grupos.page.ts` e `pages/assistentes/assistentes.page.ts`: `aria-label` e `matTooltip` deixam de levar o nome. Ficam "Editar", "Excluir", "Reenviar convite", "Desativar acesso", "Reativar acesso".

### 3.4 Menu "Mais ações" (só nestas três telas)

Marcação única:

```html
<button mat-icon-button type="button" aria-label="Mais ações" matTooltip="Mais ações" [matMenuTriggerFor]="mais">
  <mat-icon>more_vert</mat-icon>
</button>
<mat-menu #mais="matMenu" class="cardWithShadow">
  <button mat-menu-item type="button" (click)="…"><mat-icon>send</mat-icon> Enviar</button>
  <button mat-menu-item type="button" class="text-error" (click)="…"><mat-icon>delete</mat-icon> Excluir</button>
</mat-menu>
```

Cada item do menu mantém o mesmo `(click)`, o mesmo `@if` e o mesmo ícone do botão que ele substitui. O texto do item é o que hoje está no `matTooltip` do botão. Como o menu fica dentro da linha, use `mat-menu` com `matMenuContent` se precisar do item da linha (`<ng-template matMenuContent>`).

| Tela | Ícones visíveis (nesta ordem) | Vai para o menu (nesta ordem) |
|---|---|---|
| `pages/contratos-funil/contratos-funil.page.ts` | `visibility` (ver), `edit` | `send`, `draw`, `cancel`, `delete` |
| `pages/orcamentos-funil/orcamentos-funil.page.ts` | `send`, `edit` | `payments`, `mark_email_read`, `link`, `cancel`, `delete` |
| `pages/convidados/convidados.page.ts` | `chat`, `edit` | `link`, `qr_code_*`, `qr_code_scanner`, `delete` |

As outras listas têm até 3 ações e continuam com ícones. Em todas, a ordem é: ação da linha, Editar, Clonar, Excluir.

### 3.5 Nome clicável (D15)

Marcação única. Para abrir modal ou visualização:

```html
<button type="button" class="link-nome" (click)="abrir(item)">{{ item.nome }}</button>
```

Para ir a uma página:

```html
<a class="link-nome" [routerLink]="['/eventos', evento.id]">{{ evento.nome }}</a>
```

Regras:

1. Só o nome vira link. O texto de apoio da célula (`span.block.text-xs.text-muted`) continua fora do `button`, logo abaixo.
2. O `(click)` é **exatamente** a chamada que já existe na tela, indicada na tabela abaixo. Não crie método novo.
3. Se o botão Editar da linha estiver dentro de um `@if` (permissão ou situação), o nome usa a mesma condição: `@if (cond) { <button class="link-nome" …> } @else { {{ item.nome }} }`.
4. O ícone Editar da coluna Ações não sai.
5. Não usar `(click)` na linha (`tr`) em tela nova. As duas listas de tarefas que já abrem pela linha ficam como estão.

| Arquivo | Coluna | Abre |
|---|---|---|
| `pages/clientes/clientes.page.ts` | `cliente.nome` | `abrir(cliente)` |
| `pages/grupos/grupos.page.ts` | `item.nome` | `abrir(item)` |
| `pages/assistentes/assistentes.page.ts` | `item.nome` | `editar(item)` |
| `pages/admin/planos-admin.page.ts` | nome do plano | `editar(p)` |
| `pages/contratos/contratos.page.ts` (lista de modelos) | nome do modelo | `abrir(contrato)` |
| `pages/fornecedores/fornecedores.page.ts` (aba Fornecedores) | `item.nome` | `abrirFornecedor(item)` |
| `pages/modelos-briefing/modelos-briefing.page.ts` | `item.nome` | `abrir(item)` |
| `pages/modelos-cronograma/modelos-cronograma.page.ts` | `item.titulo` | `abrir(item)` |
| `pages/modelos-roteiro/modelos-roteiro.page.ts` | `item.nome` | `abrir(item)` |
| `pages/modelos-mensagens/modelos-mensagens.page.ts` | `item.nome` | `abrir(item)` |
| `pages/modelos-funil/modelos-funil.page.ts` | `item.nome` | `abrir(item)` |
| `pages/contratos-funil/contratos-funil.page.ts` | `item.oportunidadeNome` | `ver(item)` |
| `pages/orcamentos-funil/orcamentos-funil.page.ts` | `item.oportunidadeNome` | `abrir(item)` |
| `pages/tarefas-funil/tarefas-funil.page.ts` | `item.titulo` | `abrir(item)` |
| `pages/convidados/convidados.page.ts` | nome do convite | `abrirEdicao(item)` |

Telas que já têm o nome clicável e só trocam a classe:

- [x] `pages/eventos/eventos.page.ts`: o `a` do nome troca `text-sm font-semibold no-underline` por `link-nome`.
- [x] `pages/modelos-evento/modelos-evento.page.ts`: o `a` do nome ganha `class="link-nome"`.
- [x] `pages/modelos-inspiracoes/modelos-inspiracoes.page.ts`: mantém `visualizar(item)` e apaga a regra `.link-nome` do `styles:` (agora é global).

Ficam **sem** nome clicável, de propósito:

- `pages/tarefas/tarefas.page.ts` e `pages/tarefas/evento-tarefas.component.ts`: a linha inteira já abre a tarefa.
- `pages/leads-rsvp/leads-rsvp.page.ts` e `pages/gestao-financeira/gestao-financeira.page.ts`: a linha não tem registro para abrir; as ações são outras.
- `pages/fornecedores/fornecedores.page.ts` (aba Serviços): o serviço não tem edição.
- Tabelas de ranking e resumo (`eventos.page.ts`, `hoje.page.ts`, `relatorios-funil.page.ts`) e tabelas dentro de modal.
- Listas agrupadas da fase 4.

Pronto quando: `grep -rn 'class="w-full text-' src/frontend/src/app | grep "<table"` não retorna nada; `grep -rn 'sr-only">Ações' src/frontend/src/app` não retorna nada; `grep -rln "link-nome" src/frontend/src/app/pages` lista os 18 arquivos acima; nenhum `styles:` de componente define `.link-nome`.

---

## Fase 4 — Lista agrupada (acordeão)

Objetivo: as listas agrupadas usam as classes globais da fase 1.8 e se comportam igual.

Comportamento único: o cabeçalho inteiro do grupo é um `<button type="button" class="grupo-cabecalho">` com `aria-expanded` e `aria-controls`; a seta é `<mat-icon class="seta">expand_more</mat-icon>` à esquerda, deitada quando fechado; acima da lista vai `app-expandir-todos`.

Em cada arquivo: trocar as classes conforme a tabela da fase 1.8 e **apagar do `styles:`** as regras que agora são globais. Um arquivo por vez, conferindo no navegador.

- [x] `pages/dinheiro/evento-dinheiro.page.ts`
- [x] `pages/eventos/evento-contratos.page.ts`
- [x] `pages/eventos/evento-fornecedores.page.ts`
- [x] `pages/portaria/portaria.page.ts`
- [x] `pages/modelos-evento/modelo-evento-editor.page.ts`
- [x] `pages/tarefas/evento-tarefas.component.ts`: só o cabeçalho de grupo (`tr.cabeca-grupo`). A seta passa para a esquerda, com ícone fixo `expand_more` e a mesma rotação (hoje troca entre `expand_more` e `expand_less` à direita). **Não** mexer em `tr.linha-tarefa` nem na seta da linha.

Fora desta fase: as linhas expansíveis de `convidados.page.ts` e `link-cliente.page.ts` (seta em `mat-icon-button`) já têm o mesmo desenho e ficam como estão.

Pronto quando: `grep -rn "servico-cabecalho\|servicos-lista" src/frontend/src/app` não retorna nada.

---

## Fase 5 — Vocabulário, botões da lista, vazio e carregando

### 5.1 Vocabulário (D7)

- [x] `pages/grupos/grupos.page.ts`: "Apagar" vira "Excluir" (tooltip, título e botão da confirmação: "Excluir grupo" / `confirmar: 'Excluir'`).
- [x] `pages/modelos-evento/modelo-evento-editor.page.ts`: tooltip "Tirar o serviço" vira "Remover serviço".
- [x] Tooltips "Excluir tarefa", "Editar tarefa", "Excluir contrato" em coluna Ações viram "Excluir" e "Editar". "Excluir comprovante" fica, porque na mesma linha há outro Excluir.

### 5.2 Botão principal da lista (D8)

| Arquivo | Hoje | Fica |
|---|---|---|
| `pages/grupos/grupos.page.ts` | `group_add` Novo grupo | `add` Novo grupo |
| `pages/assistentes/assistentes.page.ts` | `person_add` Convidar pessoa | `add` Convidar pessoa |
| `pages/tarefas-funil/tarefas-funil.page.ts` | `add` Adicionar tarefa | `add` Nova tarefa |
| `pages/fornecedores/fornecedores.page.ts` (~113) | `add` Adicionar serviço | `add` Novo serviço |
| `pages/modelos-evento/modelo-evento-editor.page.ts` (~241) | `add_task` Nova tarefa | `add` Nova tarefa |
| `pages/modelos-evento/modelo-evento-editor.page.ts` (~179) | `add_link` Adicionar … | `add` Adicionar … |
| `pages/eventos/evento-fornecedores.page.ts` (~290) | `playlist_add` Adicionar serviço | `add` Adicionar serviço |
| `pages/modelos-evento/modelos-evento.page.ts` (~99) | ícone `upload` | ícone `upload_file` (texto não muda) |
| `shared/convidados-topo.component.ts` | `upload` Importar | `upload_file` Importar planilha |

Os botões secundários de `modelo-evento-editor.page.ts` ("Adicionar em massa", "Adicionar serviços") não mudam.

### 5.3 Estado vazio (D10)

- [x] Trocar todo `p.text-center.text-muted.py-10`, `py-8` e `py-6` e todo `div.flex.flex-col.items-center.gap-3.text-center.text-muted.py-10` que represente lista vazia por `<app-estado titulo="…" texto="…" />`. O botão de ação, quando existir, vai dentro do `app-estado`.
- Texto quando a lista não tem nenhum registro: título "Nenhum cliente ainda" (ou "Nenhuma tarefa ainda"), mantendo como `texto` a dica que a tela já tiver.
- Texto quando há filtro ou busca sem resultado: título "Nada encontrado", texto "Mude a busca ou os filtros."
- **Não trocar:** "Nenhum … encontrado" dentro de `mat-autocomplete`, textos dentro de célula ("Nenhum evento vinculado", "Sem responsável", "Sem prazo") e rótulos de grupo ("Sem serviço").

### 5.4 Carregando (D10)

- [x] Toda lista de página que hoje mostra o vazio antes da resposta ganha `protected readonly carregado = signal(false)`, ligado no `next` e no `error` da primeira carga. Template: `@if (!carregado()) { <app-estado titulo="Carregando…" /> } @else if (vazio) { … } @else { … }`. As 9 telas que já têm `carregando = signal(true)` mantêm o sinal e só trocam a marcação.
- [x] "Carregando..." (três pontos) vira "Carregando…" (reticências) em todo o app.
- [x] `pages/assistentes/assistentes.page.ts`: apagar o método `selo()` e usar `STATUS.sucesso`, `STATUS.erro` e `STATUS.alerta` de `shared/status.ts`.

Pronto quando: `grep -rn "Carregando\.\.\." src/frontend/src/app` e `grep -rn "text-center text-muted py-10" src/frontend/src/app` não retornam nada.

---

## Fase 6 — Paginação

Aplicar `Paginacao` conforme `docs/design-system.md` §5.5.1, sem mudar filtros: `protected readonly pagina = new Paginacao(<sinal já filtrado>)`, `[dataSource]="pagina.itens()"`, `mat-paginator` logo abaixo da tabela e `pagina.inicio()` onde a busca ou o filtro mudam. Se a tela não tiver um sinal `computed` com a lista filtrada, pare e pergunte.

- [ ] `pages/clientes/clientes.page.ts`
- [x] `pages/eventos/eventos.page.ts` (só a tabela de eventos; as tabelas de ranking não)
- [ ] `pages/leads-rsvp/leads-rsvp.page.ts`
- [ ] `pages/contratos-funil/contratos-funil.page.ts`
- [ ] `pages/orcamentos-funil/orcamentos-funil.page.ts`
- [x] `pages/tarefas-funil/tarefas-funil.page.ts`
- [x] `pages/tarefas/tarefas.page.ts` (só a visão em tabela)

Fora desta fase: listas agrupadas, convidados, gestão financeira e modelos.

---

## Fase 7 — Telas de acesso

Telas: `entrar`, `cadastro`, `esqueci-senha`, `redefinir-senha`, `confirmar-email`, `reenviar`, `assistentes/convite-assistente`.

- [ ] Cada tela passa a ser `<app-casca-acesso titulo="…" subtitulo="…">` com o formulário dentro. Somem o `section`, o `mat-card` e o `app-marca` de cada arquivo.
- [ ] Formulário: `form.grid.grid-cols-1.gap-4`; cada campo em `div.campo` com `mat-label.font-semibold.mb-2.block` (no Entrar, tirar o `text-sm` dos rótulos e o `mb-4` dos campos).
- [ ] Botão principal `mat-flat-button.w-full`, `[disabled]="enviando()"` apenas. No início do `enviar()`: se o formulário for inválido, `formulario.markAllAsTouched()` e `return`.
- [ ] `mat-error` dentro de cada `mat-form-field`, um por validador que o formulário já tem: obrigatório "Preencha este campo."; e-mail "Informe um e-mail válido."; tamanho mínimo "Use pelo menos N caracteres." (N do validador); confirmação diferente "As senhas não conferem."; termos não aceitos (cadastro) em `p.text-error.text-sm` abaixo da caixa: "Aceite os termos para continuar." Não criar validador novo.
- [ ] Textos:

| Tela | Título | Subtítulo | Botão | Link abaixo |
|---|---|---|---|---|
| entrar | Entrar | (o atual) | Entrar | (os atuais) |
| cadastro | Criar conta | Teste grátis de 14 dias, sem cartão. | Criar conta | Já tenho conta |
| esqueci-senha | Esqueci a senha | Enviamos um link para você criar outra. | Enviar link | Voltar para entrar |
| redefinir-senha | Redefinir senha | Crie uma senha nova. | Salvar senha | Voltar para entrar |
| reenviar | Reenviar confirmação | Enviamos de novo o e-mail de confirmação. | Reenviar e-mail | Voltar para entrar |
| convite-assistente | Criar sua senha | (sem) | Criar senha | Voltar para entrar |
| confirmar-email | Confirmar e-mail | (sem) | (sem) | Voltar para entrar |

  No cadastro, a frase "O cadastro abre um teste grátis…" sai do formulário, porque virou subtítulo.
- [ ] `confirmar-email`: o `p[role=status]` vira `app-estado`: enquanto confere, `titulo="Carregando…"`; sucesso, `icone="check_circle"`; falha, `icone="error_outline"`. O título é o texto que `status()` já devolve.
- [ ] `convite-assistente`, estado `pronto()`: `app-estado icone="check_circle" titulo="Senha criada"` com o botão "Entrar" dentro.
- [ ] `pages/conta-bloqueada/conta-bloqueada.page.ts` e `pages/atalhos/sem-acesso.page.ts` (ficam dentro da casca logada): `mat-card.cardWithShadow > mat-card-content` com `app-estado` (`icone="lock"`), mantendo os textos e o botão.
- [ ] Ajustar `pages/cadastro/cadastro.page.spec.ts` ao novo comportamento do botão e aos novos textos.
- [ ] Atualizar em `docs/specs/001-autenticacao-e-conta.md` e `docs/specs/032-assistentes.md` os textos de interface que mudaram.

---

## Fase 8 — Telas públicas

Telas: `rsvp`, `lead-publico`, `briefing-publico`, `proposta-publica`, `equipe-publica`, `link-cliente` (e `acesso-link.component`), `portaria`.

### 8.1 Casca

- [ ] Cada tela passa a ter `<app-pagina-publica>` como raiz. Somem de cada arquivo: `main.pagina`, o `section` centrado, o `header.topo` e, do `styles:`, as regras `:host`, `.pagina`, `.topo`, `h1`, `.fim`, `.aviso`, `.icone` e `.acoes`.
- Entradas por tela:

| Tela | `titulo` | `subtitulo` | `empresa` | `estreita` |
|---|---|---|---|---|
| rsvp | `titulo()` ou "Confirmação de presença" | (sem) | (não vem da API) | sim |
| lead-publico | Solicitar orçamento | (sem) | (não vem da API) | sim |
| briefing-publico | "Briefing" + nome | o texto "Responda com calma…" atual | `b.empresa` | não |
| proposta-publica | "Proposta" + título | "Válida até …" | `p.empresa` | não |
| equipe-publica | `p.evento` | data e hora | `p.empresa` | não |
| link-cliente | `d.evento` | (o que o `header` atual mostrar) | (não vem da API) | não |
| portaria | "Portaria: " + evento | (o que o `header` atual mostrar) | (não vem da API) | não |

- O conteúdo de cada tela fica em `mat-card.cardWithShadow > mat-card-content` dentro da casca. RSVP e lead deixam de usar `max-w-[440px]` e o `h3` do cartão.
- Enquanto a tela pede o código (`app-acesso-link`), está carregando ou o link é inválido, a casca vai sem `titulo`.
- [ ] `proposta-publica`, ramo da página própria (`iframe`): não usa a casca. O construtor chama `TemaService.fixarClaro()` e o `ngOnDestroy` chama `restaurar()`.

### 8.2 Estados

- [ ] Todo bloco de link inválido, vencido, concluído e carregando vira `app-estado` dentro de um cartão:

| Situação | `icone` | `titulo` | `texto` |
|---|---|---|---|
| Carregando | (sem) | Carregando… | (sem) |
| Link inválido ou desativado | `link_off` | Este link não está mais disponível | `erro()` se houver; senão "Fale com a assessoria." (equipe e portaria: "Fale com quem organizou o evento.") |
| Proposta vencida | `link_off` | Esta proposta venceu | o texto atual |
| Briefing enviado | `check_circle` | Briefing enviado | o texto atual |
| Lead enviado | `check_circle` | Pedido enviado | Em breve a assessoria retorna. |
| RSVP expirado | `event_busy` | Este convite expirou | o texto atual do prazo (mantém `data-teste="convite-expirado"` no `app-estado`) |
| RSVP sem convidados | `link_off` | Este link não está mais disponível | Fale com quem enviou o convite. |

  "Link indisponível" e "Link inválido" deixam de existir como título.

### 8.3 Botões

- [ ] Todo grupo de botões de ação usa `div.acoes-publicas`, com o botão principal por último no HTML: briefing (Salvar e continuar depois, Concluir e enviar), proposta (Voltar, Confirmar ou Enviar) e os botões de enviar de RSVP e lead (tiram o `w-full`).
- [ ] Não mexer nos três botões de resposta da proposta (`.botoes`) nem nos atalhos da equipe (`.itens`).

### 8.4 Campo do código

- [ ] `pages/link-cliente/acesso-link.component.ts`: o campo "Código" passa a ter o rótulo acima (`div.campo` + `mat-label.font-semibold.mb-2.block`), sem `mat-label` dentro do `mat-form-field`. O bloco `.acesso` vira `app-estado icone="lock"` com `titulo` igual a `a.evento`, e o restante dentro dele.

### 8.5 Texto do RSVP

- [ ] `pages/rsvp/rsvp.page.ts`: rótulos "Confirmado" e "Não comparecerá" viram "Vou" e "Não vou". Os `value` (`Confirmado`, `NaoComparecera`) não mudam. O botão "Enviar" vira "Enviar resposta".
- [ ] Ajustar `pages/rsvp/rsvp.page.spec.ts` e os trechos de interface em `docs/specs/004-convites-e-rsvp.md`, `010-convites-convidados-completo.md` e `054-rsvp-com-prazo.md`.
- [ ] Ajustar `pages/portaria/portaria.page.spec.ts` se algum seletor mudou.

Pronto quando: `grep -rn "class=\"pagina\"" src/frontend/src/app/pages` não retorna nada; nenhuma tela pública mostra o botão de tema; as sete abrem no claro mesmo com o aparelho no escuro.

---

## Fase 9 — Fechamento

- [ ] Reler `docs/design-system.md` e conferir cada seção com o código final; corrigir o documento onde o código ficou diferente do descrito.
- [ ] `docs/manual/fonte/`: listar para o usuário as páginas do manual cujos textos ou capturas ficaram desatualizados (botões renomeados, RSVP, telas de acesso). Não regerar capturas sem pedir.
- [ ] Transcrever as pendências abaixo para `docs/proximas-acoes.md`.
- [ ] Apagar este arquivo.

## Pendências (fora deste plano)

1. Nome da assessoria em RSVP, lead, link do cliente e portaria: a API não devolve `empresa` nessas rotas. Precisa de mudança no backend e de spec.
2. Exclusões sem confirmação: conferir, uma a uma, se os botões de remover em `fornecedor-form.dialog.ts`, `tarefa-form.dialog.ts`, `tarefa-leitura.dialog.ts`, `convite-form.dialog.ts`, `perfil.page.ts`, `estagios-funil.dialog.ts` e nos editores de briefing, roteiro e cronograma chamam a API na hora. Regra: se apaga na hora, pede confirmação; se só tira da lista até o Salvar, não pede.
3. Paginação em convidados e gestão financeira.
4. Dividir arquivos com vários modais dentro da página (`contratos.page.ts`, `oportunidades.page.ts`, `orcamentos-funil.page.ts`) em arquivos `*.dialog.ts`.
