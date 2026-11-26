# Plano de implementação: contas, membros, integridade e SaaS

**Status: rascunho para revisão (25/11/2026).** Pela regra do projeto, código só começa com spec aprovada. Este plano vira a base da SPEC-062 (contas e membros) e das specs seguintes. O modelo de dados de referência está no explorador (`docs/banco/explorador/`, visão **Proposta**).

**Premissa: o sistema não foi lançado.** Não há dados de produção a preservar. Por isso não há migração de dados, limpeza de órfãos nem conversão de colunas: o banco é redesenhado e recriado.

## O que muda, em uma frase por tema

| Tema | Hoje | Depois |
|---|---|---|
| Conta | O usuário Organizer é a conta: `ContaId` guarda o id dele. | `Contas` nasce no cadastro. Todo `ContaId` é `uuid` com FK para `Contas`. |
| Equipe | Só assistentes, ligadas por `AspNetUsers.OrganizerId`. | `MembrosConta` com papel `Dono`, `Organizador` ou `Assistente`, entrando por convite. |
| Isolamento | Cada consulta lembra do `Where(ContaId == …)`. | Filtro global no EF por conta, mais teste automático de isolamento. |
| Tenant | 32 de 73 tabelas têm `ContaId`; 12 sem índice. | 71 tabelas com `ContaId` e índice começando por ele. |
| Integridade | 39 referências sem FK. | 34 FKs novas, 2 trocadas para `MembrosConta`, 3 colunas polimórficas divididas, 1 mantida de propósito. |
| Cobrança | Não existe. | Trial de 14 dias, R$ 179/mês, Asaas. Membros só entram com a conta em dia. |
| Link do cliente | Token no link. | Token + código por e-mail ou SMS (pode ser ligado por link). |

## Migrations: recomeçar do zero

Hoje há dezenas de migrations acumuladas, com tabelas criadas e removidas no caminho. Sem produção, recomendo:
1. Ajustar todas as entidades e o `Mapa.cs` para o modelo novo.
2. Apagar a pasta `Persistencia/Migrations` e gerar **uma migration inicial** limpa.
3. Regerar o `deploy/schema.sql` a partir dela.
4. Recriar os bancos locais e o de homologação (VPS), e rodar o bootstrap de novo.

Ganho: o schema fica legível, sem `ALTER` de colunas que já não existem, e a revisão do banco passa a ser a leitura de um arquivo só.

## Fases

Cada fase é um PR com testes.

### Fase 1: base de isolamento (sem mudar comportamento)
1. **Teste de isolamento** em `tests/Project.IntegrationTests`: cria duas contas e confere que a conta B recebe 404 ou lista vazia em cada grupo de endpoints da conta A. Ele protege todas as fases seguintes.
2. Centralizar a descoberta da conta. Hoje a função `Conta(usuario)` está repetida em 6 arquivos (`NegocioEndpoints`, `ContratoEndpoints`, `DinheiroEndpoints`, `LinkClienteEndpoints`, `PortariaEndpoints`, `AssistenteEndpoints`). Ela vira um único `IContaAtual` em `Project.Application/Conta`.

### Fase 2: modelo novo do banco (uma PR grande, guiada pelo compilador)
Tudo o que mexe em schema entra junto, para gerar a migration inicial uma vez só.

**Contas e equipe**
- Entidades `Conta`, `MembroConta` (enum `PapelMembro`: Dono, Organizador, Assistente) e `EventoMembro`.
- Saem `Assistente`, `EventosAssistentes` e `ApplicationUser.OrganizerId`.

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
- `HasQueryFilter(x => x.ContaId == contaAtual.Id)` em toda entidade com tenant.
- Endpoints públicos (link do cliente, portaria, RSVP, proposta) acham o registro pelo token com `IgnoreQueryFilters()` e só leem dentro da conta desse registro. Cada um ganha teste próprio.
- Os `Where(ContaId == …)` manuais saem, já que o filtro e o teste de isolamento cobrem.

**Migration**: apagar as antigas, gerar a inicial e regerar o `deploy/schema.sql`.

### Fase 3: fluxos de conta e equipe
- **Cadastro**: cria usuário, conta e membro Dono numa transação só.
- **Login**: resolve a conta e o papel pela `MembrosConta`. O `EmissorJwt` emite `conta_id` e `papel` no lugar de `organizer_id`.
- **Convite**: o fluxo atual de assistente passa a servir para Organizador e Assistente (`/api/equipe`).
- **Autorização**: a role `Organizer` vale para Dono e Organizador. O que só o Dono pode fazer é **pendência de spec**.
- **Exclusões com FK `RESTRICT`**: apagar uma oportunidade com contrato ou proposta, um fornecedor com contrato ou um arquivo em uso devolve **409** com mensagem clara, no lugar de erro 500.
- **Troca de arquivo** (logo, fundo, comprovante): grava o novo, atualiza a referência e só depois apaga o antigo, se ninguém mais usar.
- **Apagar um modelo** apaga os `VinculoModeloEvento` dele, a única ligação mantida sem FK.
- **Frontend**:
  - `pages/assistentes` vira **Equipe**: lista com papel, convite com escolha de papel, remover membro;
  - `convite-assistente.page` vira convite de membro;
  - as telas de tarefa passam a usar as colunas novas de responsável.
- **Testes**: cadastro cria conta e membro; convite de cada papel; `VeSomenteSeusEventos` continua valendo; um teste por FK `RESTRICT`; isolamento verde.

### Fase 4: assinatura (SaaS)
- Tabelas `Assinaturas`, `CobrancasAssinatura`, `EventosWebhookAsaas` e `DocumentosTrial`, presas a `Contas`. Se a Fase 2 ainda não tiver ido para homologação, elas entram direto na migration inicial.
- Trial de 14 dias no cadastro.
- Bloqueio com 402 para qualquer membro quando a conta não está em dia.
- Checkout pelo Asaas e webhook com eventos sem repetição.
- Job diário, página Minha assinatura e aceite de termos (`Perfis.AceiteTermosEm`, `VersaoTermos`).

### Fase 5: código de acesso do cliente
- Tabelas `CodigosAcessoCliente`, `SessoesLinkCliente` e a coluna `LinksCliente.ExigeCodigo`.
- Fluxo: abrir o link → pedir código → receber por e-mail (SMTP atual) ou SMS → validar → sessão curta.
- Limite de tentativas e expiração em minutos.
- O provedor de SMS é **pendência**. O e-mail funciona desde o primeiro dia.

## Decisões pendentes (precisam de resposta antes das specs)
1. O que só o **Dono** pode fazer e o Organizador não: equipe, assinatura, excluir conta, ver financeiro?
2. Um usuário pode ser membro de **mais de uma conta**? (O modelo permite; o login precisaria escolher a conta.)
3. Apagar uma oportunidade com contrato: bloquear (409) ou **arquivar**?
4. Provedor de SMS para o código do cliente.
5. Recomeçar as migrations do zero (recomendado) ou manter o histórico?

## Riscos
- **A Fase 2 é grande.** Ela troca o tipo de `ContaId` em todo o código e liga o filtro global de uma vez. O teste de isolamento da Fase 1 vem antes por isso.
- **Endpoints públicos com filtro global:** um `IgnoreQueryFilters()` esquecido quebra o link do cliente; um a mais vaza dados. Cada endpoint público tem teste próprio.
