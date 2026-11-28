#!/usr/bin/env bash
# Sugere e confere a versão de um merge para a main (versionamento semântico MAJOR.MINOR.PATCH).
#
# Uso:  bash scripts/versao.sh <ref-base> [ref-head]
#       bash scripts/versao.sh origin/main
#
# 1. Lê a versão publicada na base (arquivo VERSION da ref-base; sem arquivo = primeira versão).
# 2. Classifica os commits de base..head pelos Conventional Commits:
#      tipo!:  ou rodapé "BREAKING CHANGE:"  -> major
#      feat:                                  -> minor
#      qualquer outro (fix, refactor, docs…)  -> patch
# 3. Sugere a próxima versão e confere se o head já traz:
#      - VERSION válido (X.Y.Z) e exatamente um passo acima da base;
#      - salto pelo menos do tamanho sugerido (pode ser maior, nunca menor);
#      - CHANGELOG.md com a seção "## [X.Y.Z]".
# Sai com 0 se está tudo certo e 1 se o PR precisa ajustar a versão.
set -euo pipefail

base="${1:?informe a ref base, ex.: origin/main}"
head="${2:-HEAD}"
semver='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'

ler_versao() { { git show "$1:VERSION" 2>/dev/null || true; } | tr -d '[:space:]'; }
peso() { case "$1" in major) echo 3 ;; minor) echo 2 ;; *) echo 1 ;; esac; }

relatorio=""
dizer() { relatorio+="$1"$'\n'; echo "$1"; }
fechar() {
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then printf '%s' "$relatorio" >> "$GITHUB_STEP_SUMMARY"; fi
  exit "$1"
}

if [[ -z "$(git log --no-merges --format=%H "$base..$head" | head -1)" ]]; then
  dizer "Nenhum commit novo em $head em relação a $base: nada para versionar."
  fechar 1
fi

# --- classificação pelos commits -------------------------------------------------------------
assuntos="$(git log --no-merges --format=%s "$base..$head")"
corpos="$(git log --no-merges --format=%b "$base..$head")"

nivel=patch
motivo="só correções, ajustes internos ou documentação"
if grep -qE '^[a-z]+(\([^)]*\))?!:' <<<"$assuntos" || grep -qE '^BREAKING[ -]CHANGE:' <<<"$corpos"; then
  nivel=major
  motivo="há commit marcado como quebra de compatibilidade (tipo!: ou BREAKING CHANGE)"
elif grep -qE '^feat(\([^)]*\))?:' <<<"$assuntos"; then
  nivel=minor
  motivo="há funcionalidade nova (feat) sem quebra de compatibilidade"
fi

total=$(grep -c . <<<"$assuntos" || true)
feats=$(grep -cE '^feat(\([^)]*\))?!?:' <<<"$assuntos" || true)
fixes=$(grep -cE '^fix(\([^)]*\))?!?:' <<<"$assuntos" || true)

# --- versão sugerida ---------------------------------------------------------------------------
v_base="$(ler_versao "$base")"
v_head="$(ler_versao "$head")"

dizer "## Versão do merge"
dizer ""
dizer "- Base: \`$base\` → versão publicada: **${v_base:-nenhuma (primeira versão)}**"
dizer "- Commits analisados: $total ($feats feat, $fixes fix)"
dizer "- Classificação: **$nivel** — $motivo"

if [[ -z "$v_base" ]]; then
  sugerida="1.0.0"
  dizer "- Sugestão: **$sugerida** (primeira versão em produção)"
else
  if [[ ! "$v_base" =~ $semver ]]; then
    dizer "- ERRO: VERSION da base (\`$v_base\`) não está no formato X.Y.Z."
    fechar 1
  fi
  IFS=. read -r M m p <<<"$v_base"
  case "$nivel" in
    major) sugerida="$((M + 1)).0.0" ;;
    minor) sugerida="$M.$((m + 1)).0" ;;
    patch) sugerida="$M.$m.$((p + 1))" ;;
  esac
  dizer "- Sugestão: **$sugerida**"
fi
dizer "- Versão no PR (VERSION): **${v_head:-ausente}**"
dizer ""

# --- conferência -------------------------------------------------------------------------------
erros=()
if [[ -z "$v_head" ]]; then
  erros+=("Falta o arquivo VERSION. Crie com a versão $sugerida.")
elif [[ ! "$v_head" =~ $semver ]]; then
  erros+=("VERSION (\`$v_head\`) não está no formato X.Y.Z.")
elif [[ -n "$v_base" ]]; then
  IFS=. read -r M m p <<<"$v_base"
  if   [[ "$v_head" == "$((M + 1)).0.0" ]];        then salto=major
  elif [[ "$v_head" == "$M.$((m + 1)).0" ]];       then salto=minor
  elif [[ "$v_head" == "$M.$m.$((p + 1))" ]];      then salto=patch
  else salto=""
  fi
  if [[ "$v_head" == "$v_base" ]]; then
    erros+=("VERSION continua em $v_base, igual à base. Suba para $sugerida.")
  elif [[ -z "$salto" ]]; then
    erros+=("VERSION $v_head não é o próximo passo depois de $v_base. Use $((M + 1)).0.0, $M.$((m + 1)).0 ou $M.$m.$((p + 1)) (sugerida: $sugerida).")
  elif (( $(peso "$salto") < $(peso "$nivel") )); then
    erros+=("VERSION $v_head é um $salto, mas os commits pedem pelo menos $nivel ($motivo). Use $sugerida.")
  fi
fi

if [[ -n "$v_head" ]] && ! { git show "$head:CHANGELOG.md" 2>/dev/null || true; } | grep -qF "## [$v_head]"; then
  erros+=("CHANGELOG.md não tem a seção \"## [$v_head]\" com o que entra nesta versão.")
fi

if (( ${#erros[@]} )); then
  dizer "### ❌ A versão precisa de ajuste"
  for e in "${erros[@]}"; do dizer "- $e"; done
  dizer ""
  dizer "Peça ao agente: \"prepare a versão do merge para a main\" (skill versao-release)."
  fechar 1
fi

dizer "### ✅ Versão $v_head pronta para o merge"
fechar 0
