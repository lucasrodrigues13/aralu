# 050. Contrato do funil: gerar com os dados do contratante e preencher as tags

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #39, com as opções mais simples e conservadoras nos pontos em aberto, listados na seção 17).** Fonte: card #39 do Trello ([tarefas-trello.md](../tarefas-trello.md)); [produto-v1.md](../produto-v1.md) 5.10 e 5.13. Revisa a [SPEC-022](022-contratos-do-funil.md) (contrato do funil), a [SPEC-030](030-contrato-do-evento.md) §6.2 (campos de mesclagem) e a [SPEC-039](039-modelos-de-contrato-tela-unica.md) §6.2 (a "só nome" vira preenchimento completo). Usa a [SPEC-038](038-endereco-estruturado-do-perfil.md) (`Mesclagem.ValoresDaContratada`), a [SPEC-040](040-parcelas-por-documento.md) e [042](042-parcelas-no-orcamento-do-funil.md) (parcelas do orçamento e do contrato) e a [SPEC-049](049-dados-do-contratante-na-oportunidade.md) (`dadosContratoCompletos`).

## 1. Identificador e nome

SPEC-050. Contrato do funil com as tags preenchidas.

## 2. Objetivo

Gerar o contrato de uma oportunidade só quando o orçamento foi aprovado e os dados do contratante estão completos, e entregar o texto já com todas as tags do modelo preenchidas. O lead não precisa virar cliente antes.

## 3. Requisitos relacionados

RF-075 (funil), RF-098 (contrato), RF-087 / RF-088 (dados da conta no texto). Sem RF novo.

## 4. Atores e permissões

Quem usa o funil (`Admin`, `Organizer` e `Assistant`) cria o contrato, como na SPEC-022. Nada de permissão nova.

## 5. Pré-condições

Oportunidade da conta com **orçamento aprovado** (aceito pelo lead no link ou registrado pela organizadora, SPEC-031) e **dados do contratante completos** (6.2).

## 6. Fluxo principal

### 6.1. Gerar o contrato

Em Funil de vendas > Contratos > "Novo contrato" (ou `POST /api/v1/contratos-funil`):

1. Sem orçamento aprovado na oportunidade: não gera. Mensagem: "Esta oportunidade ainda não tem orçamento aprovado. Aprove o orçamento antes de gerar o contrato."
2. Com orçamento aprovado e dados incompletos: não gera e diz o que falta: "Faltam dados do contratante para gerar o contrato: CPF/CNPJ, estado civil. Preencha na oportunidade ou no cadastro do cliente."
3. Com os dois: gera. Se o contrato veio de um modelo ou tem texto próprio, **todas as tags conhecidas do texto são preenchidas** (6.3). O contrato guarda o texto já preenchido, o `ModeloId` e as parcelas copiadas do orçamento aprovado (SPEC-040).

O texto do modelo é copiado como está para a tela do contrato (com as tags); o preenchimento acontece ao salvar. Marca desconhecida fica no texto; campo sem dado sai como `________`.

### 6.2. Quem é o contratante e o que é "completo"

- **Fonte:** se a oportunidade já tem cliente (`ClienteId`), vale o cadastro do cliente; o que o cliente não tiver preenchido cai para os dados do contratante da oportunidade (SPEC-049), campo a campo. Sem cliente, valem os dados da oportunidade.
- **Completo** é a regra da SPEC-049 §6.4: nome completo, CPF/CNPJ, estado civil, nacionalidade, e-mail, celular e endereço (CEP, endereço, número, bairro, cidade e estado). Nascimento, profissão, complemento e país são opcionais. A regra é uma só (`ContratanteRegras.Faltando`) para a oportunidade, a tela de aceite e o contrato.

### 6.3. Tags e de onde puxam

Lista única em `Mesclagem.Campos` (backend), usada pela tela de modelos, pelo "Ver como fica" e pelo preenchimento.

| Tag | Fonte |
|---|---|
| `contratante_nome`, `_documento`, `_endereco`, `_email`, `_telefone`, `_nascimento`, `_profissao`, `_estado_civil`, `_nacionalidade` | Cliente, se existir; senão dados do contratante da oportunidade (6.2). Endereço montado em uma linha. Documento com máscara de CPF ou CNPJ. |
| `contratada_nome`, `_documento`, `_endereco`, `_responsavel`, `_pix` | Perfil da assessoria (`Mesclagem.ValoresDaContratada`, SPEC-038) |
| `evento_tipo`, `evento_data`, `evento_local_cerimonia`, `evento_local_recepcao`, `evento_convidados` | Oportunidade: tipo, data prevista por extenso, local e endereço da cerimônia e da recepção, quantidade de convidados |
| `contrato_valor` | Valor do orçamento aprovado, em reais |
| `contrato_parcelas` | Parcelas do orçamento aprovado, uma por trecho, separadas por "; " |
| `data_hoje` | Data da geração, por extenso |

## 7. Fluxos alternativos

- Oportunidade com cliente: se o cliente mudar depois, o contrato já gerado não muda (guarda o texto).
- Contrato criado só com texto, sem modelo: também exige orçamento aprovado e dados completos, e também tem as tags preenchidas.
- Orçamento aprovado sem valor ou sem parcelas: `contrato_valor` e `contrato_parcelas` saem em branco (`________`); não bloqueia.

## 8. Regras de negócio

- Orçamento aprovado é o da SPEC-040: aceito (`Resposta = Aceitar`) e não cancelado.
- Editar um contrato em andamento não refaz o preenchimento.
- Regra 7 do roteiro: nada foi removido nesta entrega.

## 9. Validações

As mensagens do 6.1. Nenhuma validação nova no cadastro de modelo.

## 10. Estados

Sem estado novo.

## 11. Dados necessários

Nenhum dado novo: sem migration. Usa as colunas do contratante (SPEC-049), do orçamento e do contrato (SPEC-040).

## 12. Interface

O modal de contrato do funil copia o texto do modelo sem trocar nenhuma tag (antes trocava `contratante_nome` pelo nome da oportunidade) e mostra a mensagem do servidor quando faltam orçamento aprovado ou dados. A tela de modelos mostra as tags novas.

## 13. Erros

As mensagens do 6.1, sem detalhe interno.

## 14. Critérios de aceite

1. Criar contrato sem orçamento aprovado falha e diz isso.
2. Criar contrato com orçamento aprovado e dados incompletos falha e lista o que falta.
3. Com cliente vinculado, os dados dele preenchem `contratante_*` e valem para a regra de completo.
4. Todas as tags da 6.3 são preenchidas no texto gerado; `contrato_valor` e `contrato_parcelas` vêm do orçamento aprovado; as parcelas do contrato são copiadas.
5. A lista de tags da tela de modelos traz as tags novas.

## 15. Cenários de teste

Unitário (`ContratoPreenchimentoTests`, `MesclagemTests`): fonte cliente x oportunidade, tags de evento, valor e parcelas, o que falta. Integração (roda no fim das ondas): `DinheiroFluxoTests` e `FunilFluxoTests` ajustados para criar contrato só com aceite e dados. Frontend: `mesclagem.spec.ts` não muda.

## 16. Dependências

#46 (SPEC-038), #43 (SPEC-049), #44 (SPEC-042), #36, #38 (SPEC-039). Vêm depois: #40 (seletor com busca e ajuda das tags), #15 (Live Preview).

## 17. Premissas e pontos não definidos (opção mais simples e conservadora; o dono pode rever)

1. **Conjunto mínimo para gerar:** o da SPEC-049 §6.4 (nome, CPF/CNPJ, estado civil, nacionalidade, e-mail, celular e endereço completo). Nascimento e profissão ficam opcionais.
2. **Cliente e oportunidade se completam campo a campo:** o cliente vale primeiro; o que ele não tem cai para a oportunidade. Alternativa não adotada: exigir tudo só no cliente quando existe.
3. **Orçamento aprovado = aceito e não cancelado** (inclui o aceite registrado por fora pela organizadora).
4. **Contrato avulso (sem modelo) segue a mesma regra:** a exigência vale para qualquer contrato novo do funil.
5. **Preenchimento ao criar, não ao editar:** quem edita um contrato em andamento e digita uma tag nova a vê sem preencher.
6. **Orçamento sem valor ou sem parcelas** não bloqueia: as tags saem em branco.
7. **Formato:** valor em reais (R$ 1.234,56); parcelas como "Entrada de R$ 500,00 em 10/12/2026; Parcela 2 de R$ 500,00 em 10/01/2027"; celular como está cadastrado.
8. **Tags novas além das do card:** `contratante_nascimento`, `_profissao`, `_estado_civil` e `_nacionalidade` ("todos os dados do cliente ficam disponíveis"). `evento_nome` e `evento_local` (únicos) não voltam: o evento tem dois locais.
9. **Sem migration.** Nada foi apagado do banco nem da API.
10. **Sem aviso antecipado na tela:** a tela só mostra o que falta na hora de gerar (mensagem do servidor). Aviso ao escolher a oportunidade fica para depois.
