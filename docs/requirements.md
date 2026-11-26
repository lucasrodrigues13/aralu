# Requisitos e decisões arquiteturais

Documento de referência desta etapa. Aqui ficam a visão do sistema, os requisitos já fechados, a arquitetura e o que ainda precisa de confirmação.

Nenhum código, solution, entidade, migration ou arquivo de infraestrutura faz parte deste documento.

## Como ler o status

| Status | Significado |
|---|---|
| **Definido** | Decisão confirmada. A implementação deve seguir este texto. |
| **Proposto** | Recomendação técnica. Ainda não vale como regra do projeto. |
| **Pendente** | Pergunta em aberto. Não escolher um caminho na implementação antes de fechar. |
| **Substituído** | Deixou de valer. O texto indica o RF ou a decisão que ocupa o lugar. O ID não é reaproveitado. |

## 1. Visão geral

Aplicação web para gestão de cerimonial e assessoria de eventos, com a interface em Angular e os casos de uso numa API .NET. Contas usam as roles `Admin`, `Organizer` e `Assistant`. O cliente acessa o próprio evento por link, sem conta. O escopo da versão 1.0 está em [produto-v1.md](produto-v1.md); o código segue as specs aprovadas.

A API, o build estático do Angular, o PostgreSQL e os arquivos ficam na mesma VPS, sob Docker Compose, com o Caddy na frente. A primeira versão não usa microsserviço, mensageria, fila de e-mail nem infraestrutura distribuída.

O material de domínio já levantado está em [docs/brief.md](brief.md). Esse brief descreve o produto observado na plataforma de referência e o recorte sugerido de MVP. Ele ainda não foi convertido em requisitos funcionais deste documento. O cliente também ainda não informou as melhorias que pretende pedir.

## 2. Requisitos funcionais

Nos requisitos de conta, o status **Definido** significa **Confirmado** para este produto. Requisitos de domínio usam também **Observado**: comportamento visto na plataforma de referência e ainda não aprovado para o nosso sistema.

### 2.1. Cadastro público

| ID | Requisito | Status |
|---|---|---|
| RF-001 | Qualquer visitante pode criar uma conta com e-mail e senha, sem convite. | Definido |
| RF-002 | O e-mail é obrigatório e único. A comparação usa a normalização do ASP.NET Core Identity. | Definido |
| RF-003 | A senha é obrigatória, tem no mínimo 8 caracteres e segue DA-028. O Identity faz a validação e o hash. | Definido |
| RF-004 | Os dados do cadastro são validados no servidor antes de criar a conta. | Definido |
| RF-005 | O login só é permitido depois da confirmação do e-mail. | Definido |
| RF-006 | O cadastro tem proteção contra tentativas automatizadas, com os recursos nativos do ASP.NET Core, inclusive o limite de RF-017. | Definido |
| RF-007 | Falhas de cadastro são informadas sem expor dados sensíveis nem detalhes internos. | Definido |
| RF-008 | Toda conta criada pelo cadastro público recebe somente a role `Organizer`. | Definido |
| RF-009 | O formulário de cadastro não oferece campo de role. O visitante não escolhe o próprio privilégio. | Definido |
| RF-010 | O cadastro público não atribui a role `Admin`. O primeiro visitante que se cadastra não vira administrador. | Definido |

### 2.2. Login e logout

| ID | Requisito | Status |
|---|---|---|
| RF-011 | O usuário autentica com e-mail e senha pelo ASP.NET Core Identity. | Definido |
| RF-012 | A sessão da API é um JWT de acesso, enviado em `Authorization: Bearer`. A aplicação não usa cookie de autenticação nem opera servidor OAuth2. | Definido |
| RF-013 | O logout faz o cliente deixar de enviar o token. O token já emitido continua válido até expirar. Não há lista de revogação. | Definido |
| RF-014 | Após 5 tentativas inválidas de login, a conta fica bloqueada por 15 minutos pelo lockout do Identity. | Definido |
| RF-015 | As mensagens de erro de login não revelam se o e-mail existe, se a senha está errada ou se a conta está bloqueada de forma que ajude um ataque. | Definido |
| RF-016 | A proteção contra força bruta usa os recursos nativos do Identity e do ASP.NET Core. A aplicação não implementa hash nem autenticador próprios. O lockout por conta convive com o rate limiting por IP. | Definido |
| RF-017 | Cadastro, login, recuperação de senha e reenvio de confirmação passam pelo rate limiting nativo, com os limites de DA-030. | Definido |

### 2.3. Recuperação de senha e e-mail

| ID | Requisito | Status |
|---|---|---|
| RF-018 | O usuário solicita a recuperação informando o e-mail. | Definido |
| RF-019 | O token de redefinição é gerado pelo ASP.NET Core Identity. A aplicação não gera token próprio. | Definido |
| RF-020 | O link de redefinição de senha vale 1 hora. | Definido |
| RF-021 | A senha só é trocada depois que o token é validado pelo Identity. | Definido |
| RF-022 | A resposta da solicitação é a mesma exista ou não uma conta para aquele e-mail. Falha de SMTP não muda essa resposta. | Definido |
| RF-023 | O token deixa de valer depois do uso bem-sucedido, conforme o comportamento do Identity. | Definido |
| RF-036 | Confirmação de cadastro e recuperação de senha são enviadas pelo serviço de e-mail. | Definido |
| RF-037 | O usuário pode pedir o reenvio do e-mail de confirmação. | Definido |
| RF-038 | Falha de envio não grava senha nem token em log e não marca o e-mail como confirmado. No cadastro, a tela informa que o envio falhou. Na recuperação, vale RF-022. | Definido |
| RF-041 | O link de confirmação de e-mail vale 24 horas. Token expirado ou inválido é rejeitado. O usuário pede outro pelo reenvio, dentro do limite de RF-017. | Definido |
| RF-042 | Upload rejeitado recebe mensagem clara, sem detalhe interno de disco, caminho ou exceção. | Definido |
| RF-043 | Arquivo privado só é entregue pela aplicação, depois de autenticação e da autorização daquele arquivo. O caminho físico não aparece na resposta. | Definido |

### 2.4. Autorização

| ID | Requisito | Status |
|---|---|---|
| RF-024 | Existem três roles: `Admin`, `Organizer` e `Assistant`. A role `Client` deixa de existir; o cliente usa o link do evento, RF-056. | Substituído pelo RF-111 e RF-113 (SPEC-062): fora o `Admin`, o acesso vem do tipo na conta e do grupo |
| RF-025 | Página privada exige usuário autenticado. | Definido |
| RF-026 | Página administrativa exige a role `Admin`. | Definido |
| RF-027 | Conta com role `Organizer` ou `Assistant` não acessa recurso administrativo. | Definido |
| RF-028 | A autorização é verificada no servidor com `[Authorize]`, roles e policies do ASP.NET Core. Esconder um link na interface não protege a página. | Definido |
| RF-040 | `Admin` é o admin geral: acesso a tudo e a todas as contas. `Organizer` é o comprador do sistema (organiza eventos e dados da própria conta). `Assistant` é subusuário Identity sempre vinculado a um `Organizer`, com o acesso que a dona concede, RF-045. Fornecedor com login não é role. O cliente não tem conta, RF-056. | Substituído pelo RF-110 a RF-113 (SPEC-062); o papel do `Admin` segue igual |
| RF-083 | Dados de negócio da conta (eventos, clientes de contato, modelos, funil, agenda, serviços e fornecedores) pertencem ao tenant do `Organizer`. Outro `Organizer` não os vê. A `Assistant` opera dentro do tenant da dona. | Substituído pelo RF-110 (SPEC-062): o tenant é a conta |
| RF-084 | Toda conta `Client` está vinculada a exatamente um `Organizer`. | Substituído pelo RF-045 (a `Assistant` é a única subconta) |
| RF-085 | O `Organizer` cria e gerencia as contas `Client` da própria conta e define as permissões de módulos e eventos concedidas a cada uma. | Substituído pelo RF-045 |
| RF-086 | O `Client` só acessa recursos do `Organizer` vinculado e somente o que as permissões concederem (flags vistas: convidados, tarefas, anexos, parcelas, RSVP, mapa e contrato). | Substituído pelo RF-056 (o que o cliente vê é escolhido no link do evento) |
| RF-110 | O cadastro público cria o login, a conta (assessoria) e o visitante como Dono. Todos os dados de negócio pertencem à conta; outra conta não os vê. SPEC-062. | Definido |
| RF-111 | Na conta, cada pessoa é Dono ou Membro. A conta pode ter vários Donos (sócios) e sempre tem pelo menos um. SPEC-062. | Definido |
| RF-112 | Só o Dono gerencia a assinatura, a equipe (convidar, remover, mudar tipo e grupo), os grupos de acesso e o menu Configurações. SPEC-062. | Definido |
| RF-113 | O Dono cria grupos de acesso com permissões por módulo (ver, editar, excluir) e alcance de eventos (todos ou só os atribuídos). Cada Membro pertence a um grupo. A conta nasce com os grupos Organizadores e Assistentes. SPEC-062. | Definido |
| RF-114 | O Dono convida pessoas por e-mail como Dono ou Membro de um grupo. O convite vale 7 dias; a pessoa entra com login próprio. SPEC-062. | Definido |
| RF-115 | Trial de 14 dias corridos no cadastro, um por conta e por CPF/CNPJ. O plano de lançamento é o Pro, R$ 179/mês, cobrado pelo Asaas, por cartão ou Pix. Assinar durante o trial não antecipa a primeira cobrança. SPEC-062. | Definido |
| RF-116 | A conta fora do prazo (trial vencido, atraso acima de 5 dias, cancelada após o período pago, estorno) fica bloqueada para todos os membros, sem apagar dados. Os links do cliente continuam funcionando. SPEC-062. | Definido |
| RF-117 | Permissões de grupo são verificadas no servidor a cada ação; mudanças valem na próxima ação do membro. SPEC-062. | Definido |
| RF-118 | O `Admin` mantém o catálogo de planos: código, nome, descrição, valor mensal, público ou não, ativo, e um plano padrão. SPEC-062. | Definido |
| RF-119 | Cada plano libera um conjunto de recursos, com limite mensal opcional. A conta só usa os recursos do seu plano; no trial, os do plano padrão ou do plano atribuído. SPEC-062. | Definido |
| RF-120 | O `Admin` atribui a uma conta qualquer plano (inclusive não público), valor personalizado ou desconto percentual com data de fim opcional. Cada alteração tem motivo e fica no histórico. Mudar o preço de um plano não altera quem já assina. SPEC-062. | Definido |
| RF-121 | A permissão do grupo não libera recurso fora do plano da conta. As duas checagens são feitas no servidor. SPEC-062. | Definido |
| RF-122 | Todo link do cliente exige um código enviado ao e-mail de um cliente do evento antes de abrir. O servidor só entrega os dados do link com sessão válida. SPEC-063. | Definido |
| RF-123 | O código tem 6 dígitos, vale 10 minutos e aceita 5 tentativas. Cada link aceita 1 pedido a cada 2 minutos e, depois de 3 pedidos, espera 15 minutos. A sessão vale 7 dias no mesmo navegador, renova a cada uso e cai quando o link é gerado de novo. Código e sessão são guardados só como hash. SPEC-063. | Definido |
| RF-125 | O `Organizer` (Dono) define a validade padrão das propostas da conta, em dias (1 a 180, padrão 30). Ao enviar ou reenviar, o organizador pode mudar a validade daquela proposta. A proposta vale até o fim do último dia. SPEC-064. | Definido |

### 2.5. Bootstrap do administrador inicial

| ID | Requisito | Status |
|---|---|---|
| RF-029 | Na inicialização, quando o bootstrap está habilitado, a aplicação garante as roles `Admin`, `Organizer` e `Assistant`, cria o administrador inicial se ele ainda não existe e atribui a role `Admin`. | Definido |
| RF-030 | A operação é idempotente: não duplica role nem usuário e não altera a senha de um usuário que já existe. | Definido |
| RF-031 | Se já existir um usuário `Organizer` ou `Assistant` com o e-mail configurado para o administrador, o bootstrap interrompe a operação e não promove esse usuário. | Definido |
| RF-032 | O administrador criado pelo bootstrap consegue entrar sem passar pelo fluxo público de confirmação de e-mail. A confirmação é registrada de forma segura durante o bootstrap. | Definido |
| RF-033 | O bootstrap fica desligado por padrão. Só roda quando `Bootstrap__Enabled` está habilitado. Credencial ausente ou inválida faz a inicialização falhar, sem gravar senha ou segredo em log. | Definido |
| RF-034 | Não existe endpoint público para disparar o bootstrap. Ele não usa `HasData()` do EF Core, senha fixa no código nem seed genérico de usuários. | Definido |

O comportamento detalhado está na seção 8.4.

### 2.6. Domínio de negócio

| ID | Requisito | Status |
|---|---|---|
| RF-035 | O escopo da versão 1.0 é o de [produto-v1.md](produto-v1.md). Só entra no código o que uma spec aprovada descreve: RF Definido sem spec aprovada espera a spec. RF Observado, login de fornecedor, peças de marketplace e o que a spec deixar de fora permanecem fora do código. | Definido |

As fontes são [docs/brief.md](brief.md), [docs/inventario-referencia.md](inventario-referencia.md), os inventários das outras referências e o plano do cliente, consolidados em [docs/produto-v1.md](produto-v1.md) em 18/11/2026. A spec aprovada limita o que entra no código.

### 2.7. Requisitos de domínio (referência e promoção)

Ator “Assessoria” na referência corresponde ao `Organizer` neste produto. Status **Definido** vale para o que as specs 001–028 cobrem e para o que [produto-v1.md](produto-v1.md) trouxe para a 1.0 (revisão de 18/11/2026). O que permanece Observado ou Pendente fica fora do código até nova decisão.

| ID | Nome | Comportamento | Ator | Regras | Depende de | Status |
|---|---|---|---|---|---|---|
| RF-044 | Perfil da assessoria | Cadastro da empresa com nome, responsável, e-mail, CPF ou CNPJ, celular, nascimento, endereço e foto opcional. | Organizer | E-mail da conta não é editável. SPEC-005. | RF-011 | Definido |
| RF-045 | Assistentes | A dona convida a assistente por e-mail; a assistente entra com login próprio (role `Assistant`). Por assistente, a dona marca "pode ver o financeiro" e "vê todos os eventos" ou "só os dela". | Organizer, Assistant | Plano, Pix, contrato da conta, marca e página pública ficam só com a dona. A assistente não convida outra assistente. produto-v1 5.15. | RF-040, RF-102 | Substituído pelo RF-113 e RF-114 (SPEC-062): viram permissões e alcance do grupo |
| RF-046 | Busca global | Campo para buscar eventos ou ferramentas. | Organizer | Não fechado nas specs 001–028. | RF-048 | Observado |
| RF-047 | Notificações | Sino com lista e ação de marcar como lidas. | Organizer | Não fechado nas specs 001–028. | — | Observado |
| RF-048 | Lista de eventos | Abas em andamento, concluído e cancelado; busca; filtros; card; atalhos de resumo. | Organizer | SPEC-002, SPEC-008, SPEC-011 (resumo/atalhos). | RF-049 | Definido |
| RF-049 | Cadastro do evento | Criação curta num modal: tipo e nome obrigatórios; data (digitável), horário, convidados e local opcionais; cliente na mesma tela, existente ou novo com nome e WhatsApp. O pacote escolhido aplica o modelo de tarefas e roteiro. Edição completa com os campos do inventário. | Organizer, Assistant | Modelo não é obrigatório. Valor da assessoria e parcelas ficam no Dinheiro do evento, RF-095, e não na criação. SPEC-002 e SPEC-008. | RF-053 | Definido |
| RF-050 | Home do evento | Contagem, código, atalhos, serviços, pendências. | Organizer | Blocos cobertos pelas specs de evento, tarefa, convidado, serviço e parcela. | RF-048, RF-058, RF-061, RF-063, RF-068 | Definido |
| RF-051 | Equipe do dia | Escalar pessoas da equipe no evento com função e hora de chegada; aviso quando a pessoa já está escalada em outro evento na mesma data; "mandar a escala no WhatsApp" com horários da equipe e dos fornecedores. | Organizer, Assistant | produto-v1 5.15. | RF-102, RF-050 | Definido |
| RF-052 | Agrupar eventos | Rotas de eventos agrupados. | Organizer | Fluxo não aberto. | RF-048 | Pendente |
| RF-053 | Modelo de evento | Biblioteca e editor; aplicar na criação. | Organizer | SPEC-012 e SPEC-008. | — | Definido |
| RF-054 | Outros modelos | Bibliotecas de briefing, roteiro, cronograma, inspiração e mensagem. | Organizer | SPEC-013 a SPEC-017. | RF-069, RF-070, RF-071, RF-072 | Definido |
| RF-055 | Clientes da assessoria | Lista e cadastro de contatos; vínculo no evento. | Organizer | SPEC-006 e SPEC-009. Contato não é conta. | RF-049 | Definido |
| RF-056 | Link do cliente | Link secreto por evento, sem senha, com a marca e a mensagem da cerimonialista e contagem regressiva. A dona marca o que o cliente vê: andamento das tarefas (marcos, não %), parcelas com Pix, fornecedores contratados, convidados, roteiro e fotos; valores podem ficar ocultos. O cliente marca as próprias tarefas. "Ver como o cliente vê". | Cliente, Organizer | Gerar link novo desliga o antigo. Só aparecem tarefas com visibilidade "cliente" ou "compartilhada", RF-061. Nada interno vai junto (observações, comparativos, valores ocultos). Substitui a conta `Client` com flags. produto-v1 5.11. | RF-055, RF-087 | Definido |
| RF-057 | Catálogo de fornecedores | Catálogo, solicitação de dados e serviços da conta. | Organizer | SPEC-018. | — | Definido |
| RF-058 | Serviços e budget | Serviço no evento com fornecedor, tarefas e valor. | Organizer | SPEC-018. | RF-049, RF-057, RF-061 | Definido |
| RF-059 | Negociação | Duas etapas por fornecedor no serviço: Orçamento → Contratado. No contratado, valor e horário de chegada no evento. | Organizer, Assistant | Substitui a trilha de quatro etapas. Contratar o fornecedor conclui a tarefa ligada ao serviço, RF-061. SPEC-018. | RF-058 | Definido |
| RF-060 | Link do fornecedor | Fornecedor completa dados / orçamento / contrato sem conta da assessoria. | Fornecedor | Fora deste corte. | RF-057, RF-059 | Observado (fora do corte) |
| RF-061 | Tarefas | Na aba do evento, lista em tabela (título, prazo, situação, responsáveis e grupo) com filtro de situação. "Nova tarefa" abre o modal de criação; título obrigatório e o restante opcional. Sem criação numa linha e sem grupos de prazo nessa aba. Vários responsáveis (dona, assistente, equipe ou cliente), visibilidade (só eu, cliente, compartilhada), prioridade (baixa, média, alta), checklist, anexos, comentários e vínculo com serviço. Tarefas de todos os eventos com filtros e visões lista, quadro por situação e quadro por dia. | Organizer, Assistant, cliente pelo link | Tocar abre leitura; editar é ação separada. O cliente só vê e marca tarefas com visibilidade "cliente" ou "compartilhada", RF-056. SPEC-003 v3. | RF-049, RF-058 | Definido |
| RF-062 | Redatar tarefas | Ao mudar a data do evento, perguntar se os prazos das tarefas não concluídas se movem junto (mesma diferença em dias). | Organizer, Assistant | SPEC-012 v2, seção 6.6. Concluídas e sem prazo não mudam. | RF-049, RF-061 | Definido |
| RF-063 | Convites e convidados | Convite, convidados, grupos, transfer, importação. | Organizer | SPEC-004 e SPEC-010. | RF-049 | Definido |
| RF-064 | RSVP por link | Link por convite; histórico. | Convidado, Organizer | SPEC-004 e SPEC-010. | RF-063 | Definido |
| RF-065 | RSVP automático | Disparos automáticos em volume. | Organizer | Fora do canal SMTP atual; não fechado. | RF-064, RNF-020 | Observado |
| RF-066 | Mesas | Lista de mesas do evento com nome, lugares e observação; convidados atribuídos; lugares livres e ocupados; filtros "sem mesa" e "só confirmados". | Organizer, Assistant | Lista, sem planta desenhada (planta fica para a 1.1). Substitui o campo solto de mesa da SPEC-010. | RF-063 | Definido |
| RF-067 | Checklist de presença | Portaria / check-in. | Organizer | Não fechado em spec 001–028. | RF-063 | Observado |
| RF-068 | Parcelas do evento | Parcelas por serviço e fornecedor. | Organizer | SPEC-018 (hub e parcelas). | RF-058 | Definido |
| RF-069 | Roteiro | Seções, clonagem, impressão; biblioteca em SPEC-014. | Organizer, Assistant, cliente pelo link | Biblioteca Definida (SPEC-014). Instância no evento em RF-092. | RF-049, RF-054 | Definido |
| RF-070 | Cronograma | Grade e biblioteca (SPEC-015). | Organizer | Biblioteca Definida. | RF-049, RF-054 | Definido |
| RF-071 | Briefing | Modelo e seções (SPEC-013). | Organizer, Assistant, cliente pelo link | Biblioteca Definida. | RF-054 | Definido |
| RF-072 | Inspirações | Galerias (SPEC-016). | Organizer, Assistant, cliente pelo link | Biblioteca Definida. | RF-054 | Definido |
| RF-073 | Anexos | Por fornecedor, serviço, tarefa e observação. | Organizer | Coberto em parte por SPEC-018 e upload técnico; caixa global ainda Observado. | RF-049, DA-035 | Observado |
| RF-074 | Agenda | Vistas mês (grade de calendário), semana, dia e lista; compromisso com título, descrição, início e fim, local, lembrete por e-mail, participantes e anexo; arrastar para remarcar; o evento aparece na agenda. | Organizer, Assistant | Compromisso é marcação genérica, sem tipo. Integração bidirecional com Google fora; feed iCal em RF-090. SPEC-019. | RF-049 | Definido |
| RF-075 | Funil de vendas | Quadro, oportunidades, descarte, lead, contratos, orçamentos, tarefas comerciais e modelos. Estágios configuráveis (nome, cor, ordem), com contratado e descartado fixos; arrastar o cartão entre colunas; data de retorno no cartão; origem do contato em lista fechada mais "outro"; aviso de contato repetido; proposta por link com "aceitar", "tenho dúvidas" e "não vou seguir" e a situação "ainda não foi aberta". | Organizer, Assistant, lead | Rótulo do estágio: "Orçamento enviado". SPEC-020 a SPEC-028. | RF-074 | Definido |
| RF-076 | Financeiro da assessoria | Caixa da empresa separado do evento: recebido e pago no mês, saldo, a receber, a cobrar (atrasadas e próximos 7 dias); movimento do mês; lançamento avulso de despesa ou entrada com categoria, ligado a um evento ou "do cerimonial"; despesas fixas; comissão de fornecedor (BV). | Organizer; Assistant com "pode ver o financeiro" | produto-v1 5.14. | RF-068, RF-095 | Definido |
| RF-077 | Relatórios e impressões | Catálogos do funil (SPEC-024) e relatórios do negócio: eventos no ano, contratado, recebido no ano, ticket médio, eventos por mês e por tipo, recebido por mês, fornecedores mais contratados, fechamento por origem do contato. | Organizer; Assistant com "pode ver o financeiro" para valores | Impressões soltas ficam com cada módulo. | RF-075, RF-076 | Definido |
| RF-078 | Estatísticas de eventos | Aba Estatísticas e resumo. | Organizer | SPEC-011. | RF-048 | Definido |
| RF-079 | Peças da plataforma de referência | VIP Pay, Casar.com, loja, MeLink, indicação. | — | Fora do produto. | — | Observado (fora do corte) |

### 2.8. Tela inicial

Decisão deste produto. A referência abre um painel de menus. Aqui a primeira tela autenticada é a tela **Hoje**, que substitui os dashboards (revisão de 18/11/2026, produto-v1 5.2).

| ID | Requisito | Status |
|---|---|---|
| RF-080 | Depois do login, o `Organizer` e a `Assistant` caem na tela Hoje: saudação com a data e "N coisas pedem você hoje" (ou "Nada pede você hoje"), e cartões de ação somando todos os eventos: tarefas da semana e atrasadas, cobranças a fazer (atrasadas e próximos 7 dias), pagamentos a fornecedores da semana, respostas de convidados e retornos do funil. Cada cartão leva à tela que resolve. Não é uma grade de atalhos; o menu leva aos módulos. | Definido |
| RF-081 | A tela Hoje mostra o próximo evento com contagem de dias e a carteira em tabela: cliente, data, % de tarefas, convidados que responderam e a coluna Atenção (tarefas atrasadas e respostas abaixo do esperado). Uma conta nova vê o checklist de configuração inicial (contrato, Pix, marca, página, equipe), com "pular". | Definido |
| RF-082 | A tela Hoje mostra os números do funil: quantidade e valor por estágio, com os estágios configurados da conta, RF-075. | Definido |

### 2.9. Novos requisitos da versão 1.0

Vindos de [produto-v1.md](produto-v1.md) em 18/11/2026. O "Onde" aponta a seção de lá.

| ID | Nome | Comportamento | Ator | Regras | Onde | Status |
|---|---|---|---|---|---|---|
| RF-087 | Marca da conta | Logo, nome, WhatsApp e cor da cerimonialista, usados no link do cliente, no RSVP e na página pública. | Organizer | Só a dona edita. | 5.1 | Definido |
| RF-088 | Chave Pix | Tipo, chave e CPF/CNPJ do recebedor, usados na cobrança ao cliente e no contrato. | Organizer | Só a dona edita. | 5.1 | Definido |
| RF-089 | Página pública | Página da assessoria com apresentação, cidade, Instagram, tipos de evento, portfólio, depoimentos (RF-101) e botão de orçamento que cria uma oportunidade no funil. | Organizer, visitante | Sem login para o visitante. Só a dona edita. | 5.1 | Definido |
| RF-090 | Feed iCal | Endereço secreto de calendário com eventos e compromissos, para assinar no Google Agenda ou no iPhone; "gerar link novo" desliga o anterior. | Organizer, Assistant | Somente leitura. Não é integração bidirecional. | 5.1, 5.12 | Definido |
| RF-091 | Colar lista de convidados | A cerimonialista cola a lista recebida no WhatsApp e vê uma prévia antes de salvar. A leitura entende "+ marido", "(3 pessoas)", "Família X - 4" e crianças. | Organizer, Assistant | Nada é gravado antes de confirmar a prévia. Foto ou PDF com IA fica para a 1.1. | 5.7 | Definido |
| RF-092 | Roteiro do dia no evento | Roteiro criado do modelo, com horários ajustados ao horário da cerimônia; momentos de cerimônia e recepção; nomes do cortejo por momento; enviar pelo WhatsApp para equipe e fornecedores; imprimir uma folha do dia. | Organizer, Assistant | Separado do cronograma, RF-093. | 5.8 | Definido |
| RF-093 | Cronograma no evento | Cronograma com seções e informações aos fornecedores, criado do modelo. | Organizer, Assistant | Separado do roteiro. | 5.8 | Definido |
| RF-094 | Briefing e inspirações no evento | Briefing criado do modelo, preenchido pela cerimonialista ou pelo cliente pelo link; galerias de inspiração no evento. | Organizer, Assistant, cliente pelo link | Modelos de briefing servem ao evento e ao funil. | 5.8, 5.4 | Definido |
| RF-095 | Recebimentos do cliente | Valor do contrato, entrada e nº de parcelas geram as parcelas do cliente. "Cobrar" abre o WhatsApp com mensagem e Pix, com texto diferente para lembrete, vencimento hoje e atraso. "Recebi" registra valor, forma e data, aceita parcial e tem "Desfazer". Totais Contrato, Recebido, A receber e Resultado. | Organizer; Assistant com "pode ver o financeiro" | Separado do que se paga a fornecedores, RF-068. Sem cobrança automática. | 5.9 | Definido |
| RF-096 | Despesas e comprovantes do evento | Despesas e entradas do evento por categoria; comprovantes e documentos do evento. | Organizer; Assistant com "pode ver o financeiro" | Entram no Resultado do evento. | 5.9 | Definido |
| RF-097 | Pagamentos de todos os eventos | Pagamentos a fornecedores por mês e por fornecedor, de um evento e de todos; exportação do budget para Excel. | Organizer; Assistant com "pode ver o financeiro" | — | 5.9 | Definido |
| RF-098 | Contrato do evento | Um modelo de contrato por conta, com campos (cerimonial, CPF/CNPJ dela, dados do cliente, título, tipo, data, horário, local, convidados, valor, parcelas, data de hoje); "ver como fica" com os campos destacados; contrato preenchido por evento para baixar em PDF; as parcelas vão para RF-095. "Assinar" marca o contrato como assinado e avisa. | Organizer | Assinatura simulada na 1.0, sem serviço externo; a integração entra quando o serviço for escolhido. Um modelo só, não um por pacote. | 5.10 | Definido |
| RF-099 | Aprovações do cliente | A cerimonialista pede um ok (cardápio, decoração, convite); o cliente aprova ou pede ajuste pelo link; ela recebe e-mail. | Organizer, cliente pelo link | — | 5.11 | Definido |
| RF-100 | Código de edição | Com um código, o cliente edita pelo link o que a cerimonialista liberar, sem login. | Cliente pelo link | O código pode ser trocado. | 5.11 | Definido |
| RF-101 | Depoimento | Depois do evento, o cliente deixa um depoimento pelo link; a cerimonialista escolhe se vai para a página pública. | Cliente pelo link, Organizer | — | 5.11 | Definido |
| RF-102 | Equipe | Ficha de cada pessoa da equipe: nome, contato, nascimento, endereço, Pix ou banco e compromissos. | Organizer, Assistant | Pessoa da equipe não tem login; quem tem login é a assistente, RF-045. | 5.15 | Definido |
| RF-103 | Aniversários | Lembretes de aniversário de casamento (meses e anos), do cliente, da equipe e da assistente; situações a enviar, envio em atraso, enviado e ignorado, agrupadas por semana; modelos de mensagem por tipo e envio pelo WhatsApp. | Organizer, Assistant | — | 5.16 | Definido |
| RF-104 | Resumo do dia | Um e-mail por dia, no horário escolhido, só quando há algo: tarefas da semana, cobranças, respostas de convidados e retornos do funil, com links "Recebi" e "Feito". | Organizer, Assistant | Pelo canal de e-mail da seção 8.5. WhatsApp fica para a 1.1. | 5.18 | Definido |
| RF-105 | Salvar evento como modelo | Gera um modelo com as tarefas em "dias antes" da data do evento e o roteiro. | Organizer, Assistant | — | 5.3 | Definido |
| RF-106 | Modelos mais simples | Prazo exibido como "N semanas antes" ou "N meses antes"; importar modelo colando lista ou planilha (linha vira tarefa, título vira grupo); aplicar modelo num evento existente. | Organizer, Assistant | — | 5.4 | Definido |
| RF-107 | Observações do evento | Observações gerais do evento, com modelos de observação. | Organizer, Assistant | Interno: não vai para o link do cliente. | 5.3 | Definido |
| RF-108 | Fornecedor no evento | Mensagens prontas para o WhatsApp do fornecedor (pedir orçamento, pedir dados, enviar escala); "dados para contrato (copiar)"; agrupar, ordenar e ocultar serviços do cliente; comparativo de fornecedores, alinhamentos e observações por fornecedor; mensagem em massa aos contratados. | Organizer, Assistant | Comparativo e observações são internos. | 5.6 | Definido |
| RF-109 | Importar fornecedores | Importar a lista de fornecedores colando texto ou planilha, com prévia. | Organizer, Assistant | — | 5.6 | Definido |

## 3. Requisitos não funcionais

| ID | Requisito | Status |
|---|---|---|
| RNF-001 | Segredos e credenciais ficam fora do controle de versão. Configuração por `appsettings`, variáveis de ambiente, User Secrets em desenvolvimento e arquivo protegido em produção. | Definido |
| RNF-002 | Desenvolvimento e produção usam configurações separadas. | Definido |
| RNF-003 | Os dados de negócio e as contas do Identity persistem no PostgreSQL. O banco só é alcançado pela rede interna do Docker. A porta não fica publicada no host. | Definido |
| RNF-004 | Arquivos enviados ficam no volume `/storage`, fora do build estático do frontend e fora da camada gravável do container. O volume sobrevive à recriação do container. O Caddy não publica esse diretório. | Definido |
| RNF-005 | Erros HTTP são tratados de forma centralizada. A resposta ao usuário não expõe stack trace nem detalhe interno em produção. | Definido |
| RNF-006 | Logging estruturado com `ILogger`, recurso nativo do .NET. Senha, token, senha SMTP, connection string e chave do Data Protection não entram no log. | Definido |
| RNF-007 | Toda entrada relevante é validada no servidor. | Definido |
| RNF-008 | Acesso a banco, disco, SMTP e rede usa operações assíncronas. | Definido |
| RNF-009 | A evolução do schema usa EF Core Migrations. Produção não aplica migration na subida da aplicação. | Definido |
| RNF-010 | A VPS sobe com Docker Compose: API, PostgreSQL e Caddy. O Caddy publica o build estático do Angular. Sem Kubernetes e sem outro orquestrador. | Definido |
| RNF-011 | Senhas de usuário são protegidas exclusivamente pelo ASP.NET Core Identity. | Definido |
| RNF-012 | Endpoints de autenticação têm proteção contra força bruta e abuso, conforme RF-014, RF-016 e RF-017. | Definido |
| RNF-013 | Pedido que altera estado exige o JWT no cabeçalho `Authorization`. Não há cookie de autenticação nem proteção antiforgery de formulário. | Definido |
| RNF-014 | Produção atende somente por HTTPS. O Caddy redireciona HTTP para HTTPS e renova o certificado. | Definido |
| RNF-015 | As chaves do ASP.NET Core Data Protection ficam em volume persistente da VPS, com acesso restrito, e sobrevivem à recriação do container. | Definido |
| RNF-016 | O JWT de acesso dura 8 horas e não se renova sozinho. Não há sliding expiration, refresh token nem lista de revogação. O cliente guarda o token em `sessionStorage`. | Definido |
| RNF-017 | A criação do administrador inicial é idempotente e não registra segredo em log, conforme RF-030 e RF-033. | Definido |
| RNF-018 | Esta versão não implementa backup, ferramenta nem rotina de cópia. Backup e restauração passam a ser obrigatórios antes de dados reais em produção. Até lá, perda de disco significa perda do banco e dos arquivos. | Definido |
| RNF-019 | Testes unitários rodam em todo pull request. Testes de integração rodam no pipeline de validação, com PostgreSQL descartável, antes da aprovação do deploy. Falha em teste obrigatório interrompe o pipeline. Não há meta percentual de cobertura nem teste de navegador nesta versão. | Definido |
| RNF-020 | O e-mail transacional de confirmação e de recuperação sai por SMTP do Outlook (Microsoft 365), com MailKit, na Infrastructure. | Definido |
| RNF-021 | Ao exceder o rate limit, a resposta é HTTP 429. Quando o middleware puder, a resposta inclui `Retry-After`. | Definido |
| RNF-022 | O rate limiting desta versão é em memória e vale para uma instância. Os limites ficam no `appsettings.json` e mudam sem recompilar. Não há Redis nem outro armazenamento distribuído de contagem. | Definido |
| RNF-023 | O IP usado no rate limiting é o do cliente, lido atrás do Caddy. A aplicação só confia em proxies configurados de forma explícita. | Definido |
| RNF-024 | Migration de produção roda por comando explícito no deploy, depois de autorização. Havendo migration pendente sem essa autorização, o deploy para. | Definido |
| RNF-025 | Volumes persistentes guardam os dados do PostgreSQL, os arquivos enviados e as chaves do Data Protection. | Definido |
| RNF-026 | O nome físico do arquivo é gerado no servidor. O nome enviado pelo usuário não entra no caminho. Caminho informado pelo cliente é recusado, o que impede path traversal. | Definido |
| RNF-027 | O binário não entra no PostgreSQL. O banco guarda identificador, nome original sanitizado, nome físico, caminho relativo, MIME validado, tamanho, data de criação e o usuário do upload, quando houver. | Definido |
| RNF-028 | Tamanho, quantidade, total da requisição e formatos de upload são validados no servidor e permanecem configuráveis sem recompilar. O mesmo teto de corpo vale no Caddy e no ASP.NET Core. | Definido |
| RNF-029 | Arquivo vazio, extensão fora da lista, assinatura incompatível com o formato e requisição acima do limite são recusados. A aplicação não confia só no Content-Type do navegador. | Definido |
| RNF-030 | Disco e PostgreSQL não formam uma transação única. Falha depois da gravação remove o arquivo daquela tentativa no mesmo fluxo e registra o erro. Não há job de limpeza nesta versão. | Definido |

Não há meta numérica de disponibilidade, throughput ou latência nesta versão.

Não há cookie de autenticação. DA-019 registra isso.

## 4. Decisões arquiteturais

| ID | Decisão | Status |
|---|---|---|
| DA-001 | A aplicação é um produto com dois processos: a API e o build estático do Angular. Não é microsserviço. A interface não roda dentro do processo da API. | Definido |
| DA-002 | A arquitetura é Clean Architecture simplificada, com quatro projetos .NET de produção em `src/backend/`. A solution `src/backend/aralu.slnx` inclui esses projetos e os testes, e não inclui o frontend. O Angular fica em `src/frontend/`. Os testes ficam em `tests/`, separados em unitário e integração. | Definido |
| DA-003 | A interface é Angular em `src/frontend/`. A API é ASP.NET Core em `src/backend/Project.Api`, com rotas em `/api/v1`. Erro HTTP vai em JSON, com código e mensagem, sem stack trace em produção. Swagger é configurável e fica ligado em desenvolvimento. CORS só libera a origem local do `ng serve`. Em produção a origem é a do Caddy. Não há Razor Pages. | Definido |
| DA-004 | .NET 10 LTS, C#, ASP.NET Core. | Definido |
| DA-005 | PostgreSQL, Entity Framework Core, Code First e Migrations. O provider é Npgsql. | Definido |
| DA-006 | Autenticação com ASP.NET Core Identity para senha, normalização, lockout, roles e tokens de e-mail. A sessão da API é um JWT de acesso. Sem cookie de autenticação, sem refresh token, sem lista de revogação, sem servidor OAuth2 próprio e sem provedor externo de identidade. | Definido |
| DA-007 | Autorização com o sistema nativo do ASP.NET Core, baseada nas roles `Admin`, `Organizer` e `Assistant`. O acesso do cliente pelo link é autorizado pelo token secreto do evento, sem conta Identity. | Definido |
| DA-008 | O Domain não referencia Identity, EF Core nem ASP.NET Core. Nenhuma entidade de domínio herda de `IdentityUser`. | Definido |
| DA-009 | `ApplicationUser`, se um campo extra for realmente necessário, fica na Infrastructure. Enquanto o `IdentityUser` padrão atender, essa classe não será criada. | Definido |
| DA-010 | Login e as operações que o Identity já resolve usam `UserManager` e `SignInManager.CheckPasswordSignIn` nos endpoints de conta da Api. Não haverá serviço só para encapsular essas APIs. A assinatura do JWT fica na Infrastructure, atrás de interface na Application. O logout não invalida o token no servidor. | Definido |
| DA-011 | Usuários e roles não ganham repositório próprio. `UserManager` e `RoleManager` são a API de persistência dessas contas. | Definido |
| DA-012 | Não haverá Generic Repository nem Unit of Work adicional. O `DbContext` já cumpre esses papéis. Repositório específico de um agregado só nasce quando isolar a consulta ou a escrita trouxer clareza real. | Definido |
| DA-013 | Casos de uso ficam na Application, organizados por funcionalidade. Endpoints delegam a regra de negócio para essa camada. Endpoint de negócio não usa `DbContext`. | Definido |
| DA-014 | Não entram CQRS, MediatR, AutoMapper nem biblioteca de abstração sem um problema concreto que o recurso nativo não resolva. As exceções já registradas são MailKit (DA-021) e Testcontainers (DA-042). | Definido |
| DA-015 | Injeção de dependência, logging, Options e `IConfiguration` usam os recursos nativos do ASP.NET Core. | Definido |
| DA-016 | O bootstrap do administrador é um serviço específico da Infrastructure, chamado de forma explícita na inicialização, usando `UserManager` e `RoleManager`. | Definido |
| DA-017 | Arquivos da primeira versão ficam no disco da mesma VPS, em volume Docker. Sem S3, Azure Blob, MinIO ou outro armazenamento externo nesta versão. | Definido |
| DA-018 | A primeira versão não usa microsserviço, barramento de mensagens, fila de e-mail nem cache distribuído. | Definido |
| DA-019 | Não há cookie de autenticação, então `SameSite` não se aplica. O cliente guarda o JWT em `sessionStorage` e envia `Authorization: Bearer`. | Definido |
| DA-020 | Lockout do Identity: 5 falhas e bloqueio de 15 minutos. | Definido |
| DA-021 | E-mail transacional por SMTP do Outlook (Microsoft 365), biblioteca MailKit, implementação na Infrastructure, registrada no contrato de e-mail do Identity. Os casos de uso não conhecem o Outlook. | Definido |
| DA-022 | O envio de e-mail acontece na requisição. Esta versão não cria fila nem worker para isso. | Definido |
| DA-023 | Deploy com Docker Compose na VPS única. Serviços: API ASP.NET Core, PostgreSQL e Caddy. O Caddy publica o build estático do Angular e encaminha `/api` para a API. Sem processo Node, sem SSR e sem service worker. | Definido |
| DA-024 | O Caddy é o reverse proxy, emite e renova o HTTPS e redireciona HTTP para HTTPS. | Definido |
| DA-025 | O PostgreSQL permanece na rede interna do Compose. A porta do banco não é publicada. | Definido |
| DA-026 | Volumes persistentes para dados do PostgreSQL, arquivos enviados e chaves do Data Protection. | Definido |
| DA-027 | Dado não sensível no `appsettings.json`. Segredo em variável de ambiente, User Secrets no desenvolvimento ou arquivo protegido fora do repositório. | Definido |
| DA-028 | Senha com mínimo de 8 caracteres. A política não exige número, maiúscula nem caractere especial. Hash e validação são os do Identity. | Definido |
| DA-029 | JWT de acesso com duração de 8 horas, sem renovação deslizante e sem refresh token. Segredo, issuer, audience e prazo vêm de configuração. | Definido |
| DA-030 | Rate limiting nativo, em memória, por IP, com os limites iniciais da seção 8.6. Resposta 429 e `Retry-After` quando o middleware informar a espera. | Definido |
| DA-031 | Token de recuperação de senha com validade de 1 hora, gerado e validado pelo Identity. | Definido |
| DA-032 | Migration de produção é explícita no deploy, de preferência por script SQL idempotente do EF Core. A aplicação não chama `Database.Migrate()` na inicialização nem ao subir o container. | Definido |
| DA-033 | Backup fica fora desta versão. Vira obrigação antes de dados reais em produção. Nenhuma ferramenta de backup entra agora. | Definido |
| DA-034 | As três roles de Identity são `Admin`, `Organizer` e `Assistant` (revisão de 18/11/2026; a role `Client` saiu). Contato de negócio chamado “cliente” não é conta. Fornecedor com login não entra. | Definido |
| DA-035 | Arquivos ficam em `/storage/{categoria}/{ano}/{mês}/{guid}.{extensão}`, com a raiz configurável. A extensão segue o tipo validado. O nome original só existe no banco, sanitizado. | Definido |
| DA-036 | Metadados do arquivo ficam no PostgreSQL. O conteúdo binário fica só no volume. | Definido |
| DA-037 | Arquivo privado é lido pela aplicação, com autenticação e autorização. O Caddy não serve o volume. A resposta usa o MIME validado, `Content-Disposition: attachment` com o nome sanitizado e `X-Content-Type-Options: nosniff`. | Definido |
| DA-038 | O contrato de armazenamento, quando um caso de uso precisar, fica na Application. A Infrastructure grava e lê com o I/O nativo do .NET. Sem abstração de storage distribuído. | Definido |
| DA-039 | Limites iniciais: imagem 5 MB, documento 10 MB, até 5 arquivos e 50 MB por requisição. Formatos: PDF, JPG/JPEG, PNG e WebP. | Definido |
| DA-040 | Upload usa `IFormFile` e o pipeline nativo do ASP.NET Core. Sem streaming próprio e sem job de limpeza. A gravação evita carregar o arquivo inteiro em um array na memória. | Definido |
| DA-041 | Esta versão não inclui antivírus. O risco de malware fica registrado e precisa ser reavaliado antes de liberar upload de usuário não confiável. | Definido |
| DA-042 | Testes com xUnit. Integração HTTP com `WebApplicationFactory`. PostgreSQL real com Testcontainers e Npgsql. O provider InMemory não valida o comportamento do PostgreSQL. E-mail de teste substitui o SMTP real. | Definido |
| DA-043 | Confirmação de e-mail vale 24 horas e recuperação de senha vale 1 hora. Prazos diferentes usam providers de token do próprio Identity, sem criptografia própria. | Definido |
| DA-044 | A interface usa Angular Material em `src/frontend/`, com componentes standalone. O visual segue `docs/design-system.md` (versão 2), medido na demo pública https://apex-angular.dashboardpack.com: as cores são as da demo, com modo claro e escuro; no modo claro o texto principal é o quase preto da demo (`--gd-foreground`) e rótulo de campo nunca usa o cinza de apoio; a casca, os cartões, as tabelas, os campos e os modais seguem esse documento. O código do template pago não entra no repositório. A casca autenticada tem barra lateral, barra superior e a área principal; abaixo de 960px a barra lateral vira gaveta e aparece a barra inferior. As telas do produto são só as das specs, com textos em português. Formulário, tabela, diálogo e aviso usam o Material. O aviso fica no canto superior, abaixo da barra, e tem fechar. Todo cadastro e toda edição, de qualquer entidade, abrem em modal sobre a tela atual; só Perfil, Ajustes, telas de detalhe e telas públicas são página. O miolo do dashboard continua em cartões e lista. Gráfico não entra enquanto um RF não pedir a série. | Definido |

## 5. Stack tecnológica

| Tema | Escolha | Status |
|---|---|---|
| Linguagem de servidor | C# | Definido |
| Plataforma | .NET 10 LTS | Definido |
| API | ASP.NET Core Web API em `src/backend/Project.Api` | Definido |
| Interface | Angular 22 e Angular Material, build estático | Definido |
| Banco | PostgreSQL | Definido |
| Acesso a dados | Entity Framework Core + Npgsql | Definido |
| Schema | Code First e EF Core Migrations | Definido |
| Contas | ASP.NET Core Identity | Definido |
| Sessão | JWT de acesso, 8 horas, sem refresh | Definido |
| Autorização | Roles `Admin`, `Organizer` e `Assistant` | Definido |
| E-mail | Outlook (Microsoft 365) SMTP + MailKit | Definido |
| Arquitetura | Clean Architecture simplificada | Definido |
| Execução | API e frontend estático na mesma VPS | Definido |
| Hospedagem | Uma VPS, Docker Compose | Definido |
| Proxy | Caddy | Definido |
| Arquivos | Volume local `/storage` na VPS | Definido |
| Testes | xUnit, WebApplicationFactory, Testcontainers | Definido |
| Fora desta versão | Microsserviço, mensageria, fila, Redis, Kubernetes, refresh token, Razor Pages, pacote AdminLTE, template pago de dashboard, OAuth2 próprio, login social, MFA, SSR, backup automatizado, antivírus, object storage, teste de navegador | Definido |

## 6. Organização dos projetos

```text
src/
├── backend/
│   ├── aralu.slnx
│   ├── Project.Api/
│   ├── Project.Application/
│   ├── Project.Domain/
│   └── Project.Infrastructure/
└── frontend/

tests/
├── Project.Tests/
└── Project.IntegrationTests/

docs/
├── brief.md
└── requirements.md
```

A solution fica em `src/backend/aralu.slnx` e tem quatro projetos de produção .NET mais os dois de teste. `src/frontend/` é o Angular e não entra na solution. Os testes são dois porque a suíte unitária não sobe banco e a de integração sobe PostgreSQL descartável. Novo projeto de produção só com justificativa registrada neste documento.

### 6.1. Project.Domain

Camada central. Não depende de nenhum outro projeto da solution.

Contém entidades, value objects quando houver valor real, enums, invariantes e comportamento de negócio.

Modelo rico quando a regra justificar encapsular comportamento na entidade. CRUD sem regra permanece simples, sem abstração em volta.

Não referencia ASP.NET Core, Entity Framework Core, Identity nem PostgreSQL.

### 6.2. Project.Application

Casos de uso e orquestração. Depende só de Domain.

Contém serviços de aplicação, DTOs de entrada e saída, validação de aplicação e interfaces para recursos externos. Contratos de persistência também ficam aqui, e somente quando um caso de uso precisar deles.

Organização preferencial por funcionalidade.

Contrato ligado à identidade do usuário só aparece quando um caso de uso de negócio precisar consultar quem está autenticado. Operações de login, cadastro e senha não passam por um serviço intermediário nesta camada. A assinatura do JWT é recurso externo: a interface fica aqui e a implementação na Infrastructure.

O envio de confirmação e de recuperação usa o contrato de e-mail do Identity. A Application não referencia MailKit nem a configuração SMTP.

Contrato de armazenamento só nasce quando um caso de uso precisar gravar ou ler arquivo. Esse contrato fala em fluxo e metadados, não em caminho absoluto nem em volume Docker.

Não depende de Infrastructure.

### 6.3. Project.Infrastructure

Implementações de recursos externos. Depende de Application e Domain.

Contém `DbContext`, configuração Fluent API, migrations, acesso ao PostgreSQL, leitura e gravação de arquivos no volume, implementações das interfaces da Application, `IdentityDbContext`, a assinatura do JWT, o envio SMTP com MailKit e o bootstrap do administrador.

`ApplicationUser`, se existir, fica aqui.

Esta camada não contém regra de negócio.

### 6.4. Project.Api

ASP.NET Core Web API. Depende de Application e de Infrastructure.

Infrastructure entra aqui para composição: registro de dependências, Identity, JWT, CORS, rate limiting, DbContext, e-mail e bootstrap. Os endpoints de negócio não usam `DbContext` nem tipos concretos de persistência.

Contém endpoints em `/api/v1`, validação de entrada, cadastro, login, logout, confirmação, reenvio e recuperação de senha, middleware, tratamento de erro HTTP e `Program.cs`.

Endpoints ficam finos. A exceção definida é o uso direto de `UserManager` e `SignInManager.CheckPasswordSignIn` nos endpoints de conta.

### 6.5. Testes

`Project.Tests` cobre regras, invariantes, value objects, validação e serviços de aplicação, sem banco, sem rede e sem SMTP real.

`Project.IntegrationTests` cobre EF Core, constraints, migrations, a API, autenticação, autorização e arquivos, com PostgreSQL do Testcontainers e um diretório temporário isolado.

O detalhe está na seção 10.1.

## 7. Regras de dependência

```text
Project.Domain
    não referencia outros projetos

Project.Application
    → Project.Domain

Project.Infrastructure
    → Project.Application
    → Project.Domain

Project.Api
    → Project.Application
    → Project.Infrastructure
```

A seta é referência de compilação. Application não referencia Infrastructure. `src/frontend/` não referencia os projetos .NET.

Interfaces de persistência e de serviços externos são declaradas na Application e implementadas na Infrastructure. O registro concreto acontece no `Program.cs` da Api.

O fluxo de uma requisição de negócio pode percorrer Api, Application e Infrastructure. A dependência de código continua apontando para dentro.

Identity segue a mesma regra: persistência, bootstrap, SMTP e assinatura do JWT na Infrastructure, endpoints de conta na Api, Domain sem referência ao Identity.

### 7.1. O que cada endpoint pode usar

| Endpoint | Pode usar | Não usa |
|---|---|---|
| Cadastro, login, logout, confirmação de e-mail, reenvio, recuperação de senha | `UserManager`, `SignInManager`, `RoleManager` quando a operação for do Identity | Serviço de aplicação criado só para repetir essas APIs; cliente SMTP |
| Demais endpoints | Serviços da Application | `DbContext`, repositório concreto, SQL |

## 8. Autenticação, autorização e sessão

### 8.1. Cadastro, login e senha

Coberto por RF-001 a RF-023 e RF-036 a RF-038.

O hash da senha, a normalização do e-mail e a geração dos tokens de confirmação e de redefinição são os do ASP.NET Core Identity. O JWT de acesso é emitido pela Infrastructure. Não há implementação paralela de senha nem de token de e-mail.

Política inicial de senha, DA-028:

- tamanho mínimo de 8 caracteres;
- número não é obrigatório;
- letra maiúscula não é obrigatória;
- caractere especial não é obrigatório.

A exigência de ao menos uma letra minúscula não foi alterada. O padrão do Identity continua ligado nesse ponto. Ver seção 14.

Confirmação de e-mail antes do login é obrigatória para quem veio do cadastro público. O link vale 24 horas, RF-041. A recuperação de senha continua em 1 hora, DA-031. Os dois prazos usam providers de token do Identity, DA-043. O administrador criado pelo bootstrap é a exceção de confirmação, em RF-032.

### 8.2. Roles

| Role | Quem recebe | Acesso |
|---|---|---|
| `Organizer` | Todo cadastro público | Conta compradora: opera eventos, modelos, funil, agenda e dados do próprio tenant. Não acessa área de `Admin`. |
| `Assistant` | Convite por e-mail feito pelo `Organizer` (não pelo cadastro público) | Subusuário sempre vinculado a um `Organizer`. Opera o tenant da dona com o que ela conceder: financeiro sim ou não, todos os eventos ou só os dela. Plano, Pix, contrato da conta, marca e página pública ficam com a dona (RF-045). |
| `Admin` | Somente o bootstrap, ou um procedimento administrativo futuro explícito | Admin geral: tudo e todas as contas. |

Não há tela em que o próprio usuário eleve o próprio privilégio.

Fornecedor com login não é role (RF-060 fora). O cliente acessa o evento por link sem senha (RF-056) e o convidado responde por link; nenhum dos dois tem conta.

### 8.3. Sessão

| Diretriz | Status |
|---|---|
| JWT de acesso com duração de 8 horas | Definido (DA-029, RNF-016) |
| Sem sliding expiration, sem refresh e sem lista de revogação | Definido (DA-029) |
| Cliente guarda o token em `sessionStorage` e envia `Authorization: Bearer` | Definido (DA-019, RNF-016) |
| Não há cookie de autenticação | Definido (DA-019) |
| HTTPS obrigatório em produção | Definido (RNF-014) |
| Pedido que altera estado exige o Bearer. Não há antiforgery de formulário | Definido (RNF-013) |
| CORS só para a origem local do `ng serve`. Em produção a origem é a do Caddy | Definido (DA-003) |
| Chaves do Data Protection em volume persistente, para os tokens de e-mail do Identity | Definido (RNF-015, DA-026) |

### 8.4. Bootstrap

Configuração por variável de ambiente, ou mecanismo seguro equivalente, nunca por valor real em arquivo versionado:

```text
Bootstrap__Enabled
Bootstrap__AdminEmail
Bootstrap__AdminPassword
```

`Bootstrap__Enabled` permanece desligado, salvo na janela do primeiro deploy.

Quando habilitado, a ordem é:

1. Conferir se e-mail e senha foram informados e se a senha cumpre DA-028. Se faltar ou for inválida, a inicialização falha sem escrever o segredo no log.
2. Criar a role `Admin` se ela não existir.
3. Criar a role `Organizer` se ela não existir.
4. Criar a role `Assistant` se ela não existir.
5. Se não existir usuário com o e-mail configurado, criar o administrador pelo `UserManager`, marcar o e-mail como confirmado e atribuir `Admin`.
6. Se o usuário já existir e já tiver a role `Admin`, não alterar nada. A senha permanece como está.
7. Se o usuário já existir como `Organizer` ou `Assistant` (sem `Admin`), interromper o bootstrap. A resolução é manual.
8. Repetir a inicialização não duplica role nem usuário.

Depois que o administrador entrou pela primeira vez, `Bootstrap__Enabled` volta a desligado. A aplicação não apaga a variável sozinha. Quem opera a VPS desliga.

Restrições já fechadas:

- Sem senha administrativa escrita no repositório ou em `HasData()`.
- Sem endpoint HTTP para rodar o bootstrap.
- Sem redefinir senha administrativa a cada startup.
- Sem promover cadastro público a `Admin`, inclusive o primeiro cadastro.
- Sem framework genérico de seeds. O código deste bootstrap serve só para as três roles e para o primeiro administrador.

### 8.5. E-mail transacional

Definido em DA-021, DA-022, RF-036 e RNF-020.

Servidor: `smtp.office365.com`, porta `587`, STARTTLS, com a caixa business da plataforma no Microsoft 365 (Outlook). A autenticação usa usuário e senha da caixa (SMTP AUTH), configurados uma vez. A aplicação não abre login interativo em tempo de execução. O MailKit usa as credenciais já configuradas.

Não haverá servidor SMTP próprio nem relay autenticado por IP fixo.

O contrato consumido pelo Identity no .NET 10 é `IEmailSender<TUser>`, em `Microsoft.AspNetCore.Identity`. A Infrastructure implementa esse contrato com MailKit e o registra na composição. Não será criada outra abstração de e-mail na Application, e o pacote de UI padrão do Identity não entra só para obter o `IEmailSender` não genérico. Esse contrato do framework cobre confirmação de cadastro e recuperação de senha. Ele não é uma caixa de saída genérica do domínio.

Trocar o Outlook por outro SMTP no futuro altera a configuração e, se a API do provedor mudar, a implementação na Infrastructure. Os casos de uso e os endpoints permanecem.

Configuração não sensível no `appsettings.json`. O arquivo versionado guarda placeholder, não a caixa real:

```json
{
  "Email": {
    "Host": "smtp.office365.com",
    "Port": 587,
    "Username": "contato@seudominio.com",
    "FromAddress": "contato@seudominio.com",
    "FromName": "Minha Aplicação",
    "UseStartTls": true
  }
}
```

A senha fica em `Email__Password`, em User Secrets no desenvolvimento, ou em arquivo protegido fora do repositório. O binding usa Options e `IConfiguration`. Endereço e nome reais de produção podem ser sobrescritos pelas variáveis `Email__Username`, `Email__FromAddress` e `Email__FromName`.

Limites publicados pela Microsoft para o SMTP AUTH do Exchange Online (confirmar no tenant, pois a Microsoft pode alterá-los):

| Limite | Valor |
|---|---|
| Mensagens por minuto, por caixa | 30 |
| Destinatários por dia, por caixa | 10.000 |

Outras restrições que acompanham essa escolha:

- O SMTP AUTH precisa estar habilitado na caixa (Centro de administração do Exchange, "Aplicativos de email" da caixa). Security defaults ou acesso condicional podem bloqueá-lo.
- A Microsoft está retirando a autenticação básica (usuário e senha) do SMTP AUTH no Exchange Online. Se o tenant passar a bloqueá-la, a saída é OAuth2 (XOAUTH2, que o MailKit suporta), o que exige mudança na Infrastructure.
- O remetente efetivo é a conta autenticada. `Email__From` deve ser essa caixa ou um alias dela.
- O limite é da caixa, compartilhado com outros clientes que usem a mesma conta.
- Mensagem considerada suspeita pode ser filtrada ou rejeitada. Configure SPF, DKIM e DMARC no domínio.
- Este canal não serve para disparo em massa, como RSVP para centenas de convidados.

Fonte: [limites do Exchange Online](https://learn.microsoft.com/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365).

### 8.6. Rate limiting

Definido em DA-030, RF-017, RNF-021, RNF-022 e RNF-023.

Limites iniciais, por IP:

| Operação | Limite |
|---|---|
| Cadastro público | 5 requisições por hora |
| Login | 10 requisições por minuto |
| Recuperação de senha | 3 requisições por hora |
| Reenvio de confirmação de e-mail | 3 requisições por hora |

O contador é em memória, de uma instância. Várias pessoas atrás do mesmo endereço, como uma rede de escritório, dividem o mesmo limite. Os números ficam no `appsettings.json` para ajuste sem recompilar. O lockout de 15 minutos continua por conta, separado do limite por IP.

Atrás do Caddy, o IP do cliente vem do cabeçalho encaminhado. A aplicação só aceita esse cabeçalho de proxies colocados na configuração. O restante da internet não pode inventar o IP.

## 9. Padrões de desenvolvimento

Estas regras estão **definidas**.

- Preferir o recurso nativo do ASP.NET Core, do EF Core e do Identity antes de adicionar pacote. As exceções já decididas são MailKit, para SMTP, e Testcontainers, para PostgreSQL real nos testes.
- Injeção de dependência nativa. Interface só quando existir mais de uma implementação real ou quando a camada interna precisar depender de um contrato.
- Logging com `ILogger`. Senha, token, senha SMTP, connection string e chave do Data Protection não entram no log.
- Configuração em `appsettings` por ambiente. Segredo por User Secrets, variável de ambiente ou arquivo protegido.
- Fluent API para o mapeamento das entidades quando a convenção do EF Core não expressar a restrição.
- I/O assíncrono até o banco, o disco e o SMTP.
- Validação no servidor, mesmo quando a tela também validar no navegador.
- Endpoint de negócio fino. Regra de negócio na Application ou no Domain, conforme o tipo da regra. A tela Angular não substitui essa validação.
- Entidade de domínio rica só onde houver invariante. Lista e cadastro simples não ganham camada extra.
- Sem Generic Repository, sem Unit of Work manual, sem repositório de usuário ou role.
- Sem CQRS, MediatR, AutoMapper e sem fila até existir um caso em que o código nativo fique pior de manter.
- A solution permanece nos projetos da seção 6.

## 10. Persistência e migrations

**Definido**, junto com DA-005, DA-012, DA-032 e RNF-024.

- Um `DbContext` de aplicação na Infrastructure, integrado ao Identity por `IdentityDbContext`.
- PostgreSQL como único banco desta versão, acessível só pela rede interna do Compose.
- Migrations versionadas no projeto Infrastructure.
- Consultas e comandos de negócio podem usar o `DbContext` diretamente a partir de um serviço da Infrastructure que implemente um contrato da Application.
- Repositório por agregado só quando a consulta for reutilizada ou quando esconder o EF Core simplificar o caso de uso.
- Arquivos em volume persistente, conforme RNF-004 e DA-026.

Produção não chama `Database.Migrate()` na inicialização e não aplica schema quando o container sobe.

O caminho preferido é o script SQL idempotente:

```bash
dotnet ef migrations script --idempotent
```

O script é revisado antes de rodar em produção. Não haverá ferramenta própria de migration.

Fluxo do deploy quando o schema muda:

1. O pull request é aprovado.
2. A pipeline aponta migrations novas.
3. Quem desenvolve informa que o banco precisa ser atualizado.
4. O deploy recebe aprovação para essa atualização.
5. A migration roda de forma explícita.
6. Se ela terminar bem, a nova versão da aplicação pode ser publicada.
7. Se ela falhar, a publicação para.

Se a pipeline alcançar o banco de destino e encontrar migration pendente sem autorização, o deploy para.

Migration que apaga ou reescreve dado recebe revisão própria. Enquanto RNF-018 valer, não existe cópia para desfazer esse tipo de mudança. Durante a troca de versão, o schema e a aplicação que ainda estiver no ar precisam continuar compatíveis. Por isso a ordem é migration bem-sucedida e só então a publicação.

## 10.1. Arquivos e uploads

Definido em DA-017, DA-035 a DA-041, RF-042, RF-043 e RNF-004, RNF-026 a RNF-030.

Não há S3, Azure Blob nem MinIO. O volume do container é a raiz de armazenamento, configurável no `appsettings.json`. O valor inicial no container é `/storage`.

```text
/storage/
├── documents/
│   └── 2026/
│       └── 11/
│           └── {guid}.pdf
├── images/
│   └── 2026/
│       └── 11/
│           └── {guid}.webp
└── temp/
```

`documents` e `images` ilustram a organização. A categoria real acompanha o caso de uso, quando o domínio existir. Ano e mês são os da gravação. `temp` recebe o arquivo enquanto a validação e a persistência não terminam.

Regras de nome e caminho:

- O nome físico é um GUID mais a extensão do tipo validado.
- O nome original é guardado no banco, sem caminho, sem caractere de controle e sem sequência que atravesse diretório.
- O destino é sempre relativo à raiz configurada. Entrada do usuário não escolhe pasta.
- A gravação final usa criação exclusiva, para não sobrescrever um arquivo existente.
- O diretório não é servido como site e não tem permissão de execução.

Quem pode ver cada arquivo depende do requisito funcional daquele caso. Enquanto isso não existir, a regra técnica é: arquivo privado só sai pela aplicação, para um usuário autenticado e autorizado àquele recurso. A resposta traz o MIME validado, disposição `attachment` com o nome sanitizado e `nosniff`. O corpo não inclui o caminho do volume.

Limites iniciais, todos configuráveis:

| Tipo | Limite |
|---|---|
| Imagem | 5 MB por arquivo |
| Documento | 10 MB por arquivo |
| Quantidade | 5 arquivos por requisição |
| Total da requisição | 50 MB |

Formatos aceitos: PDF, JPG/JPEG, PNG e WebP. Executável, script e arquivo compactado ficam de fora até um requisito funcional pedir outro formato.

A validação no servidor confere tamanho, extensão, arquivo vazio e a assinatura do conteúdo. JPEG, PNG, WebP e PDF são reconhecidos pelo início do arquivo, não pelo cabeçalho que o navegador declara. Extensão e assinatura precisam concordar.

O upload usa `IFormFile`. O arquivo segue para `temp` e só vai para a pasta final depois da validação. O código não copia o conteúdo inteiro para um `byte[]` sem necessidade. O Kestrel e o Caddy usam o mesmo teto de 50 MB para o corpo dessa requisição, também configurável. Se o envelope multipart passar um pouco desse teto, a margem entra na mesma configuração, sem um segundo limite escondido no código.

Disco e banco não commitam juntos. A ordem é gravar o arquivo final, persistir o metadado e, se o banco falhar, apagar o arquivo daquela tentativa no mesmo fluxo e registrar o erro com `ILogger`. Arquivo parcial em `temp` também é removido quando a validação ou a gravação falha. Se o processo morrer no meio, pode sobrar um arquivo sem linha no banco. Esta versão não cria job para varrer isso.

Upload de pessoa não confiável pode trazer malware. Não há antivírus nesta etapa. Antes de liberar essa função para uso real, essa proteção precisa ser avaliada de novo. DA-041.

## 10.2. Testes

Definido em DA-042, DA-002 e RNF-019.

| Suíte | Onde | O que prova |
|---|---|---|
| Unitária | `tests/Project.Tests` | Regra de negócio, invariante, value object, validação e serviço de aplicação com lógica. Também os casos de erro. |
| Integração | `tests/Project.IntegrationTests` | Mapeamento do EF Core, consulta, constraint, migration, fluxo HTTP da API, autenticação, autorização e arquivo. |

A suíte unitária não acessa banco, rede nem SMTP, e cabe em todo pull request. Não se cria teste só para aparecer em métrica de cobertura. Não há percentual obrigatório. O foco é autenticação, autorização, persistência e arquivo.

A suíte de integração sobe PostgreSQL com Testcontainers e usa Npgsql. O banco é descartável e não aponta para desenvolvimento nem produção. `WebApplicationFactory` exercita o HTTP sem um servidor à parte. O provider InMemory do EF Core não substitui esses cenários.

Autenticação que a integração precisa cobrir: cadastro válido (role `Organizer`), e-mail duplicado, login válido e inválido, confirmação de e-mail, recuperação de senha, bloqueio após as tentativas, página administrativa negada ao `Organizer` e ao `Client`, página administrativa permitida ao `Admin` e bootstrap idempotente das três roles. O `IEmailSender<TUser>` dos testes é uma implementação local. Nenhum teste envia mensagem por SMTP real.

Arquivo que a integração precisa cobrir: upload válido, extensão recusada, arquivo acima do limite, arquivo vazio, assinatura incompatível, tentativa de path traversal, acesso sem autorização, falha ao gravar o metadado e limpeza do temporário quando o fluxo quebra. O diretório usado é temporário e exclusivo do teste.

Biblioteca de mock ou de assertion só entra se o xUnit e um dublê simples não derem conta. Essa necessidade ainda não existe.

Não há teste de ponta a ponta com navegador nesta versão.

## 11. Hospedagem

Definido em DA-023, DA-024, DA-025, DA-026 e DA-027.

Uma VPS. Três serviços no Compose:

| Serviço | Função |
|---|---|
| Caddy | Certificado HTTPS, redirecionamento de HTTP para HTTPS, publicação do build estático do Angular, encaminhamento de `/api` para a API e o mesmo teto de corpo dos uploads. Não publica `/storage`. Não sobe processo Node. |
| API ASP.NET Core | Web API, Identity, JWT, rate limiting, SMTP e acesso ao PostgreSQL pela rede interna |
| PostgreSQL | Dados. Sem porta publicada no host |

Volumes que sobrevivem à recriação dos containers: dados do PostgreSQL, arquivos enviados e chaves do Data Protection.

Segredos que não entram no Git: senha SMTP, senha do administrador de bootstrap, connection string com credencial, segredo de assinatura do JWT e qualquer chave privada. Em desenvolvimento, User Secrets. Em produção, variável de ambiente ou arquivo protegido.

## 12. Decisões pendentes

Itens já fechados saíram desta lista. O rastro está na seção 15.

### DP-016. Aprovação dos requisitos de domínio

O catálogo está nas seções 2.7 a 2.9, RF-044 a RF-109. O escopo da 1.0 está em [produto-v1.md](produto-v1.md) e o código segue as specs aprovadas. Roles fechadas: `Admin`, `Organizer` e `Assistant` (RF-024, RF-040, RF-045); o cliente usa link sem senha (RF-056).

Permanecem fora ou Observados: RF-060 (login de fornecedor), RF-079 (marketplace), RF-046, RF-047, RF-052, RF-065, RF-067 (check-in, 1.1) e RF-073 global (pendência 4 do produto-v1). As pendências da seção 10 do produto-v1 seguem abertas.

## 13. Atividades futuras

Não são pendências desta etapa e não entram na implementação agora.

- Estratégia de backup e restauração, obrigatória antes de dados reais em produção, RNF-018 e DA-033.
- Troca do Outlook por outro SMTP quando o volume passar dos limites da seção 8.5. A troca fica na Infrastructure.
- Verificação antimalware, antes de liberar upload de usuário não confiável, DA-041.
- Migração do volume local para object storage, se o disco da VPS deixar de ser suficiente.
- Autenticação multifator.
- Login social.
- Fila ou worker, só se um caso concreto deixar a requisição lenta. E-mail desta versão não justifica.
- Monitoramento além do log nativo.
- Teste de ponta a ponta com navegador, se um fluxo crítico pedir.
- Login de fornecedor, só depois de promover RF-060.

## 14. Conflitos e pontos de atenção

Decisões anteriores que este texto altera ou que precisam de cuidado:

1. **Lockout.** DA-020 deixou de ser a proposta de 5 minutos e passou a ser 15 minutos, definido.
2. **E-mail.** DP-010 estava aberto e bloqueava o primeiro acesso. O canal agora é Outlook (Microsoft 365) SMTP. O cadastro continua dependente desse envio, e a caixa tem o teto da seção 8.5.
3. **Backup.** A pendência de escolher a rotina foi substituída pela decisão de não ter backup nesta versão. O risco de perda total permanece e fica explícito em RNF-018.
4. **Migrations.** A proposta de comando explícito virou DA-032. `Database.Migrate()` na subida deixa de ser opção.
5. **Cookie.** A duração de 8 horas chegou a ser fechada em DA-029 como cookie com sliding expiration. Essa forma foi substituída pelo JWT. O registro da troca está no item 17.
6. **MailKit e a regra de poucos pacotes.** DA-014 evita biblioteca sem necessidade. MailKit entra porque o `SmtpClient` de `System.Net.Mail` não é o caminho recomendado para SMTP. Não entram outros pacotes de e-mail.
7. **Nome** `IEmailSender`**.** No .NET 10 o Identity chama `IEmailSender<TUser>`. A implementação segue esse contrato. Não será adotado o `IEmailSender` não genérico do pacote de UI.
8. **Um prazo para dois tokens.** A recuperação permanece em 1 hora e a confirmação passou a 24 horas, DA-043. O provider padrão do Identity não carrega os dois prazos. A implementação usa dois providers nativos, sem criptografia própria. DP-013 fecha com isso.
9. **Letra minúscula na senha.** DA-028 desliga número, maiúscula e caractere especial. Não fala de minúscula. O padrão do Identity, que exige uma minúscula, permanece. Uma senha de 8 dígitos continua inválida por causa disso.
10. **Roles e o brief.** A assessoria da referência é o `Organizer`. Contato de negócio “cliente” (SPEC-006/009) não é conta. Desde o item 22, a assistente tem login (RF-045) e o cliente usa link sem senha (RF-056). Fornecedor com login fica fora (RF-060). Convidado responde por link, sem conta.
11. **IP compartilhado.** Cinco cadastros por hora no mesmo IP podem atingir uma rede inteira. O número está definido e pode ser ajustado no `appsettings.json`. O lockout por conta não substitui esse limite.
12. **Migration sem backup.** DA-032 pede revisão especial do que é destrutivo. Sem cópia do banco, essa revisão é o único freio.
13. **Api referencia Infrastructure.** Continua intencional para o `Program.cs`. Endpoint de negócio não usa `DbContext` nem MailKit. A regra da seção 7.1 permanece.
14. **Bootstrap sem role** `Admin`**.** Está definido o que fazer se o e-mail não existe, se já é `Admin` e se já é usuário comum. Não está definido o que fazer se o e-mail do bootstrap existe e a role `Admin` foi removida depois. A resolução continua manual.
15. **Quem vê qual arquivo.** A entrega técnica está fechada: autenticação, autorização e resposta segura. A regra de qual usuário acessa qual arquivo continua no domínio, DP-016. Sem esse requisito, não há tela de upload de negócio.
16. **Testcontainers.** A suíte de integração precisa de Docker para subir o PostgreSQL. Isso é intencional: o provider InMemory não reproduz constraint nem migration. A suíte unitária segue sem Docker, para o pull request continuar leve.
17. **Interface e sessão.** A interface deixou de ser Razor Pages com AdminLTE, DA-003 e DA-044, e passou a ser o build estático do Angular, com a API em `Project.Api`. A sessão deixou de ser cookie, RF-012, DA-006, DA-029, RNF-013 e RNF-016, e passou a ser JWT de acesso de 8 horas, sem renovação, sem refresh e sem lista de revogação. DA-019 deixa de propor `SameSite`. O logout do cliente não invalida um token já emitido.
18. **Template da interface.** O Apex foi descartado como dependência porque é pago. DA-044 permanece Angular Material. O item 19 fixa a referência visual.
19. **Referência visual.** A demo pública do Apex passa a ser a fonte de cor e de layout, em `docs/design-system.md`. O código do template continua de fora. Modo claro e escuro fazem parte dessa decisão. Cadastro e edição abrem diálogo sobre a tela atual. A sessão do item 17 permanece.
20. **Casca no celular, contraste, aviso e diálogo.** A barra lateral deixa de ficar sempre aberta em tela estreita: até 959px ela abre por cima e fecha pelo X, pelo toque fora ou ao escolher um item. No modo claro o texto passa a ser preto, no lugar do cinza claro. O aviso continua no alto, à direita, mas desce para logo abaixo da barra, com X para fechar, e deixa de cobrir Sair. O primeiro campo de um diálogo deixa de encostar no título. O detalhe visual fica em `docs/design-system.md` e a decisão continua em DA-044.
21. **Design system versão 2 (18/11/2026).** O design system anterior foi descartado e refeito do zero a partir de nova medição da demo do Apex. Mudanças em relação ao item 20: o texto do modo claro passa de `#000000` ao quase preto da demo (`oklch(0.155 0.015 230)`); o cinza de apoio volta a existir, mas só em texto secundário, nunca em rótulo; o rótulo do campo fica sempre acima da caixa; o modal ganha cabeçalho e rodapé separados por linha e três larguras; no celular entra a barra inferior e o modal encosta embaixo. Todo cadastro e toda edição abrem em modal, inclusive Novo e Editar evento, que deixam de ser rota (`/eventos/novo` e `/eventos/:id/editar` redirecionam). O aviso continua abaixo da barra.
22. **Produto 1.0 (18/11/2026).** O escopo passou do corte das specs 001–028 ([mvp-scope.md](mvp-scope.md)) para [produto-v1.md](produto-v1.md), aprovado pelo usuário com os conflitos da seção 7 de lá. A role `Client` saiu e entrou `Assistant` (RF-024, RF-040, RF-045, DA-007, DA-034, bootstrap da seção 8.4); RF-084 a RF-086 ficam Substituídos. O acesso do cliente passou a ser link sem senha (RF-056). Mudaram de conteúdo: RF-049 (criação curta, modelo não obrigatório, valor depois), RF-051, RF-059 (duas etapas), RF-061, RF-066, RF-074, RF-075, RF-076, RF-077 e RF-080 a RF-082 (tela Hoje no lugar dos dashboards). Entraram RF-087 a RF-109 (seção 2.9). Código já existente que dependa da role `Client`, dos dashboards ou da trilha de quatro etapas continua até a spec revisada de cada bloco ser aprovada e implementada.
23. **Lista de tarefas e um só Novo evento (18/11/2026).** A aba Tarefas do evento deixa a criação numa linha e os grupos de prazo e passa a ser uma tabela, com "Nova tarefa" em modal (SPEC-003 v3, RF-061). A barra superior deixa de ter "Novo evento"; o botão fica no cabeçalho da lista e, no celular, no "+" da barra inferior (SPEC-008 v3, design-system 4.1).
24. **Cliente sem login e link do cliente (22/11/2026).** O cliente não entra na plataforma: o acesso dele é só o link público com token gerado pelo organizador (RF-056). O login aceita apenas `Admin`, `Organizer` e `Assistant`, e o cadastro de cliente perdeu a aba de acesso e as permissões por módulo. A plataforma não é só para casamentos: o link passa de `/casal/<token>` para `/cliente/<token>` e "casal" vira "cliente" em todo contexto genérico. Ver [SPEC-060](specs/060-cliente-sem-login-e-link-do-cliente.md).

## 15. Pendências já resolvidas

| ID antigo | Decisão que o substitui |
|---|---|
| DP-001 | DA-023, Docker Compose |
| DP-002 | DA-024, Caddy |
| DP-003 | DA-033 e RNF-018, sem backup nesta versão |
| DP-007 | DA-022, e-mail na requisição, sem fila |
| DP-008 | DA-032, migration explícita no deploy |
| DP-009 | DA-027, DA-026 e RNF-001, segredos e volumes |
| DP-010 | DA-021 e RNF-020, Outlook SMTP com MailKit |
| DP-011 | DA-030, limites da seção 8.6 |
| DP-012 | DA-028, senha mínima de 8 |
| DP-014 | DA-029, duração de 8 horas. A forma deixou de ser cookie com sliding expiration e passou a ser JWT sem renovação. Ver seção 14, item 17. |
| DP-015 | Seção 13, MFA e login social ficam para o futuro |
| DP-004 | DA-035 e DA-036, árvore `/storage`, GUID e metadados |
| DP-005 | DA-039 e DA-040, limites, formatos e `IFormFile` |
| DP-006 | DA-042 e RNF-019, xUnit, WebApplicationFactory e Testcontainers |
| DP-013 | DA-043 e RF-041, confirmação em 24 horas, com provider distinto da recuperação |
