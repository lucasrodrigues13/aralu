# Análise do plano "Versão 1.0 em 12 passos"

**Status: decidido em 18/11/2026, com dois pontos ainda abertos.** O PDF é fonte de sugestões, não de regra; o resultado consolidado (PDF + construído + referências + decisões) está em [produto-v1.md](produto-v1.md). Leitura do PDF do cliente (`plataforma-v1-passo-a-passo.pdf`, 17/11/2026) cruzada com [comparativo-assessoriavip.md](comparativo-assessoriavip.md), as specs 001–028 e o código. Nada foi alterado em spec ou código. As decisões tomadas e o que ficou em aberto estão na seção 4.

Legenda do estado atual: ✅ já existe · 🟡 existe diferente · ❌ não existe.
Classificação: **Plausível** (fazer como pedido) · **Ajustar** (fazer, com mudança de spec/código existente) · **Decidir** (precisa da sua decisão) · **Adiar** (v1.1).

## 1. O que o PDF muda no rumo

1. **Foco no celular**, com barra inferior de 5 itens (Hoje, Eventos, + Novo, Dinheiro, Mais) e evento organizado em 4 grupos (Planejar, Convidados, Dinheiro, Casal) + Resumo. Hoje o gevents segue o menu lateral da Assessoria VIP (mvp-scope §3) e o visual de dashboard Apex.
2. **Funil de vendas, briefing, financeiro da empresa, aniversários, equipe, relatórios e mesas vão para a v1.1.** O funil (specs 020–028) já está construído.
3. **Minha agenda não aparece no plano.** Só há "agenda geral de fornecedores" no passo 8.
4. **Inspirações em quatro sistemas**: Cerimonial Fácil (11 de 12 passos), Assessoria VIP (4), Ivola (2), WeddingPro (4). Só a Assessoria VIP foi inventariada.
5. **Entram itens novos sem spec**: tela Hoje, cobrança por WhatsApp/Pix, link do casal sem senha, resumo diário, assistente de IA, colar lista de convidados.

## 2. Os 12 passos

| # | Passo | O que pede | Estado atual | Classificação |
|---|---|---|---|---|
| 1 | Criar evento em uma tela | Obrigatório só tipo, data, nome do casal; cliente na mesma tela; pacote define o modelo de tarefas; data digitável; **não** pedir valor/parcelas antes de ver o evento | 🟡 spec 008 exige modelo; cliente inline existe; o passo "valor da assessoria" (`POST /eventos/{id}/assessoria`) copia justamente o que o PDF manda não fazer | **Ajustar**: pacote = modelo; tornar o valor da assessoria opcional e posterior |
| 2 | Modelos de tarefas e roteiro | Modelos próprios; prazo relativo à data do evento ("6 meses antes"); importar colando lista/planilha | ✅ `TarefaModelo.DiasAntes` já calcula a partir da data do evento; ❌ importação por colagem | **Plausível** (falta só importar) |
| 3 | Tarefas | Criar numa linha; grupos fixos **Esta semana / Depois / Para conferir / Feitas**; responsável: eu, equipe ou casal (casal só vê o que ela marca); checklist e anexos dentro da tarefa, recolhidos; tocar abre leitura, não edição | 🟡 spec 003 usa situações pendente/em andamento/concluída/atrasada; responsável único (`ResponsavelContaId`); sem checklist/anexo | **Ajustar**: troca o modelo de situação da spec 003. "Equipe" depende da decisão sobre equipe (v1.1) |
| 4 | Tela "Hoje" | Só o que pede ação hoje somando todos os eventos (tarefas, cobranças, respostas); "Nada pede você hoje"; carteira em tabela abaixo; alerta leva à tela que resolve | 🟡 spec 007 é dashboard de eventos + funil | **Ajustar**: substitui ou reescreve a 007 |
| 5 | Parcelas e cobrança | Total + entrada + nº parcelas gera tudo; "Cobrar" abre WhatsApp com mensagem e Pix (texto muda: lembrete / vence hoje / atrasada); "Recebi" com valor, forma, data, parcial e Desfazer; casal vê as parcelas no link | 🟡 parcelas existem só para **fornecedor** (`ParcelaServico`) e para o serviço da assessoria; ❌ visão "a receber do casal", cobrança, pagamento parcial | **Plausível** via link `wa.me` (já usado em convites). Pix exige a chave da assessoria no perfil |
| 6 | Contrato | Modelo por pacote; campos trocados (nome, data, valor, parcelas); "Ver como fica"; sai preenchido por evento para baixar ou assinar no celular; parcelas do contrato vão para o financeiro | 🟡 modelo de contrato existe só no **funil** (028), com 7 parâmetros de oportunidade; ❌ contrato por evento | **Ajustar** + **Decidir** o que é "assinar" (seção 4) |
| 7 | Convidados | Colar lista do WhatsApp **ou foto** ou planilha; IA entende "+ marido", "(3 pessoas)", crianças, com prévia antes de salvar; por família/convite; faixa etária e inteira/meia/gratuito; RSVP simples; mesas na 1.1 | ✅ convite→convidados, faixa, custo, planilha, RSVP (004/010); ❌ colar texto/foto | **Plausível** para colar texto com regras + prévia. Foto e IA dependem da decisão sobre IA |
| 8 | Fornecedores do evento | Cadastrar dentro do evento (entra também no catálogo); status **Orçamento → Contratado**; valor e **horário de chegada**; mensagens prontas no WhatsApp; tarefas agrupadas por serviço; contratar fecha a tarefa "Contratar X" | 🟡 cadastro pelo evento e catálogo ✅; funil de 4 etapas (Recomendado, Solicitado, Recebido, Contratado); ❌ horário de chegada; ❌ tarefa ligada a serviço | **Ajustar** + **Decidir** 2 vs 4 etapas |
| 9 | Roteiro do dia | Gerado do modelo com horários ajustados ao horário da cerimônia; cerimônia e recepção; cortejo com nomes da família; enviar por WhatsApp e imprimir uma folha; **não** separar Roteiro e Cronograma | 🟡 modelos 014 (roteiro) e 015 (cronograma) separados; ❌ roteiro no evento | **Ajustar** + **Decidir** fundir 014/015 |
| 10 | Link do casal | Link **sem senha**, com a marca dela; tarefas do casal, pagamentos, roteiro, mensagem no topo; marcos em vez de %; ela escolhe o que aparece | 🟡 hoje é login `Client` com flags (001/009) e e-mail de acesso, o que o PDF lista como "não fazer" | **Decidir** (seção 4) |
| 11 | Resumo do dia | Uma mensagem por dia (WhatsApp ou e-mail) no horário escolhido; só quando há algo; botões "Recebi", "Feito" na mensagem | ❌ não há job agendado no backend | **Decidir** canal: e-mail é plausível; WhatsApp com botões exige API oficial paga |
| 12 | Assistente de IA | Poucos comandos (criar tarefa, colar convidados, "o que falta?", "quanto falta receber?"); sempre mostra e pede "Confirmar"; conversa guardada por evento | ❌ RF-045 (assistente) está fora do MVP | **Decidir**: entra na 1.0 ou vai para 1.1 |

### Itens "não fazer" do PDF

| Item | Estado atual | Ação |
|---|---|---|
| Convite digital, mural, playlist, lista de presentes | Fora (RF-079) | Nenhuma |
| Propaganda ou parceiro no meio do uso | Não existe | Nenhuma |
| Botões perigosos soltos (Remover no cartão, Excluir todos) | 🟡 conferir cartão de evento e ações de convidados | Mover para "Mais" com confirmação |
| Formulários longos | 🟡 cadastro de evento e de cliente seguem a Assessoria VIP, com muitos campos | Coberto pelo passo 1 |
| Avisos que não somem | Não existe | Nenhuma |

## 3. O que já foi construído e o PDF adia

| Bloco | Specs | O PDF diz |
|---|---|---|
| Funil completo | 020–028 | v1.1 (com proposta "aceitar / tenho dúvidas / não vou seguir") |
| Modelos de briefing, inspirações, mensagens | 013, 016, 017 | Briefing na 1.1; inspirações não citadas; mensagens prontas são usadas nos passos 5, 8 e 11 |
| Estatísticas de eventos | 011 | Não citadas; relatórios na 1.1 |
| Login do cliente com flags | 001, 009 | Trocar por link sem senha (passo 10) |
| Minha agenda | 019 | Não citada |
| Mesas | 010 (campo mesa) | 1.1 |

Decisão 13 (seção 4): funil, briefing, financeiro da empresa, aniversários, equipe, relatórios e mesas entram na 1.0 apesar do PDF.

## 4. Decisões (18/11/2026)

| # | Tema | Decisão | Efeito nas specs |
|---|---|---|---|
| 1 | Rumo | **Juntar os dois**: os 12 passos do PDF e as funções de Gestão de Eventos, Agenda e Funil da Assessoria VIP entram na 1.0 | O "Adiar" do PDF não vale para Funil e Agenda |
| 2 | Funil | **Mantém na 1.0 e evolui o que faltou** (comparativo §2: estágios configuráveis, kanban arrastável, horários separados, briefing no funil, vários responsáveis) | Revisar 020, 023, 027; spec nova para briefing no funil |
| 3 | Navegação | **Barra inferior só no celular** (Hoje, Eventos, + Novo, Dinheiro, Mais); **desktop mantém o menu lateral com grupos** | Revisar mvp-scope §3 e design-system |
| 4 | Casal | **Link sem senha**, no lugar do login `Client` | Revisar 001 e 009; spec nova para o link do casal (passo 10) |
| 5 | IA | **1.1.** Na 1.0, colar lista de convidados com regras e prévia, sem IA e sem foto | Passo 12 sai; passo 7 sem foto |
| 6 | Resumo do dia | **Só e-mail** na 1.0, com links "Recebi"/"Feito"; WhatsApp na 1.1 | Spec nova; precisa de job agendado no backend |
| 7 | Assinatura do contrato | **Integrar serviço de assinatura eletrônica** (ZapSign, Clicksign ou similar) | Spec nova; escolher fornecedor e custo por envelope |
| 8 | Fornecedor | **Orçamento → Contratado** (2 etapas) | Revisar 018 e a regra `NegociacaoRegras` |
| 9 | Roteiro × Cronograma | **Mantém separados** | 014 e 015 seguem; falta a instância no evento |
| 10 | Tarefas | **Os dois**: grupos do PDF (Esta semana / Depois / Para conferir / Feitas) como visão padrão; situações da spec 003 como filtro e quadro | Revisar 003 |
| 11 | Agenda | Fica na 1.0 (consequência da decisão 1), com as melhorias do comparativo §1 | Revisar 019 |
| 12 | Outras referências | **Explorar Cerimonial Fácil, Ivola e WeddingPro** antes de reescrever specs | Login seu no navegador embutido; mesmas regras de só leitura |

| 13 | Itens que o PDF manda para a 1.1 | **Entram na 1.0**: funil de vendas (com proposta "aceitar / tenho dúvidas / não vou seguir" e aviso de contato repetido), briefing com o casal, financeiro da empresa (fluxo de caixa, despesas fixas, comissão de fornecedor/BV), aniversários dos clientes, equipe e permissões, relatórios (recebido, a receber, fechamento por origem) e mesas e mapa do salão. **Continuam na 1.1**: modo dia do evento e check-in, assistente de IA, resumo por WhatsApp | Saem do "fora do corte" do mvp-scope: RF-076 (financeiro), RF-051 (equipe do dia), RF-066 (mapa de mesas). Specs novas: financeiro da empresa, aniversários, equipe, mesas, relatórios financeiros, proposta do funil, briefing no evento |

Ainda em aberto:

- Qual serviço de assinatura (decisão 7). **Adiado em 18/11/2026**: a spec do contrato descreve a assinatura por uma interface própria (enviar, acompanhar situação, receber o PDF assinado), sem amarrar a um fornecedor; a escolha fica para antes da implementação dessa parte.
- Se o resumo por e-mail é opcional por conta.


Decidido depois:

- **Equipe e permissões:** login de **assistente** com permissões por módulo (ex.: sem financeiro). RF-045 entra na 1.0 e cria uma quarta role. A equipe do dia continua sem login, escalada por WhatsApp.
- **Mesas:** **lista de mesas** com nome, lugares, convidados e totais de livres/ocupados, como a Assessoria VIP. O mapa desenhado do salão fica para a 1.1.

## 5. Ideias das referências (decididas em 18/11/2026)

Fontes: [inventario-cerimonial-facil.md](inventario-cerimonial-facil.md), [inventario-ivola.md](inventario-ivola.md), [inventario-weddingpro.md](inventario-weddingpro.md).

| Ideia | Origem | Decisão |
|---|---|---|
| Página pública com portfólio, depoimentos e botão de orçamento para o funil | Cerimonial Fácil | **1.0** |
| Feed de calendário (iCal) para Google Agenda e iPhone | Cerimonial Fácil | **1.0** |
| Aprovações do casal pelo link (cardápio, decoração, convite) | Cerimonial Fácil | **1.0** |
| Depoimento pós-evento pelo link (alimenta a página pública) | Cerimonial Fácil | **1.0** |
| Visibilidade por tarefa: só eu / casal / compartilhada | Ivola | **1.0** |
| Prioridade na tarefa | Ivola | **1.0** |
| Código de edição no link do casal (edita sem login) | WeddingPro | **1.0** |
| "Fechou: criar o evento" a partir da oportunidade | Cerimonial Fácil | Não agora |
| Recibo de parcela | Cerimonial Fácil | Não agora |
| Checklist do evento (itens com valor e mês) | Cerimonial Fácil | Não agora |
| Fardamento da equipe | Cerimonial Fácil | Não agora |
| Tarefas opcionais no modelo | Ivola | Não agora |
| RSVP "Talvez" | Ivola | Não agora |
| Família e cortejo como lista própria | WeddingPro | Não agora |
| Formato da mesa (redonda / retangular) | WeddingPro | Não agora |

Observações:

- O feed iCal cobre a necessidade de "ver no Google Agenda" sem integração OAuth; a integração bidirecional continua fora.
- Aprovações, depoimento e código de edição ampliam a spec do link do casal (decisão 4).
- Visibilidade por tarefa substitui "responsável = casal" do passo 3: o responsável continua sendo pessoa (ela, assistente ou casal), e a visibilidade decide quem vê.

## 6. Ponto de atenção na conta da Assessoria VIP

O PDF registra que foi criado na conta de referência da Assessoria VIP o evento "TESTE CLAUDE - NAO MEXER & Ana e Bruno" (15/05/2030), com 133 tarefas que caíram nesta semana e entraram no contador "Tarefas para essa semana". O PDF diz que você apagaria esse evento manualmente. Não mexi nele.
