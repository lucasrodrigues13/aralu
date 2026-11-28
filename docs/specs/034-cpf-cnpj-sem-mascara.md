# 034. CPF e CNPJ sem máscara, com CNPJ alfanumérico

**Status: aprovada.** O dono do projeto aprovou antecipadamente (21/11/2026) e o código segue esta spec. Origem: card #45 do board "Tarefas Aralu" ([tarefas-trello.md](../tarefas-trello.md)); [produto-v1.md](../produto-v1.md) 5.1.

## 1. Identificador e nome

SPEC-034. CPF e CNPJ guardados sem máscara, com CNPJ alfanumérico, em todo o sistema.

## 2. Objetivo

CPF e CNPJ são texto no banco, **sem máscara**. A máscara é só de exibição e digitação. O CNPJ passa a aceitar letras (formato alfanumérico que começa a valer no Brasil), guardado em maiúsculas, com os dígitos verificadores pela regra oficial do SERPRO.

## 3. Requisitos relacionados

RF-044 (perfil), RF-088 (Pix), RF-108 (fornecedor). Complementa as SPEC-005, 006/009, 010 e 018, que continuam valendo no resto.

## 4. Atores e permissões

Os mesmos das telas afetadas (Organizer e Assistant). Nada de permissão nova.

## 5. Pré-condições

Nenhuma além das das telas afetadas.

## 6. Fluxo principal

1. Na tela, o campo de documento mostra a máscara enquanto a pessoa digita.
2. Ao salvar, o backend tira pontos, barra, traço e espaços, põe em maiúsculas, valida e grava só os caracteres.
3. Ao reabrir, a tela aplica a máscara ao valor gravado.

## 7. Fluxos alternativos

- Documento inválido (tamanho, caractere ou dígito verificador): não grava e a mensagem aponta o campo.
- Campo vazio: grava vazio (nulo). O documento continua opcional onde já era.

## 8. Regras de negócio

- **Armazenamento:** só A-Z e 0-9, em maiúsculas, sem pontos, barra, traço nem espaço. Coluna `text` do Postgres (equivale a varchar sem limite).
- **CPF:** 11 dígitos numéricos e 2 dígitos verificadores. Sequência de um só dígito repetido (111.111.111-11) é inválida.
- **CNPJ:** 14 caracteres: 12 alfanuméricos (A-Z, 0-9) e 2 dígitos verificadores **numéricos**. Sequência de um só caractere repetido é inválida. Cálculo (SERPRO, "Cálculo dos dígitos verificadores de CNPJ alfanumérico"):
  1. Valor de cada caractere = código ASCII menos 48 (0-9 valem 0-9; A=17, B=18 ... Z=42).
  2. Pesos de 2 a 9 da direita para a esquerda, recomeçando em 2 depois do oitavo caractere.
  3. Soma de valor × peso; resto = soma ÷ 11. Resto 0 ou 1: dígito 0; senão, 11 menos o resto.
  4. 1º dígito sobre os 12 primeiros caracteres; 2º dígito repete sobre 13 (os 12 mais o 1º dígito).
  - Exemplo do documento: `12ABC34501DE` gera `35` (soma 459, resto 8, dígito 3; soma 424, resto 6, dígito 5), ou seja, `12.ABC.345/01DE-35`. CNPJ só com números vale pela mesma regra.
- **Campo único "CPF ou CNPJ"** (Perfil, dados bancários do fornecedor): 11 caracteres é CPF, 14 é CNPJ, outro tamanho é inválido.
- **Máscara dupla (tela):** começa como CPF (`000.000.000-00`); se aparecer letra ou passar de 11 caracteres, vira CNPJ (`00.000.000/0000-00`). No CNPJ, as 2 últimas posições só aceitam número.
- **Onde vale:** Cliente (CPF e CNPJ), Perfil (documento), Fornecedor (CNPJ, CPF e CPF/CNPJ dos dados bancários), e o CPF do convidado (continua só CPF). Chave Pix do fornecedor do tipo CPF ou CNPJ também é gravada sem máscara. O campo da oportunidade (dados do contratante) é do card #43 e vai usar estas mesmas regras.
- **Migration:** `DocumentosSemMascara` só normaliza o que já está gravado, sem mudar o esquema e sem apagar coluna.

## 9. Validações

Ver §8. Mensagens: "Informe um CPF válido.", "Informe um CNPJ válido.", "Informe um CPF ou CNPJ válido." (Perfil) e "Informe um CPF ou CNPJ válido para os dados bancários." (fornecedor).

## 10. Estados

Não há estados novos.

## 11. Dados necessários

Cliente: `Cpf`, `Cnpj`. Convidado: `Cpf`. Fornecedor: `Cnpj`, `Cpf`, `DocumentosBancarios`, `PixChave` (tipo Cpf/Cnpj). Perfil: `Documento`. Todos texto, sem máscara.

## 12. Interface

Máscara `documento` e `cnpj` de `shared/mascaras.ts` entendem letras (maiúsculas) e números. Nenhuma tela nova; os campos existentes ganham a máscara dupla onde já eram "CPF ou CNPJ".

## 13. Erros

Mensagens da §9, sem detalhe interno.

## 14. Critérios de aceite

1. Salvar com máscara grava sem máscara; reabrir mostra a máscara.
2. `12.ABC.345/01DE-35` é aceito e gravado como `12ABC34501DE35`; `12ABC34501DE36` é recusado.
3. Letra no CPF é recusada. CNPJ só com números continua aceito.
4. Digitar letra no campo "CPF ou CNPJ" troca para a máscara de CNPJ.
5. Valores antigos mascarados ficam sem máscara depois da migration; valores que não são documento (tamanho diferente de 11 ou 14) não são alterados.

## 15. Cenários de teste

Unitários do validador (exemplo do SERPRO, CPF, CNPJ numérico e alfanumérico, inválidos, campo único) e da máscara do frontend (CPF, CNPJ, máscara dupla, limpeza).

## 16. Dependências

Vem antes de #42 (cliente com campo único), #43 (contratante) e #46 (Perfil). Mesmo cadastro de fornecedor do #27.

## 17. Premissas e pontos não definidos

Decisões tomadas por serem a opção mais simples e conservadora (o dono pode rever):

1. **"varchar" no banco:** as colunas já eram `text` no Postgres, equivalente. Não há alteração de esquema; a migration é só de dados e o `schema.sql` ganha só essa etapa.
2. **Migration só normaliza valor que, limpo, tem 11 ou 14 caracteres.** O resto (texto livre antigo do Perfil, por exemplo) fica como está, para não perder dado. Ele só é recusado quando a pessoa editar e salvar de novo.
3. **Validação passa a valer para Fornecedor e Perfil**, que antes aceitavam qualquer texto (fornecedor caía no texto bruto). Cliente e convidado já recusavam tamanho errado; agora também recusam dígito verificador errado.
4. **Sequência repetida** (000...0, 111...1) é inválida, como nos validadores comuns.
5. **Chave Pix tipo CPF/CNPJ** do fornecedor é gravada sem máscara (a chave Pix de CPF/CNPJ é só os caracteres).
6. **Documentos nos contratos:** os campos `contratante_documento` e `contratada_documento` passam a sair sem máscara até o #39 / #43 decidirem o formato de exibição no contrato.
7. **Migration sem volta:** `Down` não faz nada, porque a máscara é só de exibição.
8. **RG:** não mexe aqui; saiu no #42 ([SPEC-037](037-rg-fora-e-documento-unico-do-cliente.md)), que também juntou CPF e CNPJ do cliente em um campo único.
