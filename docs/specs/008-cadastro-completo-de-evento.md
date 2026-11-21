# 008. Cadastro e resumo do evento

**Status: aprovada (versão 4, card #19 "Simplificar o cadastro de evento").** A versão 3 (18/11/2026) está no histórico do Git. A v4 enxuga a criação: sem pacote, casamento com um nome só e busca de clientes sem vínculo. O restante segue [produto-v1.md](../produto-v1.md) 5.3.

## 1. Identificador e nome

SPEC-008. Cadastro e resumo do evento (v4).

## 2. Objetivo

Criar um evento em menos de um minuto, num modal só, e abrir o evento num resumo em cartões que diz o que precisa de atenção.

## 3. Requisitos relacionados

RF-049 (criação curta), RF-050 (resumo do evento), RF-055 (cliente do evento), RF-074 (evento na agenda).

Fora desta spec, cada um com a sua: aplicar modelo de evento (pacote) a um evento já criado (RF-053; a criação deixa de aplicar modelo), dinheiro do casal (RF-095), roteiro (RF-092), equipe do dia (RF-051), link do casal (RF-056), observações (RF-107), salvar como modelo (RF-105), visão em tabela da lista de eventos (SPEC-002).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Criar, abrir, editar, concluir e cancelar os próprios eventos. |
| Assistant | O mesmo, nos eventos que a dona liberou para ela (RF-045). Regras na SPEC-032. |
| Outra conta | Não vê o evento. |

## 5. Pré-condições

Usuário autenticado, SPEC-001. Modelo de evento **não** é pré-condição.

## 6. Fluxo principal

### 6.1. Criar

1. "Novo evento" no cabeçalho da lista de eventos abre o modal de criação. No celular, o "+" da barra inferior também abre. A barra superior fica com o título da área e o botão de tema; não há "Novo evento" ao lado do tema.
2. O usuário escolhe o **tipo** em cartões: Casamento, 15 anos, Aniversário, Corporativo, Formatura.
3. Não há escolha de pacote nem de modelo na criação. O evento nasce sem tarefas e sem serviços. Aplicar um modelo a um evento existente fica para a edição, em spec própria.
4. O usuário informa o **nome do evento**, igual para todos os tipos, inclusive casamento: um campo só, sem nome da noiva e do noivo na criação.
5. Opcionais, na mesma tela: **data** (digitável ou pelo calendário), **horário**, **convidados estimados** e **local**.
6. Opcional: **cliente**. Um campo de busca encontra um cliente da conta pelo nome. Sem texto digitado, a lista mostra só clientes **sem vínculo com nenhum evento**. Ao digitar, a busca pelo nome também encontra clientes que já têm vínculo com outro evento, e o organizador pode escolher um deles (um cliente pode estar em mais de um evento); esses aparecem com o nome do evento em que estão. Se não existir, "Cadastrar novo" abre dois campos, nome e WhatsApp.
7. "Criar evento" grava e abre o resumo do novo evento. O aviso diz "Evento criado".

### 6.2. Resumo do evento

A primeira aba do evento passa a se chamar **Resumo** e mostra, de cima para baixo:

1. **Cabeçalho**: nome, tipo, data e horário (ou "Sem data"), local, contagem regressiva, e os botões "Editar" e "Mais" (Concluir, Cancelar).
2. **Alertas** que pedem ação, até três, do mais urgente para o menos urgente. Cada alerta tem um botão que leva à tela que resolve (seção 8.3). Sem alerta, a faixa não aparece.
3. **Cartões**, em grade (seção 8.4). Cada cartão tem um número principal, uma linha de apoio e o link "Abrir", que leva à aba ou à tela daquele assunto.

### 6.3. Editar

"Editar" abre o modal de edição com quatro abas: Informações gerais, Detalhes, Cerimônia e Recepção. Os campos que saíram da criação (foto, tags, notificações, agenda, budget, horários de detalhe, endereço completo) ficam aqui.

## 7. Fluxos alternativos

- Sem tipo ou sem nome: não grava; o campo mostra o erro.
- Sem data: o evento não entra na agenda.
- Todos os clientes já vinculados e nada digitado: a lista mostra só "Cadastrar novo"; digitar o nome ainda encontra os vinculados.
- Cliente novo com WhatsApp inválido: não grava; o erro aparece no campo.
- Fechar o modal sem criar: nada é gravado.
- Evento de outra conta ou inexistente: mensagem de indisponível, sem revelar se existe.

## 8. Regras de negócio

### 8.1. Criação

- Obrigatórios: tipo e nome. A criação não recebe modelo.
- O nome do evento é o texto digitado, em qualquer tipo. Na edição de casamento, o nome da noiva e o do noivo continuam opcionais: com os dois preenchidos, o nome do evento é a junção deles com `&`; com só um, é esse nome.
- Cliente existente escolhido na criação pode já ter vínculo com outro evento; o vínculo novo não desfaz o antigo.
- O transfer não faz parte da criação; fica só na aba Convidados (SPEC-010).
- Evento com data entra na agenda da conta. A opção de tirar da agenda fica na edição.
- O valor da assessoria e as parcelas do casal **não** são pedidos na criação. Eles ficam no Dinheiro do evento (RF-095). O passo de valor da assessoria logo após salvar deixa de existir.
- Cliente novo criado aqui grava só nome e WhatsApp e fica vinculado ao evento. O papel e os outros dados são completados depois em Clientes (SPEC-009); o papel nasce vazio.
- O local da criação é gravado como o nome do local da recepção. Cerimônia e endereço completo ficam na edição.

### 8.2. Abas do evento

Resumo, Convidados, Fornecedores, Contratos e Dinheiro. **A aba Tarefas saiu: a lista de tarefas fica dentro do Resumo, abaixo dos cartões ([SPEC-051](051-resumo-do-evento-com-tarefas.md)).** A lista de serviços e fornecedores que hoje fica na primeira aba passa para a aba **Fornecedores**, sem mudar o comportamento da SPEC-018. Os clientes do evento ficam num cartão do Resumo.

### 8.3. Alertas

Calculados ao abrir o resumo, só para evento em andamento:

| Alerta | Quando | Leva a |
|---|---|---|
| "N tarefas atrasadas" | Tarefa não concluída com prazo antes de hoje | Lista de tarefas do próprio Resumo, filtro atrasadas (SPEC-051) |
| "N pagamentos a fornecedor vencidos" | Parcela a fornecedor vencida e não paga | Fornecedores |
| "N pagamentos a fornecedor nesta semana" | Parcela a fornecedor que vence nos próximos 7 dias | Fornecedores |
| "N serviços sem fornecedor contratado" | Faltam 60 dias ou menos e há serviço sem contratado | Fornecedores |
| "N convidados sem resposta" | Faltam 30 dias ou menos e há convidado pendente | Convidados, filtro pendentes |
| "Evento sem data" | Evento sem data | Editar |

A ordem é a da tabela. Aparecem no máximo três.

### 8.4. Cartões do resumo

| Cartão | Número principal | Apoio | Abrir |
|---|---|---|---|
| Tarefas | % concluídas | "N de M feitas · N atrasadas" | Rola até a lista de tarefas do Resumo (SPEC-051) |
| Convidados | Confirmados | "N pendentes · N recusados · de M" | Convidados |
| Fornecedores | Serviços contratados | "N de M serviços · N sem fornecedor" | Fornecedores |
| Orçamento | Contratado | "Estimado R$ X · pago R$ Y" | Fornecedores |
| Cliente | Nome do cliente principal | WhatsApp, ou "Nenhum cliente" com o botão "Vincular" | Modal de vínculo |

Os cartões de Dinheiro do casal, Roteiro, Equipe, Link do casal e Notas entram com as specs desses blocos; até lá, não aparecem.

## 9. Validações

Tipo é um dos cinco. Nome sem só espaços, igual para todos os tipos. Data e hora válidas, se preenchidas; a data aceita `dd/mm/aaaa` digitada. Convidados estimados inteiro maior ou igual a zero. Cliente existente é da conta. Cliente novo: nome obrigatório e WhatsApp com DDD válido.

## 10. Estados

Não muda a máquina da SPEC-002: o evento nasce em andamento; concluir e cancelar ficam em "Mais".

## 11. Dados necessários

Criar: tipo, nome, data, horário, convidados estimados, local, cliente existente **ou** cliente novo (nome, WhatsApp).

Editar, Informações gerais: foto, nomes, data, horário (convite), budget estimado, senha do site, tags, três notificações, salvar na agenda.

Editar, Detalhes: convidados estimados, tempo de festa, início da cerimônia, início da recepção, padrinhos, damas e pajens.

Editar, Cerimônia e Recepção, cada uma: local, CEP, país, endereço, número, estado, cidade, bairro. CEP completo preenche o resto.

Resumo: os números da seção 8.4 e os alertas da 8.3, calculados no servidor numa leitura só.

## 12. Interface

Modal largo (design-system 5.10). No celular, o modal sobe de baixo e os cartões de tipo ficam em duas colunas. O botão principal é "Criar evento". O resumo usa `.gd-numeros` para os cartões e `.gd-alerta` para os alertas. Há um só "Novo evento" no computador: o do cabeçalho da lista. O "+" do celular permanece.

## 13. Erros

Campo inválido fica no modal com a mensagem no campo. Falha ao gravar não cria evento pela metade: evento, tarefas, serviços, agenda e cliente novo gravam juntos ou nada grava.

## 14. Critérios de aceite

1. Com tipo e nome, o evento é criado em andamento e o resumo abre.
2. A criação não mostra pacotes; o evento nasce sem tarefas e sem serviços.
3. Casamento pede só o nome do evento, como os outros tipos; "Maria e João" é gravado como digitado.
4. A criação não mostra opção de transfer.
5. A criação não pede valor da assessoria nem parcelas.
6. Cliente existente escolhido na busca fica vinculado; cliente novo com nome e WhatsApp é criado e vinculado. Sem digitar, a lista só tem clientes sem evento; digitando o nome, aparece também cliente já vinculado a outro evento, e escolhê-lo vincula ao novo evento.
7. Evento com data aparece na Minha agenda.
8. O resumo mostra os cinco cartões com os números reais e até três alertas na ordem da seção 8.3.
9. Cada alerta e cada "Abrir" leva à tela certa.
10. A edição em quatro abas continua gravando horários e endereço completo; CEP preenche o endereço.
11. Outra conta não vê o evento nem o resumo.
12. No computador, a barra superior não tem "Novo evento". O botão do cabeçalho da lista abre o modal. No celular, o "+" da barra inferior também abre.

## 15. Cenários de teste

Criar só com tipo e nome, em cada tipo (casamento inclusive: um campo de nome). Conferir que não há pacote nem transfer. Editar casamento com os dois nomes (vira "A & B") e com um só. Criar com cliente sem vínculo, com cliente já vinculado achado pela busca e com cliente novo; WhatsApp inválido; lista sem busca sem clientes vinculados. Resumo de evento sem nada (zeros, alerta "Evento sem data"). Resumo com tarefa atrasada, parcela vencida, parcela da semana, serviço sem contratado a 45 dias e convidados pendentes a 20 dias: conferir os três primeiros alertas. Isolamento entre contas. No computador, a barra superior só tem o tema; "Novo evento" aparece no cabeçalho da lista. No celular, o "+" abre o mesmo modal.

## 16. Dependências

SPEC-001, SPEC-002 (lista e situações), SPEC-003 (tarefas), SPEC-004 e SPEC-010 (convidados), SPEC-006 e SPEC-009 (clientes), SPEC-018 (serviços, fornecedores e parcelas).

## 17. Premissas e pontos não definidos

- Os limites de 60 dias (serviço sem fornecedor) e 30 dias (convidados sem resposta) são propostos aqui e podem ser ajustados.
- "Momentos" do roteiro no cartão do pacote entram quando o roteiro no evento existir (RF-092).
- Sem modelo na criação, o modelo se aplica depois pelo menu "Aplicar modelo" do evento (SPEC-012).
- O endpoint atual de valor da assessoria continua até o Dinheiro do evento substituí-lo; a tela deixa de chamá-lo.
- Tamanho máximo dos textos não definido.
