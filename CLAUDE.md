# aralu

## Testes e build

- Rode testes e build só quando a mudança tocar código (`src/`, `tests/`, configuração de build ou deploy).
- Mudança só em documentação (`docs/`, specs, `README.md`, arquivos `.md`) não roda testes nem build.

## Versão

- Todo merge para a `main` declara a versão (`VERSION` + `CHANGELOG.md`, MAJOR.MINOR.PATCH). Use a skill `versao-release` antes de abrir ou atualizar PR para a `main`; o check "Versão" do CI bloqueia o PR sem isso.
