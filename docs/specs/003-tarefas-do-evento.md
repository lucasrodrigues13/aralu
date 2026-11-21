# 003. Tarefas do evento

**Status: aprovada (versão 4, 21/11/2026).** A versão 3 (aprovada em 18/11/2026) está no histórico do Git e é o que o código faz hoje; a v4 só acrescenta prazo e responsável por item da checklist (§6.8, card #21 do Trello). Fonte da v3: pedido de 18/11/2026 para a aba Tarefas do evento seguir a lista de eventos. RF-061 e [produto-v1.md](../produto-v1.md) 5.5 acompanham a v3.

**Onde fica a lista:** desde 21/11/2026 a lista do evento (§6.1 a §6.8) aparece dentro da aba Resumo, não numa aba própria ([SPEC-051](051-resumo-do-evento-com-tarefas.md), card #20). Onde esta spec diz "aba Tarefas do evento", leia "lista de tarefas no Resumo".

## 1. Identificador e nome

SPEC-003. Tarefas do evento (v4).

## 2. Objetivo

Deixar as tarefas do evento numa lista igual à lista de eventos, com criação e edição em modal, vários responsáveis, visibilidade para o casal, prioridade, checklist (cada item com prazo e responsável próprios) e anexos.

## 3. Requisitos relacionados

RF-061 (tarefas): lista do evento e criação em modal. RF-062 (redatar prazos) já está na SPEC-012 §6.6. RF-056 (o casal só vê tarefas com visibilidade casal/compartilhada — detalhe do link no bloco 11). RF-058/RF-059 (tarefa ligada a serviço; contratar fecha "Contratar X").

Fora deste rascunho: mural da equipe, caixa global de anexos, lembrete de aniversário.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Tudo nas tarefas dos próprios eventos. |
| Assistant | O mesmo nos eventos liberados (RF-045, SPEC-032). |
| Casal (link) | Ver e marcar como feitas as tarefas com visibilidade "casal" ou "compartilhada" (RF-056). Não edita título, prazo nem responsáveis. |
| Outra conta | Não vê. |

## 5. Pré-condições

Usuário autenticado (SPEC-001) ou link do casal (quando o bloco 11 existir). Evento da conta em andamento para criar e editar. Campo **grupo** já pode vir do modelo (SPEC-012).

## 6. Fluxo principal

### 6.1. Criar pelo botão

1. Na aba Tarefas do evento, o cabeçalho tem o botão **Nova tarefa**, no mesmo lugar e no mesmo peso do botão "Novo evento" da lista de eventos. "Aplicar modelo" continua ao lado (SPEC-012).
2. "Nova tarefa" abre o modal de criação sobre a lista. A rota não muda. O modal segue o padrão das outras telas (design-system 5.10): título do modal, frase de apoio, corpo com os campos e rodapé com Cancelar e Salvar.
3. O título é obrigatório. Prazo, responsáveis, visibilidade, prioridade, grupo, descrição, serviço e checklist são opcionais e já entram neste modal. A situação nasce pendente e não é pedida na criação.
4. Salvar grava a tarefa e ela aparece na lista. Cancelar, Esc ou toque fora fecha sem gravar. Não há linha de criação na própria lista.

### 6.2. Lista do evento

A aba Tarefas do evento é uma lista no padrão da lista de eventos: cabeçalho, painel e uma tabela, com as linhas **agrupadas pela distância do prazo até a data do evento** (como a lista de tarefas da Assessoria VIP, decidido em 18/11/2026):

- "N meses antes" (meses completos até o evento), "N semanas antes", "N dias antes", "No dia do evento", "Depois do evento" e "Sem prazo", nessa ordem (do mais longe para o mais perto do evento).
- Evento sem data: os grupos são o mês do prazo ("novembro de 2026") e "Sem prazo".
- Cada grupo tem um cabeçalho com o nome em caixa alta e a contagem ("3 tarefas"); clicar no cabeçalho recolhe ou abre o grupo.
- A linha mostra um ponto colorido da situação, o título (com grupo de texto e progresso da checklist), o prazo, o serviço ligado e os responsáveis. A última coluna traz Editar e Excluir. Dentro do grupo, ordem pelo prazo e depois pelo título.

A barra da lista, à direita, tem a busca pelo título e os filtros de situação, responsável, serviço e "só com checklist", e mostra quantas tarefas foram encontradas. Não há troca de visão para quadro na aba do evento.

### 6.3. Situações

Pendente, em andamento, concluída e atrasada aparecem na coluna da tabela e no filtro da barra. Na aba do evento não há quadro por situação nem quadro por dia. Essas visões continuam só na lista de todos os eventos (§6.7).

### 6.4. Leitura e edição

1. Tocar na tarefa abre a **leitura** (título, prazo, responsáveis, visibilidade, prioridade, grupo, checklist, anexos, comentários, serviço).
2. "Editar" abre o modal de edição. Não abre direto no formulário ao tocar.

### 6.5. Responsáveis, visibilidade e prioridade

- Responsáveis: um ou mais entre a dona (Organizer), assistente, membro da equipe ou casal.
- Visibilidade: só eu / casal / compartilhada.
- Prioridade: baixa / média / alta (padrão: média).

### 6.6. Checklist, anexos e serviço

- Checklist e anexos ficam **recolhidos** na leitura até alguém expandir.
- Anexos (decidido em 18/11/2026): JPG, JPEG, PNG ou PDF de até 5 MB cada, a mesma regra dos comprovantes (SPEC-029 §6.6). Fotos são reduzidas ao guardar (lado maior até 2000 px) sem perder a leitura. Anexar e remover ficam na leitura da tarefa, com o evento em andamento.
- Na tabela (aba do evento e lista geral), a tarefa com checklist mostra uma seta à esquerda e o progresso (feitos / total, sem contar os cancelados). A seta expande a checklist logo abaixo da linha.
- Na checklist expandida (tabela ou leitura), cada item pode ser marcado como **feito** ou **cancelado**. Cancelado fica riscado, não conta no progresso e pode ser restaurado. Um item não é feito e cancelado ao mesmo tempo. Cada marcação grava na hora, sem abrir o modal de edição, e só vale com o evento em andamento.
- Tarefa pode ligar-se a um serviço do evento. Ao marcar o fornecedor como Contratado (RF-059), a tarefa cujo título for "Contratar {nome do serviço}" (ou o vínculo explícito) passa a concluída — regra exata na §17 se não houver vínculo explícito.

### 6.7. Todos os eventos

Lista de tarefas de todos os eventos da conta, com filtros: situação, responsável, prazo, evento, serviço, tags. Visões: lista, quadro por situação, quadro por dia.

### 6.8. Prazo e responsável por item da checklist (novo na v4)

1. Cada item da checklist pode ter, além do texto, um **prazo** (data) e um **responsável**. Os dois são opcionais; item sem nenhum dos dois continua como hoje.
2. O prazo do item é independente do prazo da tarefa: itens da mesma tarefa podem ter datas diferentes entre si e diferentes da tarefa. Nenhuma das datas limita a outra.
3. O responsável do item é **uma pessoa só**, escolhida na mesma lista do responsável da tarefa: a dona, o casal ou uma assistente ativa. Assistente removida segue aparecendo no item em que já estava, marcada "(removida)", e some da lista de escolha para novos itens (SPEC-032).
4. No modal de criar e editar a tarefa, cada linha da checklist tem o texto, o campo de prazo e o seletor de responsável (os dois podem ficar vazios). Salvar grava texto, prazo e responsável de todos os itens junto com a tarefa.
5. Na checklist expandida (tabela e leitura), o item mostra o prazo (dia/mês) e o nome do responsável ao lado do texto. Item com prazo anterior a hoje, nem feito nem cancelado, mostra o prazo em destaque de atraso. Prazo e responsável se alteram só no modal de edição; marcar feito ou cancelado continua gravando na hora.
6. A ordem dos itens não muda: segue a ordem em que foram escritos, não o prazo.
7. A tarefa e o agrupamento da §6.2 continuam usando só o prazo da tarefa; o prazo do item não move a tarefa de grupo.
8. Aplicar modelo (SPEC-012) e tarefas criadas por outras telas continuam gerando itens sem prazo e sem responsável.

## 7. Fluxos alternativos

- Título vazio: o modal não grava e o campo mostra o erro.
- Fechar o modal sem salvar: nada é gravado.
- Evento concluído ou cancelado: o botão "Nova tarefa" não aparece; não cria nem edita; só consulta (ou bloqueia — §17).
- Casal tenta editar campo que não é "marcar feita": indisponível, inclusive prazo e responsável do item.
- Responsável do item aponta para assistente que não é da conta: recusado, nada é gravado.
- Sem tarefas, ou filtro sem resultado: a lista diz que não há tarefa para mostrar.
- Aplicar modelo (SPEC-012): tarefas novas entram com grupo copiado e responsáveis = Organizer.

## 8. Regras de negócio

- Situação inicial: pendente. Atrasada pode continuar manual neste rascunho; cálculo automático fica na §17.
- Prazo é data concreta no evento (não "dias antes").
- Mudar a data do evento e mover prazos: SPEC-012 §6.6 (já implementado). Prazos dos itens: pendência da v4, §17, ponto 7.
- O grupo de texto (SPEC-012) é opcional, até 80 caracteres; exibido na lista.
- Comentários e perguntas: thread simples na tarefa (autor, texto, data). Sem menções neste corte, salvo decisão na §17.

## 9. Validações

Título obrigatório. Prazo, se houver, data válida. Prazo de item, se houver, data válida. Responsável de item, se houver, uma das opções da §6.8 (dona, casal ou assistente da conta). Prioridade e visibilidade nos enums. Até N responsáveis (limite na §17). Anexo: JPG, JPEG, PNG ou PDF até 5 MB.

## 10. Estados

Pendente → qualquer das quatro; concluída pode voltar. Sem estado "arquivada".

## 11. Dados necessários

Título; descrição opcional; prazo; situação; grupo (texto); responsáveis (lista); visibilidade; prioridade; checklist (itens com texto, feito, cancelado ou pendente, prazo opcional e responsável opcional); anexos; comentários; serviço do evento opcional; evento; conta.

## 12. Interface

A aba do evento repete a lista de eventos: `.gd-cabecalho` com a ação principal "Nova tarefa", `.gd-painel` com `.gd-barra` (filtro de situação) e uma tabela `.gd-grade`. Editar e Excluir ficam na última coluna. Criar e editar abrem o modal padrão (design-system 5.10), com título, corpo e rodapé Cancelar / Salvar. "Aplicar modelo" permanece no cabeçalho (SPEC-012). A lista de todos os eventos (§6.7) mantém as visões em quadro.

## 13. Erros

Validação no campo, dentro do modal. Outra conta: indisponível. Falha ao gravar não deixa checklist/anexo pela metade e não fecha o modal como se tivesse salvo.

## 14. Critérios de aceite

1. "Nova tarefa" abre o modal sobre a lista. Salvar só com título gera tarefa pendente na tabela.
2. A aba do evento mostra a tabela agrupada por distância até o evento ("2 meses antes", "1 mês antes"…), com contagem e grupo recolhível. Não há quadro.
3. Tocar a linha abre leitura; Editar, na coluna de ações, abre o modal de edição. "Nova tarefa" não abre a leitura.
4. Dá para marcar dois responsáveis e prioridade alta.
5. Visibilidade "só eu" não aparece no link do casal (quando o bloco 11 existir).
6. Checklist e anexos começam recolhidos. Na tabela, a seta da tarefa expande a checklist abaixo da linha; marcar um item como feito ou cancelado (riscado) grava na hora.
7. Filtros da lista geral isolam por evento e situação.
8. Outra conta não vê as tarefas.
9. (v4) No modal, cada item da checklist aceita prazo e responsável. Dois itens da mesma tarefa com prazos diferentes aparecem cada um com a própria data na checklist expandida, na tabela e na leitura.
10. (v4) Item sem prazo e sem responsável continua funcionando e não mostra nada a mais. Tarefas e itens antigos abrem sem erro.
11. (v4) Item não feito e não cancelado com prazo anterior a hoje mostra o prazo em destaque; ao marcar feito ou cancelar, o destaque some.
12. (v4) Responsável de item que é assistente removida continua visível no item, com "(removida)".

## 15. Cenários de teste

Abrir "Nova tarefa" e fechar sem salvar (nada é criado). Criar só com título e ver a linha na tabela. Filtro de situação. Abrir leitura sem editar. Dois responsáveis. Prioridade. Visibilidade. Checklist. Isolamento entre contas. Tarefa com grupo vindo do modelo. Evento concluído sem o botão "Nova tarefa". (v4) Criar tarefa com três itens de prazos e responsáveis diferentes e reabrir (tudo gravado); editar tirando prazo e responsável de um item (limpos); prazo de item inválido (recusado); assistente de outra conta como responsável do item (recusado); item atrasado em destaque; marcar o item feito sem apagar prazo e responsável; casal não altera prazo nem responsável do item.

## 16. Dependências

SPEC-001, SPEC-002, SPEC-008, SPEC-012 (grupo e aplicar modelo), SPEC-018 (serviço). Bloco 11 (link do casal) para a parte do casal. SPEC-032 (assistentes como responsáveis); equipe e casal em outra spec.

## 17. Premissas e pontos não definidos

Decidido em 18/11/2026: as visões "Esta semana" e "Para conferir" ficam descartadas. A lista do evento agrupa por distância até o evento (§6.2).

1. Atrasada automática ou só manual.
2. Remoção de tarefa (hoje a tela ainda avisa que exclusão não está no fluxo).
3. Limite de responsáveis. (Anexo decidido: JPG, JPEG, PNG ou PDF até 5 MB, §6.6.)
4. Regra automática "Contratar X" sem vínculo explícito ao serviço.
5. Comentários vs "perguntas" como tipos distintos ou um só fio.
6. O que o casal pode fazer além de marcar feita (só bloco 11 decide a UI).


Decidido em 21/11/2026 (v4, card #21):

7. Mudar a data do evento: os prazos dos itens abertos (nem feitos, nem cancelados, com prazo) das tarefas não concluídas andam junto na mesma pergunta "Mover" / "Manter" da SPEC-012 §6.6, pela mesma diferença em dias. Itens feitos, cancelados ou sem prazo, e itens de tarefa concluída, não mudam.
8. O responsável do item é uma pessoa só.
9. Item atrasado só ganha destaque na checklist; a Hoje e o filtro de responsável não consideram o responsável do item.
10. Concluir a tarefa não fecha os itens pendentes.
