# 008. Cadastro e resumo do evento

**Status: aprovada (versão 2, 18/11/2026).** O código segue esta spec. A versão 1 está no histórico do Git. Fonte: [produto-v1.md](../produto-v1.md) 5.3, plano do cliente, Cerimonial Fácil, Ivola e Assessoria VIP.

## 1. Identificador e nome

SPEC-008. Cadastro e resumo do evento.

## 2. Objetivo

Criar um evento em menos de um minuto, num modal só, e abrir o evento num resumo em cartões que diz o que precisa de atenção.

## 3. Requisitos relacionados

RF-049 (criação curta), RF-050 (resumo do evento), RF-053 (modelo aplicado na criação), RF-055 (cliente do evento), RF-074 (evento na agenda).

Fora desta spec, cada um com a sua: dinheiro do casal (RF-095), roteiro (RF-092), equipe do dia (RF-051), link do casal (RF-056), observações (RF-107), salvar como modelo (RF-105), visão em tabela da lista de eventos (SPEC-002).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Criar, abrir, editar, concluir e cancelar os próprios eventos. |
| Assistant | O mesmo, nos eventos que a dona liberou para ela (RF-045). Enquanto a spec de assistente não for implementada, só o Organizer. |
| Outra conta | Não vê o evento. |

## 5. Pré-condições

Usuário autenticado, SPEC-001. Modelo de evento **não** é pré-condição.

## 6. Fluxo principal

### 6.1. Criar

1. Em qualquer tela, "Novo evento" (barra superior, botão "+" da barra inferior no celular ou cabeçalho da lista) abre o modal de criação.
2. O usuário escolhe o **tipo** em cartões: Casamento, 15 anos, Aniversário, Corporativo, Formatura.
3. Abaixo do tipo aparecem os **pacotes**: os modelos de evento da conta daquele tipo, cada um num cartão com o nome do modelo e "N tarefas · N serviços". Há também o cartão "Começar vazio". Se o tipo tem um só modelo, ele já vem escolhido.
4. O usuário informa o **nome**: no casamento, os dois nomes; nos outros tipos, um nome.
5. Opcionais, na mesma tela: **data** (digitável ou pelo calendário), **horário**, **convidados estimados** e **local**.
6. Opcional: **cliente**. Um campo de busca encontra um cliente da conta pelo nome; se não existir, "Cadastrar novo" abre dois campos, nome e WhatsApp.
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
- Casamento com um nome só: não grava ("Informe os dois nomes").
- "Começar vazio": o evento nasce sem tarefas e sem serviços.
- Tipo sem modelo na conta: só aparece "Começar vazio", com a dica "Crie modelos em Modelos de evento".
- Sem data: o modelo é aplicado, mas as tarefas ficam sem prazo; o evento não entra na agenda.
- Cliente novo com WhatsApp inválido: não grava; o erro aparece no campo.
- Fechar o modal sem criar: nada é gravado.
- Evento de outra conta ou inexistente: mensagem de indisponível, sem revelar se existe.

## 8. Regras de negócio

### 8.1. Criação

- Obrigatórios: tipo e nome. Modelo não é obrigatório.
- O nome do casamento é a junção dos dois nomes com `&`.
- O modelo escolhido cria os serviços e as tarefas do modelo, com prazo calculado em "dias antes" da data (SPEC-012).
- Evento com data entra na agenda da conta. A opção de tirar da agenda fica na edição.
- O valor da assessoria e as parcelas do casal **não** são pedidos na criação. Eles ficam no Dinheiro do evento (RF-095). O passo de valor da assessoria logo após salvar deixa de existir.
- Cliente novo criado aqui grava só nome e WhatsApp e fica vinculado ao evento. O papel e os outros dados são completados depois em Clientes (SPEC-009); o papel nasce vazio.
- O local da criação é gravado como o nome do local da recepção. Cerimônia e endereço completo ficam na edição.

### 8.2. Abas do evento

Resumo, Tarefas, Convidados e Fornecedores. A lista de serviços e fornecedores que hoje fica na primeira aba passa para a aba **Fornecedores**, sem mudar o comportamento da SPEC-018. Os clientes do evento ficam num cartão do Resumo.

### 8.3. Alertas

Calculados ao abrir o resumo, só para evento em andamento:

| Alerta | Quando | Leva a |
|---|---|---|
| "N tarefas atrasadas" | Tarefa não concluída com prazo antes de hoje | Tarefas, filtro atrasadas |
| "N pagamentos a fornecedor vencidos" | Parcela a fornecedor vencida e não paga | Fornecedores |
| "N pagamentos a fornecedor nesta semana" | Parcela a fornecedor que vence nos próximos 7 dias | Fornecedores |
| "N serviços sem fornecedor contratado" | Faltam 60 dias ou menos e há serviço sem contratado | Fornecedores |
| "N convidados sem resposta" | Faltam 30 dias ou menos e há convidado pendente | Convidados, filtro pendentes |
| "Evento sem data" | Evento sem data | Editar |

A ordem é a da tabela. Aparecem no máximo três.

### 8.4. Cartões do resumo

| Cartão | Número principal | Apoio | Abrir |
|---|---|---|---|
| Tarefas | % concluídas | "N de M feitas · N atrasadas" | Tarefas |
| Convidados | Confirmados | "N pendentes · N recusados · de M" | Convidados |
| Fornecedores | Serviços contratados | "N de M serviços · N sem fornecedor" | Fornecedores |
| Orçamento | Contratado | "Estimado R$ X · pago R$ Y" | Fornecedores |
| Cliente | Nome do cliente principal | WhatsApp, ou "Nenhum cliente" com o botão "Vincular" | Modal de vínculo |

Os cartões de Dinheiro do casal, Roteiro, Equipe, Link do casal e Notas entram com as specs desses blocos; até lá, não aparecem.

## 9. Validações

Tipo é um dos cinco. Nome sem só espaços; no casamento, os dois. Data e hora válidas, se preenchidas; a data aceita `dd/mm/aaaa` digitada. Convidados estimados inteiro maior ou igual a zero. Modelo, se escolhido, é da conta e do mesmo tipo. Cliente existente é da conta. Cliente novo: nome obrigatório e WhatsApp com DDD válido.

## 10. Estados

Não muda a máquina da SPEC-002: o evento nasce em andamento; concluir e cancelar ficam em "Mais".

## 11. Dados necessários

Criar: tipo, modelo (opcional), primeiro nome, segundo nome (casamento), data, horário, convidados estimados, local, cliente existente **ou** cliente novo (nome, WhatsApp).

Editar, Informações gerais: foto, nomes, data, horário (convite), budget estimado, senha do site, tags, três notificações, salvar na agenda.

Editar, Detalhes: convidados estimados, tempo de festa, início da cerimônia, início da recepção, padrinhos, damas e pajens.

Editar, Cerimônia e Recepção, cada uma: local, CEP, país, endereço, número, estado, cidade, bairro. CEP completo preenche o resto.

Resumo: os números da seção 8.4 e os alertas da 8.3, calculados no servidor numa leitura só.

## 12. Interface

Modal largo (design-system 5.10). No celular, o modal sobe de baixo e os cartões de tipo ficam em duas colunas. O botão principal é "Criar evento". O resumo usa `.gd-numeros` para os cartões e `.gd-alerta` para os alertas.

## 13. Erros

Campo inválido fica no modal com a mensagem no campo. Falha ao gravar não cria evento pela metade: evento, tarefas, serviços, agenda e cliente novo gravam juntos ou nada grava.

## 14. Critérios de aceite

1. Com tipo e nome, o evento é criado em andamento e o resumo abre.
2. Sem modelo ("Começar vazio"), o evento é criado sem tarefas e sem serviços.
3. Com modelo e data, as tarefas nascem com prazo em "dias antes" e os serviços do modelo aparecem em Fornecedores.
4. Casamento com dois nomes vira "Nome & Nome"; com um nome, não grava.
5. A criação não pede valor da assessoria nem parcelas.
6. Cliente existente escolhido na busca fica vinculado; cliente novo com nome e WhatsApp é criado e vinculado.
7. Evento com data aparece na Minha agenda.
8. O resumo mostra os cinco cartões com os números reais e até três alertas na ordem da seção 8.3.
9. Cada alerta e cada "Abrir" leva à tela certa.
10. A edição em quatro abas continua gravando horários e endereço completo; CEP preenche o endereço.
11. Outra conta não vê o evento nem o resumo.

## 15. Cenários de teste

Criar só com tipo e nome. Criar casamento com um nome (erro). Criar com modelo e data; conferir prazos e serviços. Criar com "Começar vazio". Criar com cliente existente e com cliente novo; WhatsApp inválido. Resumo de evento sem nada (zeros, alerta "Evento sem data"). Resumo com tarefa atrasada, parcela vencida, parcela da semana, serviço sem contratado a 45 dias e convidados pendentes a 20 dias: conferir os três primeiros alertas. Isolamento entre contas.

## 16. Dependências

SPEC-001, SPEC-002 (lista e situações), SPEC-003 (tarefas), SPEC-004 e SPEC-010 (convidados), SPEC-006 e SPEC-009 (clientes), SPEC-012 (modelos), SPEC-018 (serviços, fornecedores e parcelas).

## 17. Premissas e pontos não definidos

- Os limites de 60 dias (serviço sem fornecedor) e 30 dias (convidados sem resposta) são propostos aqui e podem ser ajustados.
- "Momentos" do roteiro no cartão do pacote entram quando o roteiro no evento existir (RF-092).
- O endpoint atual de valor da assessoria continua até o Dinheiro do evento substituí-lo; a tela deixa de chamá-lo.
- Tamanho máximo dos textos não definido.
