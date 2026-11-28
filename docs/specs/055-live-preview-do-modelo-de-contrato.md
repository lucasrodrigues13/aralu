# 055. Modelo de contrato: Live Preview

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #15, com as opções mais simples e conservadoras nos pontos em aberto, listados na seção 17).** Fonte: card #15 do Trello ([tarefas-trello.md](../tarefas-trello.md)); [produto-v1.md](../produto-v1.md) 5.10. Evolui o "Ver como fica" da [SPEC-030](030-contrato-do-evento.md) §6.1 e usa a [SPEC-039](039-modelos-de-contrato-tela-unica.md), a [SPEC-050](050-contrato-do-funil-com-tags.md) §6.3 e a [SPEC-053](053-seletor-de-tags-do-modelo-de-contrato.md).

## 1. Identificador e nome

SPEC-055. Live Preview do modelo de contrato.

## 2. Objetivo

A cerimonialista cola o texto do contrato, troca os dados por tags e, com um botão, vê ao lado do texto como o contrato chegará ao cliente, com exemplos no lugar das tags, sem sair do modal.

## 3. Requisitos relacionados

RF-098 (contrato). Sem RF novo.

## 4. Atores e permissões

Quem edita modelos de contrato, como na SPEC-039. Nada de permissão nova.

## 5. Pré-condições

Modal "Novo/Editar modelo de contrato" aberto.

## 6. Fluxo principal

1. O modal tem o botão **"Live Preview"** (no lugar do seletor "Editar texto / Ver como fica"). O texto fica sempre visível para edição.
2. Ao clicar, abre à direita (em tela larga; abaixo do texto no celular) o painel **"Como chega ao cliente"**: título do modelo e o texto em formato de folha, com cada `{{tag}}` trocada pelo exemplo da tag, destacado.
3. O painel atualiza a cada tecla (e ao inserir tag pelo seletor da SPEC-053). O botão passa a "Fechar Live Preview".
4. Tag escrita que não existe na lista fica como digitada, destacada em amarelo, e um aviso lista as tags que não serão trocadas.

## 7. Fluxos alternativos

Texto vazio: a folha mostra só o título. Salvar não depende do preview.

## 8. Regras de negócio

- Só pré-visualização: nada é salvo nem enviado. O contrato real continua sendo gerado como na SPEC-050.
- **Lista única:** exemplos e tags vêm de `Mesclagem.Campos` via `GET /api/v1/contratos/campos`; a lógica é a de `mesclagem.ts`. Sem lista nova.
- O texto é escapado antes da troca; só `<mark>` e `<br>` entram como HTML.

## 9. Validações

Nenhuma nova.

## 10. Estados

Painel aberto ou fechado (só na tela, não persiste). Abre fechado.

## 11. Dados necessários

Nenhum: sem migration, sem endpoint novo.

## 12. Interface

Modal mais largo para caber texto e folha lado a lado. Folha branca, fonte com serifa, título centralizado. Nota sob a folha: os destacados são exemplos; no contrato real, sem dado aparece `________`.

## 13. Erros

Se a lista de tags não carregar, as tags ficam como digitadas e destacadas como inexistentes.

## 14. Critérios de aceite

1. Clicar em "Live Preview" mostra a folha ao lado do texto com `{{contratante_nome}}` trocada pelo exemplo.
2. Digitar no texto atualiza a folha na hora.
3. `{{apelido}}` (inexistente) aparece destacada e listada no aviso.
4. Fechar o painel volta ao modal só com o texto.

## 15. Cenários de teste

Frontend (`mesclagem.spec.ts`): `previaDestacada` destaca tag desconhecida com classe própria e escapa HTML; `tagsDesconhecidas` lista sem repetir e ignora caixa. A tela é conferida no navegador.

## 16. Dependências

#38 (SPEC-039), #40 (SPEC-053). Vem depois: #16 (logo e fundo, que passam a aparecer no preview).

## 17. Premissas e pontos não definidos (opção mais simples e conservadora; o dono pode rever)

1. **Preview com exemplos fixos** da lista de tags, não com dados de um evento real escolhido. Escolher um evento para ver com dados reais fica para depois.
2. **Painel ao lado** (não página nem aba nova), no mesmo modal.
3. **Substitui o seletor "Ver como fica"**: a função continua, agora sempre ao lado do texto.
4. **Sem logo nem fundo** na folha: entraram no card #16 ([SPEC-056](056-logo-e-fundo-do-modelo-de-contrato.md)), que usa a mesma folha.
5. **Sem migration.**
