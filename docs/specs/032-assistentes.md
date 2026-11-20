# 032. Assistentes

**Status: aprovada (20/11/2026).** O código segue esta spec, em três partes (A conta, B permissões, C "só os dela" e responsáveis). O usuário aprovou todas as sugestões da §17, que agora são decisões. Fonte: [produto-v1.md](../produto-v1.md) §5.15 (linha "Assistente com login") e RF-045. Cobre só a parte "assistente" do bloco 13. A ficha da equipe e a equipe do dia (RF-102, RF-051) ficam para outra spec. Cada ponto que os RFs não fecham está na §17, com a decisão.

## 1. Identificador e nome

SPEC-032. Assistentes: convite, login próprio e o que cada uma pode ver.

## 2. Objetivo

A dona da conta divide o trabalho com assistentes sem dividir a senha:

- convida cada assistente por e-mail;
- cada assistente entra com login próprio e trabalha nos dados da conta da dona;
- a dona decide, por assistente, se ela vê o financeiro e se vê todos os eventos ou só os dela;
- a dona pode mudar essas permissões ou tirar o acesso a qualquer momento.

## 3. Requisitos relacionados

- **RF-045:** convite por e-mail, login próprio, "pode ver o financeiro", "vê todos os eventos / só os dela"; plano, Pix, contrato da conta, marca e página pública só com a dona; a assistente não convida outra.
- **RF-024 / RF-040:** a role `Assistant` é subusuário sempre ligado a uma `Organizer`.
- **RF-083:** a assistente opera dentro do tenant da dona.
- **RF-103:** o aniversário da assistente entra nos lembretes, quando o bloco de aniversários existir.
- **Specs que esperam por esta:** SPEC-003 (tarefas do evento), SPEC-007 (Hoje), SPEC-008 (evento), SPEC-012 (modelos), SPEC-029 (dinheiro do evento), SPEC-030 (contrato do evento) e SPEC-031 (funil; parte D, vários responsáveis).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer (dona) | Convidar, editar permissões, reenviar convite e remover assistentes da própria conta. |
| Assistant | Entrar com login próprio e usar a conta da dona dentro das permissões dela (§8). Editar os próprios dados e a própria senha. Não convida, não edita nem remove assistentes. |
| Admin | Vê e gerencia as assistentes de qualquer conta. |
| Outra conta | Não vê as assistentes desta conta. |

## 5. Pré-condições

Dona autenticada (SPEC-001). Canal de e-mail funcionando para o convite (o mesmo da confirmação de cadastro e da redefinição de senha).

## 6. Fluxo principal

### 6.1. Convidar

1. A dona abre a tela Assistentes (§12) e toca em "Convidar assistente".
2. O modal pede nome, e-mail e as duas permissões: "Pode ver o financeiro" (sim/não) e "Eventos que ela vê" (todos / só os dela). Celular e data de nascimento são opcionais (§17, ponto 10).
3. Ao salvar, a assistente aparece na lista como **Convite enviado** e recebe um e-mail com o link para criar a senha.
4. O link do convite vale por um tempo (§17, ponto 7). Vencido, a dona usa "Reenviar convite".

### 6.2. Primeiro acesso

1. A assistente abre o link, cria a senha e entra.
2. A situação dela passa a **Ativa**.
3. A casca mostra o nome da empresa da dona e só os menus que ela pode usar (§8).

### 6.3. Mudar permissões

1. Na lista, a dona abre a assistente e muda as permissões.
2. A mudança vale a partir do próximo pedido da assistente, sem precisar sair e entrar de novo (§17, ponto 9).

### 6.4. Escolher os eventos dela

1. Para a assistente marcada como "só os dela", um evento é dela quando a dona a marca no evento (§17, ponto 1).
2. O cadastro do evento (SPEC-008) ganha o campo "Assistentes do evento", com as assistentes ativas da conta.
3. A assistente com "só os dela" vê, nas telas Eventos, Tarefas, Hoje e Agenda, só os eventos em que está marcada.

### 6.5. Remover

1. A dona toca em "Remover acesso" e confirma.
2. A assistente perde o acesso no próximo pedido. Se estiver com a tela aberta, cai na tela de entrar com o aviso "Seu acesso foi removido".
3. O que ela criou continua na conta. As tarefas em que ela era responsável seguem a §17, ponto 8.
4. O e-mail fica livre para um novo convite (desta ou de outra conta).

### 6.6. Responsáveis

1. Os seletores de responsável passam a listar a dona e as assistentes ativas: tarefas do evento (SPEC-003) e tarefas comerciais (SPEC-023, pela SPEC-031 parte D).
2. A assistente removida some do seletor; o nome dela continua nas tarefas antigas (§17, ponto 8).

## 7. Fluxos alternativos

- **E-mail que já tem conta** (dona, admin ou assistente de outra conta): o convite não é criado e o modal avisa "Este e-mail já pertence a outra conta."
- **E-mail que já é assistente desta conta:** o modal avisa e oferece "Reenviar convite".
- **Assistente tenta abrir uma tela que não pode** (por endereço direto): vê "Você não tem acesso a esta área" e um link para Hoje.
- **Evento sem nenhuma assistente marcada:** só a dona e as assistentes com "todos os eventos" o veem.
- **Assistente "só os dela" sem nenhum evento:** a tela Eventos mostra "Nenhum evento liberado para você. Fale com a dona da conta."
- **A dona muda a assistente de "todos" para "só os dela":** a assistente passa a ver só os eventos em que está marcada; nada é apagado.

## 8. Regras de negócio

Cada linha aponta o RF. O que não está no RF vem da §17 (decidido).

| Área | Assistente | Fonte |
|---|---|---|
| Plano, Pix, contrato da conta, marca, página pública, dados da empresa (tela Perfil) | Não vê | RF-045 |
| Tela Assistentes (convidar, permissões, remover) | Não vê | RF-045 |
| Eventos (lista, cadastro, resumo, convidados, tarefas, roteiro, fornecedores do evento, anexos) | Todos ou só os dela, conforme a permissão | RF-045 |
| Dinheiro do evento, Pagamentos, cartões financeiros da Hoje, financeiro da empresa | Só com "pode ver o financeiro" | RF-045, SPEC-029, SPEC-007 |
| Valor do contrato e parcelas no resumo do evento | Só com "pode ver o financeiro" | RF-045, SPEC-008 |
| Contratos no evento (ler e enviar ao cliente) | Só com "pode ver o financeiro" | SPEC-030 |
| Tela Contratos (modelos de contrato da conta) | Não vê | RF-045 ("contrato da conta") |
| Clientes, fornecedores, modelos (evento, briefing, roteiro, cronograma, inspirações, mensagens) | Vê e edita; valores só com financeiro | §17, ponto 2 |
| Agenda | Compromissos da conta para todas; eventos conforme a permissão | §17, ponto 4 |
| Funil (quadro, arrastar, retorno, orçamentos, proposta por link, contratos e tarefas do funil, relatórios) | Usa tudo, sem "só os dela"; valores comerciais aparecem | SPEC-031 §4 |
| Gerenciar estágios do funil | Não | SPEC-031 §17, ponto 2 |
| Excluir de vez (evento, cliente, fornecedor, lead) | Só o que ela mesma criou (tarefa, lead, orçamento); evento, cliente e fornecedor não | §17, ponto 6 |
| Convidar outra assistente | Não | RF-045 |

Outras regras:

- A assistente pertence a uma só conta. O e-mail dela não pode ser de outra conta (RF-040).
- Tudo que a assistente grava fica na conta da dona (RF-083).
- A assistente nunca vê dados de outra conta.
- Sem limite de assistentes por conta na 1.0.

## 9. Validações

- **Nome:** obrigatório, de 1 a 100 caracteres.
- **E-mail:** obrigatório, formato válido, não pode pertencer a outra conta.
- **Celular:** opcional, mesma máscara do cliente.
- **Nascimento:** opcional, data no passado.
- **Permissões:** as duas são obrigatórias no convite (o modal já vem com "não" no financeiro e "todos os eventos").

## 10. Estados

- **Assistente:** Convite enviado → Ativa → Removida. Convite enviado → Removida (a dona cancela antes do primeiro acesso).
- **Convite:** válido → vencido (reenviar gera outro e invalida o anterior).

## 11. Dados necessários

- **Assistente:** conta da dona, nome, e-mail, celular, nascimento, "pode ver o financeiro", "eventos: todos ou só os dela", situação, data do convite, data do primeiro acesso, data da remoção.
- **Evento:** lista de assistentes marcadas.
- **Responsável da tarefa:** passa a poder apontar uma assistente.

## 12. Interface

- **Tela Assistentes** (só para a dona; lugar no menu em §17, ponto 12): lista com nome, e-mail, situação, "Financeiro: sim/não", "Eventos: todos / só os dela" e ações (editar, reenviar convite, remover). Cadastro e edição em modal, com Angular Material e os tokens do tema.
- **Cadastro do evento:** campo "Assistentes do evento" (seleção múltipla).
- **Casca da assistente:** só os menus permitidos. No topo, o nome da empresa da dona. Menu do usuário com "Minha conta" (nome, celular, nascimento, trocar senha) e "Sair".
- **Lista de eventos e tarefas da assistente "só os dela":** sem aviso extra; simplesmente só aparecem os eventos dela.
- **Hoje da assistente sem financeiro:** os cartões financeiros não aparecem (§17, ponto 13).

## 13. Erros

- **E-mail de outra conta:** "Este e-mail já pertence a outra conta."
- **Falha no envio do convite:** a assistente fica salva como "Convite enviado" e a tela mostra "Não foi possível enviar o e-mail. Tente reenviar."
- **Link de convite vencido ou já usado:** "Este convite venceu. Peça um novo à dona da conta."
- **Acesso a área proibida:** "Você não tem acesso a esta área."
- **Acesso removido:** "Seu acesso foi removido."

## 14. Critérios de aceite

1. A dona convida uma assistente; ela recebe o e-mail, cria a senha e entra vendo o nome da empresa da dona.
2. A assistente não vê Perfil, Pix, Contratos (modelos da conta), marca, página pública nem a tela Assistentes, nem por endereço direto.
3. Sem "pode ver o financeiro", a assistente não vê Dinheiro do evento, Pagamentos, valor do contrato, parcelas nem os cartões financeiros da Hoje; com a permissão, vê.
4. Com "só os dela", a assistente vê só os eventos em que está marcada, em Eventos, Tarefas, Hoje e Agenda.
5. Mudar a permissão vale no próximo pedido, sem sair e entrar.
6. Remover o acesso faz a assistente cair na tela de entrar no próximo pedido; o que ela criou continua na conta.
7. Um e-mail de outra conta não pode ser convidado.
8. Os seletores de responsável listam a dona e as assistentes ativas.
9. Outra conta não vê as assistentes desta conta, e a assistente não vê nada de outra conta.

## 15. Cenários de teste

- **Convite:** convidar, abrir o link, criar senha, entrar; link vencido; reenviar invalida o anterior; e-mail de outra conta; e-mail já convidado nesta conta.
- **Permissões:** assistente com e sem financeiro em Dinheiro, Pagamentos, resumo do evento e Hoje; com "todos" e com "só os dela" em Eventos, Tarefas, Hoje e Agenda; endereço direto para Perfil e Contratos.
- **Mudança:** trocar de "todos" para "só os dela" com a assistente logada; tirar o financeiro com a assistente logada.
- **Remoção:** remover com a assistente logada; tarefas em que ela era responsável; convidar de novo o mesmo e-mail.
- **Isolamento:** duas contas, cada uma com uma assistente.

## 16. Dependências

- SPEC-001 (conta e login), SPEC-008 (evento), SPEC-003 (responsáveis da tarefa), SPEC-007 (Hoje), SPEC-029 (dinheiro), SPEC-030 (contratos).
- Canal de e-mail (o mesmo já usado na confirmação de cadastro).
- Depois desta spec: SPEC-031 parte D (vários responsáveis nas tarefas comerciais).

## 17. Premissas e pontos não definidos

Decididos em 20/11/2026: o usuário aprovou todas as sugestões. A decisão de cada ponto está entre parênteses.

1. **Quando um evento é "dela"?** (Decidido: Quando a dona a marca no campo "Assistentes do evento". Evento criado por uma assistente "só os dela" já nasce com ela marcada, para não sumir da tela dela.)
2. **Clientes, fornecedores e modelos:** a assistente vê e edita? (Decidido: Vê e edita clientes, fornecedores e modelos de evento, briefing, roteiro, cronograma, inspirações e mensagens, sem depender de "só os dela". O valor dos fornecedores e dos serviços aparece só com "pode ver o financeiro".)
3. **Contratos no evento (SPEC-030):** a assistente lê e envia ao cliente? (Decidido: Só com "pode ver o financeiro", porque o contrato traz valor e parcelas.)
4. **Agenda:** a agenda é da conta ou de cada pessoa? (Decidido: Os compromissos são da conta e todas veem; os eventos na agenda seguem "todos / só os dela".)
5. **Funil:** a assistente usa o funil? Vê os valores? (Decidido: Usa o funil inteiro, como diz a SPEC-031 §4, sem "só os dela", porque lead ainda não tem dona. Os valores comerciais (proposta e orçamento) aparecem mesmo sem financeiro; "financeiro" é o dinheiro que entra e sai, não o valor da venda.)
6. **Excluir de vez:** a assistente pode? (Decidido: Pode excluir tarefas, leads, orçamentos e itens que ela mesma criou; não pode excluir evento, cliente nem fornecedor. Cancelar e concluir evento pode.)
7. **Validade do convite.** (Decidido: 7 dias. Reenviar gera um link novo e invalida o anterior.)
8. **Tarefas da assistente removida.** (Decidido: A tarefa continua com o nome dela e o selo "removida"; as tarefas abertas aparecem no card de pendências da Hoje da dona para ela trocar o responsável. Nada muda sozinho.)
9. **Quando a mudança de permissão vale.** (Decidido: No próximo pedido, sem sair e entrar.)
10. **Dados da assistente.** (Decidido: Nome e e-mail obrigatórios; celular e nascimento opcionais, para o aniversário (RF-103). A própria assistente edita nome, celular, nascimento e senha em "Minha conta"; o e-mail só a dona troca, reenviando o convite.)
11. **Limite de assistentes por conta.** (Decidido: Sem limite na 1.0. O limite entra com o plano, quando existir.)
12. **Onde fica a tela Assistentes.** (Decidido: Item "Assistentes" no grupo Principal do menu, logo abaixo de Perfil, só para a dona. Quando a spec de equipe existir, vira uma aba da tela Equipe.)
13. **Hoje sem financeiro (SPEC-007 §17, ponto 4):** ocultar os cartões ou mostrar zero? (Decidido: Ocultar.)
14. **A dona vê o que cada assistente fez?** (Decidido: Não nesta versão. O registro de quem fez o quê fica para depois.)
15. **Contas `Client` antigas.** A role `Client` deixou de existir (RF-024). (Decidido: Esta spec não mexe no acesso do casal; a retirada do `Client` entra na spec do link do casal, RF-056.)

## 18. Como ficou no código (20/11/2026)

Implementada em três partes (A conta, B permissões, C "só os dela" e responsáveis), com migration `Assistentes`. O que a spec não detalhava, ou que ficou mais restrito, e o que ainda falta:

1. **Login:** a assistente é uma conta Identity com role `Assistant` e `OrganizerId` da dona, mais uma linha na tabela `Assistentes` (nome, permissões, situação). Remover apaga o login (o e-mail fica livre) e mantém a linha como "Removida", para o nome continuar nas tarefas.
2. **Convite:** link `/convite-assistente` com token próprio de 7 dias. Reenviar troca o carimbo de segurança e invalida o link anterior. Se o e-mail muda enquanto o convite está pendente, o convite é reenviado.
3. **Permissões a cada pedido:** um middleware lê a situação e as duas permissões da assistente no banco em cada pedido. Removida: 401 "Seu acesso foi removido." e o frontend volta para a tela de entrar com o aviso.
4. **Fechado para a assistente (403):** Perfil, Assistentes (gestão), Contratos da conta (modelos), estágios do funil (PUT) e exclusão de fornecedor e de serviço da conta. Financeiro (Dinheiro do evento, Pagamentos, Budget, contratos do evento e dos modelos) só com "pode ver o financeiro".
5. **Sem a permissão financeira:** resumo do evento sem valores, evento sem orçamento estimado, fornecedor sem faixa de preço, Hoje sem cobranças nem pagamentos (o servidor zera e a tela oculta os cartões), abas Dinheiro e Contratos e menu Pagamentos ocultos.
6. **Só os dela:** tabela `EventosAssistentes`. Filtro nas listas de Eventos, Tarefas, Hoje e Agenda; rotas de evento, tarefa, convite e convidado de outro evento respondem 404. O evento criado por uma assistente já nasce com ela marcada. A dona marca as assistentes no modal "Editar evento".
7. **Responsáveis:** o seletor da tarefa do evento lista a dona, o casal e as assistentes ativas; assistente removida continua na tarefa com o selo "(removida)".
8. **Minha conta:** a assistente edita nome, celular, nascimento e senha; o menu mostra "Assistente de <empresa>".

Ainda falta, com as decisões do usuário (20/11/2026). **Cada passo roda em uma sessão própria, sem conferir no navegador** (só build e testes). Uma sessão nova deve ler só esta seção e o código apontado. Os passos são independentes; ordem sugerida: 1, 2, 4, 3. Ao terminar um passo: rodar os testes, trocar `[ ]` por `[x]` aqui, atualizar o Passo 1 de [proximas-acoes.md](../proximas-acoes.md) e commitar na `main`.

Código de apoio (backend em `src/backend`, testes em `tests`):

- Permissões: `Project.Api/Conta/AssistenteEndpoints.cs` (`PodeVerFinanceiro`, `AplicarPermissoes`, claims) e `EscopoAssistente.cs` (`Restrito`, `AssistenteId`, `LiberadosAsync`).
- Rotas do negócio: `Project.Api/Negocio/NegocioEndpoints.cs`, `DinheiroEndpoints.cs` (Pagamentos e Hoje) e `ContratoEndpoints.cs`.
- Testes de integração (precisam do Docker): `Project.IntegrationTests/Negocio/AssistentesFluxoTests.cs` é o modelo de estilo.
- Comandos: `dotnet test tests/Project.Tests`, `dotnet test tests/Project.IntegrationTests`, `npm --prefix src/frontend run build`, `cd src/frontend && npx ng test --watch=false`. Migration nova no projeto `Project.Infrastructure` (as anteriores estão em `Persistencia/Migrations`).

### [x] Passo 1. Excluir o que ela criou (§17, ponto 6)

*Decidido:* guardar o autor e liberar a exclusão só do que é dela.

- **Hoje:** as rotas `MapDelete` de `/oportunidades/{id}`, `/orcamentos-funil/{id}`, `/contratos-funil/{id}` e `/tarefas-funil/{id}` em `NegocioEndpoints.cs` (linhas ~128 a 166) exigem `SoOrganizer`.
- **Fazer:**
  1. Campo `CriadoPor` (texto com o id do usuário, aceita nulo) em `Oportunidade`, `OrcamentoFunil`, `ContratoFunil` e `TarefaFunil` (`Project.Domain/Funil`), mapeamento em `Persistencia/Mapa.cs` e migration `AutoriaDoFunil`.
  2. Preencher `CriadoPor` ao criar, com o usuário logado (dona ou assistente).
  3. Trocar `SoOrganizer` por `Papeis.Equipe` nas quatro rotas. A dona exclui tudo; a assistente só se `CriadoPor` for o id dela, senão 403. Itens antigos, sem autor, só a dona exclui.
  4. Frontend: botão de excluir para a assistente só nos itens dela (a resposta da API traz um indicador, por exemplo `podeExcluir`). Telas em `src/frontend/src/app/pages/oportunidades`, `orcamentos-funil`, `contratos-funil` e `tarefas-funil`.
- **Não muda:** evento, cliente e fornecedor continuam sem exclusão para a assistente.
- **Como ficou (20/11/2026):** em vez de `podeExcluir`, as leituras trazem `criadoPor` e `/conta/area` traz `usuarioId`; o frontend decide o botão (`AuthService.podeExcluirDoFunil`). A exclusão responde 200 (como as demais), não 204. Leads do formulário público ficam sem autor (só a dona exclui).
- **Testes de integração:** a assistente exclui o que criou (204); não exclui o da dona nem o antigo sem autor (403); a dona exclui os dois; outra conta continua com 404.

### [x] Passo 2. Pendências da Hoje (§17, ponto 8)

*Decidido:* card só na Hoje da dona, com as tarefas abertas cujo responsável é assistente removida, e troca de responsável ali mesmo.

- **Hoje:** `HojeServico` (`Project.Application/Negocio/HojeServico.cs`), rota `/api/v1/hoje` em `DinheiroEndpoints.cs` e tela em `src/frontend/src/app/pages/hoje`. O seletor de responsáveis compartilhado é `shared/responsaveis.ts`.
- **Fazer:**
  1. A resposta da Hoje ganha a lista `tarefasSemResponsavelAtivo` (evento, tarefa, prazo, nome da assistente removida), só para a dona e só com tarefas abertas (não concluídas nem canceladas), do evento e do funil.
  2. Card na tela, escondido quando a lista está vazia; cada linha tem o seletor de responsável (dona e assistentes ativas), que usa a rota de troca de responsável que a tarefa já tem. A tarefa sai do card ao trocar.
- **Como ficou (20/11/2026):** `HojeLeitura.TarefasSemResponsavelAtivo` (origem Evento ou Funil, id, título, contexto, prazo, nome da assistente), preenchida só quando o usuário é a dona (`comPendencias`). A tarefa entra se qualquer responsável for assistente removida; a troca (PUT da tarefa, com o pedido remontado no frontend por `trocarResponsavelRemovido`) tira as removidas e põe a escolhida. Sem teste de unidade do `HojeServico` (não existe fake de `IDadosHoje`); a cobertura é de integração.
- **Testes:** unidade do `HojeServico` com a lista; integração: remover a assistente com tarefa aberta, a Hoje da dona traz a tarefa, a da assistente não traz, e trocar o responsável tira do card.

### [ ] Passo 3. Admin vê as assistentes (§4)

*Decidido:* só consulta, sem editar, convidar nem remover.

- **Fazer:** rota `GET` do Admin com as assistentes de uma conta (nome, e-mail, situação e as duas permissões) e a lista na tela do Admin (`src/frontend/src/app/pages/admin`), por exemplo ao abrir a conta. Ver como o Admin lista contas hoje (`ContaEndpoints.cs`) e seguir o mesmo padrão.
- **Testes de integração:** o Admin lê as assistentes de qualquer conta; dona e assistente recebem 403 nessa rota.

### [x] Passo 4. "Só os dela" em Pagamentos e Estatísticas (§6.4)

*Decidido:* filtrar as duas telas pelos eventos liberados.

- **Hoje:** `Pagamentos` (`DinheiroEndpoints.cs`, rota `/pagamentos`) e `Estatisticas` (`NegocioEndpoints.cs`, rota `/eventos/estatisticas`) não filtram. Eventos, Tarefas, Hoje e Agenda já usam `EscopoAssistente.LiberadosAsync` (exemplos em `NegocioEndpoints.cs` ~558, ~779 e ~1210).
- **Fazer:** nas duas rotas, quando `LiberadosAsync` devolver um conjunto, restringir eventos, parcelas, pagamentos e totais a ele; os totais devem bater com a lista. Se as estatísticas incluem dados sem evento (funil, clientes), deixar como estão e anotar aqui.
- **Como ficou (20/11/2026):** `Pagamentos` filtra a lista por `EventoId` no `DinheiroServico`; as seis consultas de contagem do `EstatisticasServico` (`DadosEf`) ganharam o parâmetro `liberados`, então total, situações, por mês, rankings e tarefas da semana batem com os eventos marcados. Nada ficou sem filtro: todos os dados das Estatísticas são ligados a evento.
- **Testes de integração:** assistente "só os dela" com financeiro vê só os pagamentos e as estatísticas dos eventos marcados; com "todos" vê tudo.
