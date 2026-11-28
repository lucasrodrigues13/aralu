---
name: versao-release
description: Define a versão (MAJOR.MINOR.PATCH) de toda mudança que vai para a main. Use sempre que for abrir, preparar ou atualizar um PR para a main (ou main-v1), fazer merge na main, preparar uma release, criar a tag de versão, ou quando o check "Versão" do GitHub falhar. Classifica a mudança em patch, minor ou major, sugere o próximo número, atualiza VERSION e CHANGELOG.md e só segue com a confirmação do dev.
---

# Versão do merge para a main

Nenhuma mudança entra na `main` sem declarar a versão em que entra. A versão fica em dois arquivos na raiz:

- `VERSION`: só o número, ex.: `1.4.2`.
- `CHANGELOG.md`: uma seção `## [1.4.2] - AAAA-MM-DD` por versão, a mais nova no topo.

O workflow `.github/workflows/versao.yml` roda `scripts/versao.sh` em todo PR para a `main` e falha se a versão estiver faltando, errada ou menor do que a mudança pede. Esta skill faz o trabalho antes, para o PR já nascer certo.

## Regras de classificação

| Nível | Quando | Exemplo |
|---|---|---|
| **major** (`X`.0.0) | Quebra o que já existe: fluxo que o usuário precisa reaprender, rota/link público ou contrato de API removido ou alterado, integração (webhook, Asaas) que muda de formato, migração que apaga dados ou exige passo manual no deploy, variável de ambiente nova obrigatória | Remover o link antigo do cliente; trocar o formato do webhook |
| **minor** (x.`Y`.0) | Funcionalidade nova, sem quebrar nada | Tela nova, importação por planilha, novo relatório |
| **patch** (x.y.`Z`) | Só correção, ajuste visual, refatoração, segurança sem mudança de comportamento, dependências, documentação | Corrigir cálculo de parcela, ajuste de CSS |

- Ao subir um número, os da direita zeram: `1.4.2` → `1.5.0` → `2.0.0`.
- Vale o maior nível presente: um único `feat` no meio de vinte `fix` já faz minor.
- O dev pode escolher um nível **maior** do que o sugerido, nunca menor.
- A primeira versão em produção é `1.0.0`.

## Passo a passo

1. **Descubra a base.** Em geral `origin/main`; se o PR for para outra branch de produção (ex.: `main-v1`), use ela. Rode `git fetch origin` antes.

2. **Rode o script** (Git Bash no Windows):

   ```bash
   bash scripts/versao.sh origin/main
   ```

   Ele mostra a versão publicada, os commits analisados, a classificação e a sugestão. Antes do ajuste ele termina com ❌; isso é esperado.

3. **Não confie só nas mensagens de commit.** Leia o diff (`git diff origin/main...HEAD --stat` e os arquivos que importam) e procure o que o script não enxerga:
   - rota removida/renomeada em `src/frontend/src/app/app.routes.ts` ou controller removido na API → major;
   - migration em `src/backend/Project.Infrastructure/Persistencia/Migrations/` que faz `DropColumn`/`DropTable` ou muda tipo de coluna com dados → major;
   - `.env.example` ou `compose.production.yaml` com variável nova sem valor padrão → major;
   - commit `fix:` ou `refactor:` que na prática entrega funcionalidade nova → minor.
   Se o diff pedir um nível acima do script, a sugestão é a do diff, e o commit de versão deve deixar isso explícito (veja o passo 6).

4. **Apresente a sugestão ao dev e espere a confirmação.** Mostre de forma curta:
   - versão atual → versão sugerida, e o nível;
   - o motivo (os 2 ou 3 commits ou arquivos que decidem o nível);
   - o rascunho do CHANGELOG.
   Use o AskUserQuestion com a sugestão como primeira opção "(Recomendado)" e os outros níveis válidos como alternativa. Não grave nada antes da resposta.

5. **Grave a versão escolhida.**
   - `VERSION`: só o número, com quebra de linha no fim.
   - `CHANGELOG.md`: nova seção no topo, logo abaixo do cabeçalho, no formato:

     ```markdown
     ## [1.5.0] - 2026-12-03

     ### Adicionado
     - Importação de convidados por planilha (SPEC-070).

     ### Corrigido
     - Cálculo da parcela atrasada no painel financeiro.
     ```

     Grupos possíveis, nesta ordem e só os que tiverem itens: `Quebra de compatibilidade`, `Adicionado`, `Alterado`, `Corrigido`, `Segurança`, `Removido`. Escreva para quem usa o produto, uma linha por mudança relevante, citando a SPEC quando houver. Não liste commit por commit.

6. **Commit.** `chore(release): v1.5.0`. Se o nível foi decidido pelo diff e não pelos commits (passo 3), e for major, use `chore(release)!: v2.0.0` e um rodapé `BREAKING CHANGE: <o que quebra>`, para o script chegar à mesma conclusão.

7. **Confira** rodando de novo `bash scripts/versao.sh origin/main`: tem que terminar com ✅.

8. **Depois do merge**, crie a tag anotada na branch de produção atualizada e envie (só com o ok do dev):

   ```bash
   git checkout main && git pull
   git tag -a v1.5.0 -m "v1.5.0"
   git push origin v1.5.0
   ```

   Opcional: `gh release create v1.5.0 --notes-from-tag` ou com o trecho do CHANGELOG.

## Quando o check "Versão" falha no PR

O resumo do job diz o que falta. Os casos comuns:

- **Falta VERSION ou a seção do CHANGELOG** → siga os passos 2 a 7.
- **"é um patch, mas os commits pedem minor"** → suba para a versão sugerida; não reescreva mensagens de commit para baixar o nível.
- **"não é o próximo passo"** → a `main` recebeu outra versão depois que o PR foi aberto. Traga a `main` para a branch, resolva o conflito em `VERSION`/`CHANGELOG.md` mantendo a seção da `main` e recalcule a partir da nova base.
