# Próximas ações

Roteiro para continuar o trabalho em outra sessão. Siga na ordem. Na dúvida, pare e pergunte ao usuário: não invente regra.

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
- Não faça commit na `main`. A branch atual é `produto-v1-design-system`.
- Não faça push nem abra PR sem o usuário pedir.

## 3. Situação atual

- Pronto: bloco 1 (casca e design system v2), bloco 2 (criação curta e resumo do evento) e a agenda em calendário.
- Falta: blocos 3 a 17 da [seção 9 do produto-v1](produto-v1.md). Só o bloco 3 tem spec (SPEC-012 v2, aguardando aprovação).

## 4. Trabalho desta sessão: rascunhar specs

Para cada bloco abaixo, escreva ou revise a spec com **Status: rascunho**. Não implemente código.

| Bloco | O que fazer | Fonte no produto-v1 |
|---|---|---|
| 3. Modelos | **Já feito** (aguarda aprovação do usuário). Não mexa. | — |
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

## 5. Se o usuário aprovar uma spec e pedir código

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

## 6. Ao encerrar a sessão

Atualize este arquivo: marque o que ficou pronto e anote as dúvidas para o usuário.

- [x] SPEC-012 (bloco 3): escrita na sessão principal, aguarda aprovação. Não mexer.
- [ ] SPEC-003 (bloco 4)
- [ ] SPEC-007 (bloco 5)
- [ ] SPEC-029 (bloco 6)
- [ ] SPEC-030 (bloco 7)

Dúvidas para o usuário:

- (anote aqui)
