# 039. Modelos de Contrato: tela única

**Status: aprovada (21/11/2026).** Aprovação antecipada do dono do projeto, repassada pela sessão coordenadora (card #38 do Trello). Substitui a [SPEC-028](028-modelo-de-contrato-do-funil.md) e ajusta a [SPEC-030](030-contrato-do-evento.md) e a [SPEC-035](035-menu-lateral.md). Os pontos que o card deixou em aberto foram resolvidos pela opção mais simples e conservadora e estão na seção 17.

## 1. Identificador e nome

SPEC-039. Modelos de Contrato (tela única, usada pelo funil de vendas).

## 2. Objetivo

Existir **uma só biblioteca** de modelos dos contratos que a organizadora envia aos clientes. O que eram duas telas (Contratos, no grupo Modelos, e Modelos de contrato, no Funil de vendas) vira a tela "Modelos de Contrato", no grupo Modelos. O contrato de cada oportunidade (lista "Contratos" do funil, SPEC-022) escolhe o modelo dessa tela.

## 3. Requisitos relacionados

RF-075 (funil), RF-098 (contrato), RF-087 / RF-088 (dados da conta no texto). Não há RF novo. Card #38 do Trello; [produto-v1.md](../produto-v1.md) §4 e §5.10.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Admin, Organizer | Criar, editar e excluir modelos na tela "Modelos de Contrato" (grupo Modelos). |
| Assistant | Não vê a tela de modelos (SPEC-032 §8). Ao criar contrato no funil, **escolhe** um modelo da lista (somente leitura). |
| Outra conta | Não vê. |

## 5. Pré-condições

Usuário autenticado (SPEC-001).

## 6. Fluxo principal

### 6.1. Tela "Modelos de Contrato"

É a antiga tela Contratos da SPEC-030 §6.1, só com outro nome: lista com nome e data de atualização, "Novo modelo", editar e excluir; o modal tem **Nome** e **Texto**, a lista de campos de mesclagem (SPEC-030 §6.2) e "Ver como fica". A rota continua `/contratos`. O item do menu (grupo Modelos, só para a dona) chama-se **Modelos de Contrato**.

Os modelos servem para **orçamentos aprovados**: é o contrato que a organizadora gera depois que o cliente aprova a proposta.

### 6.2. Contrato do funil escolhe o modelo

1. Em Funil de vendas > Contratos > "Novo contrato", o seletor "Modelo" lista os modelos da tela única (`GET /api/v1/contratos-funil/modelos`, para quem usa o funil, inclusive a assistente).
2. Ao escolher, o texto do modelo é copiado para o contrato; a marca `{{contratante_nome}}` é trocada pelo nome da oportunidade. As demais marcas ficam no texto como estão; o preenchimento completo com os dados do contratante é o card #39.
3. O contrato guarda o texto copiado e o `ModeloId` (o vínculo é só informativo, sem chave estrangeira). Excluir o modelo não altera contratos já criados.

### 6.3. Migração dos modelos que já existiam no funil

A migration `ModelosDeContratoUnificados` copia cada linha de `ModelosContratoFunil` para `ContratosConta` **com o mesmo Id** (assim os `ModeloId` dos contratos já criados continuam valendo, sem vínculo órfão), troca `#nome_oportunidade` por `{{contratante_nome}}` no texto, corta o nome em 120 caracteres e então apaga a tabela `ModelosContratoFunil`.

## 7. Fluxos alternativos

- Nome ou texto vazios: não grava (SPEC-030 §9).
- Modelo de outra conta ou inexistente ao criar contrato: "Modelo inválido.".
- Contrato criado só com conteúdo, sem modelo: continua possível.

## 8. Regras de negócio

- Uma só biblioteca por conta; o contrato **não** tem vínculo com evento nem com modelo de evento (SPEC-030 v3).
- Regra 7 do roteiro: o que sai some também do banco e da API (seção 9).
- O contrato do funil copia o texto; depois tem vida própria (SPEC-022).

## 9. O que sai

1. Tela e rota `/modelos-contrato-funil` e o item "Modelos de contrato" do Funil de vendas.
2. API `GET/POST/PUT/DELETE /api/v1/modelos-contrato-funil` e `.../{id}`.
3. Tabela `ModelosContratoFunil` (dados migrados, seção 6.3), a entidade `ModeloContratoFunil`, o serviço, o DTO e os métodos de dados.
4. O token `#nome_oportunidade` nos modelos de contrato (vira `{{contratante_nome}}`). Nos modelos de **orçamento** o token continua.

## 10. Estados

Modelo cadastrado ou excluído.

## 11. Dados necessários

Os da `ContratosConta` (nome, texto, datas); sem coluna nova.

## 12. Interface

Tela "Modelos de Contrato" (grupo Modelos). Seletor "Modelo" no modal de contrato do funil. Sem item de modelo de contrato no Funil de vendas.

## 13. Erros

Validação no campo; outra conta indisponível.

## 14. Critérios de aceite

1. O menu da dona tem "Modelos de Contrato" no grupo Modelos e nenhum item de modelo de contrato no Funil de vendas.
2. `/modelos-contrato-funil` (tela e API) não existe mais.
3. Criar um contrato do funil com `modeloId` de um modelo da tela única copia o texto e troca `{{contratante_nome}}` pelo nome da oportunidade.
4. `GET /api/v1/contratos-funil/modelos` lista os modelos da própria conta, inclusive para a assistente.
5. Depois da migration, os modelos antigos do funil aparecem na tela única, com `{{contratante_nome}}` no lugar de `#nome_oportunidade`, e os contratos já criados guardam o mesmo `ModeloId`.
6. O banco não tem a tabela `ModelosContratoFunil`.

## 15. Cenários de teste

Integração: criar modelo em `/contratos`, criar contrato do funil com o modelo, listar `/contratos-funil/modelos`. Frontend: menu sem "Modelos de contrato" no Funil. A migration de dados não tem teste automatizado (SQL único; conferir na tela depois do deploy).

## 16. Dependências

SPEC-001, SPEC-020, SPEC-022, SPEC-030, SPEC-035, SPEC-036 (regra de apagar o legado). Vêm depois: #39 (contrato do funil com as tags), #40 (seletor de tags), #15, #16.

## 17. Premissas e pontos não definidos (decididos pela opção mais simples e conservadora)

1. **Nome da rota/API:** a tela única mantém `/contratos` e `/api/v1/contratos`; só muda o rótulo do menu e os títulos. Evita renomear o que o card não pede.
2. **"Só para orçamentos aprovados":** é a finalidade do modelo; o sistema **não** bloqueia hoje a criação de contrato em oportunidade sem orçamento aprovado. A exigência (e o preenchimento com valor e parcelas) fica para o card #39.
3. **Assistente:** continua sem ver a tela de modelos, mas escolhe o modelo ao criar contrato no funil (endpoint de leitura próprio), senão perderia o seletor que tinha.
4. **Tags do modelo migrado:** só `#nome_oportunidade` é convertido; outro texto com `#` fica como está (a lista antiga de parâmetros era só atalho de inserção).
5. **Nome acima de 120 caracteres** no modelo antigo é cortado na migração (limite do cadastro atual).
