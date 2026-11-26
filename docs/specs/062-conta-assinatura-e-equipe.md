# 062. Conta, assinatura e equipe

**Status: aprovada (26/11/2026).** Decisões do dono do projeto em 25 e 26/11/2026: trial de 14 dias sem renovação, plano único de R$ 179/mês, cartão e Pix pelo Asaas, tolerância de 5 dias no atraso, links do cliente seguem funcionando com a conta bloqueada, sócios como vários Donos, acesso dos membros por grupos com permissões por módulo, e só o Dono acessa Configurações. O modelo de dados de referência está em [docs/banco](../banco/plano-implementacao.md). Em 26/11/2026 entrou também: o Admin da plataforma mantém planos com preço e recursos, e atribui plano, valor ou desconto a cada conta. Esta spec tem quatro partes: **A** conta e trial, **B** assinatura, **C** equipe e grupos, **D** planos e recursos (Admin).

## 1. Identificador e nome

SPEC-062. Conta, assinatura e equipe: do primeiro cadastro do cerimonialista à equipe com acessos por grupo.

## 2. Objetivo

- O cerimonialista se cadastra, usa tudo por 14 dias sem pagar e assina para continuar.
- Ninguém usa a plataforma de graça por mais de 14 dias.
- A conta é da empresa (a assessoria), não de uma pessoa: pode ter sócios e uma equipe.
- O Dono decide, por grupo, o que cada membro da equipe vê e faz.
- O Admin da plataforma cria planos (públicos ou não), define o que cada um libera e enquadra contas em planos, valores ou descontos especiais.

## 3. Requisitos relacionados

- **Novos (§16):** RF-110 a RF-121.
- **Substituídos por esta spec:** RF-024, RF-040, RF-045 e RF-083 (ver §16).
- **Mantidos:** RF-001 a RF-023 e RF-036 a RF-041 (cadastro, confirmação de e-mail, login, senha, limites); RF-025 a RF-028 (autorização no servidor); RF-044 (perfil da assessoria); RF-056 (link do cliente).
- **Ajusta:** [SPEC-001](001-autenticacao-e-conta.md) (o cadastro passa a criar a conta e o trial) e [SPEC-032](032-assistentes.md) (assistentes viram membros com grupo).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Visitante | Cadastrar-se e começar o trial. |
| Dono | Tudo na conta. Só ele: assinatura, equipe (convidar, remover, mudar tipo e grupo), grupos de acesso e o menu Configurações. A conta pode ter mais de um Dono (sócios). |
| Membro | O que o grupo dele permite (§9). Nunca acessa Configurações. |
| Admin | Como hoje (RF-026, RF-040): área administrativa e todas as contas. Mantém o catálogo de planos e seus recursos, atribui plano a uma conta, dá valor personalizado ou desconto e estende o trial. |
| Cliente do evento | Não é membro e não entra na plataforma. Usa só o link do evento (RF-056). |
| Asaas | Gera as cobranças e avisa a plataforma do que acontece com elas. |
| Sistema | Controla prazos, bloqueia, envia e-mails. |

## 5. Pré-condições

- Cadastro, confirmação de e-mail e login funcionando como na SPEC-001.
- Conta no Asaas configurada no ambiente: sandbox no staging, produção no main.

## 6. Fluxo principal

### Parte A. Cadastro e trial
1. O visitante clica em "Começar teste grátis", informa nome, e-mail e senha e aceita os termos de uso.
2. O sistema cria, de uma vez: o login, a conta (assessoria), o visitante como **Dono** dessa conta, o trial de 14 dias corridos e os dois grupos padrão (§9).
3. O sistema registra a data e a versão dos termos aceitos.
4. O e-mail é confirmado como na SPEC-001, e o Dono faz o primeiro login.
5. Durante o trial, uma barra no topo mostra os dias restantes e o botão "Assinar".
6. O Dono preenche o perfil da assessoria (RF-044) e usa todos os módulos, sem limite.
7. Nos dias 11, 13 e 14 do trial, o Dono recebe e-mail avisando que o teste está acabando.

### Parte B. Assinatura
1. O Dono clica em "Assinar" e vê os planos **públicos** com preço e recursos. No lançamento, só o Pro (R$ 179/mês). Se o Admin já enquadrou a conta num plano, valor ou desconto (Parte D), ele aparece no lugar.
2. Informa o CPF ou CNPJ e o nome de cobrança, e escolhe **cartão** ou **Pix**.
3. Paga na página de pagamento do Asaas.
4. Se assinou **durante o trial**, a primeira cobrança vence no último dia do trial: ele não perde os dias restantes.
5. Se assinou **depois do trial**, a primeira cobrança vence no dia.
6. Com o pagamento confirmado pelo Asaas, a conta fica **ativa**, a barra some e o Dono recebe e-mail de confirmação.
7. Todo mês o Asaas cobra automaticamente o valor da conta (o do plano, ou o personalizado, ou com desconto).
8. Em **Configurações → Assinatura**, o Dono vê a situação, o próximo vencimento e as faturas com o link de pagamento, troca a forma de pagamento e cancela.

### Parte C. Equipe e grupos
1. Em **Configurações → Equipe**, o Dono convida uma pessoa por e-mail, escolhendo o tipo (**Dono** ou **Membro**) e, para Membro, o grupo.
2. A pessoa recebe o e-mail, abre o convite, cria a senha e entra na conta.
3. Em **Configurações → Grupos**, o Dono cria, edita e apaga grupos, escolhendo as permissões de cada um (§9).
4. O Dono pode mudar o tipo ou o grupo de qualquer pessoa, ou removê-la. A mudança vale a partir da próxima ação dela, sem precisar sair e entrar de novo.

### Parte D. Planos e recursos (Admin da plataforma)
1. Na área administrativa, em **Planos**, o Admin cria um plano com: código, nome, descrição, valor mensal, se é **público** (o Dono pode escolher ao assinar) e se está ativo.
2. Para cada plano, marca os **recursos** que ele libera e, quando o recurso tem consumo, o limite por mês (por exemplo, minutos de ligação com IA).
3. Um plano é o **padrão**: é o do trial e o oferecido primeiro. No lançamento: Pro, R$ 179/mês, público e padrão.
4. Na lista de contas, o Admin abre uma conta e pode:
   - trocar o plano dela, inclusive para um plano não público (ex.: "Fundadores");
   - dar um **valor personalizado** fixo;
   - dar um **desconto percentual**, com ou sem data de fim;
   - estender o trial.
5. Cada alteração pede um motivo e fica no histórico da conta: quem fez, quando, de quanto para quanto.
6. Se a conta já assina, o novo valor passa a valer na próxima cobrança do Asaas. A cobrança já gerada não muda.
7. Durante o trial, a conta usa os recursos do plano padrão, ou do plano em que o Admin a enquadrou.

## 7. Fluxos alternativos

- **Trial acaba sem assinatura:** no 15º dia, a conta fica **bloqueada**. Todos (Donos e Membros) só veem a tela "Seu teste acabou". O Dono vê o botão "Assinar"; o Membro vê "Fale com o responsável pela conta". Nenhum dado é apagado.
- **Documento que já usou trial:** se o CPF/CNPJ informado na assinatura já esteve em outra conta que assinou, a cobrança vence no dia, mesmo que esta conta ainda esteja em trial.
- **Pagamento em atraso:** a conta segue liberada por **5 dias** depois do vencimento, e o Dono recebe e-mail no 1º e no 4º dia. No 6º dia, a conta é bloqueada até o pagamento ser confirmado.
- **Cancelamento:** a conta segue liberada até o fim do período já pago e depois é bloqueada. O Dono pode assinar de novo, sem trial.
- **Estorno ou contestação do pagamento:** a conta é bloqueada.
- **Bloqueio e link do cliente:** com a conta bloqueada, os links dos clientes dos eventos **continuam funcionando**.
- **Desbloqueio:** ao confirmar um pagamento, a conta volta a ficar ativa com todos os dados.
- **Último Dono:** a conta sempre tem pelo menos um Dono. O último Dono não pode sair, ser removido nem virar Membro.
- **Convite expirado:** o convite vale 7 dias. Depois disso, o Dono reenvia.
- **E-mail já cadastrado:** se a pessoa convidada já tem login na plataforma, ela aceita o convite com esse login. (Se ela pode estar em mais de uma conta é pendência, §17.)
- **Grupo com membros:** não é possível apagar um grupo enquanto houver membros nele. A tela pede para mover os membros antes.
- **Admin estende o trial:** o Admin muda a data de fim do trial de uma conta (cortesia ou suporte).
- **Recurso fora do plano:** o Dono e os Membros veem o recurso marcado como do plano superior, com "Disponível no plano X". O Dono vê o convite para falar sobre o upgrade; a ação é recusada pelo servidor.
- **Limite do mês atingido:** o recurso para até virar o mês, e o Dono recebe aviso ao chegar em 80% e em 100%.
- **Admin muda o preço de um plano:** vale para assinaturas novas. As contas que já assinam seguem com o valor delas até o Admin aplicar o novo valor conta a conta.
- **Admin desativa um plano:** ele some da escolha do Dono. As contas que já estão nele continuam.
- **Desconto com data de fim:** na primeira cobrança depois da data, o valor volta ao do plano, e o Dono recebe aviso 7 dias antes.
- **Troca de plano pelo próprio Dono:** fora desta versão. Upgrade e downgrade são feitos pelo Admin (pendência, §17).

## 8. Regras

| # | Regra | RF |
|---|---|---|
| R1 | Todo cadastro público cria uma conta com o visitante como Dono e um trial de 14 dias corridos. | RF-110, RF-115 |
| R2 | Não existe segundo trial: nem na mesma conta, nem em outra conta com o mesmo CPF/CNPJ. | RF-115 |
| R3 | Todos os dados de negócio pertencem à conta. Outra conta nunca os vê. | RF-110 |
| R4 | A conta pode ter vários Donos e sempre tem pelo menos um. | RF-111 |
| R5 | Só o Dono acessa assinatura, equipe, grupos e Configurações. | RF-112 |
| R6 | O Membro faz só o que o grupo dele permite. A permissão é verificada no servidor; esconder o menu não basta. | RF-113, RF-117 |
| R7 | A conta está liberada quando: em trial dentro do prazo; ativa; em atraso até 5 dias depois do vencimento; ou cancelada até o fim do período pago. Fora disso, está bloqueada para todos. | RF-116 |
| R8 | Bloqueio nunca apaga dados. | RF-116 |
| R9 | Links do cliente funcionam com a conta bloqueada. | RF-116 |
| R10 | A cobrança é feita pelo Asaas, por cartão ou Pix, no valor da conta: o do plano, o personalizado ou o do plano com desconto. | RF-115, RF-120 |
| R12 | Cada conta tem um plano. O plano define os recursos que a conta pode usar; o grupo define quem, dentro da conta, usa. As duas checagens valem juntas. | RF-119, RF-121 |
| R13 | Só o Admin cria planos, atribui plano não público, dá valor personalizado ou desconto. Toda alteração tem motivo e fica no histórico. | RF-118, RF-120 |
| R14 | Mudar o preço de um plano não muda o valor de quem já assina. | RF-120 |
| R11 | A situação da assinatura muda pelos avisos do Asaas e pelo controle diário de prazos, nunca por ação do Membro. | RF-115, RF-116 |

## 9. Grupos e permissões

- Cada Membro pertence a **um** grupo. O Dono não pertence a grupo: pode tudo.
- Um grupo tem nome, as permissões por módulo e o alcance de eventos.
- **Permissões por módulo**, em três níveis independentes: **ver**, **editar** e **excluir**. Editar ou excluir sem ver não é permitido.

| Módulo | O que cobre |
|---|---|
| Clientes | Cadastro de clientes. |
| Eventos | Dados do evento, roteiro, cronograma, inspirações, observações. |
| Convidados | Convites, convidados, RSVP, portaria. |
| Tarefas | Tarefas e checklists do evento. |
| Agenda | Minha agenda e compromissos. |
| Funil | Oportunidades, briefings, tarefas do funil. |
| Orçamentos e contratos | Propostas, contratos e parcelas com o cliente. |
| Financeiro | Valores, parcelas, recebimentos, pagamentos a fornecedores e relatórios financeiros. |
| Fornecedores | Cadastro e contratação de fornecedores. |
| Modelos | Biblioteca de modelos. |

- **Alcance de eventos:** "todos os eventos da conta" ou "só os eventos em que estou atribuído". Vale para todos os módulos ligados a evento.
- **Grupos criados com a conta**, que o Dono pode editar ou apagar:
  - **Organizadores:** todos os módulos com ver, editar e excluir; todos os eventos.
  - **Assistentes:** ver e editar em Eventos, Convidados, Tarefas e Agenda; sem Financeiro, Funil, Orçamentos e contratos; só os eventos atribuídos.
- Sem a permissão de ver, o módulo some do menu. Uma ação sem permissão é recusada pelo servidor com uma mensagem que diz o que falta.
- **Recursos do plano** ficam acima dos grupos: um grupo não dá acesso a recurso que o plano da conta não libera. Os recursos já previstos, para planos futuros: ligações com IA, mensagens com IA e integrações. A lista exata de recursos e limites de cada plano é definida pelo Admin; os recursos em si serão especificados quando forem construídos.

## 10. Validações

- CPF ou CNPJ válido (dígitos verificadores) na assinatura.
- E-mail válido no convite. Não é possível convidar quem já é membro desta conta.
- Nome de grupo obrigatório, até 60 caracteres, único na conta.
- Plano: código único, nome obrigatório, valor maior ou igual a zero. Sempre existe exatamente um plano padrão, e ele é público e ativo.
- Valor personalizado maior ou igual a zero. Desconto entre 1% e 100%. Data de fim do desconto no futuro.
- Motivo obrigatório em toda alteração de plano, valor ou desconto.

## 11. Estados

**Assinatura da conta**

| Estado | Liberada? | Sai para |
|---|---|---|
| Trial | Sim, até o fim do trial. | Ativa (pagamento confirmado) · Expirada (fim do trial). |
| Ativa | Sim. | Em atraso (cobrança vencida) · Cancelada (Dono cancela) · Bloqueada (estorno). |
| Em atraso | Sim, até 5 dias depois do vencimento. | Ativa (pagamento confirmado) · Bloqueada (6º dia). |
| Cancelada | Sim, até o fim do período pago. | Bloqueada (fim do período) · Ativa (assina e paga de novo). |
| Expirada / Bloqueada | Não. | Ativa (assina e paga). |

**Convite de membro:** Pendente → Aceito, ou Pendente → Expirado (7 dias) → Pendente (reenvio).

## 12. Dados

Comportamento, não estrutura. A plataforma guarda o catálogo de planos com preço, visibilidade e recursos (com limite opcional). A conta guarda: dono(s), membros com tipo e grupo, grupos com permissões, situação da assinatura com as datas de trial, de vencimento e do período pago, as faturas, o aceite dos termos, os documentos que já usaram trial, o plano atual, o valor personalizado ou o desconto com data de fim, e o histórico de alterações feitas pelo Admin. O CPF/CNPJ de cobrança é o do perfil da assessoria (RF-044).

## 13. Interface

- **Barra de trial** no topo: "Faltam N dias do seu teste · Assinar" (o botão só aparece para o Dono).
- **Tela de conta bloqueada**, com mensagem diferente para Dono e Membro.
- **Menu Configurações**, visível só para o Dono, com: Assinatura, Equipe, Grupos. Outros itens: pendência (§17).
- **Configurações → Assinatura:** situação, próximo vencimento, forma de pagamento, faturas, trocar forma de pagamento, cancelar (com confirmação na própria tela).
- **Configurações → Equipe:** lista com nome, e-mail, tipo, grupo e situação do convite; convidar; mudar tipo ou grupo; remover; reenviar convite.
- **Configurações → Grupos:** lista de grupos com número de membros; editor com a grade módulo × ver/editar/excluir e o alcance de eventos.
- **Aceite de convite:** página pública com o nome da assessoria, criação de senha ou entrada com login existente.
- **Escolha de plano** (ao assinar): cartões dos planos públicos com preço e recursos; se a conta tem plano ou valor definido pelo Admin, só ele aparece.
- **Admin → Planos:** lista com nome, valor, público, ativo e número de contas; editor com dados do plano e a lista de recursos com limite.
- **Admin → Contas → conta:** plano atual, valor cobrado, desconto e data de fim, situação, trial; ações trocar plano, valor personalizado, desconto, estender trial; histórico de alterações.
- **Recurso fora do plano:** o recurso aparece com o selo do plano que o libera.

## 14. Erros

| Situação | Mensagem |
|---|---|
| Membro tenta ação sem permissão | "Você não tem permissão para <ação> em <módulo>. Fale com o responsável pela conta." |
| Conta bloqueada | Tela de bloqueio (§13), em qualquer página. |
| Documento inválido | "Confira o CPF ou CNPJ informado." |
| Pagamento recusado no Asaas | A página do Asaas informa; a conta segue no estado em que estava. |
| Remover ou rebaixar o último Dono | "A conta precisa ter pelo menos um dono." |
| Apagar grupo com membros | "Mova os N membros deste grupo antes de apagá-lo." |
| Convite expirado | "Este convite expirou. Peça um novo ao responsável pela conta." |
| Recurso fora do plano | "Este recurso está disponível no plano <plano>." |
| Limite do mês atingido | "Você usou todo o limite de <recurso> deste mês. Ele volta em <data>." |
| Admin tenta desativar ou tirar o público do plano padrão | "Escolha outro plano padrão antes." |

## 15. Critérios de aceite e testes

| # | Condição | Resultado esperado |
|---|---|---|
| T1 | Visitante conclui o cadastro. | Existe conta com ele como Dono, trial de 14 dias e os grupos Organizadores e Assistentes. |
| T2 | Conta no 15º dia sem assinatura. | Dono e Membros veem a tela de bloqueio; nenhum dado some. |
| T3 | Dono assina no 5º dia de trial e paga. | Primeira cobrança vence no 14º dia; conta fica ativa. |
| T4 | Assinatura com CPF/CNPJ que já assinou em outra conta. | Cobrança vence no dia. |
| T5 | Cobrança vencida há 5 dias. | Conta liberada. No 6º dia, bloqueada. |
| T6 | Pagamento confirmado com a conta bloqueada. | Conta ativa com todos os dados. |
| T7 | Dono cancela no meio do mês pago. | Liberada até o fim do período; depois, bloqueada. |
| T8 | Conta bloqueada, cliente abre o link do evento. | O link funciona normalmente. |
| T9 | Membro do grupo Assistentes abre o Financeiro. | O menu não mostra; o acesso direto é recusado pelo servidor. |
| T10 | Membro com "só eventos atribuídos" lista eventos. | Vê só os eventos em que está atribuído. |
| T11 | Dono tira "ver Financeiro" do grupo de um Membro logado. | Na próxima ação, o Membro já não acessa o Financeiro. |
| T12 | Último Dono tenta sair ou virar Membro. | A ação é recusada. |
| T13 | Dono convida um sócio como Dono. | O sócio entra e acessa Configurações. |
| T14 | Membro tenta abrir Configurações. | Não vê o menu; o acesso direto é recusado. |
| T15 | Membro da conta A tenta ler um registro da conta B. | Recusado como inexistente. |
| T16 | O mesmo aviso do Asaas chega duas vezes. | A situação da conta muda uma vez só. |
| T17 | Admin cria o plano "Fundadores", não público, e enquadra uma conta. | O Dono vê só esse plano ao assinar; outras contas não o veem. |
| T18 | Admin dá 30% de desconto até 31/03 numa conta que assina o Pro. | Próxima cobrança: R$ 125,30; a primeira depois de 31/03 volta a R$ 179; aviso 7 dias antes. |
| T19 | Admin muda o Pro para R$ 199. | Conta nova assina por R$ 199; conta que já assinava segue em R$ 179. |
| T20 | Conta no Pro tenta usar um recurso só do plano superior. | Recurso aparece com o selo do plano; a ação é recusada pelo servidor. |
| T21 | Grupo tem a permissão, mas o plano não libera o recurso. | Recusado. |
| T22 | Admin troca o plano de uma conta. | O histórico mostra quem, quando, de qual para qual plano e o motivo. |

## 16. Requisitos novos e substituídos

Registrados no `requirements.md` em 26/11/2026, na aprovação desta spec.

| ID | Requisito |
|---|---|
| RF-110 | O cadastro público cria o login, a conta (assessoria) e o visitante como Dono. Todos os dados de negócio pertencem à conta; outra conta não os vê. |
| RF-111 | Na conta, cada pessoa é Dono ou Membro. A conta pode ter vários Donos (sócios) e sempre tem pelo menos um. |
| RF-112 | Só o Dono gerencia a assinatura, a equipe (convidar, remover, mudar tipo e grupo), os grupos de acesso e o menu Configurações. |
| RF-113 | O Dono cria grupos de acesso com permissões por módulo (ver, editar, excluir) e alcance de eventos (todos ou só os atribuídos). Cada Membro pertence a um grupo. A conta nasce com os grupos Organizadores e Assistentes. |
| RF-114 | O Dono convida pessoas por e-mail como Dono ou Membro de um grupo. O convite vale 7 dias; a pessoa entra com login próprio. |
| RF-115 | Trial de 14 dias corridos no cadastro, um por conta e por CPF/CNPJ. O plano de lançamento é o Pro, R$ 179/mês, cobrado pelo Asaas, por cartão ou Pix. Assinar durante o trial não antecipa a primeira cobrança. |
| RF-116 | A conta fora do prazo (trial vencido, atraso acima de 5 dias, cancelada após o período pago, estorno) fica bloqueada para todos os membros, sem apagar dados. Os links do cliente continuam funcionando. |
| RF-117 | Permissões de grupo são verificadas no servidor a cada ação; mudanças valem na próxima ação do membro. |
| RF-118 | O Admin mantém o catálogo de planos: código, nome, descrição, valor mensal, público ou não, ativo, e um plano padrão. |
| RF-119 | Cada plano libera um conjunto de recursos, com limite mensal opcional. A conta só usa os recursos do seu plano; no trial, os do plano padrão ou do plano atribuído. |
| RF-120 | O Admin atribui a uma conta qualquer plano (inclusive não público), valor personalizado ou desconto percentual com data de fim opcional. Cada alteração tem motivo e fica no histórico. Mudar o preço de um plano não altera quem já assina. |
| RF-121 | A permissão do grupo não libera recurso fora do plano da conta. As duas checagens são feitas no servidor. |

| Substituído | Por |
|---|---|
| RF-024 (três roles: Admin, Organizer, Assistant) | RF-111 e RF-113: fora o Admin, o acesso vem do tipo na conta e do grupo. |
| RF-040 (definição das roles) | RF-110 a RF-113. |
| RF-045 (assistentes com "ver financeiro" e "só os dela") | RF-113 e RF-114: viram permissões e alcance do grupo. |
| RF-083 (tenant do Organizer) | RF-110: o tenant é a conta. |

## 17. Dependências e pendências

**Dependências:** SPEC-001 (cadastro e login), SPEC-005 (perfil da assessoria), SPEC-032 (convite de assistente, que este fluxo generaliza), RF-056 (link do cliente).

**Pendências:**
1. **Pessoa em mais de uma conta:** um login pode ser membro de duas assessorias? Se sim, o login precisa de uma escolha de conta. Até decidir, cada login pertence a uma conta só.
2. **Outros itens de Configurações** além de Assinatura, Equipe e Grupos: a levantar.
3. **Textos dos e-mails** (boas-vindas, avisos de trial, confirmação de pagamento, atraso, cancelamento): a escrever.
4. **Termos de uso e política de privacidade:** conteúdo a fornecer.
5. **Nota fiscal da assinatura:** emitir pelo Asaas ou não. Decisão com o contador.
6. **Contas criadas antes desta spec** (staging): serão recriadas, o sistema não foi lançado.
7. **Upgrade e downgrade pelo próprio Dono:** nesta versão só o Admin troca o plano. Quando o Dono puder trocar, falta definir a cobrança proporcional (pró-rata) e o que acontece com dados de recursos que o plano novo não tem.
8. **Recursos de IA e integrações:** cada um terá spec própria quando for construído (o que faz, como mede consumo, limites).
9. **Planos anuais:** fora desta versão; o catálogo é só mensal.
