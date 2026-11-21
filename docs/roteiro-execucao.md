# Roteiro de execução dos cards da versão 1.0

Criado em 21/11/2026. Diz **em que ordem** e **com que paralelismo** implementar os 30 cards de [tarefas-trello.md](tarefas-trello.md) (cópia do board "Tarefas Aralu" do Trello, coluna Todo Claude). O Trello continua sendo a fonte: se o texto de um card mudou, vale o Trello.

## 1. Regras (valem para toda sessão)

1. **Uma sessão por card.** Cada sessão faz um card, do começo ao commit.
2. **Código só sai de spec com Status: aprovada** ([proximas-acoes.md](proximas-acoes.md), seção 2). Quem aprova é o dono do projeto. Vários cards mudam specs já aprovadas (SPEC-028, 029, 030 e outras): a sessão **revisa a spec, para e pede a aprovação** antes de escrever código. Decisões já tomadas no card e no [produto-v1.md](produto-v1.md) não precisam ser perguntadas de novo; o que o card marca como "a decidir" ou "confirmar" precisa.
3. **Banco: uma sessão por vez com migration.** Migration nova exige gerar `deploy/schema.sql` de novo (comando em [proximas-acoes.md](proximas-acoes.md), seção 6). Duas migrations ao mesmo tempo conflitam no snapshot do EF e no `schema.sql`. Os cards com migration andam na **fila do banco** (seção 3).
4. **Paralelo só em worktree próprio e com arquivos diferentes.** Dois cards que editam a mesma tela não rodam juntos (ver a coluna "Mexe em" da seção 3).
5. **Testes e build só quando o card toca código** ([CLAUDE.md](../CLAUDE.md)). Card só de documentação não roda testes nem build.
6. **Commits na `main` estão liberados** enquanto o produto não vai para produção. **Sem push e sem PR** sem pedido do dono do projeto. Com worktrees paralelos, quem junta os branches é o dono do projeto.
7. **Funcionalidade removida sai também do banco e da API** (decidido em 21/11/2026): tabelas, colunas, endpoints, DTOs e testes da funcionalidade removida são apagados na mesma entrega, por migration, mesmo que isso perca dados. A 1.0 não pode ter legado sem uso: depois do lançamento só entram melhorias e funcionalidades novas. Apague só o que foi combinado remover; na dúvida, pergunte.
8. Nunca renumerar RF. O próximo RF livre é o RF-110 (confira em [requirements.md](requirements.md)).

## 2. Definição de pronto (igual para todo card)

1. Spec do card revisada ou criada e **aprovada** pelo dono do projeto (Status: aprovada).
2. Implementação conforme o card, sem sair do escopo. O que ficou de fora vai para "Dúvidas para o usuário" em [proximas-acoes.md](proximas-acoes.md).
3. Testes novos e antigos passando:
   - `dotnet test tests/Project.Tests`
   - `npm --prefix src/frontend run build`
   - `cd src/frontend && npx ng test --watch=false`
   - `dotnet test tests/Project.IntegrationTests` (precisa do Docker ligado)
4. Se houve migration: `deploy/schema.sql` gerado de novo.
5. [produto-v1.md](produto-v1.md), as specs e a coluna "Status" da seção 3 deste arquivo atualizados.
6. Um commit com mensagem clara na `main`.

## 3. Ondas e fila do banco

Legenda de "Banco": **M** = migration (entra na fila do banco), **—** = sem migration, **?** = confirmar ao especificar.

| Onda | Card | Depende de | Banco | Mexe em | Status |
|---|---|---|---|---|---|
| 1 | #19 Simplificar cadastro de evento | — | — | novo-evento.dialog, NomeDoEvento | pronto no branch `claude/card-19-cadastro-evento-d18601` (3f8f3e0); juntado na main; integração só ao fim das ondas |
| 1 | #22 Convidados: limpeza | — | — | convidados.page | pronto no branch `claude/card-22-convidados-limpeza-99eb4e` (c53f2ff); juntado na main; integração só ao fim das ondas |
| 1 | #27 Serviço no cadastro de fornecedor | — | — | fornecedor-form.dialog | pronto no branch `claude/card-27-servico-fornecedor-529f2c` (b0313cf); juntado na main; integração só ao fim das ondas |
| 1 | #21 Tarefas: data por item | — | M | tarefas, ItemChecklistTarefa | pronto no branch `claude/card-21-tarefas-item-ce4d93` (b7a2dc9, migration `PrazoEResponsavelDoItemDaTarefa`); juntado na main; integração só ao fim das ondas |
| 2 | #45 CPF/CNPJ sem máscara, CNPJ alfanumérico | #27 (mesmo cadastro de fornecedor) | M | Mascaras, cliente, perfil, fornecedor | pronto no branch `claude/card-45-cnpj-97a449` (SPEC-034, migration `DocumentosSemMascara` só de dados); juntar na main; integração só ao fim das ondas |
| 2 | #42 RG fora; CPF/CNPJ único no cliente | #45 | M | cliente-form, convidado | pronto no branch `claude/card-42-rg-bc864f` (SPEC-037, migration `RgEModeloDoEventoFora`; inclui a saída de `Evento.ModeloId`); juntar na main; integração só ao fim das ondas |
| 2 | #36 Remover vínculo contrato-evento | — | — | contratos, modelos-evento | pronto no branch `claude/card-36-vinculo-31e1bb` (commit abaixo); sem migration; integração só ao fim das ondas |
| 2 | #37 Menu: modelos no grupo Modelos | — | — | casca.component | pronto no branch `claude/card-37-menu-134f0a` (SPEC-035); integração só ao fim das ondas |
| 2 | Limpeza do legado (sem card) | #22, #36 | M | banco, convites, contratos | pronto no branch `claude/limpeza-legado-d2d8b3` (SPEC-036, migration `LimpezaDoLegado`); juntar na main; integração só ao fim das ondas |
| 2 | #46 Endereço estruturado no Perfil | #45 (fila do banco) | M | perfil | pronto no branch `claude/card-46-perfil-29d6b2` (SPEC-038, migration `EnderecoEstruturadoDoPerfil`; texto antigo do endereço apagado); juntar na main; integração só ao fim das ondas |
| 3 | #41 Banco de parcelas por documento | #21, #45, #46 (fila do banco) | M | Dinheiro, Contratos, Fornecedores, Hoje | pronto no branch `claude/card-41-parcelas-296365` (SPEC-040, migration `ParcelasPorDocumento`; `ParcelaCasal` e `ParcelaServico` apagadas, dados perdidos); juntar na main; integração só ao fim das ondas |
| 4 | #32 Gestão Financeira: mover Pagamentos | #41 | — | casca, pagamentos, contratos | pronto no branch `claude/card-32-gestao-24c71c` (SPEC-041, sem migration; tela Pagamentos e `GET /pagamentos` apagados; `PUT /contratos-funil/{id}/parcelas` novo); juntar na main; integração só ao fim das ondas |
| 4 | #31 Dinheiro do evento: pagamentos a fornecedores | #32, #41 | M | evento-dinheiro | pronto no branch `claude/card-31-dinheiro-c73d6c` (SPEC-043, migration `PagamentosAFornecedores`; `LancamentosEvento` e `ComprovantesEvento` apagadas, dados perdidos); juntar na main; integração só ao fim das ondas |
| 4 | #28 Contratar fornecedor, anexar contrato | #31, #41 | M | evento-fornecedores | pronto no branch `claude/card-28-contratar-623d18` (SPEC-045, migration `ContratoAssinadoDoFornecedor`; Contratar sem parcelas, contrato assinado em `ContratoFornecedor`; nada apagado do banco); juntar na main; integração só ao fim das ondas |
| 4 | #34 Link do casal: financeiro do evento | #31, #28 | M | link público, evento | pronto no branch `claude/card-34-link-casal-fe992e` (SPEC-046, migration `LinkDoCasal`, só cria `LinksCasal`; nada apagado); juntar na main; integração só ao fim das ondas |
| 4 | #38 Modelos de Contrato: tela única | #37 | M | casca, modelos-funil, contratos | pronto no branch `claude/card-38-modelos-7f472c` (SPEC-039, migration `ModelosDeContratoUnificados`; modelos do funil migrados para a tela única e tabela `ModelosContratoFunil` apagada); juntar na main; integração só ao fim das ondas |
| 5 | #29 Gráficos de orçamento | #28 (mesma tela) | — | evento-fornecedores | pronto no branch `claude/card-29-graficos-8b5bdc` (SPEC-047, sem migration; só frontend, nada apagado do banco nem da API); juntar na main; integração só ao fim das ondas |
| 5 | #30 Aba Contratos do evento | #28, #34, #36 | — | evento-contratos | pronto no branch `claude/card-30-contratos-38d4f6` (SPEC-048, sem migration; só frontend, nada apagado; sem "quem enviou" e data do envio por falta de campo no banco, ver SPEC-048 §17); juntar na main; integração só ao fim das ondas |
| 5 | #33 Gestão Financeira: parcelas do mês | #32, #41 | — | pagamentos/gestão financeira | pronto no branch `claude/card-33-parcelas-mes-0b0355` (SPEC-044, sem migration; só frontend; sem comprovante do recebimento) |
| 5 | #43 Oportunidade: dados do contratante | #42, #45 | M | oportunidades, clientes, proposta | pendente |
| 5 | #44 Orçamento com parcelas | #41 | — | orçamentos-funil, proposta-publica | pronto no branch `claude/card-44-orcamento-80152a` (SPEC-042) |
| 6 | #20 Resumo absorve Tarefas | #21, #31, #28, #30 | ? | evento-home, tarefas | pendente |
| 6 | #23 Link para o casal cadastrar convites | #22, #34 | M | convidados, link do casal | pendente |
| 6 | #24 RSVP com prazo | #22 (#23 ajuda) | M | rsvp, convidados | pendente |
| 6 | #39 Contrato do funil com as tags | #46, #43, #44, #36, #38 | ? | contratos-funil, Mesclagem | pendente |
| 7 | #40 Seletor de tags com busca e ajuda | #38, #39 | — | modelos de contrato | pendente |
| 7 | #15 Live Preview do modelo | #38, #40 | — | modelos de contrato | pendente |
| 7 | #16 Logo e imagem de fundo no modelo | #15, #38 | M | modelos de contrato | pendente |
| 7 | #18 HTML do orçamento na tela de aceite | — | M | modelo de orçamento, proposta-publica | pendente |
| 7 | #17 Avaliar upload de Word (avaliação) | #15, #16; SPEC-033 | — | nenhum (só avaliação) | pendente |
| 7 | #25 Portaria: QR, link da equipe, check-in | #23, #24 | M | convidados, link da equipe | pendente |

As ondas seguem as dependências. **Dentro de uma onda**, o que não tem conflito de arquivo pode rodar junto (cada um em worktree); o que tem migration entra na fila do banco, **na ordem da tabela**.

Observações sobre a ordem:

- **Onda 1:** #19, #22, #27 e #21 não dividem arquivos. Só o #21 tem migration. Podem ser as quatro sessões em paralelo.
- **Onda 2:** #45 vem depois do #27 porque os dois mexem no cadastro de fornecedor. #36 e #37 não mexem no banco e podem rodar ao lado.
- **Onda 3:** #41 roda **sozinho**. É a maior mudança de banco (remove `ParcelaCasal` e `ParcelaServico` e atravessa Dinheiro, Contratos, Fornecedores e a tela Hoje). Nenhum card com migration roda ao mesmo tempo.
- **Onda 4:** a sequência #32, #31, #28, #34 é em série (cada um usa o que o anterior criou). O #38 pode andar ao lado, porque só depende do #37.
- **Onda 7:** o #25 (portaria) é o último por depender de #23 e #24. Ele está na 1.0 (decidido em 21/11/2026).
- **Backlog (fora destes 30):** #35 "Link do casal com verificação por código enviado por e-mail" é da versão dois, só descoberta. O card #6 antigo do Backlog também segue lá.

## 4. Modelo de brief para abrir uma sessão

Copie, troque o número e cole na sessão nova:

```
Card #N do board "Tarefas Aralu" (texto completo em docs/tarefas-trello.md, seção "## #N").

Antes de qualquer coisa, leia:
- docs/roteiro-execucao.md (regras e definição de pronto)
- docs/proximas-acoes.md (seções 1, 2 e 6)
- docs/produto-v1.md (as seções citadas no card)
- as specs citadas no card, e .cursor/rules/

Passos:
1. Revise ou crie a spec do card (Status: rascunho) e PARE para a aprovação do dono do projeto. Não escreva código antes.
2. Depois de aprovada, implemente só o que o card pede.
3. Rode os testes da definição de pronto. Se criou migration, gere deploy/schema.sql de novo.
4. Atualize produto-v1.md, as specs e a coluna Status do roteiro-execucao.md.
5. Um commit na main. Sem push e sem PR.

Se algo do card não fechar com o código, pare e anote em "Dúvidas para o usuário" de docs/proximas-acoes.md em vez de decidir sozinho.
```

Para sessões em paralelo, acrescente: "Trabalhe no seu worktree, não toque em arquivos fora do que o card pede e não rode migration enquanto outra sessão estiver com uma em andamento."

## 5. Como acompanhar

- Atualize a coluna **Status** da seção 3 ao abrir (em andamento) e ao fechar (pronto, com o hash do commit) cada card.
- Dúvidas que dependem do dono do projeto vão para "Dúvidas para o usuário" em [proximas-acoes.md](proximas-acoes.md).
- Este arquivo e [tarefas-trello.md](tarefas-trello.md) são cópias de documentação: não rodam testes nem build.
