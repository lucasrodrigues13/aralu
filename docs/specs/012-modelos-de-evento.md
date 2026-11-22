# 012. Modelos de evento

**Status: aprovada (versão 2, 18/11/2026; §6.6 ampliada em 21/11/2026 para os itens da checklist, SPEC-003 v4).** O código deve seguir esta spec; a versão 1 está no histórico do Git. Fonte: [produto-v1.md](../produto-v1.md) 5.3 e 5.4, plano do cliente, Cerimonial Fácil e Ivola.

## 1. Identificador e nome

SPEC-012. Modelos de evento.

## 2. Objetivo

Deixar os modelos fáceis de montar e de reaproveitar. O prazo aparece como a pessoa fala ("6 semanas antes"). Um checklist que ela já tem pode ser colado. Um modelo pode ser aplicado num evento já criado. Um evento bem montado vira modelo.

## 3. Requisitos relacionados

RF-053 (modelo de evento), RF-106 (modelos mais simples), RF-105 (salvar evento como modelo), RF-049 (criação do evento, SPEC-008 v2). RF-062 (refazer prazos ao mudar a data, seção 6.6).

Fora: roteiro no modelo (RF-092, bloco 10), bibliotecas de briefing a mensagens (SPEC-013 a 017), loja de modelos (RF-079).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Tudo desta spec, nos modelos e eventos da própria conta. |
| Assistant | O mesmo (RF-045, SPEC-032 §17, ponto 2). |
| Outra conta | Não vê modelo nem evento. |

## 5. Pré-condições

Usuário autenticado, SPEC-001. Para aplicar um modelo ou salvar como modelo, o evento precisa existir e estar em andamento.

## 6. Fluxo principal

### 6.1. Biblioteca e editor

1. A biblioteca lista os modelos da conta em tabela: nome, tipo, "N tarefas · N serviços" e ações (Editar, Clonar, Excluir).
2. "Novo modelo" abre um modal com Nome e Tipo. Salvar abre o editor.
3. O editor mantém as abas atuais (Checklist, Tarefas, Briefings, Roteiros, Inspirações, RSVP e Mensagens). A aba **Permissões sai** (seção 8.5).
4. Na aba Tarefas, cada tarefa tem título, **grupo** (opcional) e **prazo**. A lista aparece agrupada por grupo e ordenada pelo prazo, do mais distante para o mais perto do evento.

### 6.2. Prazo legível

1. O prazo da tarefa é informado com um número e uma unidade: dias, semanas ou meses antes do evento. Também dá para escolher "No dia do evento" ou "Sem prazo".
2. Em todo lugar, o prazo é exibido como a pessoa falaria (regras na seção 8.1).

### 6.3. Importar colando

1. Há dois caminhos: "Importar modelo" na biblioteca, que cria um modelo novo pedindo Nome e Tipo, e "Colar tarefas" no editor, que acrescenta tarefas ao modelo aberto.
2. O modal tem uma caixa de texto grande e o botão "Enviar planilha" (.xlsx ou .csv).
3. Ao colar ou enviar, aparece uma **prévia** em tabela (grupo, tarefa, prazo), com o total e as linhas ignoradas. Nada é gravado antes de "Importar".
4. "Importar" grava e mostra o aviso "N tarefas importadas".

### 6.4. Aplicar modelo num evento existente

1. Na aba Tarefas do evento, ou no "Mais" do Resumo, a opção "Aplicar modelo" abre um modal com os modelos do mesmo tipo do evento.
2. Escolhido o modelo, a prévia diz: "N tarefas e N serviços novos. M já existem no evento e serão ignorados."
3. "Aplicar" acrescenta só o que é novo. Nada do evento é apagado ou alterado.

### 6.5. Salvar evento como modelo

1. No "Mais" do Resumo do evento, "Salvar como modelo" abre um modal com o Nome, sugerido como "Modelo — <nome do evento>".
2. A prévia mostra quantas tarefas e quantos serviços vão para o modelo e quantas tarefas ficarão sem prazo.
3. "Salvar" cria o modelo, do mesmo tipo do evento, e oferece "Abrir modelo".

### 6.6. Mudar a data do evento

1. Ao salvar no Editar evento uma data diferente da anterior, e havendo tarefas não concluídas com prazo, ou itens de checklist abertos com prazo nessas tarefas, um modal pergunta: "Mover os prazos das tarefas não concluídas junto com a data?".
2. "Mover" soma a cada um desses prazos a mesma diferença em dias entre a data nova e a antiga. "Manter" não mexe em nenhum prazo.
3. Tarefas concluídas e tarefas sem prazo nunca mudam. O mesmo vale para os itens da checklist (SPEC-003 §6.8): "Mover" soma a diferença em dias ao prazo dos itens não feitos e não cancelados que têm prazo, nas tarefas não concluídas; itens feitos, cancelados, sem prazo ou de tarefa concluída não mudam. Evento que passa a não ter data não abre o modal.

## 7. Fluxos alternativos

- Colar texto sem nenhuma tarefa reconhecida: a prévia diz "Nenhuma tarefa encontrada" e "Importar" fica desligado.
- Planilha sem a coluna Tarefa, ou com um formato que não seja .xlsx/.csv: erro claro e nada gravado.
- Linha da planilha com prazo ilegível: a tarefa entra sem prazo e a prévia avisa na linha.
- Aplicar modelo em evento sem data: as tarefas entram sem prazo, e a prévia avisa.
- Aplicar o mesmo modelo duas vezes: na segunda, tudo já existe e nada muda (a prévia mostra 0 novos).
- Salvar como modelo um evento sem data: todas as tarefas vão sem prazo, e a prévia avisa.
- Tarefa do evento com prazo **depois** da data do evento: vai para o modelo como "No dia do evento" (seção 17, decisão 2).
- Excluir um modelo já usado: os eventos criados com ele não mudam.

## 8. Regras de negócio

### 8.1. Prazo

- Continua gravado como **dias antes** do evento (inteiro, maior ou igual a 0), como hoje. Nulo é "Sem prazo"; 0 é "No dia do evento".
- Ao digitar: 1 semana = 7 dias; 1 mês = 30 dias.
- Ao exibir: múltiplo de 30 vira "N meses antes" ("1 mês antes"); senão, múltiplo de 7 vira "N semanas antes"; senão, "N dias antes". Exemplos: 180 → "6 meses antes", 42 → "6 semanas antes", 10 → "10 dias antes".
- No evento, o prazo continua sendo uma data concreta: data do evento menos os dias (SPEC-008).

### 8.2. Grupo

- A tarefa do modelo ganha o campo **grupo**, um texto opcional (ex.: "Cerimônia", "Recepção", "Documentos").
- Ao aplicar o modelo, o grupo é copiado para a tarefa do evento. Como o grupo aparece na lista de tarefas do evento fica com a SPEC-003 (bloco 4).

### 8.3. Leitura do texto colado

- Cada linha não vazia é uma tarefa, menos as linhas de título.
- **Título de grupo** é a linha que termina com `:` ou que está toda em maiúsculas. As tarefas abaixo dela ficam nesse grupo até o próximo título.
- Marcadores no começo da linha são removidos: `-`, `*`, `•`, `[ ]`, `[x]`, números como `1.` ou `1)`.
- Prazo opcional no fim da linha, entre parênteses: `(30 dias)`, `(6 semanas)`, `(2 meses)`, `(no dia)`. Sem parênteses, a tarefa fica sem prazo.
- Linhas repetidas no mesmo grupo entram uma vez só.
- Título com mais de 200 caracteres é cortado em 200, com aviso na prévia.

### 8.4. Planilha

- Colunas, pela primeira linha (cabeçalho): **Tarefa** (obrigatória), **Grupo** e **Prazo** (opcionais). O Prazo segue o formato da seção 8.3, sem os parênteses ("6 semanas").
- O sistema oferece "Baixar planilha padrão" com essas três colunas.

### 8.5. Aplicar e salvar

- Ao aplicar, "já existe" quer dizer mesmo título de tarefa, ou mesmo nome de serviço, sem diferenciar maiúsculas e acentos.
- As tarefas aplicadas nascem pendentes e com o Organizer como responsável, como na criação.
- Salvar como modelo leva: todas as tarefas do evento (feitas ou não), com título, grupo e prazo convertido em "dias antes"; e os serviços do evento, com nome e valor estimado. Não leva fornecedores, valores contratados, parcelas, convidados nem clientes.
- A aba Permissões do modelo sai: as flags eram da conta `Client`, que deixou de existir (RF-024). O que o cliente vê passa a ser escolhido no link do cliente (RF-056, bloco 11). As colunas ficam no banco até o bloco 11 decidir o que fazer com elas.

## 9. Validações

Nome do modelo obrigatório, sem só espaços. Tipo é um dos cinco. Prazo: número inteiro de 0 a 999 na unidade escolhida. Grupo com até 80 caracteres. Planilha de até 2 MB e até 500 linhas. Modelo aplicado é da conta e do mesmo tipo do evento.

## 10. Estados

Sem estados novos. O modelo existe ou não existe. A tarefa aplicada nasce pendente.

## 11. Dados necessários

Tarefa do modelo: título, grupo (novo), dias antes.

Tarefa do evento: grupo (novo), copiado do modelo.

Importar: texto colado ou arquivo; para modelo novo, nome e tipo.

Aplicar: evento e modelo. Salvar como modelo: evento e nome.

## 12. Interface

Todos os fluxos em modal (design-system 5.10).
- Prazo: um campo numérico e uma lista (dias / semanas / meses / no dia / sem prazo) na mesma linha.
- Prévia da importação: tabela com rolagem dentro do modal (`.gd-grade`), e as linhas ignoradas em `.gd-alerta`.
- Biblioteca: tabela com a coluna "Tarefas · Serviços".

## 13. Erros

Arquivo inválido ou grande demais: mensagem no modal, nada gravado. Falha ao importar, aplicar ou salvar como modelo: nada fica pela metade (tudo grava junto ou nada grava). Modelo ou evento de outra conta: indisponível, sem revelar dado.

## 14. Critérios de aceite

1. Prazo de 42 dias aparece como "6 semanas antes"; 180 como "6 meses antes"; 0 como "No dia do evento".
2. Informar "2 meses" grava 60 dias.
3. Colar uma lista com títulos terminados em `:`, marcadores e prazos entre parênteses gera a prévia certa (grupo, tarefa, prazo) e só grava em "Importar".
4. A planilha padrão, preenchida e enviada, importa as mesmas tarefas que o texto equivalente.
5. Aplicar um modelo num evento acrescenta só tarefas e serviços novos; aplicar de novo não muda nada.
6. Salvar como modelo um evento com data gera tarefas com "dias antes" iguais à distância entre o prazo e a data do evento.
7. O grupo da tarefa do modelo chega à tarefa do evento.
8. O editor de modelo não mostra mais a aba Permissões.
9. Outra conta não vê, não aplica e não salva modelo de outra conta.
10. Mudar a data do evento em +10 dias e escolher "Mover" desloca em +10 dias só os prazos das tarefas não concluídas; "Manter" não desloca nada.

## 15. Cenários de teste

Unidade: conversão e exibição do prazo (0, 7, 10, 30, 42, 180, nulo); leitura do texto colado (títulos com `:` e em maiúsculas, marcadores, prazos, linhas vazias e repetidas); leitura da planilha (cabeçalho fora de ordem, sem coluna Tarefa).

Integração: importar para modelo novo; colar no editor; aplicar duas vezes no mesmo evento; aplicar em evento sem data; salvar como modelo com e sem data; isolamento entre contas.

## 16. Dependências

SPEC-008 v2 (criação e Resumo do evento, onde fica o "Mais"). SPEC-003 (tarefas do evento; o bloco 4 decide como mostrar o grupo). SPEC-018 (serviços do evento). Leitura de planilha: o mesmo leitor já usado na importação de convidados (SPEC-010).

## 17. Premissas e pontos não definidos

Decisões aprovadas pelo usuário em 18/11/2026:

1. **Refazer prazos ao mudar a data do evento (RF-062, pendência 6 do produto-v1).** Decidido: ao salvar uma data nova no Editar evento, um modal pergunta "Mover os prazos das tarefas não concluídas junto com a data?". "Mover" desloca cada prazo pelo mesmo número de dias; "Manter" não mexe. Fluxo na seção 6.6; o RF-062 passou a Definido.
2. **Tarefa com prazo depois do evento** (ex.: "pedir depoimento"). Decidido: na 1.0, guardar como "No dia do evento". Prazo "depois do evento" fica para quando o depoimento (RF-101) for especificado.
3. **Mês = 30 dias** é uma aproximação. "6 meses antes" de 20/12 cai em 23/06, e não em 20/06. Decidido: aceitar, porque é simples e previsível.

Pontos abertos menores:

- O roteiro no modelo ("N momentos" no pacote) entra com RF-092 (bloco 10).
- A ordem manual das tarefas dentro de um grupo continua fora; a ordenação é pelo prazo.
