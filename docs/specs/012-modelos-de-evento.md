# 012. Modelos de evento

**Status: aprovada (versão 3, 24/11/2026).** Substitui a versão 2 (aprovada em 18/11/2026, ampliada em 21/11/2026), que está no histórico do Git e é o que o código faz hoje. A v3 junta as abas Checklist e Tarefas numa aba **Serviços e tarefas**, dá à tarefa do modelo o mesmo formato da tarefa do evento, cria o **prazo relativo** (antes, no dia ou depois do evento), passa os responsáveis para **papéis**, remove o **grupo** e troca "Colar tarefas" por **Adicionar tarefas em massa**. Decisões de 24/11/2026 na seção 17. Afeta a SPEC-003 (v5) e a SPEC-018.

## 1. Identificador e nome

SPEC-012. Modelos de evento.

## 2. Objetivo

Um modelo descreve, para um tipo de evento, **quais serviços** ele costuma ter e **quais tarefas** cada serviço exige, com prazo contado a partir da data do evento e responsável por papel. Ao aplicar o modelo, o evento recebe os serviços e as tarefas já ligadas a eles, prontas para a organizadora ir concluindo. A tarefa do modelo tem o mesmo formato da tarefa do evento, para que nada se perca ao aplicar nem ao salvar um evento como modelo.

## 3. Requisitos relacionados

RF-053 (modelo de evento), RF-106 (modelos mais simples), RF-105 (salvar evento como modelo), RF-049 (criação do evento, SPEC-008 v2), RF-058 (serviços do evento), RF-061 (tarefas do evento, SPEC-003), RF-062 (prazos ao mudar a data, seção 6.7).

Fora: roteiro no modelo (RF-092, bloco 10), bibliotecas de briefing a mensagens (SPEC-013 a 017; as abas de vínculo do editor não mudam), loja de modelos (RF-079).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Tudo desta spec, nos modelos e eventos da própria conta. |
| Assistant | O mesmo (RF-045, SPEC-032 §17, ponto 2). |
| Outra conta | Não vê modelo nem evento. |

## 5. Pré-condições

Usuário autenticado, SPEC-001. Para aplicar um modelo ou salvar como modelo, o evento precisa existir e estar em andamento. Os serviços vêm do **cadastro de serviços da conta** (SPEC-018).

## 6. Fluxo principal

### 6.1. Biblioteca

1. A biblioteca lista os modelos da conta em tabela: nome, tipo, "N serviços · N tarefas" e ações (Editar, Clonar, Excluir).
2. "Novo modelo" abre um modal com Nome e Tipo. Salvar abre o editor.
3. "Importar modelo" pede Nome e Tipo e abre o modal de **Adicionar tarefas em massa** (seção 6.4) para o modelo novo. O modelo só é criado se a importação for gravada.

### 6.2. Editor do modelo

1. Cabeçalho: voltar, nome, tipo e as ações Clonar, Excluir e Salvar.
2. Abas: **Serviços e tarefas**, Briefings, Roteiros, Inspirações, RSVP e Mensagens. As abas Checklist e Tarefas **deixam de existir**.
3. Todas as abas seguem o padrão de lista do sistema (como Convidados e Fornecedores): cabeçalho da aba com título, subtítulo e resumo; barra com filtros à esquerda e ações à direita, fixa no topo ao rolar; e a lista em caixa com bordas.

### 6.3. Aba Serviços e tarefas

1. **Resumo:** "N serviços · N tarefas · Estimado R$ X".
2. **Filtros:** busca (serviço ou tarefa) e responsável (papel).
3. **Ações:** Expandir/Recolher todos, **Adicionar tarefas em massa**, **Adicionar serviços** (do cadastro, ou cadastrar novo, como na aba Fornecedores do evento) e **Nova tarefa**.
4. **Lista:** um bloco por serviço do modelo, que abre e fecha, e no fim o bloco fixo **Sem serviço**, que só aparece quando há tarefas sem serviço.
   - Cabeçalho do serviço: nome, valor estimado, contagem ("4 tarefas", ou "Sem tarefas" em destaque), botão "+ Tarefa" (nova tarefa já ligada ao serviço) e menu com "Valor estimado" e "Remover serviço".
   - Linha da tarefa: título, prazo legível ("6 semanas antes"), responsáveis, prioridade (só "Alta" em destaque) e "N itens" quando tem checklist. Ações: Editar e Excluir.
   - Dentro do bloco, as tarefas seguem a ordem do prazo: as mais distantes antes do evento primeiro, depois "No dia do evento", depois as de depois do evento, e as sem prazo no fim; empate pelo título.
5. **Nova tarefa / Editar** abre o **mesmo formulário da tarefa do evento** (SPEC-003 §6.1), em modo modelo (seção 8.2).
6. Remover um serviço que tem tarefas pergunta o que fazer com elas: **"Mover para Sem serviço"** (padrão) ou **"Excluir as tarefas também"**.
7. Tudo o que é feito na aba só é gravado no **Salvar** do cabeçalho, como hoje. Sair com alterações não salvas pede confirmação.

### 6.4. Adicionar tarefas em massa

Substitui "Colar tarefas". O mesmo modal serve ao modelo (aqui) e ao evento (SPEC-003 v5).

1. O modal mostra uma **grade editável**. Cada linha tem: **Tarefa** (obrigatória), **Serviço** (seletor da seção 8.4), **Prazo**, **Responsáveis**, **Prioridade** e **Descrição**. Valores iniciais de uma linha nova: sem serviço, sem prazo, Organizador, prioridade média.
2. Três formas de preencher a grade, que podem ser combinadas:
   - digitar linha a linha ("+ Linha");
   - **Colar lista**: uma caixa de texto que, ao confirmar, acrescenta as linhas lidas (seção 8.6);
   - **Enviar planilha** (.xlsx ou .csv), que acrescenta as linhas lidas (seção 8.7).
3. Ao lado de "Enviar planilha" ficam o botão **"?"**, que abre a ajuda com o formato da lista e das colunas, e **"Baixar planilha modelo"**.
4. A grade **é a prévia**: nada é gravado antes de "Adicionar N tarefas". Linhas com problema ficam marcadas na própria linha (seção 7), e o botão diz quantas tarefas serão adicionadas.
5. Serviço que não existe no cadastro aparece na linha como **"Serviço novo, será cadastrado"**. A pessoa pode trocar por outro serviço ou por "Sem serviço" antes de gravar.
6. "Adicionar" grava tudo junto: cadastra os serviços novos na conta, inclui no modelo os serviços que ele ainda não tinha e cria as tarefas. Aviso final: "N tarefas adicionadas".

### 6.5. Aplicar modelo num evento existente

1. Na lista de tarefas do evento, ou no "Mais" do Resumo, "Aplicar modelo" abre um modal com os modelos do mesmo tipo do evento.
2. Escolhido o modelo, a prévia diz: "N serviços e N tarefas novos. M já existem no evento e serão ignorados."
3. "Aplicar" acrescenta só o que é novo (seção 8.8). Nada do evento é apagado ou alterado.

### 6.6. Salvar evento como modelo

1. No "Mais" do Resumo do evento, "Salvar como modelo" abre um modal com o Nome, sugerido como "Modelo — <nome do evento>".
2. A prévia mostra quantos serviços e tarefas vão para o modelo e quantas tarefas ficarão sem prazo.
3. "Salvar" cria o modelo, do mesmo tipo do evento, e oferece "Abrir modelo". Conversão na seção 8.9.

### 6.7. Mudar a data do evento

1. Tarefas e itens com **prazo relativo** acompanham a data do evento sozinhos: não há pergunta.
2. Tarefas e itens com **data exata** seguem a regra da v2: ao salvar uma data nova no Editar evento, e havendo tarefas não concluídas com data exata, ou itens abertos com data exata nessas tarefas, o modal pergunta "Mover os prazos com data exata junto com a data do evento?". "Mover" soma a diferença em dias; "Manter" não mexe.
3. Tarefas concluídas, itens feitos ou cancelados e tudo o que está sem prazo nunca mudam. Evento que passa a não ter data não abre o modal.

## 7. Fluxos alternativos

- Grade sem nenhuma linha válida: "Adicionar" fica desligado.
- Linha só com espaços ou totalmente vazia: ignorada sem aviso.
- Linha com prazo ilegível (lista ou planilha): marcada "Prazo não reconhecido"; se não for corrigida, entra sem prazo.
- Linha com responsável desconhecido: marcada; se não for corrigida, entra com Organizador.
- Prazo com **data exata** colado ou enviado para um **modelo**: marcado "Modelo aceita só prazo relativo"; se não for corrigido, entra sem prazo.
- Duas linhas com o mesmo serviço e o mesmo título: a segunda fica marcada como repetida e não entra.
- Planilha sem a coluna Tarefa, ou com um formato que não seja .xlsx/.csv: erro claro no modal e nada é acrescentado à grade.
- Aplicar modelo em evento sem data: as tarefas entram com o prazo relativo e aparecem sem data calculada até o evento ter data; a prévia avisa.
- Aplicar o mesmo modelo duas vezes: na segunda, tudo já existe e nada muda (a prévia mostra 0 novos).
- Responsável "Assistente" numa conta sem assistentes ativas: a tarefa é criada assim mesmo; a lista mostra "Assistente (nenhuma ativa)".
- Serviço do cadastro excluído depois de usado num modelo: o modelo continua mostrando o nome que tinha, marcado "(removido do cadastro)", e ainda pode ser aplicado (o serviço volta a ser cadastrado na aplicação).
- Excluir um modelo já usado: os eventos criados com ele não mudam.

## 8. Regras de negócio

### 8.1. Prazo

Uma tarefa (ou item de checklist) tem um de três tipos de prazo:

| Tipo | Onde vale | O que guarda |
|---|---|---|
| **Sem prazo** | modelo e evento | nada |
| **Relativo** | modelo e evento | deslocamento em dias em relação à data do evento: negativo = antes, 0 = no dia, positivo = depois |
| **Data exata** | **só no evento** | uma data |

- Ao digitar o relativo: número de 0 a 999, unidade (dias, semanas ou meses) e sentido (antes ou depois), ou a opção "No dia do evento". 1 semana = 7 dias; 1 mês = 30 dias.
- Ao exibir: múltiplo de 30 vira "N meses", senão múltiplo de 7 vira "N semanas", senão "N dias", seguido de "antes" ou "depois" ("6 semanas antes", "2 semanas depois", "1 mês antes"); 0 é "No dia do evento".
- **Prazo efetivo** de uma tarefa relativa no evento = data do evento + deslocamento. É ele que conta para atraso, Hoje, Agenda e para o agrupamento da lista do evento (SPEC-003 §6.2). Evento sem data: a tarefa relativa não tem prazo efetivo e mostra só o texto ("6 semanas antes").
- No formulário do evento, o relativo mostra a data calculada ao lado ("= 15/03/2027"). A pessoa pode trocar uma tarefa de relativo para data exata e vice-versa a qualquer momento.

### 8.2. Tarefa do modelo

Mesmo formato da tarefa do evento (SPEC-003 v5), com estas diferenças:

| Campo | Evento | Modelo |
|---|---|---|
| Título, Descrição, Prioridade, Visibilidade | sim | sim |
| Serviço | serviço do evento, opcional | serviço do modelo, opcional |
| Prazo | sem prazo, relativo ou data exata | **sem prazo ou relativo** |
| Responsáveis | papéis ou pessoas (seção 8.3) | **só papéis** |
| Checklist | texto, feito/cancelado, prazo, responsável | texto, prazo (sem ou relativo), responsável (papel) — **sem feito/cancelado** |
| Situação | sim | **não** (a tarefa aplicada nasce Pendente) |
| Comentários e anexos | sim | **não** |

O campo **grupo deixa de existir**, no modelo e no evento.

### 8.3. Responsáveis por papel

- Papéis: **Organizador** (a dona da conta), **Assistente** e **Cliente**. "Equipe" continua reservado e não aparece na escolha. Papéis criados no futuro entram na mesma lista, no modelo e no evento.
- **No modelo:** a tarefa tem um ou mais papéis; o item da checklist tem nenhum ou um papel.
- **No evento:** o responsável pode ser um papel ou, se a organizadora quiser, uma **pessoa específica** (uma assistente pelo nome). Na escolha aparecem: Organizador, Assistente (todas), cada assistente ativa pelo nome e Cliente.
- "Assistente" como papel quer dizer **todas as assistentes ativas da conta**: todas veem a tarefa na Hoje e no filtro "minhas tarefas", e o filtro de responsável da lista tem a opção "Assistente (papel)".
- Ao aplicar, os papéis do modelo são copiados como papéis. Ao salvar como modelo, uma assistente específica vira o papel Assistente.

### 8.4. Serviço do modelo e seletor de serviço

- O serviço do modelo é ligado ao **serviço do cadastro da conta** (SPEC-018), não só ao nome. O nome exibido é o do cadastro; renomear no cadastro renomeia no modelo. O valor estimado é do modelo.
- O seletor de serviço da tarefa (e da grade em massa) segue o comportamento da tela de fornecedor (SPEC-018, card #27): **lista suspensa com busca** e **"+ Adicionar serviço"**, que cadastra um serviço novo na conta e já o seleciona.
- No modelo, a lista mostra primeiro os serviços já incluídos no modelo e depois o resto do cadastro. Escolher um serviço que o modelo ainda não tem **inclui o serviço no modelo** (sem valor estimado).
- No evento vale o mesmo, com os serviços do evento no lugar dos do modelo; escolher um que o evento não tem inclui o serviço no evento, como "Adicionar serviço" da aba Fornecedores.

### 8.5. Mesmo serviço, mesma tarefa

- Mesmo serviço: mesmo serviço do cadastro; quando a comparação for por nome, sem diferenciar maiúsculas e acentos.
- Mesma tarefa: **mesmo serviço** (ou ambas sem serviço) **e mesmo título**, sem diferenciar maiúsculas e acentos. "Pedir orçamento" no Buffet e "Pedir orçamento" na Fotografia são tarefas diferentes.

### 8.6. Leitura da lista colada

- Cada linha não vazia é uma tarefa, menos as linhas de título.
- **Título de serviço** é a linha que termina com `:` ou que está toda em maiúsculas. As tarefas abaixo dela ficam nesse serviço até o próximo título. O nome é procurado no cadastro (seção 8.5); se não existir, vira "Serviço novo".
- Marcadores no começo da linha são removidos: `-`, `*`, `•`, `[ ]`, `[x]`, números como `1.` ou `1)`.
- Prazo opcional no fim da linha, entre parênteses: `(6 semanas)` ou `(6 semanas antes)`, `(2 semanas depois)`, `(no dia)`; no evento também `(15/03/2027)`. Sem sentido explícito, vale "antes" (compatível com a v2).
- Título com mais de 200 caracteres é cortado em 200, com aviso na linha.

### 8.7. Planilha

- Colunas, pela primeira linha (cabeçalho, em qualquer ordem): **Tarefa** (obrigatória), **Serviço**, **Prazo**, **Responsáveis**, **Prioridade**, **Descrição**.
- Prazo no formato da seção 8.6, sem os parênteses ("6 semanas antes", "no dia", "15/03/2027" só no evento).
- Responsáveis: papéis separados por `;` ("Organizador; Cliente"). No evento, também o nome de uma assistente ativa. Vazio = Organizador.
- Prioridade: Baixa, Média ou Alta. Vazio = Média.
- Compatibilidade: a coluna **Grupo** da planilha v2 é lida como Serviço.
- "Baixar planilha modelo" entrega um .xlsx com essas colunas e três linhas de exemplo.

### 8.8. Aplicar

- Serviços: cria no evento os serviços do modelo que ele ainda não tem (seção 8.5), com o valor estimado do modelo.
- Tarefas: cria as que o evento ainda não tem (seção 8.5), **Pendentes**, ligadas ao serviço correspondente do evento, com prazo relativo, descrição, prioridade, visibilidade, responsáveis (papéis) e checklist (itens abertos, com prazo relativo e responsável por papel).
- Tudo grava junto ou nada grava.

### 8.9. Salvar evento como modelo

- Leva os serviços do evento (com valor estimado) e todas as tarefas (feitas ou não), cada uma com o serviço, título, descrição, prioridade, visibilidade, responsáveis e checklist.
- Prazo: relativo vai como está; **data exata** vira relativo pela distância até a data do evento (antes ou depois); evento sem data ou tarefa sem prazo vai **sem prazo**. O mesmo vale para os itens.
- Responsáveis: assistente específica vira o papel Assistente; os demais papéis vão como estão.
- Não leva situação, feito/cancelado dos itens, comentários, anexos, fornecedores, valores contratados, parcelas, convidados nem clientes.

### 8.10. Migração dos dados existentes

1. **Itens do checklist antigo** (tipo e texto) viram **tarefas do serviço** em que estavam: título = texto, sem prazo, Organizador, prioridade média. O tipo (Tarefa, Fornecedor, Alinhamento, Comparativo) é descartado.
2. **Tarefas do modelo**: "dias antes" vira prazo relativo antes (mesmo número de dias).
3. **Tarefas de evento**: o prazo atual vira **data exata**.
4. **Grupo** (modelo e evento): se o texto é igual ao nome de um serviço do mesmo modelo ou evento (seção 8.5), a tarefa passa a ser ligada a esse serviço; senão, o grupo é descartado. Tarefa que já tinha serviço mantém o serviço.
5. **Serviços do modelo** são ligados ao cadastro pelo nome; nome que não existe no cadastro é cadastrado na conta.
6. Responsáveis já gravados não mudam (Organizador, assistente específica e Cliente continuam válidos).

## 9. Validações

Nome do modelo obrigatório, sem só espaços. Tipo é um dos cinco. Título da tarefa obrigatório, até 200 caracteres. Prazo relativo: inteiro de 0 a 999 na unidade escolhida. Data exata só em tarefa de evento. Tarefa com ao menos um responsável; item com no máximo um. Prioridade e visibilidade nos enums. Serviço do modelo é do cadastro da mesma conta. Planilha de até 2 MB e até 500 linhas; grade de até 500 linhas. Modelo aplicado é da conta e do mesmo tipo do evento.

## 10. Estados

Sem estados novos. O modelo existe ou não existe. A tarefa aplicada nasce Pendente; os itens nascem abertos.

## 11. Dados necessários

- **Serviço do modelo:** serviço do cadastro (referência), valor estimado.
- **Tarefa do modelo:** título, descrição, prioridade, visibilidade, serviço do modelo (opcional), prazo relativo (opcional), responsáveis (papéis).
- **Item da checklist do modelo (novo):** texto, ordem, prazo relativo (opcional), responsável (papel, opcional).
- **Tarefa e item do evento:** tipo de prazo, prazo relativo (deslocamento) ou data exata; responsável por papel ou pessoa (SPEC-003 v5).
- **Saem:** item tipado do serviço do modelo; grupo da tarefa (modelo e evento).
- Adicionar em massa: linhas da grade; texto colado ou arquivo; para modelo novo, nome e tipo.
- Aplicar: evento e modelo. Salvar como modelo: evento e nome.

## 12. Interface

- Abas do editor e lista no padrão das telas de lista (seção 6.2): `.barra-lista` fixa dentro das abas (`.abas-barra-lista`) e lista em caixa como a aba Fornecedores do evento.
- Formulário da tarefa: o modal da SPEC-003, com o campo **Prazo** em três partes na mesma linha: tipo (Sem prazo / Relativo / Data exata), e conforme o tipo, número + unidade + sentido (ou "No dia") ou a data. No modelo, o tipo só oferece Sem prazo e Relativo.
- Adicionar em massa: modal largo (`DIALOG_LARGO`), grade com rolagem dentro do modal, linha com problema marcada com `.gd-alerta`, ajuda em painel recolhível no próprio modal.
- Biblioteca: tabela com a coluna "Serviços · Tarefas".

## 13. Erros

Arquivo inválido ou grande demais: mensagem no modal, nada acrescentado. Falha ao adicionar em massa, aplicar ou salvar como modelo: nada fica pela metade (tudo grava junto ou nada grava). Modelo, evento ou serviço de outra conta: indisponível, sem revelar dado.

## 14. Critérios de aceite

1. O editor tem a aba "Serviços e tarefas" e não tem mais as abas Checklist e Tarefas.
2. Na aba, cada serviço abre e mostra as próprias tarefas; tarefas sem serviço aparecem em "Sem serviço".
3. Nova tarefa no modelo abre o mesmo formulário da tarefa do evento, sem Situação e sem a opção "Data exata".
4. Prazo relativo: 42 dias antes aparece como "6 semanas antes"; 14 depois como "2 semanas depois"; 0 como "No dia do evento". Informar "2 meses antes" grava −60.
5. O seletor de serviço tem busca e "+ Adicionar serviço"; escolher um serviço que o modelo não tem inclui o serviço no modelo.
6. Adicionar em massa: colar uma lista com títulos de serviço terminados em `:` e prazos `(6 semanas)`, `(2 semanas depois)` e `(no dia)` preenche a grade com serviço e prazo certos; nada é gravado antes de "Adicionar".
7. A planilha modelo, preenchida e enviada, gera as mesmas linhas que o texto equivalente; a coluna Grupo de uma planilha antiga é lida como Serviço.
8. Serviço inexistente aparece como "Serviço novo, será cadastrado" e, ao adicionar, passa a existir no cadastro e no modelo.
9. Aplicar um modelo cria no evento os serviços e as tarefas ligadas a eles, pendentes e com responsáveis por papel; aplicar de novo não muda nada.
10. Tarefa relativa no evento: mudar a data do evento em +10 dias muda o prazo efetivo em +10 dias sem perguntar; tarefa com data exata continua passando pela pergunta "Mover / Manter".
11. Evento sem data: tarefa relativa aparece com "6 semanas antes" e sem data; ao dar data ao evento, a data aparece.
12. No evento, dá para trocar o responsável "Assistente" por uma assistente específica; "Assistente" como papel aparece na Hoje de todas as assistentes ativas.
13. Salvar como modelo um evento com data gera prazos relativos iguais à distância entre cada data exata e a data do evento, inclusive "depois".
14. Depois da migração, itens do checklist antigo aparecem como tarefas do serviço, e tarefas com grupo igual ao nome de um serviço aparecem ligadas a ele.
15. Outra conta não vê, não aplica e não salva modelo de outra conta.

## 15. Cenários de teste

Unidade: conversão e exibição do prazo relativo (−180, −42, −10, 0, 14, 30, nulo); prazo efetivo com e sem data do evento; leitura da lista colada (títulos de serviço, marcadores, prazos antes/depois/no dia/data, linhas vazias e repetidas por serviço + título); leitura da planilha (cabeçalho fora de ordem, sem coluna Tarefa, coluna Grupo antiga, responsáveis com `;`); comparação de serviço e de tarefa sem acento e maiúsculas; conversão de data exata em relativo no salvar como modelo.

Integração: adicionar em massa no modelo e no evento (com serviço novo); aplicar duas vezes no mesmo evento; aplicar em evento sem data e depois dar data; mudar a data com tarefas relativas e exatas misturadas; salvar como modelo com e sem data; responsável Assistente (papel) e assistente específica; migração dos dados da v2; isolamento entre contas.

## 16. Dependências

SPEC-003 v5 (tarefa do evento: prazo relativo, responsáveis por papel, sem grupo, adicionar em massa). SPEC-018 (cadastro de serviços e seletor com busca e "+ Adicionar serviço"). SPEC-008 v2 (criação e Resumo do evento, onde fica o "Mais"). SPEC-032 (assistentes). Leitura de planilha: o mesmo leitor da importação de convidados (SPEC-010).

## 17. Premissas e pontos não definidos

Decisões aprovadas pelo usuário em 24/11/2026:

1. **Uma aba só.** Checklist e Tarefas viram "Serviços e tarefas": o serviço vem do cadastro e cada serviço tem N tarefas.
2. **Mesmo formato da tarefa do evento**, menos data exata, situação, comentários e anexos (seção 8.2).
3. **Prazo relativo acompanha a data do evento** no próprio evento (não vira data fixa ao aplicar). O modal "Mover prazos" passa a valer só para data exata (seção 6.7).
4. **Prazo depois do evento** entra agora (substitui a decisão 2 da v2, que guardava como "No dia do evento").
5. **Responsáveis por papel** (Organizador, Assistente, Cliente, e papéis futuros), no modelo e no evento; no evento a organizadora pode trocar por uma pessoa específica (seção 8.3).
6. **Grupo removido**, no modelo e no evento. Migração na seção 8.10, item 4.
7. **Seletor de serviço** igual ao da tela de fornecedor: lista com busca e "+ Adicionar serviço".
8. **"Colar tarefas" vira "Adicionar tarefas em massa"**, com grade, lista colada, planilha, ajuda e planilha modelo, no novo formato; serviço inexistente é cadastrado por padrão.
9. Os itens tipados do checklist antigo nunca eram aplicados ao evento; viram tarefas do serviço na migração.

Mantidas da v2: mês = 30 dias (aproximação aceita); a ordem manual das tarefas continua fora (ordem pelo prazo); o roteiro no modelo entra com RF-092 (bloco 10).

Também aprovados em 24/11/2026:

- Remover serviço do modelo com tarefas: padrão "Mover para Sem serviço" (seção 6.3, item 6).
- "Assistente" como papel sem assistentes ativas na conta: a tarefa existe e mostra "Assistente (nenhuma ativa)" (seção 7).
- Na grade em massa, checklist dos itens fica de fora: os itens se acrescentam depois, abrindo a tarefa.
