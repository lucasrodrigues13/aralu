# 053. Modelo de contrato: seletor de tags com busca e ajuda (?)

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #40, com as opções mais simples e conservadoras nos pontos em aberto, listados na seção 17).** Fonte: card #40 do Trello ([tarefas-trello.md](../tarefas-trello.md)); [produto-v1.md](../produto-v1.md) 5.10. Revisa a [SPEC-030](030-contrato-do-evento.md) §6.1 (os botões de campo soltos saem) e usa a [SPEC-039](039-modelos-de-contrato-tela-unica.md) (tela única de modelos) e a [SPEC-050](050-contrato-do-funil-com-tags.md) §6.3 (lista de tags).

## 1. Identificador e nome

SPEC-053. Seletor de tags com busca e ajuda no editor do modelo de contrato.

## 2. Objetivo

A cerimonialista insere tags no texto do modelo escolhendo numa lista com busca, e consulta num modal o que cada tag significa e de onde vem o valor, sem a lista de botões soltos ao lado do texto.

## 3. Requisitos relacionados

RF-098 (contrato). Sem RF novo.

## 4. Atores e permissões

Quem edita modelos de contrato, como na SPEC-039. Nada de permissão nova.

## 5. Pré-condições

Modal "Novo/Editar modelo de contrato" aberto.

## 6. Fluxo principal

1. No modo "Editar texto" aparece o campo **"Inserir tag no cursor"**: um select com busca (digitar filtra por tag, descrição ou fonte, sem diferenciar acento nem maiúsculas). Cada opção mostra a tag e o que ela representa.
2. Escolher uma opção insere `{{tag}}` no texto **na posição do cursor** (ou no lugar do trecho selecionado), devolve o foco ao texto com o cursor logo depois da tag e limpa a busca. Sem o cursor posicionado, insere no fim.
3. O botão **"?"** ao lado abre um modal "Como usar as tags": explica em poucas linhas o que é uma tag (trocada pelos dados reais ao gerar o contrato; sem dado, aparece `________`) e lista **todas** as tags em tabela com: tag, o que representa, de qual campo do sistema puxa o valor e exemplo.
4. No modo "Ver como fica" o seletor não aparece (só o texto com exemplos destacados, como na SPEC-030).

## 7. Fluxos alternativos

Busca sem resultado: a lista mostra "Nenhuma tag encontrada". Tag digitada à mão continua valendo como antes; o seletor é só um atalho.

## 8. Regras de negócio

- **Lista única:** `Mesclagem.Campos` (backend) é a fonte do seletor, do modal, do "Ver como fica" e do preenchimento (SPEC-050). Cada item tem `Marca`, `Rotulo` (o que representa), `Fonte` (de onde puxa) e `Exemplo`. Não existe outra lista no frontend.
- Endpoint `GET /api/v1/contratos/campos` passa a devolver também `fonte`. Campo novo na resposta, nada removido.

## 9. Validações

Nenhuma nova.

## 10. Estados

Sem estado novo.

## 11. Dados necessários

Nenhum dado novo: sem migration.

## 12. Interface

Acima do texto: campo de busca "Inserir tag no cursor" e o botão "?" (ícone de ajuda, com rótulo acessível). A coluna lateral de botões de campo foi removida; o texto ocupa a largura toda. O modal de ajuda é largo, com tabela rolável no celular.

## 13. Erros

Sem erro novo. Se a lista de tags não carregar, o seletor fica vazio.

## 14. Critérios de aceite

1. Digitar "valor" no seletor mostra `contrato_valor`; escolher insere `{{contrato_valor}}` na posição do cursor.
2. O "?" lista todas as tags de `Mesclagem.Campos`, cada uma com tag, o que representa, fonte e exemplo.
3. Toda tag da lista tem descrição, fonte e exemplo preenchidos.
4. Não há mais botões de campo ao lado do texto.

## 15. Cenários de teste

Unitário backend (`MesclagemTests`): toda tag traz rótulo, fonte e exemplo. Frontend (`mesclagem.spec.ts`): `filtrarCampos` (sem busca, por tag, descrição e fonte, sem acento) e `inserirMarca` (já existente). Integração (fim das ondas): `GET /contratos/campos` devolve `fonte`.

## 16. Dependências

#38 (SPEC-039), #39 (SPEC-050). Vêm depois: #15 (Live Preview), #16 (logo e fundo).

## 17. Premissas e pontos não definidos (opção mais simples e conservadora; o dono pode rever)

1. **Select com busca** feito com o campo de autocompletar do Angular Material, não um select puro: é o que permite digitar para filtrar.
2. **Busca** por tag, descrição e fonte, sem acento nem caixa.
3. **Fonte em texto fixo no backend** ("Cadastro de clientes (ou dados do contratante da oportunidade), Nome"), mantido junto da tag para não divergir; não é calculada do código de preenchimento. Se uma fonte mudar, editar a tag e o preenchimento juntos.
4. **Sem botões soltos:** a coluna de campos da SPEC-030 foi removida, como o card pede ("substitui"). Nada apagado do banco nem da API.
5. **Sem migration.**
