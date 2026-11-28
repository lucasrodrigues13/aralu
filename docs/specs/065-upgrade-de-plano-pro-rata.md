# 065. Troca de plano pelo Dono: upgrade com cobrança proporcional e downgrade

**Status: rascunho (26/11/2026).** Pedido do dono em 26/11/2026: com um plano novo no catálogo, o Dono deve poder trocar de plano sozinho. No upgrade, paga na hora a diferença proporcional aos dias que faltam do período pago; no downgrade, o plano menor vale a partir do próximo vencimento. Resolve a pendência 7 da [SPEC-062](062-conta-assinatura-e-equipe.md) (§17) e substitui a regra "Troca de plano pelo próprio Dono: fora desta versão" (§7).

Pontos marcados **(proposta)** são o padrão sugerido e ainda esperam decisão.

## 1. Identificador e nome

SPEC-065. Troca de plano pelo Dono: upgrade com cobrança proporcional (pró-rata) e downgrade no próximo ciclo.

## 2. Objetivo

- Hoje só o Admin troca o plano de uma conta.
- **Upgrade:** o Dono escolhe um plano público de valor maior em **Assinatura**, paga a diferença proporcional dos dias restantes e recebe os recursos do plano novo.
- **Downgrade:** o Dono escolhe um plano público de valor menor; o plano atual continua até o fim do período pago e o menor vale a partir do próximo vencimento, sem estorno.
- Nos dois casos o ciclo de cobrança não muda: o próximo vencimento continua o mesmo.

## 3. Requisitos relacionados

- **Novos (§10):** RF-126, RF-127, RF-128.
- **Ajusta:** SPEC-062 (§7 troca de plano, §17 pendência 7; R10 valor cobrado; avisos do Asaas; recurso fora do plano).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Dono | Ver os outros planos públicos, ver o valor da troca, fazer upgrade ou agendar downgrade, e desfazer um downgrade agendado. |
| Membro | Ver "Disponível no plano X", como hoje. Não troca plano. |
| Admin da plataforma | Continua trocando o plano de qualquer conta na hora e sem cobrança proporcional, como hoje. Uma troca pelo Admin descarta upgrade pendente e downgrade agendado. |

## 5. Pré-condições

- A assinatura está **Ativa** (ou **Trial**), com assinatura viva no Asaas quando fora do trial.
- O plano de destino é **público** e **ativo**.
- Upgrade: `ValorMensal` do plano de destino maior que o que a conta paga hoje (`Assinatura.Valor`). Downgrade: menor.
- Não há outro upgrade pendente de pagamento nem downgrade agendado para a conta (ver regra 13).

## 6. Fluxo principal

### 6.1 Upgrade

1. Em **Assinatura**, o Dono vê os planos públicos, com **"Fazer upgrade"** nos de valor maior.
2. Ao escolher um plano, a tela mostra o resumo calculado pelo servidor:
   - dias restantes do período atual e a data em que ele termina (`PagoAte`);
   - crédito do plano atual pelos dias restantes;
   - **valor a pagar agora**;
   - valor das próximas mensalidades e a data do próximo vencimento (sem mudança).
3. O Dono confirma. O servidor recalcula (o valor mostrado não vem do navegador) e cria no Asaas uma **cobrança avulsa** com vencimento hoje, no mesmo cliente e na mesma forma de pagamento da assinatura.
4. A tela mostra o link de pagamento (Pix ou cartão), como no assinar.
5. Quando o Asaas avisa o pagamento confirmado, a conta passa para o plano novo: `PlanoId` e `Valor` mudam, a assinatura no Asaas passa a cobrar o valor novo e os recursos do plano novo são liberados.
6. O Dono recebe o e-mail de confirmação do upgrade.

### 6.2 Downgrade

1. Nos planos de valor menor, o botão é **"Mudar para este plano"**.
2. A tela mostra:
   - que o plano atual continua até `PagoAte`, sem estorno nem crédito;
   - a data em que o plano menor passa a valer (o próximo vencimento) e o valor das mensalidades a partir dela;
   - os recursos que deixam de existir e o que acontece com eles (regra 15).
3. O Dono confirma. O servidor grava o **downgrade agendado** (plano de destino e data) e atualiza o valor da assinatura no Asaas para o valor do plano menor, para que a próxima cobrança já venha com ele.
4. A tela de Assinatura passa a mostrar "Muda para o plano X em DD/MM", com o botão **"Manter plano atual"**, que desfaz o agendamento e volta o valor da assinatura no Asaas.
5. No próximo vencimento, o controle diário aplica o plano menor: `PlanoId` e `Valor` mudam e os recursos do plano menor passam a valer.
6. O Dono recebe e-mail ao agendar e ao aplicar o downgrade.

## 7. Fluxos alternativos

- **Trial:** upgrade e downgrade sem cobrança. O plano muda na hora e passa a valer para a primeira cobrança.
- **Pagamento do upgrade não aprovado ou não feito:** nada muda na conta. Ela continua no plano atual, com os recursos atuais, e a recorrência no Asaas continua ativa. A cobrança avulsa fica como fatura em aberto e segue o fluxo das cobranças em aberto da SPEC-062 (aparece em "Pagar fatura em aberto"); paga depois, aplica o upgrade como no §6.1 passo 5. A recorrência só é desativada se o Dono usar o botão **Cancelar assinatura**, como hoje.
- **Cancelar a assinatura com upgrade pendente:** a cobrança avulsa pendente é removida no Asaas junto com as outras pendentes, como o cancelar já faz hoje.
- **Cancelar a assinatura com downgrade agendado:** o agendamento é descartado. Ao reativar, a conta volta no plano em que estava.
- **Upgrade com downgrade agendado:** recusado; o Dono primeiro clica em "Manter plano atual".
- **Upgrade no mesmo dia do vencimento do ciclo:** dias restantes = 1; a conta paga só a diferença de um dia.
- **Cancelada, Em atraso, Bloqueada ou Expirada:** a troca de plano não aparece; a tela orienta a regularizar ou reativar antes.

## 8. Regras

### Upgrade

1. **Período atual:** de `(PagoAte + 1 dia) − 1 mês` até `PagoAte`, o mesmo que o aviso de pagamento grava (vencimento até vencimento + 1 mês − 1 dia).
2. **Dias do ciclo:** número real de dias desse período (28 a 31), não 30 fixo.
3. **Dias restantes:** `PagoAte − hoje + 1` (hoje conta). Data em horário de Brasília.
4. **Crédito:** `Valor atual × dias restantes / dias do ciclo`, usando `Assinatura.Valor` (o valor efetivamente cobrado, com desconto ou personalizado).
5. **Valor do upgrade:** `Valor novo × dias restantes / dias do ciclo − crédito`, arredondado em centavos com `AwayFromZero`. O valor novo segue R10 da SPEC-062: valor do plano novo, com o desconto percentual da conta enquanto valer.
6. **Exemplo:** Pro a R$ 179,00, 10 dias restantes num ciclo de 30, plano novo a R$ 299,00 → (299 − 179) × 10 / 30 = **R$ 40,00**.
7. **Valor mínimo:** o Asaas recusa cobranças abaixo de R$ 5,00. Com os planos do catálogo isso não acontece na prática, então não há tratamento especial: se ocorrer, a troca é recusada com mensagem para falar com o suporte.
8. **Valor personalizado:** **(proposta)** conta com `ValorPersonalizado` não troca de plano sozinha; vê "Fale com a gente" e o Admin decide o valor.
9. **O pagamento do upgrade não paga mês:** não muda `PagoAte` nem `ProximoVencimento`. Só troca plano e valor.
10. **Recursos:** liberados na confirmação do pagamento, não antes.
11. **Assinatura no Asaas:** ao confirmar, atualiza o valor da assinatura para os próximos ciclos. Se já existir cobrança do próximo ciclo gerada e pendente, ela também passa ao valor novo.
12. **Identificação no Asaas:** a cobrança avulsa leva `externalReference = "upgrade:{assinaturaId}:{planoId}"`, para o aviso do Asaas saber que é upgrade e para qual plano.
13. **Uma troca por vez:** um upgrade pendente ou um downgrade agendado impede outra troca. Para o upgrade pendente, o Dono pode desistir dele, o que remove a cobrança avulsa no Asaas.

### Downgrade

14. **Sem estorno nem crédito:** o Dono usa o plano atual até `PagoAte`. O plano menor vale a partir de `PagoAte + 1`, que é o próximo vencimento. O valor segue R10 da SPEC-062.
15. **Recursos que o plano menor não tem:** **(proposta)** os dados ficam guardados e visíveis; criar ou usar o recurso passa a ser recusado com "Disponível no plano X", como já acontece hoje com recurso fora do plano. Limites mensais (ex.: minutos de ligação com IA) passam a ser os do plano menor a partir do novo ciclo. Integrações já conectadas são pausadas, não apagadas.
16. **Cobrança do próximo ciclo:** o valor da assinatura no Asaas muda ao agendar. Se a cobrança do próximo ciclo já tiver sido gerada e estiver pendente, ela também passa ao valor menor; desfazer o agendamento volta as duas ao valor atual.
17. **Aplicação:** o controle diário aplica o downgrade agendado no dia do vencimento, mesmo antes do pagamento da nova mensalidade. A cobrança do novo ciclo segue o fluxo normal (em atraso, tolerância, bloqueio).

## 9. Critérios de aceite

### Upgrade

1. Dono em conta Ativa vê os planos públicos de valor maior e o valor do upgrade calculado pelas regras 2 a 5.
2. Membro não vê o botão de troca, e o servidor recusa o pedido de um Membro.
3. Confirmar cria uma cobrança avulsa no Asaas com o valor da regra 5, vencimento hoje e `externalReference` da regra 12.
4. Com o aviso de pagamento confirmado da cobrança avulsa, a conta fica no plano novo, com `Valor` novo, e os recursos do plano novo funcionam.
5. Esse aviso **não** muda `PagoAte` nem `ProximoVencimento`.
6. A próxima cobrança do ciclo vem com o valor cheio do plano novo, na mesma data de antes.
7. Pagamento recusado ou não feito: a conta continua no plano atual, com os recursos atuais, a recorrência continua ativa e a situação da assinatura não muda.
8. A cobrança avulsa não paga aparece como fatura em aberto; paga depois, aplica o upgrade.
9. Aviso repetido do Asaas para a mesma cobrança não aplica o upgrade duas vezes.

### Downgrade

10. Dono em conta Ativa vê os planos públicos de valor menor, a data em que o plano menor passa a valer e os recursos que deixam de existir.
11. Confirmar agenda o downgrade, não cobra nada e não muda o plano nem os recursos antes de `PagoAte`.
12. A próxima cobrança do ciclo vem com o valor do plano menor.
13. "Manter plano atual" desfaz o agendamento e a próxima cobrança volta ao valor atual.
14. No dia do vencimento, a conta passa ao plano menor; os dados de recursos que ele não tem continuam visíveis, mas criar ou usar esses recursos é recusado.

### Ambos

15. Trial troca de plano na hora, sem cobrança.
16. Contas Cancelada, Em atraso, Bloqueada ou Expirada não trocam de plano; o servidor recusa.
17. Com upgrade pendente ou downgrade agendado, outra troca é recusada.
18. Cancelar a assinatura remove a cobrança avulsa pendente e descarta o downgrade agendado.

## 10. Requisitos novos

| ID | Requisito |
|---|---|
| RF-126 | O Dono faz upgrade para um plano público de valor maior em Assinatura. Paga agora a diferença proporcional aos dias restantes do período pago (dias reais do ciclo, hoje incluído), numa cobrança avulsa do Asaas. O ciclo e o vencimento não mudam. |
| RF-127 | O plano novo e seus recursos valem a partir da confirmação do pagamento do upgrade. Esse pagamento não estende o período pago. Sem pagamento, a conta continua no plano atual com a recorrência ativa. No trial, a troca é sem cobrança. |
| RF-128 | O Dono agenda downgrade para um plano público de valor menor. O plano atual vale até o fim do período pago, sem estorno; o menor vale a partir do próximo vencimento, que já é cobrado com o valor menor. O Dono pode desfazer até lá. Dados de recursos que o plano menor não tem ficam guardados, mas o uso é recusado. |

## 11. Pendências

1. **Liberar na hora, antes do pagamento:** se o pagamento por cartão exigir recursos imediatos, avaliar liberar com o pagamento pendente.
2. **Ciclo anual:** só existe ciclo mensal; com planos anuais, a regra 2 muda.
3. **Limite já consumido no downgrade:** se a conta usou no mês mais do que o limite do plano menor, nada é cobrado a mais; o limite novo só conta no novo ciclo.

## 12. Notas de implementação

- O aviso do Asaas (`AssinaturaServico.ProcessarAsync`) hoje descarta pagamentos sem `payment.subscription`. A cobrança avulsa não tem esse campo: tratar `externalReference` com prefixo `upgrade:` antes desse teste.
- O caminho de `PAYMENT_CONFIRMED` hoje estende `PagoAte` em um mês e ativa a conta; `PAYMENT_OVERDUE` marca Em atraso. O pagamento de upgrade não pode passar por nenhum dos dois (regra 9 e §7): um upgrade vencido não deixa a conta Em atraso.
- `IAsaas` precisa de `CriarCobrancaAvulsaAsync` (`POST /payments`). `AtualizarValorAsync` já existe para as regras 11 e 16.
- Guardar a troca pendente (tipo, plano de destino, valor, id da cobrança avulsa, data de aplicação, criado em) para as regras 13 e 17 e o cancelamento do §7.
- `ControleDiarioAssinaturas` aplica o downgrade agendado (regra 17).
- `CancelarAsync` já remove cobranças pendentes; incluir a avulsa de upgrade e descartar o downgrade agendado.
