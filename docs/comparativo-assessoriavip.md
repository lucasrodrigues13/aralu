# Comparativo: Assessoria VIP × specs × gevents

**Status: observado.** Levantamento de 18/11/2026 nos menus Gestão de Eventos, Minha agenda e Funil de vendas da plataforma de referência. A navegação foi só de leitura: nenhum registro foi criado ou alterado (o evento `TESTE LUCÃO` é o único liberado para escrita e ainda não foi usado nesta rodada). Nomes e contatos reais da conta não foram copiados.

Complementa [inventario-referencia.md](inventario-referencia.md), que não tinha percorrido Agenda nem Funil.

Legenda: ✅ coberto · 🟡 parcial · ❌ ausente · ⛔ fora do corte por decisão do [mvp-scope.md](mvp-scope.md).

## 1. Minha agenda (`/agenda_compromissos`)

### 1.1. O que a referência tem

- Calendário FullCalendar com Mês, Semana, Dia, Lista, anterior/próxima/Hoje.
- Compromissos **arrastáveis** (remarcar com drag and drop).
- Botão "Integrar minha agenda do Google".
- Clicar no dia abre **Adicionar compromisso**:

| Campo | Tipo | Obrigatório |
|---|---|---|
| Título do compromisso | Texto | Sim |
| Data e horário … Até | Data+hora início e fim (padrão: dia clicado 00:00 até o dia seguinte 00:00) | Sim |
| Local | Texto | Não |
| Notificação | Sem lembrete / Por e-mail + número + Minutos/Horas/Dias (padrão: e-mail, 1 dia) | Não |
| Incluir link de confirmação de presença | Marcação | Não |
| Participantes | Organizador fixo + "Adicionar participante" (busca "Pesquisar por fornecedor, assistente ou cliente") | Não |
| Notificar participantes desse compromisso | Marcação, ligada | Não |
| Descrição | Texto longo | Não |
| Adicionar anexo | Arquivo | Não |

- Compromisso vindo de evento mostra "Vinculado com evento {nome}" e botão "Remover compromisso" no modal "Editar compromisso".
- A home do evento imprime compromissos (`/gestao_eventos/compromissosImprimir/{id}`).

### 1.2. Spec 019 × código

| Item | Referência | Spec 019 | gevents |
|---|---|---|---|
| Vistas Mês/Semana/Dia/Lista + navegação | ✅ | ✅ | ✅ (verificar fidelidade visual) |
| Título | ✅ | "descrição" | `Descricao` |
| Hora início **e fim** | ✅ | hora opcional, sem fim | 🟡 só `Data` + `Hora` |
| Local | ✅ | ❌ | ❌ |
| Lembrete por e-mail (N min/h/dias) | ✅ | ❌ | ❌ |
| Participantes (fornecedor/cliente) + notificar | ✅ | ❌ (assistente fora) | ❌ |
| Descrição longa | ✅ | ❌ | ❌ |
| Anexo | ✅ | ❌ | ❌ |
| Arrastar para remarcar | ✅ | ❌ | ❌ |
| Vínculo com evento | ✅ | ✅ | ✅ `EventoId` |
| Link de confirmação de presença | ✅ | ⛔ | ❌ |
| Google Agenda | ✅ | ⛔ | ❌ |

**Conclusão:** a spec 019 é a mais distante da referência. Precisa de revisão (nova versão) antes de codar: título + descrição, início/fim, local, lembrete, participantes, anexo, drag and drop.

## 2. Funil de vendas (`/funnel/*`)

Abas: Oportunidades, Oportunidades de RSVP, Contratos, Tarefas, Relatórios, Orçamentos, Modelos (Serviços/Produtos, Orçamento, Contrato, **Briefings**).

### 2.1. Oportunidades (`/funnel/oportunity`)

Referência:

- Quadro kanban com colunas Contato inicial, **Enviado orçamento**, Contratado, Descartado; cada coluna com quantidade e R$; seta para rolar para mais colunas.
- **Gerenciar estágios**: "Adicionar novo estágio" (Nome, Cor), reordenar arrastando; "os estágios contratado e descartado não são editáveis".
- Busca "Pesquisar por uma oportunidade". Filtro: Responsável (avatares), Tipo de evento, Data prevista, Ordenar por.
- Menu "…" (não aberto).
- Formulário "Adicionar oportunidade" em abas: **Sobre a oportunidade** (Nome*, Estágio*, Fonte com sugestões + texto livre, Valor da proposta, Responsável, Serviço/Produto com chips Assessoria completa/parcial/do dia + texto livre), **Sobre o evento** (Tipo, Qtde convidados, Data prevista, Horário (convite), Tempo de festa, Início cerimônia, Início recepção, Padrinhos, Damas e pajens), **Cerimônia** e **Recepção** (Local, País, CEP, Endereço, Número, Estado, Cidade, Bairro, Complemento), **Contatos** (lista; "Nenhum contato cadastrado. Informe os dados de pelo menos um contato"). O subformulário de contato não foi aberto.

| Item | Spec 020 | gevents |
|---|---|---|
| 4 colunas com qtd e valor | ✅ | ✅ |
| Rótulo "Enviado orçamento" | ⚠️ spec usa "Orçamento enviado" | segue a spec |
| Estágios configuráveis (nome, cor, ordem) | ⛔ fixos | ❌ |
| Arrastar cartão entre colunas | não exigido | ❌ (sem CDK drag-drop no projeto) |
| Filtros responsável/tipo/data/ordenação | ✅ | ✅ (conferir UI) |
| Campos do evento | ✅ | 🟡 `Horarios` é um texto só; faltam horário convite, tempo de festa, início cerimônia/recepção separados; faltam Estado/Cidade/Complemento da cerimônia e Complemento da recepção |
| Contatos (lista) | ✅ | ✅ |
| Exportar, descarte com motivo, lead público, checar data | ✅ | ✅ |

### 2.2. Oportunidades de RSVP

Lista "convidados … que pretendem realizar eventos nos próximos dois anos": Convite, Evento + data, "Criado em dd/mm/aaaa às hh:mm", botão Filtro. **Bate com a spec 021 e o código.** Ações por linha não inspecionadas (há dados reais).

### 2.3. Contratos e Orçamentos

Ambos: filtro "Criado em", abas (EM ANDAMENTO / ASSINADOS / CANCELADOS; EM ANDAMENTO / RESPONDIDOS / CANCELADOS), vazio "Nenhum … encontrado!". **Bate com specs 022 e 025.** Formulário de criação não aberto (conta sem oportunidades).

### 2.4. Tarefas do funil

Filtros Prazo, Por tipo, Por responsável (avatares); abas INCOMPLETAS/COMPLETAS; "Nova tarefa": título, **Observação em texto rico** (negrito, itálico, sublinhado, listas, linha, desfazer/refazer), Oportunidade*, Tipo*, Responsáveis* (vários, avatares), Prazo*, Adicionar anexo. **Bate com spec 023**, exceto: responsáveis no plural e observação em texto rico.

### 2.5. Relatórios

Lista lateral com 9 relatórios: Negócios fechados x perdidos; Oportunidades por fonte, serviço/produto, estágio, região, responsável, data prevista, motivos de descarte; Oportunidades de RSVP. **Bate com spec 024.** Conteúdo de cada relatório não visto (conta sem oportunidades).

### 2.6. Modelos

| Modelo | Referência | Spec | gevents |
|---|---|---|---|
| Serviços/Produtos | Lista + "Novo serviço/produto" | 026 ✅ | ✅ |
| Orçamento | Lista lateral + editor; "Modelo padrão da Assessoria VIP" não editável; **Personalização** (cor de fundo, cor do texto); texto rico Froala com parâmetros `#nome_oportunidade`, `#data_evento`, `#data_atual`, `#horario_previsto`, `#tempo_festa`, `#tipo_evento`, `#valor_proposta`, `#qtd_convidados`, `#qtd_padrinhos`, `#qtd_dama_pajens`, `#local_cerimonia`, `#endereco_cerimonia`, `#horario_cerimonia`, `#local_recepcao`, `#endereco_recepcao`, `#horario_recepcao` + "Mostrar mais parâmetros"; Adicionar anexo | 027 ✅ | 🟡 conferir lista de parâmetros, cores e anexo |
| Contrato | Lista lateral + "Criar novo modelo" | 028 ✅ | ✅ |
| **Briefings** | Biblioteca **compartilhada** com Gestão de Eventos: cada modelo diz "criado em … na Gestão de Eventos" ou "no Funil de vendas" | ❌ sem spec no funil | 🟡 `ModeloBriefing.Origem` já existe, mas o funil não tem a tela |

## 3. Gestão de Eventos

O inventário já cobre lista, cadastro, home, fornecedores, convidados e modelos. Abaixo o que faltava e o estado no gevents.

### 3.1. Telas globais (atalhos do topo)

| Tela | Referência | Spec | gevents |
|---|---|---|---|
| Pagamentos de todos eventos (`/gestao_eventos/payments`) | Filtro (status Pendente pré-selecionado), "N pagamentos", agrupado por mês ("Sem data" primeiro) com "Pago: R$ X de R$ Y" e "Juros incluso"; linha: situação (Pendente/Atrasado/Pago), vencimento, fornecedor, evento, valor | ❌ | ❌ "Em breve" |
| Tarefas de todos eventos (`/task_all`) | Filtros Por situação (Concluídas, Pendentes, Em andamento, Atrasadas, Todas), responsável, prazo (+ sem prazo), evento, serviço (+ sem serviço), tags do evento, só com checklist, só com perguntas, incluir eventos concluídos; vistas **Lista, Quadros por situação, Quadros por dia** | 003 parcial | 🟡 lista + quadro; faltam filtros e "quadro por dia" |
| Anexos de todos os eventos (`/attachmentsAll`) | Abas Fornecedores, Tarefas, Observações gerais; filtros nome, serviço, visualização (visualizado/não), assinatura eletrônica; tipos Anexos gerais, Solicitação de orçamento, Solicitação de contrato, Contratos do funil; item com autor, data, fornecedor, serviço, evento, "Não visualizado" | ⛔ RF-073 | ❌ "Em breve" |
| Aniversários (`/anniversaries`) | Filtros prazo e tipo; **Modelos de mensagem** (cliente, casamento, assistente, equipe + Novo modelo); situações A enviar, Envio em atraso, Enviado, Ignorado; agrupado por Semana que vem / Em duas semanas / A partir de 3 semanas; item "Aniversário de casamento de N meses", data do evento, evento, tipo | ❌ | ❌ "Em breve" |

### 3.2. Menu do evento

Home, Convidados (4 sub-rotas), **Pagamentos**, Tarefas, **Roteiro**, **Cronograma**, **Briefing**, **Inspirações**, **Anexos** (Fornecedores, Serviços, Tarefas, Observações gerais), Site de casamento (⛔ RF-079).

| Aba | Referência (evento TESTE LUCÃO) | Spec | gevents |
|---|---|---|---|
| Pagamentos do evento | Ver inventário §3 | 018 parcial (parcelas) | ❌ sem aba |
| Tarefas do evento | 166 tarefas agrupadas por "N MESES ANTES"; mesmos filtros da tela global; vistas Lista/Quadros por situação/por dia. Formulário em abas **Tarefa** (situação, Título*, Descrição em texto rico, Responsáveis, Pertence ao serviço, Prazo), **Perguntas**, **Checklist** | 003 | 🟡 sem perguntas, checklist, serviço, anexos, agrupamento por meses antes; responsável único |
| Roteiro | "Roteiros do Evento": Criar novo roteiro (do zero ou de modelo), Ver modelos | 014 só modelo | ❌ no evento |
| Cronograma | "Informações importantes aos fornecedores", **Link Offline**, Importar modelo, Adicionar seção | 015 só modelo | ❌ no evento |
| Briefing | "Briefings do Evento": Criar novo (do zero ou modelo) — formulário para o cliente | 013 só modelo | ❌ no evento |
| Inspirações | "Galerias de Inspirações": Criar nova galeria, Ver modelos | 016 só modelo | ❌ no evento |
| Anexos do evento | 4 abas | ⛔ RF-073 | ❌ |

As specs 013–016 descrevem só a **biblioteca de modelos**; nenhuma spec cobre a instância no evento, que é onde os modelos são usados.

### 3.3. Itens do inventário (§1) ainda sem código

Escalar equipe do dia (⛔ RF-051), observações gerais do evento com modelos, planejamento de budget com subitens e exportar Excel (backend tem `GET /eventos/{id}/budget`), comparativo de fornecedores, alinhamentos, chat/observações no hub do fornecedor, reajuste do contratado, parcelas com comprovante e permissões do cliente, agrupar/ordenar/ocultar serviços, solicitações aos fornecedores, mensagem em massa a fornecedores, mapeamento de mesa e checklist de presença (⛔ RF-066/067).

## 4. Achados transversais

1. **Escopo vs. pedido.** O `mvp-scope.md` corta Google Agenda, link de presença, estágios configuráveis, anexos globais, equipe do dia e mapa de mesas. O pedido atual ("tudo que tem dentro destes menus") contradiz esses cortes — decidir item a item antes de reescrever specs.
2. **Texto rico.** A referência usa Froala em tarefas, observações, modelos de orçamento/contrato e alinhamentos. O gevents não tem editor rico; escolher um (ex.: ngx-quill ou TipTap) uma vez e reusar.
3. **Drag and drop.** Agenda, kanban do funil, ordenar estágios e ordenar serviços dependem disso; adotar `@angular/cdk/drag-drop` (+ FullCalendar Angular para a agenda).
4. **Responsáveis múltiplos.** Tarefas (evento e funil) aceitam vários responsáveis; o domínio tem `ResponsavelContaId` único.
5. **Instância de modelo no evento.** Roteiro, cronograma, briefing e inspirações precisam de entidade por evento (clonada do modelo), não só a biblioteca.
6. **Endpoints num arquivo só.** `NegocioEndpoints.cs` tem 1.374 linhas e 106 rotas; vale quebrar por módulo antes de crescer.

## 5. Prioridade sugerida

| # | Bloco | Por quê |
|---|---|---|
| 1 | Revisar spec 019 e implementar agenda completa (título/descrição, início/fim, local, lembrete, participantes, anexo, drag) | Menor esforço, maior distância da referência |
| 2 | Abas do evento: Roteiro, Cronograma, Briefing, Inspirações (instância a partir do modelo) | Fecha o uso dos modelos que já existem |
| 3 | Tarefas do evento completas (perguntas, checklist, serviço, vários responsáveis, quadro por dia, filtros) + tela global | Tela mais usada na conta real (1.955 tarefas) |
| 4 | Pagamentos do evento e global | Parcelas já existem no backend; falta a visão |
| 5 | Funil: kanban arrastável, estágios configuráveis, campos de evento separados, modelos de briefing no funil | Ajustes sobre base que já bate com a referência |
| 6 | Aniversários e anexos globais | Dependem de decisão de escopo |

## 6. Ainda não visto

Subformulário de contato da oportunidade, menu "…" das oportunidades, ações da linha de Oportunidades de RSVP, formulários de contrato/orçamento do funil, conteúdo de cada relatório, abas Perguntas/Checklist da tarefa, telas internas de roteiro/cronograma/briefing/inspiração do evento. Para ver os formulários do funil é preciso uma oportunidade, que não existe na conta — criar uma só com autorização.
