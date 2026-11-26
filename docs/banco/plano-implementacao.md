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
