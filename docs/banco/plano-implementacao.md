# Plano de implementação: contas, membros, integridade e SaaS

**Status: base da SPEC-062 aprovada (26/11/2026).** Fonte de comportamento: [docs/specs/062-conta-assinatura-e-equipe.md](../specs/062-conta-assinatura-e-equipe.md). Em conflito, a spec vence. RF: RF-110 a RF-121. Modelo de dados de referência: explorador (`docs/banco/explorador/`, visão **Proposta**), gerado de `docs/banco/fonte/build.js` e `dec.js`.

**Premissa: o sistema não foi lançado.** Não há dados de produção a preservar. Staging pode ser recriado. Não há migração de dados nem conversão de colunas: o banco é redesenhado e recriado.

**Branch:** `feat/spec-062` a partir de `staging`. Um commit por fase. Sem push nem PR sem pedido explícito.

## O que muda, em uma frase por tema

| Tema | Hoje | Depois |
|---|---|---|
| Conta | O usuário Organizer é a conta: `ContaId` guarda o id dele. | `Contas` nasce no cadastro. Todo `ContaId` é `uuid` com FK para `Contas`. |
| Equipe | Só assistentes, ligadas por `AspNetUsers.OrganizerId`. | `MembrosConta` com tipo **Dono** ou **Membro**. Membro tem `GrupoId`; Dono não tem grupo e pode tudo. Saem `PodeVerFinanceiro` e `VeSomenteSeusEventos` / `SomenteDela`. |
| Grupos | Não existem. | `GruposAcesso` (Nome, VeTodosEventos, Padrao) e `PermissoesGrupo` (GrupoId, Modulo, Ver, Editar, Excluir). Lista de módulos no código (SPEC-062 §9). Toda conta nasce com **Organizadores** e **Assistentes**. |
| Isolamento | Cada consulta lembra do `Where(ContaId == …)`. | Filtro global no EF por conta, mais teste automático de isolamento. Um login pertence a **uma conta só** (pendência 1 da spec, decisão provisória). |
| Tenant | 32 de 73 tabelas têm `ContaId`; 12 sem índice. | 71 tabelas com `ContaId` e índice começando por ele. |
| Integridade | 39 referências sem FK. | 34 FKs novas, 2 trocadas para `MembrosConta`, 3 colunas polimórficas divididas, 1 mantida de propósito. |
| Planos | Não existem. | `Planos`, `RecursosPlano`, `AlteracoesAssinatura`. Lista de recursos no código. Admin mantém planos e atribui plano/valor/desconto por conta. |
| Cobrança | Não existe. | Trial de 14 dias; Assinaturas com `PlanoId`, `ValorPersonalizado`, `DescontoPercentual`, `DescontoAte`; Asaas. Checagem do plano vale **junto** com a do grupo (RF-121). |
| Link do cliente | Token no link. | Token + código por e-mail ou SMS (pode ser ligado por link). Spec própria / Fase 5. |

## Migrations: recomeçar do zero

O sistema não foi lançado; dados do staging podem ser perdidos.

1. Ajustar todas as entidades e o `Mapa.cs` para o modelo novo (incluindo assinatura e planos).
2. Apagar a pasta `Persistencia/Migrations` e gerar **uma migration inicial** limpa.
3. Regerar o `deploy/schema.sql` a partir dela.
4. Recriar os bancos locais e o de homologação (VPS), e rodar o bootstrap de novo.

Ganho: o schema fica legível, sem `ALTER` de colunas que já não existem, e a revisão do banco passa a ser a leitura de um arquivo só.

## Fases

Cada fase é um commit (e, depois, um PR se pedido). Ordem obrigatória: Fase 1 antes de qualquer mudança de schema.

### Fase 1: base de isolamento (sem mudar comportamento)

1. **Teste de isolamento** em `tests/Project.IntegrationTests`: cria duas contas e confere que a conta B recebe 404 ou lista vazia em cada grupo de endpoints da conta A. Cobre T15. Protege todas as fases seguintes.
2. Centralizar a descoberta da conta. Hoje a função `Conta(usuario)` / `ComConta` está repetida em 6 arquivos (`NegocioEndpoints`, `ContratoEndpoints`, `DinheiroEndpoints`, `LinkClienteEndpoints`, `PortariaEndpoints`, `AssistenteEndpoints`). Ela vira um único `IContaAtual` em `Project.Application/Conta`, com implementação HTTP na Api. Semântica atual mantida: claim `organizer_id` se presente, senão `NameIdentifier`. ContaId continua `string` nesta fase.

### Fase 2: modelo novo do banco (commit grande, guiado pelo compilador)

Tudo o que mexe em schema entra junto, para gerar a migration inicial uma vez só.

**Contas, equipe e grupos**
- Entidades `Conta`, `MembroConta` (enum/tipo: **Dono** | **Membro**), `GrupoAcesso`, `PermissaoGrupo`, `EventoMembro`.
- Membro exige `GrupoId`. Dono não tem grupo.
- Saem `Assistente`, `EventosAssistentes`, `ApplicationUser.OrganizerId`, `PodeVerFinanceiro`, `VeSomenteSeusEventos` / `SomenteDela`.
- Toda conta nova nasce com grupos **Organizadores** e **Assistentes** e permissões da SPEC-062 §9 (código).

**Planos e assinatura (schema)**
- Entidades `Plano`, `RecursoPlano`, `Assinatura` (com `PlanoId`, `ValorPersonalizado`, `DescontoPercentual`, `DescontoAte`), `CobrancaAssinatura`, `EventoWebhookAsaas`, `DocumentoTrial`, `AlteracaoAssinatura`.
- Lista de recursos do plano no código (RF-119); a lista de módulos de grupo no código (§9).

**Tenant**
- `ContaId` vira `Guid` em todas as 71 entidades com tenant, com FK `RESTRICT` para `Contas`. As 37 filhas ganham a propriedade, e o código preenche com o `ContaId` do pai ao criar.
- Os índices marcados no explorador, configurados no `Mapa.cs`.
- Troca mecânica: cerca de 200 usos de `.ContaId` e as assinaturas `string contaId` dos serviços passam a `Guid`.

**Integridade**
- As 34 FKs com o `ON DELETE` marcado no explorador.
- `Tarefa.ResponsavelMembroId` e `ComentarioTarefa.AutorMembroId` (FK para `MembrosConta`).
- Responsáveis de tarefa, de tarefa do funil e de item de checklist: `MembroId` / `FornecedorId` / `ClienteId`, com um `CHECK` que exige exatamente um preenchido.
- Remover `ServicoEvento.FornecedorContaId`.
- Renomear `Vinculos` para `ClienteEventos`.

**Filtro global**
- `HasQueryFilter(x => x.ContaId == contaAtual.Id)` em toda entidade com tenant (via `IContaAtual`).
- Endpoints públicos (link do cliente, portaria, RSVP, proposta) acham o registro pelo token com `IgnoreQueryFilters()` e só leem dentro da conta desse registro. Cada um ganha teste próprio.
- Os `Where(ContaId == …)` manuais saem, já que o filtro e o teste de isolamento cobrem.

**Migration**: apagar as antigas, gerar a inicial (com tabelas de assinatura e planos) e regerar o `deploy/schema.sql`.

**Execução em lotes (definido em 26/11/2026, ao retomar no Claude Code).** A fase fica em vários commits, cada um com build e testes verdes, para não deixar a branch quebrada entre uma sessão e outra:

| Lote | Conteúdo |
|---|---|
| 2.1 | Migrations do zero (uma `Inicial` regerada a cada lote) + `ContaId` `string` → `Guid` em entidades, serviços e endpoints. Mesma semântica: o id da conta continua sendo o id do usuário dono, agora como uuid. |
| 2.2 | Tabela `Contas` + FK `RESTRICT` de todo `ContaId`. O cadastro e o bootstrap criam a conta com o mesmo id do usuário. |
| 2.3 | `ContaId` nas 37 tabelas filhas, preenchido automaticamente no `SaveChanges` a partir da conta do pedido; índices por conta. |
| 2.4 | Filtro global por conta. Endpoints públicos definem a conta a partir do token antes de ler. Saem os `Where(ContaId == …)` manuais. |
| 2.5 | As 34 FKs, o rename `Vinculos` → `ClienteEventos`, a remoção de `FornecedorContaId` e a divisão das colunas polimórficas de responsável. |
| 2.6 | Schema das tabelas novas sem fluxo ainda: `Planos`, `RecursosPlano`, `Assinaturas`, `CobrancasAssinatura`, `EventosWebhookAsaas`, `DocumentosTrial`, `AlteracoesAssinatura`. |

**Mudança de ordem em relação ao texto acima:** a troca de `Assistentes` por `MembrosConta`/`GruposAcesso`/`PermissoesGrupo` (e `ResponsavelMembroId`/`AutorMembroId`) vai para a **Fase 3**, junto com os fluxos de convite e login. Fazer a troca de schema sem os fluxos quebraria as telas e os testes de assistente entre as duas fases.

### Fase 3: fluxos de conta, equipe e grupos

- **Cadastro**: cria usuário, conta, membro Dono, trial de 14 dias e os dois grupos padrão numa transação só (T1).
- **Login**: resolve a conta e o tipo pela `MembrosConta`. Um login → uma conta só. O `EmissorJwt` emite `conta_id` (e o necessário para autorização) no lugar de depender só de `organizer_id`.
- **Convite**: generaliza o fluxo de assistente para Dono ou Membro com grupo (`/api/equipe` ou equivalente da spec). Convite 7 dias (T13, T12).
- **Grupos**: CRUD de grupos e permissões; só o Dono; não apagar grupo com membros.
- **Autorização**: Dono pode tudo na conta; Membro só o que o grupo permite (T9, T10, T11, T14). Só o Dono acessa Configurações, assinatura, equipe e grupos (RF-112).
- **Exclusões com FK `RESTRICT`**: apagar uma oportunidade com contrato ou proposta, um fornecedor com contrato ou um arquivo em uso devolve **409** com mensagem clara, no lugar de erro 500.
- **Troca de arquivo** (logo, fundo, comprovante): grava o novo, atualiza a referência e só depois apaga o antigo, se ninguém mais usar.
- **Apagar um modelo** apaga os `VinculoModeloEvento` dele, a única ligação mantida sem FK.
- **Frontend**:
  - `pages/assistentes` vira **Equipe** (Configurações): lista com tipo e grupo, convite Dono/Membro, remover;
  - tela de **Grupos** com grade módulo × ver/editar/excluir e alcance de eventos;
  - `convite-assistente.page` vira convite de membro;
  - as telas de tarefa passam a usar as colunas novas de responsável.
- **Testes**: T1, T9–T14; isolamento (T15) continua verde.

### Fase 4: assinatura, planos e bloqueio (SaaS)

- Trial de 14 dias no cadastro; e-mails nos dias 11, 13 e 14.
- Bloqueio com tela específica quando a conta não está em dia (T2, T5, T6, T7); links do cliente seguem (T8).
- Checkout pelo Asaas (cartão/Pix) e webhook idempotente (T3, T4, T16).
- Job diário, página Minha assinatura e aceite de termos.
- **Admin → Planos**: CRUD de planos e recursos; um plano padrão (T17, T19).
- **Admin → Conta**: atribuir plano, valor personalizado, desconto com data de fim, estender trial; histórico em `AlteracoesAssinatura` (T18, T22).
- Checagem **plano + grupo** no servidor (T20, T21, RF-121).
- Valor cobrado: plano, ou personalizado, ou plano com desconto.

### Fase 5: código de acesso do cliente

- Tabelas `CodigosAcessoCliente`, `SessoesLinkCliente` e a coluna `LinksCliente.ExigeCodigo` (se ainda não entraram na migration da Fase 2).
- Fluxo: abrir o link → pedir código → receber por e-mail (SMTP atual) ou SMS → validar → sessão curta.
- Limite de tentativas e expiração em minutos.
- O provedor de SMS é **pendência**. O e-mail funciona desde o primeiro dia.

## Decisões fechadas nesta versão (SPEC-062)

1. Tipo na conta: **Dono** ou **Membro** (não Dono/Organizador/Assistente).
2. Acesso do Membro: só pelo **grupo** (módulos + alcance de eventos). Sem flags `PodeVerFinanceiro` / `VeSomenteSeusEventos`.
3. Só o **Dono** acessa assinatura, equipe, grupos e Configurações. A conta pode ter vários Donos; sempre pelo menos um.
4. **Um login pertence a uma conta só** até nova decisão (pendência 1 da spec).
5. Migrations: **recomeçar do zero** (recomendado e adotado).
6. Planos: Admin cria e atribui; Dono não faz upgrade/downgrade nesta versão.
7. Contas antigas de staging: **recriadas**; sem migração de dados.

## Pendências que ainda precisam de resposta (não bloqueiam Fase 1–2 de schema)

1. Outros itens de Configurações além de Assinatura, Equipe e Grupos.
2. Textos dos e-mails.
3. Conteúdo dos termos de uso e política de privacidade.
4. Nota fiscal da assinatura (Asaas ou não).
5. Provedor de SMS para o código do cliente (Fase 5).
6. Upgrade/downgrade pelo Dono (pró-rata) — fora desta versão.
7. Specs dos recursos de IA/integrações quando forem construídos.
8. Planos anuais — fora desta versão.
9. Apagar oportunidade com contrato: 409 (já no plano) vs arquivar — confirmar se a spec de funil/contrato já define; se ambíguo, perguntar antes de implementar o 409.

## Riscos

- **A Fase 2 é grande.** Ela troca o tipo de `ContaId` em todo o código e liga o filtro global de uma vez. O teste de isolamento da Fase 1 vem antes por isso.
- **Endpoints públicos com filtro global:** um `IgnoreQueryFilters()` esquecido quebra o link do cliente; um a mais vaza dados. Cada endpoint público tem teste próprio.
- **Plano + grupo:** esquecer uma das duas checagens libera recurso indevido (RF-121; T20/T21).

## Mapeamento testes da spec (T1–T22) → fases

| Teste | Fase |
|---|---|
| T15 | 1 (e revalidar depois) |
| T1, T9–T14 | 3 |
| T2–T8, T16–T22 | 4 |
| (código de acesso do cliente) | 5 — fora de T1–T22 desta spec |

## Progresso

### Fase 1 — concluída

- **Commit:** `354e9c4` (`feat(spec-062): Fase 1 — IContaAtual e teste de isolamento entre contas`)
- **Branch:** `feat/spec-062` (a partir de `staging`). Sem push.

**Feito**
- Plano atualizado com as correções da SPEC-062 aprovada: tipo Dono/Membro + grupos; Planos/RecursosPlano/AlteracoesAssinatura; migration inicial limpa; um login = uma conta; mapeamento T1–T22 → fases.
- `IContaAtual` em `Project.Application/Conta`, resolução compartilhada em `ContaAtual.De` (claim `organizer_id` ou `NameIdentifier`), implementação `ContaAtualHttp` na Api, registrada no `Program.cs`.
- Os 6 arquivos de endpoints (`Negocio`, `Contrato`, `Dinheiro`, `LinkCliente`, `Portaria`, `Assistente`) passam a usar `ContaAtual.De` / `Conta(...)`.
- Teste de integração `IsolamentoContasTests` (matriz entre duas contas) e unitários `ContaAtualTests`.
- Build da solution e testes da fase: ok.

**Diferenças em relação ao plano**
- Os handlers ainda recebem `ClaimsPrincipal` e chamam `ComConta`/`Conta` local; a lógica está centralizada, mas a assinatura dos helpers não foi trocada para injetar `IContaAtual` em cada um dos ~229 call sites (evita churn sem mudança de comportamento). `IContaAtual` fica pronto para o filtro global da Fase 2.
- ContaId continua `string` (Guid é Fase 2), como previsto.

**Testes da spec cobertos**
- T15 (isolamento entre contas).
- Demais (T1–T14, T16–T22): não cobertos nesta fase.

**Pendências / próximos passos**
- Fase 2: modelo novo (Contas, MembrosConta Dono/Membro, GruposAcesso, PermissoesGrupo, Planos, Assinaturas…), ContaId Guid, FKs, filtro global, apagar migrations antigas, migration inicial limpa, regerar `deploy/schema.sql`.
- Não iniciar schema antes de revalidar que `IsolamentoContasTests` segue verde após cada lote da Fase 2.
- Pendências de produto da spec (§17) que não bloqueiam a Fase 2 de schema: textos de e-mail, termos, SMS, NF, itens extras de Configurações.

### Fase 2 — lotes 2.1 e 2.2 concluídos (Claude Code)

**Feito**
- Migrations antigas apagadas; uma migration `Inicial` limpa, regerada a cada lote. `deploy/schema.sql` regerado (sem dados padrão perdidos: os `INSERT`/`UPDATE` antigos eram só correções de dados velhos).
- `ContaId` `string` → `Guid` em entidades, serviços, endpoints e testes. `ContaAtual.De`/`IContaAtual.Id` devolvem `Guid?`. Campos que guardam id de usuário (`Responsavel`, `ResponsavelContaId`, `AutorContaId`, `ReferenciaId`) seguem `string`, preenchidos com `contaId.ToString()` (mesmo formato do id do Identity).
- Tabela `Contas` (entidade `ContaAssessoria`, em `Domain/Equipe`), com FK `RESTRICT` de todo `ContaId` (laço genérico em `Mapa.LigarContas`) e `DonoUsuarioId` → `AspNetUsers`.
- `CadastroDeConta`: o cadastro público cria login, role Organizer e conta numa transação só; a conta usa o mesmo Id do usuário.
- Testes: `CadastroCriaContaTests` (conta criada, sem duplicar) e `ContaAtualTests` atualizado. Suíte: 314 unitários + 86 integração, verdes.

**Atenção para deploy**
- O banco de staging precisa ser **recriado** antes de subir esta branch: o `schema.sql` novo tem uma única migration `Inicial`, e um banco com o histórico antigo falharia ao criar tabelas que já existem.

**Próximo:** lote 2.3 (`ContaId` nas tabelas filhas, preenchido no `SaveChanges` a partir do pai). A tabela implícita `EventoTagConta` e `EventosAssistentes` ficam sem `ContaId` por ora (a primeira é junção sem entidade; a segunda sai na Fase 3).

### Fase 2 — lote 2.3 concluído (Claude Code)

**Feito**
- Interface `ITemConta` (`Domain/Comum`) em todas as 64 entidades de negócio. As 32 filhas que não tinham ganharam `ContaId`, com FK `RESTRICT` para `Contas` (o laço do `Mapa.LigarContas` pega todas).
- `AppDbContext.SaveChangesAsync` preenche o `ContaId` de registro novo a partir do pai pela FK, em passadas (cobre neto criado junto). Registro novo sem conta e sem pai é recusado com erro claro.
- Índices compostos nas listagens principais: Eventos (ContaId, Data), Tarefas (ContaId, Prazo), Clientes (ContaId, Nome), Compromissos (ContaId, Data), Convites (ContaId, EventoId). As demais tabelas têm o índice por ContaId criado pela FK.
- Testes `ContaNasFilhasTests` (filho e neto juntos, filho depois, órfão recusado). Suíte: 314 + 89, verdes.

**Diferença do explorador:** os índices compostos com o segundo campo foram feitos só nas 5 listagens mais usadas; o resto fica com o índice simples por ContaId até aparecer consulta que justifique.

**Próximo:** lote 2.4 (filtro global por conta).

### Fase 2 — lote 2.4 concluído (Claude Code)

**Feito**
- Filtro global no `AppDbContext`: toda entidade `ITemConta` tem `HasQueryFilter(ContaId == conta do pedido)`. O `AppDbContext` recebe `IContaAtual` (opcional; sem ele o filtro fica desligado).
- `ContaAtualHttp` decide quando há conta: só em endpoint que exige login. Endpoint público (link do cliente, portaria, proposta, RSVP, login, cadastro) não filtra, mesmo com login de outra conta no navegador. Admin sem impersonação não filtra (vê todas, RF-040); Admin impersonando filtra pela conta impersonada.
- Testes: `ContaAtualHttpTests` (6 casos de quando filtra), `FiltroGlobalPorContaTests` (consulta sem `Where` só vê a conta ativa, inclusive filhas; sem conta, filtro desligado) e, no isolamento, "logado na conta B abre o link público da conta A". Suíte: 314 + 98, verdes.

**Diferença do plano:** os `Where(ContaId == …)` escritos em cada consulta **ficaram**. O filtro global é a segunda camada; tirar os filtros manuais seria troca grande sem ganho de segurança. Se um dia saírem, o teste de isolamento e o `FiltroGlobalPorContaTests` cobrem.

**Próximo:** lote 2.5 (34 FKs, rename `Vinculos` → `ClienteEventos`, remoção de `FornecedorContaId`, divisão das colunas polimórficas de responsável).

### Fase 2 — lote 2.5 concluído (Claude Code)

**Feito**
- 32 FKs novas com o `ON DELETE` de `docs/banco/fonte/dec.js` (`Mapa.LigarReferencias`): 17 para `Arquivos`, as do funil, serviços, fornecedor no serviço e presenças.
- `LeadRsvp.EventoId`/`ConviteId` passam a aceitar nulo (o lead fica como histórico se o evento ou convite for apagado); DTO e tipo do frontend acompanham.
- Tabela `Vinculos` renomeada para `ClienteEventos`. `ServicoEvento.FornecedorContaId` removida.
- Suíte: 314 + 98, verdes. Build do frontend ok.

**Diferenças do plano/explorador (registradas no `dec.js`)**
- `Convites.PrincipalId` fica **sem FK**: aponta para um convidado do próprio convite, que aponta de volta; FK nos dois sentidos impede gravar convite e convidados juntos (o EF acusa dependência circular). Os convidados saem em cascata com o convite.
- Proposta e contrato do funil saem com a oportunidade (`CASCADE`, não `RESTRICT`): a SPEC-032 diz que a dona exclui tudo no funil, e o teste dela quebrava com `RESTRICT`. Bloquear ou arquivar continua pendência 9.
- A divisão das colunas polimórficas de responsável vai para a **Fase 3**, porque precisa de `MembrosConta`.
- O `data.json` do explorador ainda mostra a versão anterior dessas três decisões.

**Pendência fora do escopo encontrada**
- `npx ng test` não compila: `src/app/pages/tarefas/checklist-tarefa.spec.ts` (tipo `number | null | undefined`). O erro já existia na `staging`; esta branch só mudou o tipo `LeadRsvp` no frontend.

**Fase 2 de schema concluída**, exceto o lote 2.6 (tabelas de planos e assinatura, sem fluxo).

### Fase 3 — lote 3.1 concluído (Claude Code)

**Feito**
- `Assistentes`/`EventosAssistentes` viram `MembrosConta` (tipo **Dono** | **Membro**, `GrupoId` só para Membro, com `CHECK`) e `EventosMembros`. Novas `GruposAcesso` e `PermissoesGrupo` (módulo × ver/editar/excluir; editar/excluir exigem ver). Lista de módulos no código (`Modulo`). Sai `ApplicationUser.OrganizerId`.
- **Cadastro** cria login, conta, membro Dono e os grupos Organizadores e Assistentes numa transação (T1). O trial fica para a Fase 4, junto com as tabelas de assinatura (lote 2.6).
- **Login** resolve conta e tipo em `MembrosConta`; o JWT leva `conta_id` (no lugar de `organizer_id`). Membro inativo não entra.
- **Autorização por pedido** (`EquipeEndpoints.AplicarAcesso`): lê membro e grupo no banco a cada pedido e troca os papéis do token pelo tipo atual (Dono → Organizer, Membro → Assistant), então mudar tipo, grupo ou permissão vale na próxima ação (RF-117, T11). `PermissaoPorRota` dá o módulo e a ação de cada rota (GET ver, DELETE excluir, resto editar); rota sem permissão devolve 403 com a mensagem da spec (T9). Alcance "só os atribuídos" vem do grupo (T10).
- **Equipe** em `/api/v1/equipe` (convidar Dono ou Membro com grupo, editar tipo/grupo, reenviar, desativar, reativar). Último Dono não sai nem vira Membro: 409 (T12). Sócio convidado como Dono acessa Configurações (T13). Membro recebe 403 em equipe e grupos (T14).
- **Grupos** em `/api/v1/grupos-acesso` (só Dono): CRUD; grupo com membros não é apagado (409). A rota não é `/api/v1/grupos` porque um teste garante que a antiga rota de grupos de convite segue inexistente.
- **Frontend mínimo**: a tela de assistentes usa `/api/v1/equipe`, mostra tipo e grupo, e o formulário escolhe Tipo e Grupo no lugar de "financeiro" e "só os dela". O link do convite passa a `/convite` (o antigo continua abrindo).
- Migration `Inicial` e `deploy/schema.sql` regerados. Suíte: 313 + 101, verdes. Build do frontend ok.

**Diferenças da spec/plano**
- O grupo padrão Assistentes segue a spec (sem excluir); antes a assistente podia excluir no funil o que criou. Quem precisar disso usa um grupo com "excluir".
- Convite sem grupo cai no grupo Assistentes (compatível com a tela antiga).

**Próximo: lote 3.2** — telas Configurações → Equipe e Grupos (grade módulo × ver/editar/excluir e alcance), menu Configurações só para Dono e menu escondendo módulos sem "ver"; renomear `convite-assistente.page`. **Lote 3.3** — colunas novas de responsável (`ResponsavelMembroId`/`AutorMembroId` e divisão `MembroId`/`FornecedorId`/`ClienteId` com `CHECK`), 409 nas exclusões com FK `RESTRICT`, troca segura de arquivo e apagar `VinculoModeloEvento` junto com o modelo.

### Fase 3 — lote 3.2 concluído (Claude Code)

**Feito**
- Menu **Configurações** (só Dono): Perfil, Equipe (`/configuracoes/equipe`) e Grupos de acesso (`/configuracoes/grupos`). `/assistentes` redireciona para Equipe.
- Tela **Grupos**: lista com membros, alcance e módulos que vê; editor com a grade módulo × ver/editar/excluir (marcar editar/excluir liga ver; tirar ver tira os dois) e o alcance de eventos. Grupo com membros não é apagado.
- Tela **Equipe**: textos de Dono/Membro; o formulário escolhe tipo e grupo.
- Menu e rotas por módulo: cada item e rota tem o módulo do grupo; sem "ver", some do menu e a rota leva a "sem acesso" (`moduloGuard`). `AuthService.pode(modulo, acao)` lê as permissões de `/conta/area`.
- Aceite de convite com a mensagem da spec para convite expirado.
- Build do frontend ok. `ng test` segue sem compilar só pelo erro antigo de `checklist-tarefa.spec.ts`.

**Não verificado no navegador:** o stack local precisa da API nova e do banco recriado.

**Próximo: lote 3.3** — colunas novas de responsável, 409 nas exclusões com FK `RESTRICT`, troca segura de arquivo e apagar `VinculoModeloEvento` com o modelo.

### Fase 3 — lote 3.3 concluído (Claude Code)

**Feito**
- **409 nas exclusões barradas por FK `RESTRICT`**: o tratador de erros da API reconhece a violação de FK do Postgres e responde 409 com mensagem pela tabela referenciada (arquivo em uso, fornecedor em serviço de evento, serviço ligado a fornecedor, estágio com oportunidades, grupo com membros). Antes era 500.
- **Troca de arquivo**: os fluxos já gravavam o novo, trocavam a referência e só depois apagavam o antigo. Agora `DescartarAsync` mantém o arquivo quando outro registro ainda o usa (ex.: logo do modelo copiado para o contrato do funil), no lugar de estourar 500.
- **Vínculos de modelo**: apagar um modelo de briefing, roteiro, inspiração ou mensagem apaga os `VinculoModeloEvento` que apontavam para ele (a ligação sem FK). Apagar o modelo de evento já levava os vínculos em cascata.
- **Responsáveis ligados ao membro**: `ResponsaveisTarefa.MembroId`, `ResponsaveisTarefaFunil.MembroId` e `ItensChecklistTarefa.ResponsavelMembroId`, com FK `RESTRICT` para `MembrosConta`, preenchidos no `SaveChanges` quando o responsável é uma pessoa da equipe. `ComentariosTarefa.AutorMembroId` (FK, `SET NULL`) grava quem escreveu; antes só ficava o id da conta.
- Testes `IntegridadeFase3Tests`. Migration `Inicial` e `deploy/schema.sql` regerados. Suíte: 313 + 104, verdes.

**Diferenças do plano/explorador**
- Não houve a divisão em `MembroId`/`FornecedorId`/`ClienteId` com `CHECK` de "exatamente um": os responsáveis de hoje são, na maior parte, papéis sem pessoa (Organizer, Equipe, "todas as assistentes", Cliente), e não existe responsável fornecedor. Ficou `MembroId` opcional, com `CHECK` de que só o papel Assistente tem membro. `ReferenciaId` segue como está para não mudar a API.
- `Tarefa.ResponsavelContaId` ficou: guarda sempre o id da conta (legado), não uma pessoa; não há membro para pôr ali.
- Apagar oportunidade com contrato segue em cascata (pendência 9).

**Fase 3 concluída no backend e nas telas.** Falta verificar no navegador com o banco local recriado.

### Fase 4 — lote 4.1 concluído (Claude Code)

Fase 4 em lotes: **4.1** schema, trial e bloqueio; **4.2** checkout e webhook do Asaas, Configurações → Assinatura; **4.3** Admin → Planos e Admin → Conta, checagem plano + grupo; **4.4** controle diário, e-mails e aceite de termos.

**Feito**
- Schema do lote 2.6: `Planos` (com o Pro de R$ 179, público e padrão, vindo da migration; índice garante um padrão só), `RecursosPlano`, `Assinaturas` (uma por conta), `CobrancasAssinatura`, `EventosWebhookAsaas` (id do evento único), `DocumentosTrial` (hash do documento único) e `AlteracoesAssinatura`. Recursos do plano no código (`RecursoPlano`).
- **Cadastro** abre o trial de 14 dias no plano padrão, na mesma transação (R1).
- **Regra de liberação** (R7) em `Assinatura.Liberada`, calculada na hora: trial no prazo, ativa, em atraso até 5 dias depois do vencimento, cancelada até o fim do período pago. O bloqueio não depende do controle diário.
- **Bloqueio no servidor**: `AplicarAcesso` devolve 402 `conta_bloqueada` para Dono e Membro, com mensagem diferente para cada um (T2). Ficam abertos a sessão (`/api/v1/conta/*`) e `/api/v1/assinatura`. Os links públicos não passam pelo bloqueio (T8). Nada é apagado; voltar a Ativa devolve tudo (T6).
- `GET /api/v1/assinatura`: situação efetiva, dias de trial, plano e valor.
- **Frontend**: barra "Faltam N dias do seu teste · Assinar" (botão só para o Dono); 402 leva à tela **Seu teste acabou / Sua conta está bloqueada**, com mensagem para Dono e Membro. "Assinar" aponta para `/configuracoes/assinatura`, que por ora mostra "em breve" (lote 4.2).
- Testes: `AssinaturaRegraTests` (R7) e `BloqueioContaTests` (T2, T5, T6, T7, T8, trial no cadastro). Suíte: 319 + 107, verdes. Build do frontend ok.

**Diferenças do explorador**
- `ContaId` de `Assinaturas` e `DocumentosTrial` aponta para `Contas` (como no `build.js`), não para `AspNetUsers`.
- `AlteracoesAssinatura` ganhou `Tipo` (Plano, Valor, Desconto, Trial) e `Detalhe`, para o histórico mostrar desconto e datas do trial, que não cabem em plano/valor.
- O aceite de termos (`Perfis.AceiteTermosEm`) fica para o lote 4.4: o conteúdo dos termos é pendência.

### Fase 4 — lote 4.2 concluído (Claude Code)

**Feito**
- **Cliente do Asaas** (`AsaasHttp`, API v3, header `access_token`): criar cliente, criar assinatura mensal (Pix ou cartão), listar cobranças da assinatura, cancelar. Configuração na seção `Asaas` (`BaseUrl`, `ApiKey`, `WebhookToken`, `DiagnosticoNoNavegador`), vinda do `.env` do servidor (`ASAAS_*` no `compose.production.yaml` e no `.env.example`). Sandbox é o padrão.
- **Assinar** (`POST /api/v1/assinatura/assinar`, só Dono): valida CPF/CNPJ, cria cliente e assinatura no Asaas e devolve o link da primeira fatura. No trial, vence no último dia do teste (T3); com documento que já assinou em outra conta, no dia (T4). O hash do documento vai para `DocumentosTrial`. A conta só fica ativa quando o Asaas avisa o pagamento.
- **Avisos do Asaas** (`POST /api/v1/webhooks/asaas`): token conferido no header `asaas-access-token`; o aviso é gravado em `EventosWebhookAsaas` antes de processar e o id único impede processar duas vezes (T16). Confirmado/recebido → Ativa e paga o mês (desbloqueia, T6); vencido → Em atraso; estorno/contestação → Bloqueada.
- **Cancelar** (`POST /api/v1/assinatura/cancelar`): cancela no Asaas; paga, fica Cancelada e liberada até o fim do período (T7); ainda no trial, o trial segue sem cobrança.
- **Faturas** (`GET /api/v1/assinatura/faturas`).
- **Diagnóstico no navegador** (só com `ASAAS_DIAGNOSTICO=true`): a resposta de assinar/cancelar traz o passo a passo das chamadas ao Asaas (método, rota, status, enviado e resposta; a chave nunca vem), e `GET /api/v1/assinatura/diagnostico` traz os avisos recebidos. A tela escreve tudo no console do DevTools.
- **Tela Configurações → Assinatura**: situação, plano e valor, formulário (CPF/CNPJ, nome de cobrança, Pix ou cartão), link da fatura em aberto, faturas e cancelar.
- Testes com Asaas simulado (`AsaasDeTeste`): `AssinaturaAsaasTests` (T3, T4, T6, T7, T16, documento inválido, Membro não assina, aviso sem token). Suíte: 319 + 111, verdes. Build do frontend ok.

**Como testar do zero no staging**
1. No sandbox do Asaas (sandbox.asaas.com): criar a chave de API em Integrações.
2. No `.env` de `/opt/aralu-staging`: `ASAAS_API_KEY=<chave do sandbox>`, `ASAAS_WEBHOOK_TOKEN=<texto de 32 a 255 caracteres, sem espaços>`, `ASAAS_DIAGNOSTICO=true`.
3. No sandbox, criar o webhook: URL `https://staging.aralu.com.br/api/v1/webhooks/asaas`, mesmo token no campo de autenticação, eventos de cobrança (`PAYMENT_*`).
4. Recriar o banco do staging (a migration `Inicial` mudou) e publicar a branch no staging.
5. Abrir o DevTools (Console), cadastrar uma conta nova, ir em Configurações → Assinatura e assinar. O console mostra cada chamada ao Asaas; o link da fatura abre em outra aba.
6. Pagar no sandbox (Pix: confirmar pelo painel do sandbox; cartão: números de teste do Asaas). Em até 10 segundos o console mostra o aviso recebido e a tela passa para Ativa.

**Fica para depois**
- Trocar forma de pagamento (§6 B8) e e-mail de confirmação de pagamento: lote 4.4.
- Escolha entre planos públicos (§6 B1): lote 4.3, junto com Admin → Planos. Por ora o Dono assina o plano da conta (Pro).

### Fase 4 — lote 4.3 concluído (Claude Code)

**Feito**
- **Admin → Planos** (`/api/v1/admin/planos`, tela `/admin/planos`): criar e editar plano com código único, nome, descrição, valor mensal, público, ativo, padrão e recursos com limite mensal. Sempre um padrão, público e ativo; desativar ou tirar o público do padrão dá "Escolha outro plano padrão antes." Marcar outro como padrão tira a marca do anterior.
- **Admin → Conta** (`/api/v1/admin/contas/{conta}/assinatura`, tela `/admin/contas/:contaId`, botão "Assinatura" no Início Admin): trocar plano (inclusive não público), valor personalizado, desconto de 1% a 100% com ou sem data de fim, estender trial. Motivo obrigatório; cada mudança vai para `AlteracoesAssinatura` com quem, quando, plano e valor de antes e depois (T22). Se a conta já assina, o novo valor vai ao Asaas (`PUT /v3/subscriptions/{id}` com `updatePendingPayments=false`): vale na próxima cobrança, a já gerada não muda.
- **Mudança de preço do plano** vale para assinaturas novas; quem já assina guarda o próprio valor (T19).
- **Escolha de plano pelo Dono** (`GET /api/v1/assinatura/planos`): os planos públicos e ativos; se o Admin enquadrou a conta (plano não padrão, valor ou desconto), só esse (T17). A tela de assinatura mostra os cartões dos planos com preço e recursos.
- **Plano + grupo (RF-121)**: `RecursosAsync` dá os recursos do plano da conta; `.ExigirRecurso(recurso, modulo, acao)` para usar nas rotas de recursos futuros (IA, integrações) recusa com "Este recurso está disponível no plano X." ou com a mensagem de permissão do grupo (T20, T21). `GET /api/v1/assinatura/recursos` serve os selos na tela.
- **Início Admin** passa a listar contas (id da conta e e-mail de quem criou), não logins com papel Organizer: sócio convidado como Dono não aparece como conta própria.
- Testes: `PlanosAdminTests` (T17–T22) e regras de valor e vencimento em `AssinaturaRegraTests`. Suíte: 321 + 115, verdes. Build do frontend ok.

**Fica para o lote 4.4**
- Desconto com data de fim: o controle diário precisa mandar ao Asaas o valor cheio antes da primeira cobrança depois da data, e avisar o Dono 7 dias antes.
- Nenhuma rota usa `.ExigirRecurso` ainda: os recursos (IA, integrações) terão spec própria (pendência 8).

### Fase 4 — lote 4.4 concluído (Claude Code)

**Feito**
- **Controle diário** (`ControleDiarioAssinaturas`, roda de hora em hora; desliga com `Assinaturas__ControleDiario=false`), com a lógica em `AvisosAssinaturaServico.RodarAsync`:
  - grava a situação que já venceu: trial no fim → Expirada; atraso acima de 5 dias → Bloqueada; cancelada depois do período pago → Bloqueada (o bloqueio em si já valia na hora, pela regra R7);
  - e-mails do trial nos dias 11, 13 e 14 (só para quem não assinou), de atraso no 1º e no 4º dia, e do fim do desconto 7 dias antes;
  - fim do desconto: antes da primeira cobrança depois da data, o valor cheio vai ao Asaas (T18).
- Nova tabela `AvisosAssinatura` (conta + tipo + data de referência, únicos): a rodada pode repetir sem mandar o mesmo e-mail duas vezes. Estender o trial muda a referência, e os avisos voltam a valer para o novo fim.
- **E-mail de pagamento confirmado** (§6 B6), um por vencimento: confirmado e recebido do mesmo pagamento mandam um só.
- Os e-mails vão para todos os Donos ativos da conta, com botão para Configurações → Assinatura.
- **Aceite dos termos no cadastro** (§6 A1 e A3): sem aceitar, o cadastro devolve 400; a conta grava `AceiteTermosEm` e `VersaoTermos` ("2026-11-provisoria"). A tela de cadastro tem a caixa de aceite.
- Testes `ControleDiarioTests`. Suíte: 321 + 120, verdes. Build do frontend ok; `ng test` segue barrado só pelo erro antigo de `checklist-tarefa.spec.ts` (o spec do cadastro foi ajustado para marcar o aceite).

**Diferenças da spec/plano**
- Os termos foram para `Contas` (`AceiteTermosEm`, `VersaoTermos`), não para `Perfis`: no cadastro ainda não existe perfil.
- Textos dos e-mails e dos termos são provisórios (pendências 3 e 4). A caixa de aceite não tem link porque o texto dos termos não existe ainda.

**Fica fora desta fase**
- Trocar a forma de pagamento pela tela (§6 B8): hoje o Dono troca na própria fatura do Asaas. Precisa de decisão sobre o fluxo (cancelar e assinar de novo, ou `PUT` do `billingType`).
- Aviso de 80% e 100% do limite mensal de recurso (§7): depende dos recursos, que ainda não existem.

**Fase 4 concluída.** Próximo: Fase 5 (código de acesso do cliente) e o teste ponta a ponta no staging com o sandbox do Asaas.
