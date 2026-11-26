# 064. Validade da proposta configurável

**Status: aprovada (26/11/2026).** Pedido do dono em 26/11/2026: o organizador define em dias por quanto tempo a proposta vale, porque há propostas grandes em que o cliente leva pelo menos um dia para ler e mais alguns para comparar com outros orçamentos. Ajusta a [SPEC-031](031-funil-estagios-retorno-e-proposta.md) (§6 ponto 8 e §17 ponto 10, que fixaram 30 dias).

## 1. Identificador e nome

SPEC-064. Validade da proposta configurável pelo organizador.

## 2. Objetivo

- Hoje toda proposta do funil vale 30 dias a partir do envio, sem opção.
- O organizador passa a escolher a validade em dias: um padrão da conta e, se quiser, outro valor numa proposta específica.

## 3. Requisitos relacionados

- **Novo (§10):** RF-125 (o RF-124 ficou sem uso: foi a configuração de prazos tirada da SPEC-063).
- **Ajusta:** SPEC-031 (validade fixa de 30 dias e o parâmetro `{{validade}}`), SPEC-061 (página de aceite mostra a validade).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Dono | Definir a validade padrão da conta em **Configurações → Propostas**. |
| Dono e Membro com "editar" em Orçamentos e contratos | Mudar a validade de uma proposta ao enviar ou reenviar. |
| Lead / cliente | Ver até quando a proposta vale e responder dentro do prazo. |

## 5. Pré-condições

Nenhuma nova.

## 6. Fluxo principal

1. Em **Configurações → Propostas**, o Dono define a **validade padrão**, em dias corridos. **(proposta)** De 1 a 180 dias; padrão **30**, que é o valor de hoje.
2. Ao enviar uma proposta, a janela de envio mostra o campo **"Válida por N dias"** já com o padrão da conta. O organizador pode mudar só para esta proposta.
3. A proposta vale até o fim do último dia: enviada em 10/03 com 7 dias, vale até 17/03, inclusive.
4. O parâmetro `{{validade}}` do modelo e a página de aceite mostram essa data.

## 7. Fluxos alternativos

- **Reenvio:** o prazo volta a contar a partir do reenvio, com o número de dias da janela (que vem com o valor usado no envio anterior). Hoje são sempre 30 dias.
- **Proposta vencida:** como hoje (SPEC-031): a página mostra a mensagem com o contato da assessoria e não aceita resposta.
- **Mudar o padrão da conta:** vale para os próximos envios. Proposta já enviada mantém a data dela.
- **Prorrogar sem reenviar:** **(proposta)** fora desta versão; o organizador reenvia com o novo prazo.

## 8. Regras

| # | Regra | RF |
|---|---|---|
| R1 | A validade é em dias corridos, de 1 a 180, e vale até o fim do último dia. | RF-125 |
| R2 | Sem escolha na janela de envio, vale o padrão da conta; sem padrão gravado, 30 dias. | RF-125 |
| R3 | Mudar o padrão não altera proposta já enviada. | RF-125 |
| R4 | O servidor recusa resposta depois da validade, como hoje. | RF-125 |

## 9. Critérios de aceite

| # | Condição | Resultado esperado |
|---|---|---|
| C1 | Conta sem configuração envia proposta. | Vale 30 dias, como hoje. |
| C2 | Dono define padrão de 7 dias e envia. | Vale até o fim do 7º dia; `{{validade}}` mostra essa data. |
| C3 | Na janela de envio, o organizador troca para 15 dias. | Esta proposta vale 15 dias; o padrão da conta segue 7. |
| C4 | Reenvio de proposta. | O prazo recomeça no reenvio, com os dias escolhidos. |
| C5 | Dono muda o padrão depois de enviar. | A proposta enviada mantém a data. |
| C6 | Validade 0 ou acima de 180. | Recusado: "A validade da proposta vai de 1 a 180 dias." |
| C7 | Lead responde depois da validade. | Recusado, com a mensagem de proposta vencida. |
| C8 | Membro tenta mudar o padrão da conta. | Recusado pelo servidor (SPEC-062 R5). |

## 10. Requisito novo

| ID | Requisito |
|---|---|
| RF-125 | O Dono define a validade padrão das propostas da conta, em dias (1 a 180, padrão 30). Ao enviar ou reenviar, o organizador pode mudar a validade daquela proposta. A proposta vale até o fim do último dia. |

## 11. Pendências

1. **Prorrogar sem reenviar:** dar mais dias a uma proposta já enviada sem mandar o link de novo.
2. **Aviso de vencimento:** avisar o organizador (ou o lead) alguns dias antes de a proposta vencer.
