# 003. Tarefas do evento

**Status: aprovada (versão 2, 18/11/2026).** Substitui a SPEC-003 anterior. O código segue esta spec, exceto a seção 17. Fonte: [produto-v1.md](../produto-v1.md) 5.5, RF-061; campo **grupo** já existe na tarefa (SPEC-012 v2).

## 1. Identificador e nome

SPEC-003. Tarefas do evento (v2).

## 2. Objetivo

Deixar as tarefas do dia a dia rápidas de criar e fáceis de achar: criação numa linha, visão padrão em grupos de prazo, vários responsáveis, visibilidade para o casal, prioridade, checklist e anexos.

## 3. Requisitos relacionados

RF-061 (tarefas). RF-062 (redatar prazos) já está na SPEC-012 §6.6. RF-056 (o casal só vê tarefas com visibilidade casal/compartilhada — detalhe do link no bloco 11). RF-058/RF-059 (tarefa ligada a serviço; contratar fecha "Contratar X").

Fora deste rascunho: mural da equipe, caixa global de anexos, lembrete de aniversário.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Tudo nas tarefas dos próprios eventos. |
| Assistant | O mesmo nos eventos liberados (RF-045). Enquanto a spec de assistente não existir, só o Organizer. |
| Casal (link) | Ver e marcar como feitas as tarefas com visibilidade "casal" ou "compartilhada" (RF-056). Não edita título, prazo nem responsáveis. |
| Outra conta | Não vê. |

## 5. Pré-condições

Usuário autenticado (SPEC-001) ou link do casal (quando o bloco 11 existir). Evento da conta em andamento para criar e editar. Campo **grupo** já pode vir do modelo (SPEC-012).

## 6. Fluxo principal

### 6.1. Criar numa linha

1. Na aba Tarefas do evento, a linha de criação pede **título**; prazo e responsável(eis) são opcionais.
2. Salvar (Enter ou botão) cria a tarefa pendente. Campos extras (visibilidade, prioridade, grupo, checklist, anexos, serviço) ficam na leitura/edição.

### 6.2. Visão padrão em grupos

A lista do evento abre agrupada, nesta ordem:

| Grupo | Critério |
|---|---|
| Esta semana | Não concluída; prazo entre hoje e o domingo da semana corrente (fuso da conta — ver §17). |
| Depois | Não concluída; prazo depois desta semana. |
| Sem prazo | Não concluída; sem data de prazo. |
| Para conferir | Não concluída; prazo já estava vencido **no momento em que o evento foi criado** (ou quando a tarefa recebeu prazo pela primeira vez a partir do modelo — ver §17). |
| Feitas | Situação concluída. |

Dentro de cada grupo, ordenação pelo prazo (mais perto primeiro); sem prazo, por título. O **grupo de texto** da tarefa (Cerimônia, Recepção…) pode aparecer como rótulo na linha; não substitui estes agrupamentos de prazo.

### 6.3. Situações e quadro

As situações pendente, em andamento, concluída e atrasada continuam como **filtro** e como **quadro** (uma coluna por situação). A visão padrão deixa de ser o quadro; o usuário escolhe Lista (grupos), Quadro por situação ou Quadro por dia.

### 6.4. Leitura e edição

1. Tocar na tarefa abre a **leitura** (título, prazo, responsáveis, visibilidade, prioridade, grupo, checklist, anexos, comentários, serviço).
2. "Editar" abre o modal de edição. Não abre direto no formulário ao tocar.

### 6.5. Responsáveis, visibilidade e prioridade

- Responsáveis: um ou mais entre a dona (Organizer), assistente, membro da equipe ou casal.
- Visibilidade: só eu / casal / compartilhada.
- Prioridade: baixa / média / alta (padrão: média).

### 6.6. Checklist, anexos e serviço

- Checklist e anexos ficam **recolhidos** na leitura até alguém expandir.
- Tarefa pode ligar-se a um serviço do evento. Ao marcar o fornecedor como Contratado (RF-059), a tarefa cujo título for "Contratar {nome do serviço}" (ou o vínculo explícito) passa a concluída — regra exata na §17 se não houver vínculo explícito.

### 6.7. Todos os eventos

Lista de tarefas de todos os eventos da conta, com filtros: situação, responsável, prazo, evento, serviço, tags. Visões: lista, quadro por situação, quadro por dia.

## 7. Fluxos alternativos

- Título vazio: não grava.
- Evento concluído ou cancelado: não cria nem edita; só consulta (ou bloqueia — §17).
- Casal tenta editar campo que não é "marcar feita": indisponível.
- Sem tarefas: mensagem vazia por visão.
- Aplicar modelo (SPEC-012): tarefas novas entram com grupo copiado e responsáveis = Organizer.

## 8. Regras de negócio

- Situação inicial: pendente. Atrasada pode continuar manual neste rascunho; cálculo automático fica na §17.
- Prazo é data concreta no evento (não "dias antes").
- Mudar a data do evento e mover prazos: SPEC-012 §6.6 (já implementado).
- O grupo de texto (SPEC-012) é opcional, até 80 caracteres; exibido na lista.
- Comentários e perguntas: thread simples na tarefa (autor, texto, data). Sem menções neste corte, salvo decisão na §17.

## 9. Validações

Título obrigatório. Prazo, se houver, data válida. Prioridade e visibilidade nos enums. Até N responsáveis (limite na §17). Anexo: tipos e tamanho na §17.

## 10. Estados

Pendente → qualquer das quatro; concluída pode voltar. Sem estado "arquivada".

## 11. Dados necessários

Título; descrição opcional; prazo; situação; grupo (texto); responsáveis (lista); visibilidade; prioridade; checklist (itens com feito/não); anexos; comentários; serviço do evento opcional; evento; conta.

## 12. Interface

Criação e edição em modal (design-system 5.10). Lista com `.gd-grade` ou seções por grupo. Quadro usa colunas. Botão "Aplicar modelo" na aba (SPEC-012).

## 13. Erros

Validação no campo. Outra conta: indisponível. Falha ao gravar não deixa checklist/anexo pela metade.

## 14. Critérios de aceite

1. Criar só com título numa linha gera tarefa pendente na visão em grupos.
2. Tarefa com prazo nesta semana aparece em "Esta semana"; sem prazo em "Sem prazo"; concluída em "Feitas".
3. Tocar abre leitura; editar é ação separada.
4. Dá para marcar dois responsáveis e prioridade alta.
5. Visibilidade "só eu" não aparece no link do casal (quando o bloco 11 existir).
6. Checklist e anexos começam recolhidos.
7. Filtros da lista geral isolam por evento e situação.
8. Outra conta não vê as tarefas.

## 15. Cenários de teste

Criar numa linha. Agrupar Esta semana / Depois / Sem prazo / Feitas. Abrir leitura sem editar. Dois responsáveis. Prioridade. Visibilidade. Checklist. Isolamento entre contas. Tarefa com grupo vindo do modelo.

## 16. Dependências

SPEC-001, SPEC-002, SPEC-008, SPEC-012 (grupo e aplicar modelo), SPEC-018 (serviço). Bloco 11 (link do casal) para a parte do casal. Spec de assistente e equipe para responsáveis além da dona.

## 17. Premissas e pontos não definidos

1. Fronteira exata de "Esta semana" (domingo vs sábado; fuso).
2. Definição precisa de "Para conferir" (prazo vencido na criação do evento vs na criação da tarefa).
3. Atrasada automática ou só manual.
4. Remoção de tarefa (hoje a tela ainda avisa que exclusão não está no fluxo).
5. Limite de responsáveis, tamanho de anexo e tipos aceitos.
6. Regra automática "Contratar X" sem vínculo explícito ao serviço.
7. Comentários vs "perguntas" como tipos distintos ou um só fio.
8. O que o casal pode fazer além de marcar feita (só bloco 11 decide a UI).
