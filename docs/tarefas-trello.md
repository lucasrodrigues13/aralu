# Tarefas da versão 1.0 (exportadas do Trello)

**Fonte: o board "Tarefas Aralu" do Trello.** Este arquivo é uma cópia de 21/11/2026, feita para que as sessões de código leiam os cards sem acesso ao Trello. Se o Trello e este arquivo divergirem, vale o Trello. Antes de implementar um card, confira se o texto aqui ainda está igual.

Como ler:

- Os 30 cards abaixo são a coluna **Todo Claude**, **na ordem de prioridade e de precedência** (a ordem já respeita as dependências).
- O número `#N` é o número do card no Trello e não muda.
- "Prioridade e dependências" diz o que precisa existir antes e o que já existe no código.
- Os cards têm a etiqueta "Reorganizado". Os cards antigos da coluna "A fazer" serão apagados à mão pelo dono do projeto depois da revisão.
- O plano de execução (ondas, definição de pronto, modelo de brief) está em [roteiro-execucao.md](roteiro-execucao.md).
- Decisões de produto tomadas na reorganização estão registradas em [produto-v1.md](produto-v1.md) (seções 4, 5.1, 5.7, 5.9, 5.10, 5.11 e 5.13).

---

## #19 Evento: Simplificar o cadastro de evento

- Posição: 1 de 30
- Trello: https://trello.com/c/0jpShu09
- Prioridade e dependências: (ALTA). Sem dependências. Já existe: o modal pede só tipo e nome, mas casamento ainda exige nome da noiva e do noivo, a escolha de pacote (modelo) ainda aparece e a busca de clientes lista todos. O nome do casamento hoje é montado a partir dos dois nomes (NomeDoEvento), então precisa de ajuste e teste. O transfer não aparece neste modal (só na aba Convidados), então esse item já está atendido aqui.

Alterar a tela de cadastro de evento para ter o mínimo de informações possíveis.
- Remover seleção de pacotes (fica para a edição posterior).
- No tipo casamento, manter igual aos outros tipos: somente o nome do evento; remover nome da noiva e do noivo.
- Seleção de clientes apresenta apenas os que não têm vínculo com evento; ao buscar pelo nome, o organizador pode adicionar um cliente que já tem vínculo com outro evento.
- Remover opção de transfer.

Origem: "Mudar a criação de evento"

## #22 Convidados: Limpeza da aba e cards por situação

- Posição: 2 de 30
- Trello: https://trello.com/c/3ltu0RH8
- Prioridade e dependências: (ALTA). Sem dependências. Só remove tela (Transfer, Totais, Grupos); não apagar colunas do banco, como a regra do projeto. Vem antes dos cards de link do casal, RSVP e portaria porque todos mexem na mesma tela. Os cards por situação substituem os Totais.

- Remover Transfer, Totais e Grupos da aba Convidados do evento.
- Na aba de convidados, ter cards separados para pendentes, confirmados e não confirmados.

Origem: "Remover itens da Aba convidados do evento" + último parágrafo de "Implementar checagem na portaria do evento"

## #27 Fornecedores: Cadastro de serviço simples e fornecedor com vários serviços

- Posição: 3 de 30
- Trello: https://trello.com/c/oevRVlrs
- Prioridade e dependências: (ALTA). Sem dependências, mudança pequena. Já existe: fornecedor com vários serviços (seleção múltipla) e serviço só com nome. Falta apenas a busca e o 'Cadastrar novo serviço' no dropdown. Vem antes do card de contratar, que usa esses serviços.

- Cadastro de serviços simples, apenas com o nome.
- Cadastro de fornecedores solicita os mesmos dados já solicitados e permite selecionar mais de um serviço.
- No dropdown de serviços do cadastro de fornecedor: campo de busca e opção "Cadastrar novo serviço".

Origem: "No cadastro de fornecedor o dropdown de serviços deve apresentar um search e um Cadastrar novo Serviço" + 1º bloco de "Aba fornecedores do evento"

## #45 CPF e CNPJ: guardar sem máscara e aceitar CNPJ alfanumérico (todo o sistema)

- Posição: 4 de 30
- Trello: https://trello.com/c/iM2EF4QE
- Prioridade e dependências: (ALTA). Sem dependências. Base para os cards de cliente (#42), dados do contratante (#43) e Perfil: vem antes deles.

Regras (21/11/2026):
- CPF e CNPJ são texto (varchar) no banco, SEM máscara. A máscara é só de exibição e digitação.
- O CNPJ passa a poder ter letras (formato alfanumérico que começa a valer no Brasil): aceitar A-Z e 0-9, guardar em maiúsculas.
- Hoje o backend grava mascarado (Mascaras.Cpf e Mascaras.Cnpj em Project.Application/Comum/Mascaras.cs) e SoDigitos remove as letras; isso precisa mudar. A máscara 'documento' do frontend (shared/mascaras.ts) também só entende dígitos.
- Máscara dupla: começa como CPF; se aparecer letra ou passar de 11 caracteres, vira CNPJ.
- Validação: CPF com 11 dígitos e dígitos verificadores. CNPJ com 14 caracteres: 12 alfanuméricos (A-Z, 0-9) mais 2 dígitos verificadores numéricos, calculados assim (regra do SERPRO, "Cálculo dos dígitos verificadores de CNPJ alfanumérico"):
  1. Valor de cada caractere = código ASCII menos 48 (0-9 valem 0-9; A=17, B=18, C=19, D=20, E=21 ... Z=42).
  2. Pesos de 2 a 9 da direita para a esquerda, recomeçando em 2 depois do oitavo caractere.
  3. Somar valor x peso; resto = soma dividida por 11. Se o resto for 0 ou 1, o dígito é 0; senão, o dígito é 11 menos o resto.
  4. 1º dígito: calculado sobre os 12 primeiros caracteres. 2º dígito: repetir sobre 13 caracteres (os 12 mais o 1º dígito), com pesos de 2 a 9 da direita para a esquerda.
  Teste obrigatório (exemplo do próprio documento): 12ABC34501DE gera os dígitos 35 (soma 459, resto 8, 1º dígito 3; soma 424, resto 6, 2º dígito 5), ou seja, 12.ABC.345/01DE-35. O CNPJ só com números continua válido pela mesma regra.
- Aplicar em todos os campos: Cliente (cpf e cnpj), Perfil (documento), Fornecedor (cnpj, cpf, documentos bancários), a oportunidade (card de dados do contratante) e o CPF do convidado (que continua só CPF).
- Migration: normalizar os valores que já estão gravados com máscara (tirar pontos, barra e traço), sem perder dados.

Origem: pedido de 21/11/2026.

## #42 Cliente e convidado: remover o RG; cliente com CPF/CNPJ em campo único

- Posição: 5 de 30
- Trello: https://trello.com/c/dCznZkC4
- Prioridade e dependências: (ALTA). Sem dependências. Pequeno. Deve vir antes do card de dados do contratante na oportunidade, que usa o mesmo campo. Depende de #45 (CPF/CNPJ sem máscara e CNPJ alfanumérico).

- Remover o campo RG do cadastro de cliente e do cadastro de convidado (telas, API e testes): no Brasil o RG não é mais exigido e novos cidadãos só têm CPF. Não é preciso apagar as colunas agora (decidir ao implementar).
- No cadastro de cliente, juntar CPF e CNPJ em um campo único "CPF/CNPJ" com máscara dupla: começa como CPF e, se a pessoa continua digitando, vira CNPJ. A máscara 'documento' já existe em shared/mascaras.ts (usada no Perfil), mas só entende dígitos: o CNPJ alfanumérico e o armazenamento sem máscara estão no #45. Hoje o cliente tem dois campos separados (cpf e cnpj), então a gravação separa pelo número de dígitos.

Origem: pedido de 21/11/2026.

## #21 Evento: Tarefas com data por item e responsável na subtarefa

- Posição: 6 de 30
- Trello: https://trello.com/c/4eaZWGzk
- Prioridade e dependências: (ALTA). Sem dependências, mas muda o banco: o item de checklist (ItemChecklistTarefa) hoje só tem texto, feito, cancelado e ordem. Precisa de prazo e responsável (migration + deploy/schema.sql). Deve vir antes do card que junta Tarefas ao Resumo, para a tela nova já nascer com isso.

- Adicionar aos itens das tarefas a possibilidade de ter datas diferentes para cada item.
- Adicionar nas subtarefas o responsável por ela.

Origem: "Mudar a criação de evento"

## #41 Banco de parcelas por documento: Orçamento, Contrato e Contrato de fornecedor (substitui ParcelaCasal)

- Posição: 7 de 30
- Trello: https://trello.com/c/Ua9yZ4Pr
- Prioridade e dependências: (ALTA). Sem dependências. É a base dos cards de Dinheiro do evento, Contratar fornecedor, Gestão Financeira, parcelas no orçamento e contrato do funil: precisa vir antes de todos.

Decidido em 21/11/2026: deixa de existir ParcelaCasal (parcelas do casal presas ao evento). Os dados atuais podem ser perdidos (aceito pelo usuário; exceção à regra de não apagar colunas do banco). Passam a existir:
- Orçamento.Parcelas (hoje OrcamentoFunil, que só tem valor);
- Contrato.Parcelas (contrato com o cliente; hoje ContratoFunil), copiadas do orçamento aprovado quando o contrato é gerado;
- ContratoFornecedor.Parcelas (entidade nova: o contrato com o fornecedor, com o arquivo assinado, o pagamento e as parcelas; substitui ParcelaServico).

As três parcelas têm a mesma estrutura (número, vencimento, valor, entrada, situação, recebimentos ou pagamentos, comprovante) e o mesmo gerador (ParcelasDaAssessoria já existe).

O que muda por causa disso: aba Dinheiro do evento, Cobrar e Recebi (DinheiroServico), cartão de cobranças da tela Hoje (DadosHojeEf), ContratoServico, EventoServico e FornecedorServico. Ajustar SPEC-029 e SPEC-030 ao implementar. Gerar deploy/schema.sql de novo.

Origem: pedido de 21/11/2026 (reformulação do banco).

## #32 Gestão Financeira: Mover Pagamentos para o menu Principal e listar contratos por cliente

- Posição: 8 de 30
- Trello: https://trello.com/c/E5dCcYR2
- Prioridade e dependências: (ALTA). Gestão Financeira = faturamento do organizador pelo serviço prestado (contratos com clientes e parcelas a receber), sem nada específico de evento. A tela Pagamentos de hoje (pagamentos a fornecedores de todos os eventos) deixa de existir: pagamentos a fornecedores ficam só na aba Dinheiro de cada evento. Atenção: a tela Pagamentos de hoje lista só pagamentos a FORNECEDORES de todos os eventos; as parcelas do casal estão na aba Dinheiro de cada evento. Este card cria o lugar novo do casal (contratos por cliente) e precisa vir antes do card de Dinheiro do evento, que tira a parte do casal da aba. Atualizado em 21/11/2026: as parcelas do casal passam a ser Contrato.Parcelas (do contrato/cliente), vindas do orçamento aprovado; ParcelaCasal deixa de existir. Depende de #41.

- A tela hoje chamada Pagamentos passa a se chamar Gestão Financeira e sai do grupo de menus Gestão de Eventos para o grupo Principal.
- Contém a lista de contratos fechados com cada cliente.
- O organizador gerencia cada contrato individualmente, configurando parcelamento ou não.

Origem: "Nova gestão financeira do organizador separada da gestão de fornecedores do evento."

## #31 Evento > Dinheiro: Pagamentos a fornecedores com parcelas e comprovantes

- Posição: 9 de 30
- Trello: https://trello.com/c/jR9syWSN
- Prioridade e dependências: (ALTA). Dinâmica: o dinheiro do orçamento é do casal; o organizador acompanha e marca como pago o que o casal informar. Depois o casal também marca pelo link (card #34). Pagamentos a fornecedores existem só dentro do evento. Fica como está: cartão de pagamentos da semana na tela Hoje. Depende do #32 (a parte do casal sai da aba só depois de ter casa nova) e do #41 (os pagamentos a fornecedores passam a ser ContratoFornecedor.Parcelas, no banco novo; substitui ParcelaServico). Os comprovantes e despesas atuais (ComprovanteEvento, LancamentoEvento) têm dados existentes: definir o que acontece com eles antes de remover os boxes. Precisa vir ANTES do #28 (contratar sem parcelas).

A aba Dinheiro do evento contém apenas a gestão financeira dos fornecedores contratados para o evento selecionado (a gestão financeira do casal com o organizador sai daqui).

Na lista de pagamentos aos fornecedores:
- Cada registro pode informar que o contrato foi feito em parcelas; ao clicar, um modal pede as informações do parcelamento.
- Pagamentos parcelados podem ser expandidos, exibindo as parcelas com checkbox para marcar como paga.
- Todas as parcelas pagas mudam o status do pagamento para pago automaticamente.
- O pagamento também pode ser marcado diretamente como pago, marcando todas as parcelas como pagas.
- Cada parcela ou pagamento total pode receber comprovante (pdf, jpg, jpeg, png).
- Remover o box de Comprovantes existente: um comprovante por pagamento ou parcela.
- Remover o box de Despesas e entradas (não será usado; não adicionar alternativas).

Origem: "Aba fornecedores do evento" (parte final) + 1º parágrafo de "Nova gestão financeira do organizador..."

## #28 Evento > Fornecedores: Selecionar serviços, contratar sem parcelas e anexar contrato assinado

- Posição: 10 de 30
- Trello: https://trello.com/c/svtLbPQy
- Prioridade e dependências: (ALTA). Depende do #31 (tirar as parcelas do botão Contratar só funciona se o Dinheiro já deixa parcelar depois) e do #41 (contratar cria o ContratoFornecedor, com o arquivo assinado e as parcelas). Muda o banco: anexo do contrato assinado no vínculo fornecedor/serviço. Hoje o diálogo Contratar pede valor, parcelas e data da 1ª parcela. Contrato de fornecedor: a plataforma só recebe o arquivo. O organizador sobe o que recebeu por fora (do fornecedor ou do cliente); não há modelo, leitura nem envio ao casal.

Na aba de fornecedores de um evento:
- O organizador seleciona o fornecedor e, na sequência, os serviços que ele presta.
- Remover parcelas do botão Contratar (o fluxo de contratados continua indo para a aba Dinheiro).
- Ao clicar em Contratar, o organizador pode subir um arquivo, que seria o contrato assinado pelo fornecedor e pelo casal.

Origem: "Aba fornecedores do evento" (2º bloco)

## #34 Link do casal: acesso ao financeiro do evento (pagamentos, contratos e comprovantes)

- Posição: 11 de 30
- Trello: https://trello.com/c/JPihPfWr
- Prioridade e dependências: (ALTA). Depende de 'Evento > Dinheiro: Pagamentos' (o casal marca pago e anexa comprovante nessa estrutura) e de 'Evento > Fornecedores: Selecionar serviços' (contrato assinado anexado). Cria a base do link do casal, que o card de convites também usa. Hoje não existe link por evento para o casal (produto-v1 5.11). Recomendo escrever spec antes.  Contrato de fornecedor: o casal pode subir o contrato que fechou e assinou com o fornecedor pelo link dele. A plataforma só recebe o arquivo; a assinatura é feita fora, entre o casal e o fornecedor.

O organizador libera, por evento, um link sem login para o casal acompanhar e atualizar o financeiro do evento.

Base do link do casal (também usada pelo card de convites):
- um link por evento, sem senha; trocar o link desliga o antigo;
- o organizador marca o que o casal vê e o que ele pode editar.

Com o acesso ao financeiro liberado, o casal pode:
- marcar como paga cada parcela ou pagamento de fornecedor;
- subir o contrato assinado do fornecedor;
- subir comprovantes de pagamento;
- gerenciar as parcelas de fornecedor (definir e editar o parcelamento).
O organizador continua vendo tudo e podendo marcar como pago.

Fora do acesso do casal: a Gestão Financeira do organizador (faturamento) e qualquer dado interno do organizador.

Contexto (decidido em 21/11/2026): o dinheiro do orçamento é do casal; o organizador acompanha e informa a saúde financeira. Responsabilidade de pagamento do organizador (ele pagar fornecedor parceiro) NÃO entra: o cliente piloto disse que ninguém adota essa prática (risco fiscal e custo).

Decidido em 21/11/2026: o casal marca direto como pago, sem etapa de confirmação do organizador (o organizador pode desfazer).

Origem: funcionalidade nova pedida em 21/11/2026 (não veio de card antigo).

## #29 Evento > Fornecedores: Gráficos de orçamento no topo

- Posição: 12 de 30
- Trello: https://trello.com/c/8OVa3eYm
- Prioridade e dependências: (MÉDIA). Sem dependências, só tela. Já existe o orçamento (BudgetEvento) em modal, com orçamento, estimado e contratado; o card troca o modal por gráficos no topo. Fica depois do card de contratar para não editar a mesma tela (evento-fornecedores.page.ts) ao mesmo tempo.

Na aba Fornecedores da tela de evento, remover o botão "orçamento atual" e o seu modal, e adicionar cards no topo com gráficos do orçamento para fácil visualização.

Origem: "Adicionar cards de gráficos de orçamento aba Fornecedor da tela de evento"

## #36 Remover o vínculo do contrato com o evento

- Posição: 13 de 30
- Trello: https://trello.com/c/zBMHWluU
- Prioridade e dependências: (MÉDIA). Sem dependências. Precisa vir antes do #30 (aba Contratos do evento).

Decidido em 21/11/2026: o contrato de modelo (organizador com cliente) não tem vínculo com o evento.

Remover:
- a aba Contratos no modelo de evento (vincular contratos ao modelo; o evento criado do modelo já vem com eles);
- o vínculo contrato-modelo e contrato-evento (ContratoDoModelo, ContratoDoEvento) da tela e da API;
- o link de leitura do contrato por evento e os campos de mesclagem que dependem do evento.

Regras: não apagar colunas nem tabelas do banco (regra do projeto); só tirar da tela e da API. A aba Contratos do evento passa a listar só os contratos de fornecedores (card #30). O envio do contrato ao cliente fica só pelo contrato do funil (Enviar e, depois, assinatura eletrônica, SPEC-033). Confirmar esta consequência ao implementar.

Origem: pedido de 21/11/2026 (funcionalidade nova).

## #30 Evento > Contratos: Exibir todos os contratos enviados (organizador ou casal), com o fornecedor de cada um

- Posição: 14 de 30
- Trello: https://trello.com/c/EGZWPEfX
- Prioridade e dependências: (MÉDIA). Depende de '#28 Evento > Fornecedores: Selecionar serviços' (anexo do contrato assinado pelo organizador) e de '#34 Link do casal: acesso ao financeiro do evento' (envio de contrato pelo casal). Atenção: hoje a aba Contratos (SPEC-030) lê contratos com campos de mesclagem e envia link de leitura ao casal. Este card muda essa regra; vale revisar a SPEC-030 e a SPEC-033 antes. Atualizado em 21/11/2026: depende também de #36 (remoção do vínculo contrato-evento): contratos de modelo não aparecem nesta aba.

SEPARAÇÃO (decidida em 21/11/2026): modelos de contrato são só para os contratos que o organizador envia aos seus clientes. Contratos com fornecedores não têm relação com modelos: são arquivos enviados.

A aba Contratos do evento exibe todos os contratos com fornecedores enviados para o sistema naquele evento:
- contratos anexados pelo organizador ao contratar o fornecedor;
- contratos subidos pelo casal pelo link sem login dele.

Cada contrato da lista identifica o fornecedor a que pertence (e o serviço, se houver) e quem enviou (organizador ou casal), com a data do envio.

COMO O CONTRATO DE FORNECEDOR FUNCIONA (decidido em 21/11/2026): a negociação, a leitura e a assinatura são entre o cliente e o fornecedor, fora da plataforma. A plataforma só RECEBE o documento. Ele entra de duas formas: o organizador sobe o arquivo (recebido por fora, do fornecedor ou do cliente) ou o próprio casal sobe pelo link dele ao fechar e assinar. Não há ler preenchido, imprimir nem enviar link de leitura ao casal para contrato de fornecedor; a aba só lista, abre e baixa o arquivo.

Os contratos criados a partir de modelo (campos de mesclagem, "Ver como fica", link de leitura ao casal, assinatura eletrônica) NÃO aparecem nesta aba: pertencem ao contrato do organizador com o cliente.

Fora deste card, em aberto: onde o contrato do organizador com o cliente (feito a partir de modelo) é visto, impresso e enviado ao casal dentro do evento, já que sai desta aba. Não é contrato de fornecedor.

Origem: "Aba de contratos do evento deve apenas exibir os contratos que foram subidos pelo organizador direto nos fornecedores" (ajustado em 21/11/2026: inclui os do casal, mostra o fornecedor e separa dos contratos de modelo).

## #20 Evento: Aba Resumo absorve a aba Tarefas

- Posição: 15 de 30
- Trello: https://trello.com/c/ZBUn2XvT
- Prioridade e dependências: (MÉDIA). Depende de 'Tarefas com data por item', 'Dinheiro: Pagamentos', 'Selecionar serviços' e 'Contratos' (os vínculos de fornecedor, contrato, documento e pagamento precisam apontar para as estruturas novas). Já existe: Resumo em cartões e aba Tarefas separada. É a maior refatoração de tela da lista.

Na aba Resumo, apresentar as tarefas já cadastradas, com todas as ações referentes a elas, mesclando a aba de tarefas (uma aba a menos). Inspirar no Wedy Pro.
Implementar opções para vincular fornecedor, contrato, documento e pagamento.

Referência site wedy pro.

Origem: "Mudar a criação de evento"

## #33 Gestão Financeira: Parcelas do mês e atrasadas com cobrança por WhatsApp

- Posição: 16 de 30
- Trello: https://trello.com/c/dHH4xksi
- Prioridade e dependências: (MÉDIA). Depende de 'Gestão Financeira: Mover Pagamentos'. Já existe: o cartão 'Cobranças a fazer' na tela Hoje e o Cobrar por WhatsApp na aba Dinheiro (SPEC-029); dá para reaproveitar a consulta. A pesquisa de ideias no Wedy fica como descoberta no Backlog. Atualizado em 21/11/2026: as parcelas vêm de Contrato.Parcelas; depende de #41.

- No topo, em evidência, cards com parcelas a receber no mês vigente e parcelas atrasadas.
- Havendo parcelas atrasadas, abaixo dos cards aparece a lista delas com: nome do evento, número da parcela, link para cobrar no WhatsApp, botão para marcar como paga e adicionar comprovante.

Nota: a pesquisa de novas ideias no Wedy e em outras plataformas (final do card original) sugerida como descoberta no Backlog.

Origem: "Nova gestão financeira do organizador separada da gestão de fornecedores do evento."

## #23 Convidados: Link sem login para o casal cadastrar convites

- Posição: 17 de 30
- Trello: https://trello.com/c/rOGSYyVr
- Prioridade e dependências: (MÉDIA). Depende de 'Convidados: Limpeza' e de 'Link do casal: acesso ao financeiro do evento', que cria a base do link do casal (um link por evento, trocar link, permissões por área). Muda o banco: não existe link por evento para o casal (o Convite só tem token de RSVP) nem e-mail do convite nem data de envio. Corresponde à pendência 'Pedir a lista ao casal pelo link' (produto-v1 5.7) e ao bloco 'Link do casal'. Recomendo escrever spec antes.

O casal preenche a lista de convidados por um link sem login, como é feito no envio de orçamentos.

Tela de cadastro de convidados:
- Nome do convite
- Telefone
- Email
- Nome completo de cada convidado incluído no convite

Na tela da cerimonialista aparecem todos os convites cadastrados. Na tela de convidados, ela define a data de envio do convite.
O recebedor abre o link e confirma a presença por cada convidado incluído no convite (pode comparecer todos, alguns ou nenhum).

Origem: "Implementar funcionalidade para o casal preencher lista de convidados com um link sem login como é feito no envio de orçamentos"

## #24 Convidados: Confirmação de presença (RSVP) com prazo

- Posição: 18 de 30
- Trello: https://trello.com/c/74RptvKj
- Prioridade e dependências: (MÉDIA). Depende de 'Convidados: Limpeza' e se beneficia do 'Link sem login'. Já existe: página pública de RSVP por token. Falta prazo limite, expiração, exceção manual e lista de presença com id único (banco novo no evento).

- A cerimonialista pode definir uma data limite para receber confirmações.
- Cada confirmação de convites gera uma lista de presença com um id único.
- Links de confirmação após a data limite mostram uma tela informando que o convite expirou.
- A cerimonialista pode abrir exceções e confirmar manualmente na plataforma mesmo após a expiração.
- O Evento pode não ter data limite também sendo assim qualquer confirmado até a hora do evento conseguem fazer o checkin

Origem: "Implementar checagem na portaria do evento" (1ª parte)

## #37 Menu: todos os modelos no grupo Modelos e Modelos como último grupo

- Posição: 19 de 30
- Trello: https://trello.com/c/5nmDAAQj
- Prioridade e dependências: (MÉDIA). Sem dependências, só menu. Vem antes da tela única de contratos para os dois não editarem o menu ao mesmo tempo.

- Mover para o grupo Modelos os itens que hoje estão no Funil de vendas: Modelos de serviços e Modelo de orçamento (o de contrato é tratado no card de tela única).
- Reordenar os grupos do menu: Modelos passa a ser o último, porque o que se configura uma vez muda pouco (trabalho pré-feito do organizador). Ordem: Principal, Gestão de eventos, Agenda, Funil de vendas, Modelos.
- Hoje, em casca.component.ts, a ordem é Principal, Gestão de eventos, Modelos, Agenda, Funil de vendas.

Origem: pedido de 21/11/2026.

## #38 Modelos de Contrato: tela única (renomear, remover a do funil, migrar modelos)

- Posição: 20 de 30
- Trello: https://trello.com/c/GecdDCQJ
- Prioridade e dependências: (MÉDIA). Depende do #37 (menu) (modelos no grupo Modelos). Conflito com regra já aprovada: a SPEC-028 (modelo de contrato do funil) deixa de existir; ajustar SPEC-028 e SPEC-030 ao implementar.

- O item "Contratos" do grupo Modelos passa a se chamar "Modelos de Contrato". A tela gerencia todo tipo de contrato que o organizador quiser oferecer aos seus clientes.
- Esses modelos só servem para orçamentos aprovados.
- Remover o item "Modelos de contrato" do Funil de vendas (rota /modelos-contrato-funil). Fica uma única tela de modelos.
- Manter o item "Contratos" do funil: é a lista dos contratos de cada oportunidade (enviado, assinado), e passa a escolher o modelo da tela única.
- Migrar os modelos que já existem no funil para a tela única, trocando #nome_oportunidade pela tag do nome do contratante. Contratos do funil já criados guardam o texto copiado e o ModeloId: não deixar o vínculo órfão e não apagar tabelas (regra do projeto).

Origem: pedido de 21/11/2026 (unifica SPEC-028 e SPEC-030).

## #43 Oportunidade: dados do contratante, cadastro reorganizado e conversão em cliente pré-preenchida

- Posição: 21 de 30
- Trello: https://trello.com/c/FPJz5mBB
- Prioridade e dependências: (MÉDIA). Depende de #42 (campo CPF/CNPJ único e RG removido) e de #45 (CPF/CNPJ sem máscara). Já existe: oportunidade só com contatos (nome, telefone, e-mail), Virar cliente pré-preenchido com o primeiro contato (SPEC-020 v2) e ClienteId na oportunidade.

A oportunidade passa a guardar os principais dados que preenchem um cliente, para enviar o orçamento e gerar o contrato sem criar o cliente antes de fechar.

Dados para contrato (seção opcional no cadastro):
- nome completo; CPF/CNPJ em campo único com máscara dupla; nascimento; profissão; e-mail; celular; endereço completo (CEP, endereço, número, bairro, cidade, estado, complemento, país). Sem RG.
- marcar qual contato da oportunidade é o contratante (quem assina).
- Estado civil e nacionalidade: entram (decidido em 21/11/2026), na oportunidade e no cadastro de cliente (campos novos no banco), levados ao virar cliente.

Quando pedir: no estágio em que o lead está disposto a aceitar, com a justificativa "Para fechar, preencha mais dados para gerar o contrato". O contrato só é gerado com esses dados completos. Quem preenche (decidido em 21/11/2026): o cliente, pela tela de aceite da proposta por link. Num lead manual, o organizador coleta as informações e preenche, ou copia o link da tela de aceite e envia ao cliente (botão para copiar o link).

Cadastro de oportunidade reorganizado: agrupar o que tem relação e deixar em sequência, por exemplo contato, evento (tipo, data, convidados, horários), locais (cerimônia e recepção), comercial (origem, serviço, valor, responsável, retorno) e dados para contrato.

Virar cliente: o cadastro de cliente abre já preenchido com tudo isso; sobram só os campos menos relevantes (redes sociais, religião, observações, foto, acesso ao portal). O CPF/CNPJ do campo único vai para CPF ou CNPJ conforme o número de dígitos.

Lead descartado: excluir os dados sensíveis (CPF/CNPJ, nascimento, endereço); avisar na ação de descartar.

Depois de virar cliente, o cliente é a fonte dos dados e a oportunidade não sobrescreve o que for editado nele.

Origem: pedido de 21/11/2026 (substitui a exigência de criar o cliente antes do contrato).

## #44 Orçamento do funil: parcelas na proposta por link

- Posição: 22 de 30
- Trello: https://trello.com/c/3pItEe5K
- Prioridade e dependências: (MÉDIA). Depende de #41 (Orçamento.Parcelas). Já existe: proposta por link (SPEC-031 parte C, proposta-publica.page.ts) e o orçamento só com valor.

O cadastro do orçamento do funil ganha o parcelamento: entrada, número de parcelas e vencimentos (usar o gerador de parcelas que já existe). As parcelas aparecem na proposta que o cliente recebe pelo link sem login de aceite, antes de ele aceitar. O que o cliente aceitou passa a ser o parcelamento do contrato (copiado para Contrato.Parcelas quando o contrato é gerado).

A decidir: o que acontece com o aceite se o organizador mudar as parcelas depois de enviar a proposta.

Origem: pedido de 21/11/2026.

## #46 Perfil: endereço estruturado com CEP (no lugar do campo livre)

- Posição: 23 de 30
- Trello: https://trello.com/c/ppF8DnUa
- Prioridade e dependências: (MÉDIA). Sem dependências. Precisa vir antes do #39 (a tag contratada_endereco usa o endereço do perfil).

O endereço do perfil do organizador deixa de ser um texto livre (Perfil.Endereco é uma string única, textarea na tela) e passa a ser um endereço normal: CEP preenche os outros campos e tudo é salvo estruturado no banco, não como string.
- Campos: CEP, endereço (logradouro), número, complemento, bairro, cidade, estado, país.
- Reaproveitar a consulta de CEP que já existe (ViaCepConsulta, usada em cliente e evento) e o padrão do cadastro de cliente.
- O texto antigo do endereço não dá para converter sozinho: mostrar como "endereço anterior" até o organizador preencher o novo, e depois descartar (decidir ao implementar).
- A tag contratada_endereco do contrato passa a montar o endereço a partir dos campos estruturados.

Origem: pedido de 21/11/2026.

## #39 Contrato do funil: gerar com os dados do contratante e as tags de cliente, oportunidade e orçamento

- Posição: 24 de 30
- Trello: https://trello.com/c/U5bf9azx
- Prioridade e dependências: (MÉDIA). Depende de #46 (endereço do perfil estruturado), #43 (dados do contratante na oportunidade), #44 (parcelas no orçamento), #36 (sem vínculo com o evento) e #38 (tela única de modelos). Atualizado em 21/11/2026: não exige mais cliente cadastrado nem depende do #32.

Para gerar o contrato a partir do funil, o orçamento precisa estar aprovado e os dados do contratante completos, na oportunidade ou, se já existir, no cliente. Sem isso, o sistema avisa o que falta e não gera. Os dados são pedidos ao lead no estágio em que ele está disposto a fechar (ver #43). O lead não precisa virar cliente antes do contrato.

Dados mínimos para gerar (confirmar na spec): nome, CPF/CNPJ, estado civil, nacionalidade, endereço completo, e-mail e celular.

Tags: todos os dados do cliente ficam disponíveis; o organizador usa os que quiser ao montar o modelo. De onde cada grupo puxa o valor:
- contratante_*: cadastro do cliente, se já existir; senão, dados do contratante na oportunidade;
- contratada_*: Perfil da assessoria (nome da empresa, documento, endereço estruturado do #46, responsável, chave Pix);
- evento_*: oportunidade (tipo, data prevista, local da cerimônia e da recepção, convidados);
- contrato_valor e contrato_parcelas: orçamento aprovado (Orçamento.Parcelas), copiadas para Contrato.Parcelas ao gerar o contrato;
- data_hoje: data da geração.

Origem: pedido de 21/11/2026.

## #40 Modelos de Contrato: seletor de tags com busca e ajuda (?)

- Posição: 25 de 30
- Trello: https://trello.com/c/pTaewVaT
- Prioridade e dependências: (MÉDIA). Depende de #38 e de #39 (a lista final de tags e suas fontes sai dele).

No editor do modelo, as tags não ficam soltas:
- um select com busca insere a tag escolhida no texto, na posição do cursor;
- um botão de interrogação (?) abre um modal que explica como usar as tags e lista todas as opções, com: a tag, o que ela representa, de qual campo do sistema ela puxa o valor (por exemplo, contratante_nome: Cadastro de clientes, Nome) e um exemplo.
Usar uma única lista de tags (no backend, a mesma de Mesclagem.Campos) tanto para o select quanto para o modal e para o preenchimento, para não divergirem.

Origem: pedido de 21/11/2026 (substitui os botões de campo soltos da SPEC-030).

## #15 Modelos de Contrato: Live Preview do modelo

- Posição: 26 de 30
- Trello: https://trello.com/c/oHuBVQcR
- Prioridade e dependências: (MÉDIA). Sem dependências. Já existe: modelo de contrato do funil só com nome e texto (SPEC-028) e, no evento, 'Ver como fica' com campos de mesclagem (SPEC-030, mesclagem.ts): dá para reaproveitar a lógica. Vem antes de logo/fundo para já mostrar o resultado. Atualizado em 21/11/2026: existe uma única tela de modelos de contrato (grupo Modelos, #38); este card depende dela e das tags com busca (#40). O "Ver como fica" da tela atual (SPEC-030) pode ser reaproveitado.

Na tela de modelos de contratos do Funil, a cerimonialista cola todo o texto do contrato, substitui os dados por tags e clica num botão de Live Preview para ver como o contrato chegará ao cliente.

Origem: "Implementar Live Preview na tela de modelo de contratos do Funil"

## #16 Modelos de Contrato: Logo e imagem de fundo

- Posição: 27 de 30
- Trello: https://trello.com/c/wk9VzKL0
- Prioridade e dependências: (MÉDIA). Depende de 'Funil: Live Preview' (para ver o resultado). Muda o banco: o modelo de contrato do funil hoje só guarda nome e texto; precisa de arquivos de logo e fundo (o armazenamento de arquivos já existe). Atualizado em 21/11/2026: aplica-se ao modelo da tela única (#38), não mais ao modelo do funil.

Incrementar o cadastro de contratos com Logo e Imagem de Fundo.

Origem: "Incrementar o cadastro de contratos com Logo e Imagem de Fundo"

## #18 Funil: HTML personalizado na tela de aceite do orçamento

- Posição: 28 de 30
- Trello: https://trello.com/c/2iqyIJgw
- Prioridade e dependências: (MÉDIA). Sem dependências. Já existe: proposta por link (SPEC-031 parte C, proposta-publica.page.ts). Falta cadastrar o HTML no modelo de orçamento e exibi-lo na tela de aceite; HTML do usuário exibido ao cliente exige sanitização (risco de segurança).

Tela de cadastro de um HTML para ser apresentado na página em que o cliente aceita o orçamento, pois isso faz parte do convencimento.

Origem: "Orçamento do Funil - Implementar tela de cadastro de um HTML para apresentar na tela de aceite do cliente"

## #17 Modelos de Contrato: Avaliar upload em Word com tags do sistema

- Posição: 29 de 30
- Trello: https://trello.com/c/AJDRJTZC
- Prioridade e dependências: (BAIXA). Depende de 'Live Preview' e 'Logo e fundo' (as tags e o modelo precisam estar fechados) e se liga à SPEC-033 (assinatura eletrônica ainda sem fornecedor): o formato do arquivo (Word x PDF) depende do que a plataforma de assinatura aceita. Começar pela avaliação. Atualizado em 21/11/2026: aplica-se à tela única de modelos (#38); as tags são as do seletor (#40).

Avaliar a opção de a pessoa subir o contrato próprio, trocando os dados pelas tags aceitas no sistema, deixando de usar a opção padrão. Limitar a arquivos Word.
Começa com avaliação de viabilidade antes de implementar.

Origem: "Adicionar a opção de subir um arquivo de contrato assim deixando de usar a opção padrão do sistema"

## #25 Portaria: QR code, link da equipe e check-in de convidados

- Posição: 30 de 30
- Trello: https://trello.com/c/arUmwd4R
- Prioridade e dependências: (BAIXA). Depende de 'Link sem login' e 'Confirmação de presença'. Entra na versão 1.0 (decidido em 21/11/2026; documentado em docs/produto-v1.md, 5.7). Já existe: QR do link de RSVP (GeradorQr). Fica por último por depender dos dois cards anteriores.

Com a lista fechada:
- Cada convite confirmado recebe um QR code referente aos convidados confirmados.
- O sistema gera um link sem login para o organizador enviar a alguém da equipe que vai autorizar a entrada.
- Esse link abre a tela de autorização com as opções de escanear o QR code e conferir a lista completa.
- Ao escanear, exibe a tela do convite com todos os convidados incluídos e um botão de checar a presença.
- Também permite marcar quais convidados do convite compareceram (ex.: o marido passou mal, mas a esposa foi com o filho).

Origem: "Implementar checagem na portaria do evento" (2ª parte)
