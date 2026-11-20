# Próximas ações

Roteiro para continuar o trabalho em outra sessão. Siga na ordem. Na dúvida, pare e pergunte ao usuário: não invente regra.

## 0. Próxima tarefa (atualizada em 20/11/2026)

A SPEC-032 (assistentes) e a SPEC-031 parte D (ajustes do formulário do funil) estão **implementadas e commitadas na `main`**. Backend: 102 testes de unidade e 52 de integração passando. Frontend: `ng build` e 63 testes passando. O usuário ainda não conferiu na tela.

### Passo 1. Fechar o que a SPEC-032 deixou combinado (§18 da spec)

Pergunte ao usuário o que quer fazer, na ordem que ele escolher:

1. **Excluir o que ela criou (§17, ponto 6):** hoje a assistente não exclui lead, orçamento, contrato nem tarefa do funil. Precisa guardar quem criou cada item (coluna de autor nas quatro tabelas) e liberar a exclusão só do que é dela.
2. **Pendências da Hoje (§17, ponto 8):** card de tarefas abertas de assistente removida na Hoje da dona.
3. **Admin (§4):** o Admin gerenciar as assistentes de qualquer conta.
4. **"Só os dela" no dinheiro:** a tela Pagamentos e as Estatísticas de eventos não filtram por evento liberado.

### Passo 2. Próximo bloco do produto-v1 (§9)

Falta spec dos blocos 8 a 12 e 14 a 17 (convidados, fornecedores, roteiro e cronograma no evento, link do casal, resumo do dia, financeiro da empresa, agenda, aniversários). Escolha com o usuário qual vem primeiro e rascunhe a spec (seção 5 deste arquivo).

### Pontos do código que ajudam

- Permissões da assistente: `AssistenteEndpoints.AplicarPermissoes` (middleware que lê o banco a cada pedido), política `Financeiro` e `EscopoAssistente` (filtro "só os dela") em `src/backend/Project.Api/Conta`.
- Menus e guardas no frontend: `core/auth.guard.ts` (`donaGuard`, `financeiroGuard`) e `layout/casca.component.ts`.
- Seletor de responsáveis compartilhado: `shared/responsaveis.ts` (tarefas do evento e do funil).
- Em arquivos `.cs` e `.ts` o Git converte LF/CRLF; se um script de edição não achar um trecho de várias linhas, confira os finais de linha.

## 1. Leia antes de tudo

1. [.cursor/rules/](../.cursor/rules/): regras do projeto (vale tudo que está lá).
2. [docs/produto-v1.md](produto-v1.md): escopo da 1.0. A seção 9 traz a ordem dos blocos e a seção 10, as pendências.
3. [docs/requirements.md](requirements.md): os RFs. A seção 2.9 tem os RFs novos (RF-087 a RF-109).
4. [docs/design-system.md](design-system.md): visual. Todo cadastro e toda edição abrem em modal.
5. [docs/specs/008-cadastro-completo-de-evento.md](specs/008-cadastro-completo-de-evento.md): exemplo de spec já revisada e implementada. Use como modelo de formato.

## 2. Regras que não podem ser quebradas

- Código só sai de spec com **Status: aprovada**. Quem aprova é o usuário.
- Nunca renumere RF. O próximo RF livre é o **RF-110**.
- Não altere RF nem decisão marcada como Definido sem pedido do usuário.
- Não crie nem edite nada na Assessoria VIP nem em outro site de referência.
- Commits na `main` estão liberados enquanto o produto não for para produção (decisão de 18/11/2026). O versionamento de verdade começa no lançamento.
- Não faça push nem abra PR sem o usuário pedir.

## 3. Situação atual

- Pronto: bloco 1 (casca e design system v2), bloco 2 (criação curta e resumo do evento), bloco 3 (modelos, SPEC-012 v2) e a agenda em calendário.
- Bloco 4 em código ([SPEC-003](specs/003-tarefas-do-evento.md) v3), exceto a seção 17. Anexos sobem (JPG, PNG ou PDF até 5 MB).
- Prontos em 18/11/2026: bloco 5 ([SPEC-007](specs/007-dashboards.md) v2, tela Hoje), bloco 6 ([SPEC-029](specs/029-dinheiro-do-evento.md), menos comprovantes) e bloco 7 ([SPEC-030](specs/030-contrato-do-evento.md) v2, contratos; assinatura pendente).
- Falta spec: blocos 8 a 17 da [seção 9 do produto-v1](produto-v1.md).

## 4. Tarefa 1: implementar o bloco 3 (SPEC-012 v2)

Spec aprovada: [docs/specs/012-modelos-de-evento.md](specs/012-modelos-de-evento.md). Implemente exatamente o que está nela, na ordem abaixo. Rode os testes da seção 6 a cada passo e faça um commit por passo.

1. Prazo legível (seção 8.1): conversão e exibição de "dias antes", com teste de unidade no backend ou no frontend.
2. Campo "grupo" na tarefa do modelo e na tarefa do evento (8.2): migration, cópia na criação do evento, `deploy/schema.sql` gerado de novo.
3. Leitura do texto colado e da planilha (8.3 e 8.4), com testes de unidade dos exemplos da spec.
4. Modais de importar (6.3), aplicar modelo (6.4) e salvar como modelo (6.5), com teste de integração.
5. Pergunta ao mudar a data do evento (6.6).
6. Tirar a aba Permissões do editor de modelo (8.5). Não apague as colunas do banco.
7. Confira na tela (`docker compose up -d --build migrate api` e `npm --prefix src/frontend run start`) e marque o bloco 3 como pronto no [produto-v1](produto-v1.md).

Se algo da spec não fechar com o código, pare e anote em "Dúvidas para o usuário".

## 5. Tarefa 2: rascunhar specs

Depois da tarefa 1. Para cada bloco abaixo, escreva ou revise a spec com **Status: rascunho**. Não implemente código dessas specs.

| Bloco | O que fazer | Fonte no produto-v1 |
|---|---|---|
| 3. Modelos | Spec aprovada; é a tarefa 1. | — |
| 4. Tarefas | Revisar [SPEC-003](specs/003-tarefas-do-evento.md). Leia antes a SPEC-012 v2: ela cria o campo "grupo" na tarefa do evento | 5.5 |
| 5. Tela Hoje | Reescrever [SPEC-007](specs/007-dashboards.md) | 5.2 |
| 6. Dinheiro do evento | Criar `specs/029-dinheiro-do-evento.md` | 5.9 e 5.1 (Pix) |
| 7. Contrato do evento | Criar `specs/030-contrato-do-evento.md` | 5.10 |

Como fazer cada uma:

1. Copie as 17 seções da SPEC-008 (mesmos títulos, mesma ordem).
2. Use só o que está no produto-v1 e nos RFs citados. Cite os RFs na seção 3.
3. O que não estiver decidido vai para a seção 17, "Premissas e pontos não definidos". Não decida sozinho.
4. Atores: `Organizer` e `Assistant`. A role `Client` não existe mais; o casal usa o link (RF-056).
5. Ao terminar cada spec, faça um commit só com ela: `docs: rascunho da SPEC-0XX`.

## 6. Como implementar e testar

Siga a skill [.cursor/skills/frontend/SKILL.md](../.cursor/skills/frontend/SKILL.md) e a de backend em `.cursor/skills/backend/`. Antes de dizer que terminou, rode:

```bash
dotnet test tests/Project.Tests
```

```bash
npm --prefix src/frontend run build
```

```bash
cd src/frontend && npx ng test --watch=false
```

Os testes de integração (`dotnet test tests/Project.IntegrationTests`) precisam do Docker ligado.

Migration nova exige também gerar o script de deploy de novo:

```bash
dotnet tool run dotnet-ef migrations script --idempotent --project src/backend/Project.Infrastructure --startup-project src/backend/Project.Api -o deploy/schema.sql
```

## 7. Ao encerrar a sessão

Atualize este arquivo: marque o que ficou pronto e anote as dúvidas para o usuário.

- [x] Bloco 3 implementado (SPEC-012 v2 aprovada)
- [x] SPEC-003 (bloco 4) — aprovada e implementada em 18/11/2026, exceto parte da seção 17 (atrasada automática, exclusão)
- [x] SPEC-007 (bloco 5) — aprovada em 18/11/2026
- [x] SPEC-029 (bloco 6) — aprovada em 18/11/2026
- [x] SPEC-030 (bloco 7) — aprovada em 18/11/2026
- [x] SPEC-020 v2 (parte do bloco 16: quadro em cartões e lead → cliente) — aprovada e implementada em 20/11/2026
- [x] SPEC-031 (resto do bloco 16, funil) — aprovada em 20/11/2026 com as sugestões da §17; implementar na ordem A, B, C, D
  - [x] Parte A (estágios configuráveis e arrastar) — implementada em 20/11/2026
  - [x] Parte B (retorno, origem e contato repetido) — implementada em 20/11/2026
  - [x] Parte C (proposta por link) — implementada em 20/11/2026
  - [x] Parte D (ajustes do formulário) — implementada em 20/11/2026
- [x] SPEC-032 (assistentes, parte do bloco 13) — aprovada com as sugestões da §17 e implementada em 20/11/2026
  - [x] Parte A (conta da assistente)
  - [x] Parte B (permissões)
  - [x] Parte C ("só os dela" e responsáveis)
  - [ ] Pendências da §18 da spec (excluir o que ela criou, pendências da Hoje, Admin, dinheiro "só os dela")

Respondidas em 18/11/2026 (registradas nas specs): "Esta semana"/"Para conferir" descartadas; "N" da Hoje = tarefas ativas com prazo hoje; respostas abaixo do esperado = menos de 2 meses e 50% sem resposta; Resultado vira Saldo; cobrar sem Pix pede a chave; contratos viram tela própria com campos de mesclagem (SPEC-030 v2).

Dúvidas para o usuário:

- SPEC-003 §17: atrasada automática, exclusão de tarefa.
- SPEC-030 §17: plataforma de assinatura eletrônica (pendência).
