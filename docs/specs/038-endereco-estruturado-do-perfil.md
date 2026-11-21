# 038. Endereço estruturado no Perfil da assessoria

**Status: aprovada.** O dono do projeto aprovou antecipadamente (21/11/2026) e o código segue esta spec. Origem: card #46 do board "Tarefas Aralu" ([tarefas-trello.md](../tarefas-trello.md)); [produto-v1.md](../produto-v1.md) 5.1. Altera a [SPEC-005](005-perfil-da-assessoria.md).

## 1. Identificador e nome

SPEC-038. Endereço estruturado (com CEP) no Perfil da assessoria.

## 2. Objetivo

O endereço do perfil deixa de ser um texto livre e passa a ser um endereço de verdade: CEP, endereço, número, complemento, bairro, cidade, estado e país, gravados em campos separados. A tag `contratada_endereco` dos contratos monta o endereço a partir deles.

## 3. Requisitos relacionados

RF-044. Complementa a SPEC-005 (perfil), a SPEC-009 (cadastro de cliente, que já tem o mesmo padrão de endereço) e a SPEC-030 (tags do contrato).

## 4. Atores e permissões

Os mesmos da SPEC-005: o Organizer edita o próprio perfil.

## 5. Pré-condições

Organizer autenticado.

## 6. Fluxo principal

1. No cartão "Endereço" do perfil há os campos CEP, País, Endereço, Número, Complemento, Bairro, Cidade e Estado.
2. Ao sair do campo CEP com 8 dígitos, a tela consulta o CEP (mesma consulta do cliente e do evento) e preenche país, endereço, estado, cidade e bairro. O organizador completa número e complemento e pode corrigir o resto.
3. Ao salvar, a API grava cada campo separado. Se o CEP for encontrado, a API também preenche os campos vindos do CEP, como no cadastro de cliente.
4. Ao reabrir, os campos voltam como foram gravados.

## 7. Fluxos alternativos

- CEP com menos ou mais de 8 dígitos: não grava; "O CEP deve ter 8 dígitos.".
- CEP não encontrado ou consulta fora do ar: grava o que o organizador digitou.
- Endereço todo vazio: grava vazio.

## 8. Regras de negócio

- **Campos:** `Cep` (00000-000), `Pais`, `Endereco` (logradouro), `Numero`, `Complemento`, `Bairro`, `Cidade`, `Estado`. Todos opcionais.
- **Texto antigo descartado:** o texto livre antigo (`Perfis.Endereco`) não dá para converter sozinho. Não há "endereço anterior": a migration apaga o conteúdo da coluna `Endereco`, que passa a guardar só o logradouro, e o organizador preenche o novo (regra 7 do [roteiro](../roteiro-execucao.md)).
- **Tag `contratada_endereco`:** `Mesclagem.ValoresDaContratada` monta uma linha com os campos preenchidos, nesta ordem: `endereço, número, complemento - bairro - cidade/estado - CEP 00000-000 - país`. Campo vazio é pulado; perfil sem endereço dá a linha em branco da mesclagem. O contrato do funil (#39) usa esse valor.
- Mesmo padrão do cliente: o CEP é guardado com máscara e a consulta usa `IConsultaCep`.

## 9. Validações

"O CEP deve ter 8 dígitos." As demais da SPEC-005 não mudam.

## 10. Estados

Não há estados novos.

## 11. Dados necessários

`PerfilAssessoria`: colunas novas `Cep`, `Pais`, `Numero`, `Complemento`, `Bairro`, `Cidade`, `Estado` (texto, opcionais); `Endereco` mantida, agora como logradouro. Migration `EnderecoEstruturadoDoPerfil` (colunas novas e `UPDATE` que zera `Endereco`). `deploy/schema.sql` gerado de novo.

API: `GET/PUT /api/v1/perfil` trocam o campo único `endereco` pelos oito campos (`endereco` passa a significar logradouro).

## 12. Interface

O cartão "Endereço" troca o textarea por uma grade de campos (duas colunas em tela larga), na ordem da §6. O CEP usa a máscara `cep`.

## 13. Erros

Mensagem da §9, sem detalhe interno.

## 14. Critérios de aceite

1. Salvar com CEP 01001-000 devolve país, endereço, estado, cidade e bairro do CEP, mais o número e o complemento enviados.
2. CEP com tamanho errado é recusado.
3. Reabrir o perfil mostra os campos como gravados; a tela não tem mais textarea de endereço.
4. `contratada_endereco` vira o endereço montado dos campos; sem endereço, fica em branco.
5. Depois da migration, o texto livre antigo não aparece em lugar nenhum.

## 15. Cenários de teste

Unitário: `MesclagemTests` (endereço montado e perfil vazio). Front: `perfil.page.spec.ts` (campos estruturados, sem textarea). Integração (roda no fim das ondas): `Perfil_clientes_e_tarefas_ficam_na_conta` com CEP inválido e válido.

## 16. Dependências

Depende de #45 (SPEC-034, fila do banco). Vem antes do #39 (contrato do funil) e do #41.

## 17. Premissas e pontos não definidos

Decisões tomadas pela opção mais simples (o dono pode rever):

1. **Sem "endereço anterior":** o texto antigo é apagado na migration, em vez de ser mostrado até o novo ser preenchido (o card deixava a decidir; vale a regra 7 do roteiro e a ausência de débito técnico na 1.0).
2. **País livre**, preenchido pelo CEP ("Brasil"); sem lista de países.
3. **Estado livre** (sigla ou nome), como no cliente.
4. A montagem do endereço da contratada fica pronta e testada aqui; quem preenche o contrato a partir dela é o card #39.
