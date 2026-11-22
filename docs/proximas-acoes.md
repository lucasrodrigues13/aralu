# Próximas ações

Roteiro para continuar o trabalho em outra sessão. Siga na ordem. Na dúvida, pare e pergunte ao usuário: não invente regra.

> **Desde 21/11/2026 o trabalho segue os cards do Trello**, copiados em [tarefas-trello.md](tarefas-trello.md), na ordem e com o paralelismo de [roteiro-execucao.md](roteiro-execucao.md). Onde este arquivo e o roteiro divergirem, vale o roteiro. As seções 1, 2 e 6 deste arquivo continuam valendo.

## 0. Retomar daqui (atualizado em 22/11/2026)

Tudo o que foi feito em 22/11 está commitado e enviado para a `main`. O deploy na VPS (http://voltexstores.com) roda a cada push. Não há worktrees nem branches `claude/*` pendentes. Faça um item por vez, nesta ordem. Itens marcados como **decisão** precisam do usuário antes de codar.

### 0.1 Conferir na tela o que entrou hoje (ninguém testou no site com login)

Testes e build passaram, mas as telas abaixo só foram vistas em teste unitário ou com API de mentira. Peça ao usuário para entrar no site, ou suba o ambiente local com `just up`, e confira:

- [ ] **Gráfico de orçamento** (aba Fornecedores do evento): o excesso aparece em vermelho e a barra fica com contorno vermelho. Serviço contratado entra só pelo contratado, sem somar o estimado dele. Caso real: orçamento 150.000, Buffet 150.000 e Foto 2.000 → "Acima do orçamento em R$ 2.000,00". Código: `pages/eventos/orcamento-graficos.ts`.
- [ ] **Refazer parcelamento com parcela paga** (aba Dinheiro): alerta vermelho no modal e botão vermelho; salvar troca as parcelas. SPEC-043.
- [ ] **Cliente sem login e link do cliente ([SPEC-060](specs/060-cliente-sem-login-e-link-do-cliente.md))**: cadastro de cliente sem aba Acesso nem coluna Último acesso, e sem papel marcado de início; o link copiado é `/cliente/<token>`; conta antiga de cliente não entra. Links `/casal/...` já enviados param de abrir: reenviar no formato novo (decisão pendente sobre redirecionar).
- [ ] **Tela do cliente** (link do cliente): abas Financeiro e Convidados; comprovante como ícone + "Comprovante". Modal "Link do cliente" (antes "Link do casal"); o Copiar copia o link inteiro.
- [ ] **Aba Dinheiro do organizador**: coluna Comprovante só com ícones (abrir, enviar, excluir).
- [ ] **Convites (SPEC-059)**: formulário igual no organizador e no cliente (menos Observação; no cliente grava "Preenchido pelo cliente" sem mostrar). Vários convidados, gênero, faixa etária, convidado principal obrigatório, único e com telefone. Data de envio única por evento, fora do formulário. Lista de convites recolhida; ao expandir, mostra os convidados.
- [ ] **Planilha de convidados**: o botão abre o modal de instruções com o download dentro. O modelo traz dois convites de exemplo (com aviso para apagar), sem Mesa, Custo e Pagamento, e com Gênero e Principal em lista suspensa. A importação vai para uma fila no banco, com modal de histórico e erros por linha.
- [ ] **Tooltips**: todo botão só de ícone das listas mostra o nome da ação (regra no `design-system.md`). Confira também os botões declarados em várias linhas (`casca.component.ts`, `tarefas.page.ts`, `evento-tarefas.component.ts`, `checklist-tarefa.ts`, `estagios-funil.dialog.ts`, menu do lead em `oportunidades.page.ts`, `tema-botao.ts`). O grep simples não confirma se eles têm `matTooltip`.

### 0.2 Câmera da portaria não abre no celular (infra, fora deste repositório)

O site está em **http://**, e o navegador só libera a câmera com **HTTPS**. Por isso `navigator.mediaDevices` vem vazio e a tela diz "Este navegador não deixa usar a câmera" (`pages/portaria/leitor-qr.component.ts:34`).

- [ ] Ativar HTTPS para `voltexstores.com` no proxy das portas 80/443 da VPS. Ele fica em `/opt/proxy`, que vem do repositório `jm-reboques-lp`, pasta `infra/proxy`; veja o comentário em `compose.production.yaml`. Se for Caddy, use o domínio no endereço do site, e o certificado sai sozinho (com o DNS apontando para a VPS e as portas 80/443 abertas).
- [ ] Opcional, neste repositório: trocar a mensagem por uma que explique a falta de HTTPS quando `!window.isSecureContext`.

### 0.3 Fila de importação de convidados: confirmar a robustez

A fila é processada dentro da própria API, sem worker (decisão do usuário: nada de tecnologia nova).

- [ ] Confira em `Project.Infrastructure/Convidados/ProcessadorImportacoes.cs` se uma importação "em andamento" é retomada ou marcada como falha quando a API reinicia (deploy), para não ficar presa para sempre. Se não for, leve ao usuário antes de mudar.

### 0.4 Decisões em aberto (pergunte antes de codar)

- [ ] **Decisão:** os cards **Estimado** e **Prova real** da aba Fornecedores ainda somam o estimado dos serviços já contratados (regra da SPEC-018 §8). O gráfico já não soma. Mudar os cards exige mexer no backend (`BudgetCalculo.Resumo`) e na SPEC-018.
- [ ] **Decisão:** alerta por serviço, por exemplo "Contratado acima do estimado em R$ X" (hoje o Buffet contratou 150.000 com estimado de 15.500, e nada avisa). Precisa de spec.
- [ ] **Decisão:** na tela do cliente, o botão do contrato assinado ainda mostra "Contrato: nome-do-arquivo". Pode virar só ícone + "Contrato", como foi feito com o comprovante.

### 0.5 Anterior a 22/11

## 0-antigo. Próxima tarefa (atualizada em 20/11/2026)

A SPEC-032 (assistentes) e a SPEC-031 parte D (ajustes do formulário do funil) estão **implementadas e commitadas na `main`**. Backend: 102 testes de unidade e 54 de integração passando. Frontend: `ng build` e 63 testes passando. O usuário ainda não conferiu na tela.

### Passo 1. Fechar o que a SPEC-032 deixou combinado (§18 da spec)

O item restante (3) já estão decididos e detalhados (arquivos, regra e testes) na §18 da [SPEC-032](specs/032-assistentes.md). **Um passo por sessão**: leia só a §18, faça o primeiro passo pendente (`[ ]`), rode os testes, marque `[x]` lá e aqui, e commite. Não precisa perguntar de novo. Resumo:

1. ~~**Excluir o que ela criou (§17, ponto 6)**~~ — feito em 20/11/2026: coluna `CriadoPor` nas quatro tabelas (migration `AutoriaDoFunil`); a assistente exclui só o que criou (403 no resto), a dona exclui tudo.
2. ~~**Pendências da Hoje (§17, ponto 8)**~~ — feito em 20/11/2026: card "Tarefas sem responsável" na Hoje da dona, com troca de responsável na linha.
3. ~~**Admin (§4)**~~ — feito em 20/11/2026: `GET /api/v1/admin/assistentes` e lista só de consulta na tela do Admin. Com isso, a §18 da SPEC-032 está toda concluída.
4. ~~**"Só os dela" no dinheiro**~~ — feito em 20/11/2026: Pagamentos e Estatísticas de eventos filtram pelos eventos liberados.

### Passo 2. Próximo bloco do produto-v1 (§9)

Falta spec dos blocos 8 a 12 e 14 a 17 (convidados, fornecedores, roteiro e cronograma no evento, link do cliente, resumo do dia, financeiro da empresa, agenda, aniversários). Escolha com o usuário qual vem primeiro e rascunhe a spec (seção 5 deste arquivo).

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
4. Atores: `Organizer` e `Assistant`. A role `Client` não existe mais; o cliente usa o link (RF-056).
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
- SPEC-030 §17: plataforma de assinatura eletrônica (pendência). Rascunho aberto em 21/11/2026 como [SPEC-033](specs/033-assinatura-eletronica.md), com a revisão da tela de contratos do funil; falta escolher o fornecedor e o nível de validade jurídica.
