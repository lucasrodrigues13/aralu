# Roteiro de teste: do primeiro contato ao cliente fechado

Roteiro para percorrer o sistema inteiro simulando uma venda real, na ordem em que acontece. Serve de teste e de base para o guia e as videoaulas dos novos cerimonialistas.

Como usar: siga os atos em ordem. Cada passo tem **Faça** (o que clicar ou digitar) e **Confira** (o que deve acontecer). Marque `[x]` ao concluir. Se algo não bater, anote o passo e o que apareceu. Os trechos **Para a aula** indicam o que vale explicar na gravação.

Os nomes dos botões vêm do código atual. Se algum texto estiver diferente na tela, o roteiro está desatualizado naquele ponto: anote.

## Antes de começar

- [x] Use uma conta de teste, não uma conta de cliente real.
- [x] Abra duas janelas do navegador: uma normal (você, a cerimonialista) e uma anônima (o cliente, sem login). Os links públicos devem ser abertos na anônima.
- [x] Tenha um segundo e-mail para convidar uma assistente (Ato 11) e para receber e-mails de teste.
- [x] Dados fictícios usados abaixo (troque se quiser):
  - Casal: **Marina Alves** (noiva, contato principal) e **Rafael Costa** (noivo).
  - Evento: **Casamento Marina e Rafael**, 150 convidados, daqui a 8 meses.
  - Telefone: (11) 98888-1111. E-mail: o seu e-mail de teste.
- [ ] Anote a data de hoje: alguns passos usam "hoje", "ontem" e "amanhã".

---

## Ato 0. Conta pronta

**Menu: Perfil** (só a dona vê)

1. Faça: abra **Perfil** e preencha nome da empresa, responsável, documento, endereço, celular e **Chave Pix**. Suba a logo, se houver.
2. Confira: o nome da empresa aparece na casca do sistema. A tela **Hoje** mostra o checklist de configuração (contrato, Pix, marca, página pública, equipe) e você pode pular itens.

Para a aula: esse perfil alimenta a página pública da proposta (marca da conta), os contratos (`{{contratada_*}}`) e a cobrança por WhatsApp (Pix). Sem ele, esses textos saem em branco.

---

## Ato 1. Preparar a casa: catálogos e modelos do funil

Faça isto antes do cliente chegar. Assim, nos atos seguintes, você só escolhe o modelo.

**Menu: Funil de vendas**

### 1.1 Modelos de serviços
1. Faça: abra **Modelos de serviços**, crie dois itens: "Assessoria completa" (descrição curta, valor R$ 8.000) e "Assessoria do dia" (sem valor).
2. Confira: os dois aparecem na lista. Descrição com mais de 200 caracteres não grava. Nome vazio não grava.

### 1.2 Modelo de orçamento
1. Faça: abra **Modelo de orçamento** e crie um modelo usando os parâmetros: `#nome_oportunidade`, `#tipo_evento`, `#data_evento`, `#convidados`, `#local_cerimonia`, `#local_recepcao`, `#valor`, `#validade`, `#nome_assessoria`.
2. Confira: o editor mostra a lista dos parâmetros disponíveis.

### 1.3 Modelo de contrato do funil
1. Faça: abra **Modelos de contrato** e crie um modelo com cláusulas simples. Use `#nome_oportunidade` no texto.
2. Confira: nome e texto são obrigatórios; sem um deles não grava.

### 1.4 Modelo de briefing (roteiro de perguntas)
**Menu: Modelos > Modelos de briefing**
1. Faça: crie "Primeira conversa" com 5 perguntas: data sonhada, número de convidados, estilo, orçamento previsto, o que não pode faltar.
2. Confira: salvou. Teste também **Clonar**.

### 1.5 Modelos de mensagens (opcional)
**Menu: Modelos > Modelos de mensagens** — crie uma mensagem de boas-vindas. Será útil no WhatsApp.

### 1.6 Estágios do funil
**Menu: Funil de vendas > Oportunidades > Gerenciar estágios**
1. Faça: veja os estágios de uma conta nova (Contato inicial, Orçamento enviado, mais Contratado e Descartado).
2. Faça: crie um estágio **Reunião marcada** e arraste para ficar entre Contato inicial e Orçamento enviado. Troque a cor. Salve.
3. Faça: tente renomear ou excluir Contratado e Descartado. Confira: não deixa (só a cor muda).
4. Faça: tente criar um estágio com nome repetido. Confira: recusa.
5. Confira: o quadro e os cartões do topo mostram o estágio novo.

Para a aula: a dona monta o funil do jeito dela. Máximo de 8 estágios abertos.

---

## Ato 2. O cliente chega

Três portas de entrada. Teste as três; no vídeo, mostre a mais comum.

### 2.1 Pelo formulário público do lead
1. Faça (você): em **Oportunidades**, toque em **Link do lead**. O link é copiado.
2. Faça (janela anônima): cole o link. Preencha como a Marina: **Seu nome** (Marina), **Telefone**, **E-mail**, **Tipo de evento** (Casamento), **Data prevista**, **Convidados** e **Cidade/UF**. Envie.
3. Faça (você): volte a **Oportunidades** e recarregue.
4. Confira:
   - O lead aparece no **primeiro estágio aberto** (Contato inicial).
   - O nome da oportunidade nasce sozinho: **Casamento Marina** (tipo + nome do contato).
   - Origem: **Formulário do site**.
   - O cartão mostra o tipo e a data prevista; ao abrir, convidados, cidade e UF vêm preenchidos.
   - O cartão do topo "Contato inicial" subiu em 1.

### 2.2 Pelo cadastro manual (ligação ou WhatsApp)
1. Faça: **Nova oportunidade**. Preencha só o nome ("Casamento Camila e Bruno") e um contato (Camila, telefone). Escolha origem **Instagram**.
2. Confira: grava. Teste os erros: sem nome não grava; sem nenhum contato não grava.
3. Faça: abra de novo e preencha o resto: valor R$ 8.000, serviço "Assessoria completa", tipo Casamento, data prevista, convidados, locais da cerimônia e da recepção (use a busca por CEP), horários (convite, cerimônia, recepção, festa), responsável.
4. Confira: o cartão mostra valor, tipo e data, convidados, telefone com atalho de WhatsApp, origem e "há N dias no estágio".

### 2.3 Pelo RSVP de um evento (Ato 12)
Deixe para o Ato 12. Lá o convidado de um casamento diz que quer fazer um evento e vira lead.

### 2.4 Contato repetido
1. Faça: **Nova oportunidade** com o **mesmo telefone** da Marina, escrito com máscara diferente (por exemplo, `(11) 98888-1111` e depois `11988881111`).
2. Confira: o formulário avisa "Esse contato já está no funil: {nome}, em {estágio}", com link. O aviso **não bloqueia**: dá para gravar.
3. Faça: repita com o e-mail em maiúsculas. Confira: também avisa.
4. Faça: envie de novo pelo formulário público com o mesmo telefone. Confira: o cartão ganha o selo **Contato repetido**.

### 2.5 Checagem de data
1. Faça: em **Minha agenda**, crie um compromisso numa data qualquer (ex.: daqui a 8 meses, sábado).
2. Faça: na oportunidade da Marina, informe essa mesma data prevista.
3. Confira: assim que a data é escolhida, aparece abaixo do campo o aviso "Já há compromisso na agenda nesta data". Avisa, não bloqueia: dá para gravar.

---

## Ato 3. Primeira conversa: briefing, retorno e tarefas

### 3.1 Briefing no lead
1. Faça: no cartão da Marina, menu **⋮ > Briefing**. Aplique o modelo "Primeira conversa".
2. Faça: anote respostas durante uma "ligação" imaginária. Salve.
3. Confira: ao reabrir, as respostas continuam lá. Trocar o modelo pede confirmação e apaga as respostas. Editar o modelo depois **não** muda o lead (as perguntas foram copiadas).

### 3.2 Data de retorno
1. Faça: no cartão, marque **Retornar em** para ontem (em um lead), hoje (em outro) e amanhã (em um terceiro). Crie leads extras se precisar.
2. Confira:
   - Ontem: texto "retornar ..." em **vermelho**.
   - Hoje: em **amarelo**.
   - Amanhã: neutro.
3. Faça: abra a tela **Hoje**. Confira: o card **Retornos do funil** lista os de hoje e os atrasados. Tocar abre o lead.
4. Faça: no cartão atrasado, toque em **Retornei**. Confira: pergunta a próxima data, com opção "sem próximo retorno".
5. Confira: lead em Contratado ou Descartado **não** mostra retorno.

### 3.3 Tarefas do funil
**Menu: Funil de vendas > Tarefas do funil**
1. Faça: **Adicionar tarefa** para cada tipo: Reunião, Ligação, E-mail, Tarefa. Cada uma com título, oportunidade, responsável e prazo. Observação com **negrito**, lista (`- item`) e um link.
2. Confira: nascem em **Incompletas**. Sem título, oportunidade, tipo, responsável ou prazo, não grava. O tipo E-mail não envia nada; é só classificação.
3. Faça: marque uma como concluída. Confira: vai para **Completas**. Reabra. Confira: volta.
4. Faça: filtre por prazo, tipo e responsável. Edite e exclua uma.
5. Confira: tarefa do **evento** (menu Tarefas) não aparece aqui, e vice-versa.

Para a aula: tarefa do funil é comercial (ligar, marcar reunião). Tarefa do evento é operacional (contratar buffet).

---

## Ato 4. Mover pelo funil

### 4.1 Arrastar e menu
1. Faça (computador): arraste o cartão da Marina de **Contato inicial** para **Reunião marcada**. Confira: a coluna de destino fica destacada ao arrastar; a quantidade e o valor das colunas e dos cartões do topo atualizam.
2. Faça: arraste para a mesma coluna. Confira: nada muda.
3. Faça: use **⋮ > Mover para…** (é o caminho no celular).
4. Faça: use a ação rápida do pé do cartão ("Orçamento enviado →" ou o próximo estágio aberto).
5. Confira: o título do quadro diz "N leads em aberto · valor em negociação", somando todos os estágios abertos.

### 4.2 Filtros, busca e exportação
1. Faça: busque pelo nome. Filtre por responsável, tipo de evento, data prevista e ordenação. Use **Limpar**.
2. Faça: toque em **Exportar**. Confira: baixa `oportunidades.csv` só com o que está no filtro.

---

## Ato 5. Orçamento e proposta por link

**Menu: Funil de vendas > Orçamentos**

1. Faça: **Novo orçamento**. Escolha a oportunidade da Marina **primeiro** e depois o modelo. Confira: os parâmetros (`#valor`, `#data_evento`, `#nome_assessoria`...) são trocados pelos dados do lead. Dado que falta vira texto vazio.
2. Confira: sem oportunidade ou sem conteúdo, não grava.
3. Faça: edite e salve. Abas: **Em andamento**, **Respondidos**, **Cancelados**.
4. Faça: toque em **Enviar proposta** (ícone de avião). Confira:
   - Abre um modal com o **link da proposta**, **Copiar link** e **Enviar pelo WhatsApp** (texto pronto).
   - O lead vai sozinho para **Orçamento enviado**, se estava num estágio aberto antes dele (a regra depende de o estágio com esse nome existir).
   - O cartão mostra "Proposta ainda não foi aberta".
5. Faça (você, logada): abra o link da proposta. Pode ser em outra aba do mesmo navegador (se você entrou depois desta versão; senão, saia e entre de novo). Confira: aparece o aviso "Você está vendo como assessoria", os botões de resposta ficam desabilitados, e a proposta **não conta como aberta**. Para testar a resposta, use janela anônima.

### 5.1 O cliente responde (janela anônima)
Teste cada resposta, em ordem. Para repetir, o lead pode mudar a resposta enquanto o link vale.

1. Abra o link anônimo. Confira: aparece a marca da conta, o texto e o valor. No cartão do funil passa a "Aberta em {data}" (só a primeira abertura conta).
2. **Tenho dúvidas**: escreva uma mensagem (obrigatória, até 1.000 caracteres).
   - Confira: a mensagem aparece no cartão; o retorno do lead fica marcado para hoje; o orçamento continua em **Em andamento** (só dúvida mantém a conversa aberta).
   - Faça: ainda com esse orçamento em Em andamento, **edite o texto ou o valor** e salve. Confira: a proposta volta a "ainda não foi aberta" e a mensagem sai do cartão (fica no histórico). O link continua o mesmo. Só mudar o conteúdo ou o valor faz isso.
   - Faça: abra o link de novo na janela anônima para seguir com o próximo passo (a abertura conta de novo).
3. **Não vou seguir**: informe um motivo.
   - Confira: o cartão mostra "Recusada" com a mensagem. O botão **Descartar** abre o modal de descarte já com o motivo do lead. Só descarta se você confirmar.
4. **Aceitar**: confirme.
   - Confira: selo **Aceitou** no cartão e na lista de orçamentos; o orçamento vai para **Respondidos**. O lead **não** vai sozinho para Contratado.
5. Faça: tente editar o orçamento que o lead aceitou (ou recusou), que já está em **Respondidos**. Confira: bloqueia com "Só orçamentos em andamento podem ser editados". Se a tela estava aberta antes da resposta, recarregue: o orçamento muda para a aba Respondidos.
6. Faça: em outro orçamento, toque em **Registrar resposta** (ligação ou conversa com o cliente). Abre um quadro para escolher o que o cliente respondeu. Teste as três:
   - **Aceitou a proposta**: vai para Respondidos, com o selo **Aceitou** no cartão e na lista.
   - **Tem dúvidas**: exige a dúvida. O orçamento continua em Em andamento, o cartão mostra a dúvida e o retorno do lead fica para hoje.
   - **Não vai seguir**: motivo opcional. Vai para Respondidos e o cartão mostra "Recusada".
   - Confira: registrar pela assessoria **não** conta como abertura do link ("ainda não foi aberta" continua).
7. Faça: **Cancelar** um orçamento e abra o link dele. Confira: "Esta proposta não está mais disponível".
8. Faça: reenvie uma proposta. Confira: o link é o mesmo e a validade volta a contar 30 dias.
9. Faça: exclua um orçamento em andamento. Excluir respondido não é permitido.

Para a aula: o lead decide pelo celular, sem login. A cerimonialista acompanha pelo selo no cartão.

---

## Ato 6. Descartar e recuperar

1. Faça: no lead da Camila, **Mover para Descartado** (ou solte o cartão na coluna).
2. Confira: abre o modal pedindo **motivo** (lista: Preço, Data indisponível, Fechou com outra assessoria, Desistiu do evento, Sem resposta, Outro). Sem motivo não grava. Cancelar devolve o cartão.
3. Confira: o cartão mostra o motivo. O cartão do topo "Descartado" soma.
4. Faça: mova o lead de volta para um estágio aberto. Confira: o motivo é limpo.
5. Faça: teste a falha de rede (desligue a internet e arraste). Confira: o cartão volta para a coluna anterior com um aviso.

Isso alimenta o relatório de motivos (Ato 10).

---

## Ato 7. Contrato do funil

**Menu: Funil de vendas > Contratos**

1. Faça: **Novo contrato**, oportunidade da Marina, escolha o modelo de contrato. Salve.
2. Confira: o contrato nasce em **Em andamento**. Sem oportunidade ou sem conteúdo, não grava.
3. Faça: edite o texto. Use **Enviar** (ícone de avião). **Enviar é só um registro**: o sistema não manda nada ao cliente (você envia por fora, pelo WhatsApp ou e-mail). Confira: aparece o aviso "Envio registrado", a coluna **Situação** passa de "Não enviado" para "Enviado em {data}", e o contrato continua em Em andamento (enviar não assina).
4. Faça: **Assinar** (ícone de caneta). Confira: vai para a aba **Assinados**. É registro manual; não é assinatura eletrônica com validade jurídica.
5. Faça: **Cancelar** um contrato (em andamento ou já assinado). Confira: vai para **Cancelados**.
6. Faça: exclua um contrato em andamento. Contrato assinado não volta a Em andamento.
7. Confira: contratos de fornecedores do evento não aparecem nesta lista.

---

## Ato 8. Fechar: virar cliente

O lead da Marina aceitou. Hora do fim do funil.

1. Faça: no cartão, toque em **Virar cliente** (ação do pé ou menu ⋮).
2. Confira: abre o cadastro de novo cliente **já preenchido** com o primeiro contato do lead: nome, e-mail, celular, cidade/UF, e a observação "Veio do funil: {oportunidade} (origem: {fonte})".
3. Faça: complete o que faltar (e-mail e celular são obrigatórios) e salve.
4. Confira:
   - Aviso "Marina agora é cliente. O lead foi para Contratado."
   - O cartão está em **Contratado**, com o selo **Cliente**. O selo leva a **Clientes**.
   - Cancelar o modal não muda nada.
5. Faça: tente virar cliente de novo. Confira: o botão não aparece mais (um cliente por oportunidade).
6. Faça: em **Menu: Gestão de eventos > Clientes**, abra a Marina e complete o cadastro (documento, endereço, o noivo como segundo contato/papel). Veja a spec do cadastro completo de cliente para os campos.
7. Faça: em **Clientes**, exclua (lixeira) o cliente de um lead de teste que **não** esteja ligado a nenhum evento. Confira: o cliente some e a oportunidade continua existindo, em Contratado, sem o selo **Cliente**. Se o cliente estiver ligado a um evento, a exclusão é recusada com o nome do evento; tire o vínculo no evento e tente de novo.
8. Faça: teste **Virar cliente** direto de um lead em Descartado. Confira: sai do descarte e vai para Contratado.

> Atenção para anotar: a SPEC-031 §17 decidiu que "Virar cliente" também criaria o evento (com opção de desmarcar). No código que li, o fluxo só cria o cliente e vincula o lead; o evento é criado no Ato 9. Se o modal de cliente oferecer a criação do evento, anote e o Ato 9 muda. Se não oferecer, vale registrar como pendência.

---

## Ato 9. Criar o evento

**Menu: Gestão de eventos > Eventos**

1. Faça: **Novo evento**. Escolha o tipo (Casamento). No campo **Cliente**, escolha a Marina (autocomplete). Para testar o outro caminho, crie outro evento escolhendo **cadastrar cliente novo** ali mesmo.
2. Confira: aparece "Vinculado: Marina Alves". O botão **Criar evento** só habilita com o tipo escolhido.
3. Faça (opcional): crie o evento a partir de um **modelo de evento**. Antes, abra **Modelos de evento**, monte um modelo com tarefas, serviços, briefing, roteiro, cronograma, inspirações, mensagens e contratos vinculados. Depois confira que ao criar o evento tudo isso entra nele.
4. Faça: abra a home do evento. Confira: cartões **Tarefas**, **Convidados confirmados**, **Serviços contratados**, **Orçamento contratado** e alertas com botão para resolver.
5. Faça: edite o cadastro completo do evento (data, horários, locais com CEP, convidados estimados). Marque na agenda, se houver essa opção.
6. Faça: no menu ⋯ do evento teste **Aplicar modelo**, **Salvar como modelo**, e deixe **Concluir evento** e **Cancelar evento** para o final do roteiro.
7. Faça: **Minha agenda**. Confira: o evento aparece na data. Clique nele: abre o resumo com **Abrir evento**.

---

## Ato 10. Relatórios do funil

Faça este ato depois de ter movimentado leads em todos os estágios, com descarte, fonte, serviço e região preenchidos.

**Menu: Funil de vendas > Relatórios**

1. Faça: escolha um período que inclua os testes. Confira os nove relatórios:
   1. Negócios fechados x perdidos
   2. Por fonte (origem)
   3. Por serviço/produto
   4. Por estágio
   5. Por região (UF e Cidade, com quantidade e total)
   6. Por responsável
   7. Por data prevista
   8. Por motivos de descarte
   9. Oportunidades de RSVP
2. Confira: os números batem com o que você fez (a Marina em Contratado, a Camila em Descartado com o motivo escolhido).
3. Faça: troque o período para um sem movimento. Confira: tudo zerado, sem erro. Fim antes do início indica erro no controle.
4. Faça: **Exportar** o relatório aberto.
5. Faça: **Tela Hoje**, seção de números do funil. Confira: quantidades e valores batem com o quadro.

Para a aula: o relatório de origem mostra qual canal fecha mais; o de motivos mostra por que perde.

---

## Ato 11. Equipe: assistente

**Menu: Principal > Assistentes** (só a dona)

1. Faça: **Convidar assistente**. Preencha nome, e-mail (o seu segundo e-mail), **Pode ver o financeiro** (não) e **Eventos que ela vê** (só os dela).
2. Confira: aparece como **Convite enviado**. E-mail que já pertence a outra conta é recusado.
3. Faça (janela anônima): abra o link do e-mail, crie a senha e entre. Confira: a casca mostra o nome da sua empresa e **só os menus permitidos**. Menu Perfil, Assistentes e Contratos (modelos) não aparecem. Tentar abrir um endereço bloqueado mostra "Você não tem acesso a esta área".
4. Faça: no evento da Marina, preencha **Assistentes do evento** marcando a assistente. Confira: ela vê o evento; sem a marca, ela vê "Nenhum evento liberado para você".
5. Faça: nas tarefas do funil e do evento, escolha a assistente como responsável.
6. Faça (como assistente): crie um lead, uma tarefa e uma tarefa do evento.
7. Confira a regra do funil: a assistente **só exclui o que ela criou**. Em Pagamentos e Estatísticas (se liberados), só os dela.
8. Faça: mude a permissão para "pode ver o financeiro" e confira que vale no próximo pedido, sem sair e entrar de novo.
9. Faça: **Remover acesso**. Confira: ela cai na tela de entrar com "Seu acesso foi removido"; o que ela criou continua na conta.

---

## Ato 12. Tocando o evento

Aqui o cliente fechado vira um evento rodando. Cada item abaixo é uma tela dentro do evento ou do menu.

### 12.1 Tarefas do evento
**Evento > Tarefas** (ou menu Tarefas)
1. Crie tarefas com prazo e responsável. Marque concluídas. Teste uma com prazo vencido.
2. Confira: o evento mostra % de tarefas feitas e atrasadas; a tela **Hoje** mostra "N tarefas pedem você hoje".

### 12.2 Fornecedores e serviços
**Menu: Serviços e fornecedores** e **Evento > Fornecedores**
1. Cadastre um fornecedor (formulário de oito abas; nome e serviços são obrigatórios). Cadastro incompleto aparece como incompleto.
2. No evento, adicione um fornecedor a um serviço. Conduza **Orçamento → Contratado**. Em Contratado, informe valor e gere as parcelas.
3. No planejamento de budget: edite o estimado, adicione subitens (a soma vira o estimado do serviço).
4. Confira: a home do evento atualiza "Serviços contratados" e "Orçamento contratado".

### 12.3 Convidados, convites e RSVP
**Evento > Convidados**
1. Crie grupos (ex.: Família da Noiva). **Novo convite** com pelo menos um convidado; escolha o principal (precisa ter telefone).
2. Teste **Importar** com a planilha padrão de 11 colunas (só .xlsx/.xls).
3. No convite, use **Copiar link de RSVP**, **Baixar QR Code** e **Enviar pelo WhatsApp**.
4. Janela anônima: abra o link de RSVP, confirme presença e **marque "Pretendo realizar um evento nos próximos dois anos"**.
5. Confira: o convite vira Confirmado; a home do evento atualiza.
6. **Menu: Funil de vendas > Oportunidades de RSVP**: o convidado aparece com convite, evento e data. Teste **Gerar oportunidade** (cria lead em Contato inicial, origem Outro/RSVP), **Descartar** (some da lista, sem lead) e o contato por telefone. Busque por convite e por evento.
7. Confira: o relatório 9 (RSVP) do Ato 10 mostra a conversão.

### 12.4 Dinheiro do evento
**Evento > Dinheiro** (precisa de permissão de financeiro)
1. Informe o valor do contrato, entrada e número de parcelas. Confira as parcelas geradas.
2. **Cobrar** abre o WhatsApp com texto pronto e a chave Pix. Sem Pix no Perfil, pede a chave antes.
3. **Recebi**: registre um valor parcial, depois o restante. Receber mais que o saldo da parcela não grava. **Desfazer** volta o último recebimento.
4. Confira os totais **Contrato**, **Recebido** e **Saldo**.
5. Registre despesas e envie um comprovante (JPG, PNG ou PDF, até 5 MB).
6. Exporte o budget para Excel.
7. **Menu: Pagamentos**: confira a lista de todos os eventos.

### 12.5 Contrato do evento
**Menu: Modelos > Contratos** e **Evento > Contratos**
1. Crie um contrato com campos de mesclagem (`{{contratante_nome}}`, `{{evento_data}}`, `{{contrato_valor}}`, `{{contrato_parcelas}}`...). Use **Ver como fica**.
2. Vincule-o ao modelo de evento (aba Contratos) ou adicione no evento.
3. No evento, **Ler** (abre preenchido), **Imprimir** e **Enviar por e-mail** (link de leitura por 7 dias).
4. Janela anônima: abra o link. Confira: lê sem login e sem editar. Link vencido deixa de abrir.
5. Campo sem dado aparece como linha em branco (`________`).

### 12.6 Agenda, aniversários e anexos
- **Minha agenda**: vistas Mês, Semana, Dia e Lista; novo compromisso (e pelo "+" no dia); editar e excluir.
- **Anexos**, **Equipe** e **Aniversários** aparecem como "em breve". Anote o que aparecer e não grave aula sobre eles.

### 12.7 Modelos de roteiro, cronograma e inspirações
No evento, aplique roteiro, cronograma e inspirações vindos dos modelos. Confira que editar o modelo depois não muda o evento já criado.

---

## Ato 13. Encerrar e ver o resultado

1. Faça: no evento da Marina, **⋮ > Concluir evento**. Confira: sai de "Em andamento" e vai para Concluídos.
2. Faça: **Menu: Eventos > Estatísticas**. Confira: total, as três situações com percentual, gráfico por mês e rankings.
3. Faça: veja o bloco **Resumo de todos os eventos** e use os atalhos.
4. Faça: volte à tela **Hoje** e confira a carteira, o próximo evento e os cartões.
5. Faça: **Minha conta** (menu do avatar): edite dados e troque a senha. Teste sair e entrar de novo, e o fluxo "Esqueci minha senha".
6. Faça (opcional): crie outro evento e use **Cancelar evento** para ver o estado Cancelado.

---

## Ato 14. Testes de limite e de isolamento

Faça no fim; são os testes de que nada vaza e nada quebra.

- [ ] **Duas contas:** crie uma segunda conta (outro e-mail). Confira que ela **não vê** leads, orçamentos, contratos, tarefas, estágios, clientes, eventos e relatórios da primeira.
- [ ] **Link de proposta de outra conta** não revela dados. Token inventado mostra mensagem neutra.
- [ ] **Conta sem dados:** quadro com quatro colunas em 0 e R$ 0,00; abas vazias com texto "não há"; relatórios zerados.
- [ ] **Excluir estágio com leads:** o modal exige o estágio de destino e move os leads.
- [ ] **Limite de estágios:** o nono estágio aberto não é criado.
- [ ] **Celular:** abra no celular (ou em janela estreita). O quadro vira uma coluna por linha, o cartão não arrasta, e o menu "Mover para…" funciona. A página pública da proposta e do RSVP funcionam bem no celular.
- [ ] **Modo escuro/claro** no avatar.

---

## Ordem sugerida para as videoaulas

1. Configurar a conta (Ato 0).
2. Montar o funil e os modelos (Ato 1).
3. Receber e cadastrar leads (Ato 2).
4. Conduzir a conversa: briefing, retorno e tarefas (Ato 3).
5. Mover leads e usar filtros (Ato 4 e 6).
6. Orçamento e proposta por link (Ato 5).
7. Contrato do funil e virar cliente (Atos 7 e 8).
8. Criar o evento a partir do cliente (Ato 9).
9. Relatórios do funil (Ato 10).
10. Assistentes (Ato 11).
11. Rodar o evento: tarefas, fornecedores, convidados, dinheiro e contrato (Ato 12).
12. Encerrar e analisar (Ato 13).

## Pendências encontradas

Use esta lista durante o teste. Para cada problema: passo, o que esperava, o que aconteceu.

| Passo | Esperado | Aconteceu |
|---|---|---|
| | | |
