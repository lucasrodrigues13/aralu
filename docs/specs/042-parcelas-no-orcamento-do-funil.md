# 041. Parcelas no orçamento do funil

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #44, com a opção mais simples e conservadora no ponto em aberto).** Implementada em 21/11/2026. Fonte: card #44 do Trello; [produto-v1.md](../produto-v1.md) 5.13; complementa a [SPEC-040](040-parcelas-por-documento.md) (modelo e API) e a [SPEC-031](031-funil-de-vendas.md) parte C (proposta por link).

## 1. Identificador e nome

SPEC-042. Parcelas no orçamento do funil.

## 2. Objetivo

Dar tela ao parcelamento do orçamento e mostrar as parcelas ao cliente na proposta por link, antes do aceite. O que o cliente aceita passa a ser o parcelamento do contrato.

## 3. Requisitos relacionados

RF-075 (funil), RF-095. Regra 7 do roteiro: nada saiu nem entrou no banco (sem migration).

## 4. Atores e permissões

Admin e Organizer (e a assistente que já edita o funil) parcelam. O cliente vê as parcelas na página pública, sem login. Outra conta: 404.

## 5. Pré-condições

Orçamento em andamento com valor maior que zero (SPEC-040 §6.1).

## 6. Fluxo principal

1. Na tela Orçamentos, o ícone **Parcelas** abre o diálogo: número de parcelas, vencimento da 1ª, entrada (valor ou %, com data). O gerador é o da SPEC-040 (`PUT /orcamentos-funil/{id}/parcelas`). O diálogo mostra as parcelas atuais.
2. A página pública da proposta (`GET /publico/propostas/{token}`) traz `parcelas` (número, vencimento, valor, entrada) e mostra a seção **Forma de pagamento** abaixo do valor, antes dos botões de resposta. Sem parcelas, a seção não aparece.
3. Aceitar a proposta marca o orçamento como aceito; ao gerar o contrato, as parcelas são copiadas para o contrato (SPEC-040 §6.2), sem mudança.

## 7. Fluxos alternativos

Parcelar sem valor, fora de "em andamento" ou com dados inválidos: erro com mensagem no diálogo/aviso (SPEC-040 §7).

## 8. Regras de negócio

Mudar o valor apaga as parcelas (SPEC-040). **Mudar as parcelas de uma proposta já enviada** vale como mudar a proposta (SPEC-031 §17, ponto 10): o link continua o mesmo, a proposta volta a "ainda não foi aberta" e a resposta anterior (dúvida, por exemplo) é zerada. Um orçamento já aceito está em "Respondido" e não pode mais ser parcelado.

## 9. Validações

As da SPEC-040 §9.

## 10. Estados

Sem estado novo.

## 11. Dados necessários

Nenhum novo: `ParcelasOrcamento` (SPEC-040). Sem migration.

## 12. Interface

Ícone Parcelas na linha do orçamento em andamento; diálogo "Parcelas do orçamento"; seção "Forma de pagamento" na proposta pública (legível no celular).

## 13. Erros

Mensagem no diálogo. Link inválido, vencido ou cancelado: sem parcelas (só a marca da assessoria).

## 14. Critérios de aceite

1. Parcelar um orçamento com e sem entrada gera as parcelas corretas.
2. A proposta por link mostra as parcelas antes do aceite; sem parcelas, não mostra a seção.
3. Mudar as parcelas depois de enviada zera a resposta e a abertura.
4. Aceito o orçamento, o contrato gerado traz as mesmas parcelas.

## 15. Cenários de teste

Integração (`PropostaFluxoTests`): proposta com e sem parcelas; dúvida respondida e parcelas mudadas zeram a resposta. O fluxo orçamento → aceite → contrato já é coberto em `DinheiroFluxoTests` (SPEC-040). Frontend: compila e os testes existentes passam; o diálogo não tem teste de unidade.

## 16. Dependências

Card #41 (SPEC-040), SPEC-031 parte C. Alimenta o card #39 (tag `contrato_parcelas`).

## 17. Premissas e pontos não definidos

Decidido pela opção mais simples e conservadora (a conferir pelo dono):

1. **Parcelas mudadas depois do envio.** Zera a resposta e a abertura, como a edição de valor ou texto já faz, em vez de manter o aceite ou criar uma versão da proposta. Assim o cliente nunca fica com um aceite de parcelas que não são as atuais.
2. Não há bloqueio de parcelar uma proposta enviada; o diálogo apenas avisa.
3. Sem migration, sem endpoint novo: só o campo `parcelas` na resposta pública.
