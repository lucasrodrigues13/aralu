# Inventário: WeddingPro

**Status: observado.** Leitura de 18/11/2026 em app.weddingpro.app.br (trial de 7 dias), na conta de teste com o evento "Casamento Teste Ana & Bruno". Somente leitura. O PDF usa o WeddingPro como inspiração para o **tom com o casal**, o **roteiro do dia**, **mesas** e **check-in** (passos 9 e 10, itens da 1.1).

Obs.: `weddingpro.com.br` é outro produto (curso de fotografia).

## 1. Navegação e dashboard

Lateral: Dashboard, Eventos, Clientes, Fornecedores, Checklist, Contratos, Financeiro, Equipe, Assinatura, Configurações.

Dashboard: data e saudação; onboarding "Configure seu evento · 2 de 3 passos · 67%" (criar evento, cadastrar convidados, enviar o primeiro convite "pelo seu WhatsApp, com a mensagem pronta e o link"); **Próximo casamento** (dias, % e "0 de 5 confirmaram presença", "21 tarefas pendentes · nada atrasado", fornecedores); **Confirmações** do próximo casamento (confirmaram, aguardando, recusaram; dos confirmados: acompanhantes, crianças); **Tarefas pendentes** com prazo, de todos os eventos; **Sua agenda nos próximos 12 meses** (gráfico de eventos por mês).

## 2. Evento

Cabeçalho: nome, tipo, situação (Rascunho), descrição curta, Data, Local, Casal, Orçamento, Cerimônia ("Religioso · Interno"), Convidados ("5 de 120"). "Editar casamento".

**Organização do evento** em cartões, cada um com **um número e uma frase** (o que o PDF chama de "resumo em cartões"):

| Cartão | Frase |
|---|---|
| Convidados | "0 de 5 confirmados · 5 aguardando" — lista, convites pelo WhatsApp e confirmações |
| Fornecedores | "Adicione fornecedores do seu catálogo a este casamento" |
| Checklist | "0 de 21 concluídas" — tarefas com data-limite |
| Cronograma | "15 momentos no roteiro" — hora a hora, pronto para PDF |
| Mesas de recepção | "1 mesa montada" — capacidade e assentos; os noivos veem o mapa no portal |
| Mapa da cerimônia | posicionar convidados nos assentos da cerimônia |
| Família e cortejo | pais, avós e irmãos + ordem de entrada: "os nomes que você precisa ter na mão no dia" |
| Check-in | QR Code na entrada, chegadas em tempo real, link para a recepção sem login |

### 2.1. Cronograma do dia — passo 9

"Monte o roteiro hora a hora"; **Baixar PDF**; "+ Momento"; "Cronograma em segundos: use um template… depois edite". Momento = horário + título + descrição (ex.: "14:00 Abertura do local · Equipe de decoração e cerimonial no local", "15:10 Entrada da noiva"). Lista única, sem divisão cerimônia/recepção.

### 2.2. Família e cortejo — passo 9

Abas **Família** e **Cortejo**; "Adicionar nome" (escolhe da lista de convidados ou digita); Exportar. É separado do cronograma (no Cerimonial Fácil fica dentro de cada momento como "Nomes de quem entra").

### 2.3. Convidados — passo 7

Contadores Total, Vão comparecer, Convites enviados, Confirmados, Recusados, Aguardando. Ações: Boas práticas, Exportar, **Mensagens de convite**, **Prazo do RSVP**, Adicionar; dica "RSVP via WhatsApp". Abas Lista / Respostas; filtros status, convite, convidado, tipo. Colunas NOME, TIPO, CONTATO, RSVP, CONVITE (Rascunho), ACOMP., CONFIRMADO EM. **"Excluir selecionados" e "Excluir todos" soltos no topo** (o "não fazer" do PDF). A lista colada também não separou pessoas ("Familia Teste Oliveira - 4" = 1 linha).

### 2.4. Mesas de recepção

Totais Mesas, Alocados (0/5), A alocar, Capacidade total. Lista de convidados (Todos / Sem mesa / Atribuídos) com **Noivos** fixados no topo. Mesa: nome, ocupação 2/8, assentos (+), Atribuir, Editar. "Adicionar mesa: Redonda ou retangular". Os noivos veem o mapa no portal.

### 2.5. Check-in (1.1)

Scanner por câmera; "liberação antecipada" (fora do dia do evento); **QR Code Offline**; painel ao vivo (chegaram, faltam, confirmados); busca manual; últimas chegadas; **chegadas por mesa**; opção de enviar QR no convite ao confirmar; **link de operador para a recepção, sem login**; silenciar som.

## 3. Painel dos noivos — passo 10

- Link sem senha (`/client/{token}`): Copiar link, Abrir painel, **Configurar painel**.
- Configurações visíveis: **"Sem código de edição"** (o casal pode editar com um código), **"Valores ocultos"**, **"Só você envia convites"**; foto da contagem regressiva (o casal pode trocar com o código).
- O que o casal vê: marca "por {assessoria}", nomes, data, **contagem regressiva** (dias, horas, min, seg), menu Início, Convites, Cronograma, Convidados, Fornecedores, Lugares.
- **Mensagem da assessoria no topo**: "Que honra cuidar de cada detalhe do casamento de vocês. Por aqui vocês acompanham tudo…" (o "tom com o casal" do PDF).
- Visão geral (local, cerimônia), confirmações (sim / aguardando / não), link da lista de presentes.
- Abaixo, **propaganda dos convites digitais** do WeddingPro (o PDF manda não fazer).

## 4. Dinheiro e contratos

- **Contratos**: "Anexe o PDF, escolha o evento e, se quiser, informe o honorário: as parcelas entram sozinhas no Financeiro." Contrato é só anexo (o PDF manda não fazer).
- **Financeiro**: "O dinheiro da sua assessoria: honorários, comissões e despesas." Pagamentos a fornecedores; Lançamento; períodos Este mês, Últimos 30 dias, Este ano, Todo o período; "Comece pelo honorário"; Lançamento avulso.

## 5. O que muda na análise

| Passo | WeddingPro | Ajuste sugerido |
|---|---|---|
| Resumo do evento | Cartão = número + frase + o que se faz ali | Padrão dos cartões do Resumo |
| 9 Roteiro | Hora a hora, template, PDF; **Família e cortejo** separado | Roteiro do Cerimonial Fácil (cerimônia/recepção, nomes por momento) + lista Família e cortejo do WeddingPro |
| 10 Link do casal | Mensagem da assessoria no topo, contagem regressiva, **código de edição** opcional, **valores ocultos** | Mensagem no topo e contagem; "valores ocultos" como opção; código de edição só se o casal for editar algo |
| Mesas | Noivos fixos, redonda/retangular, ocupação x/y, casal vê | Entra na lista de mesas da 1.0 (sem planta desenhada) |
| Check-in (1.1) | Link de operador sem login, QR offline, chegadas por mesa | Base para a 1.1 |
| Dashboard | Agenda de 12 meses em gráfico | Opcional na tela Hoje |

## 6. Para decidir

1. **Código de edição** no link do casal (o casal edita foto, lista de convidados etc. sem login).
2. **Família e cortejo** como lista própria, além dos nomes por momento do roteiro.
3. **Formato da mesa** (redonda / retangular) já na 1.0.
