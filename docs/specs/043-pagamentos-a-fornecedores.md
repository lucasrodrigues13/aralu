# 043. Pagamentos a fornecedores no Dinheiro do evento

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #31, com as opções mais simples e conservadoras nos pontos em aberto).** Fonte: card #31 do Trello; [produto-v1.md](../produto-v1.md) 5.9. Revisa a [SPEC-029](029-dinheiro-do-evento.md) (aba Dinheiro do evento) e usa o banco da [SPEC-040](040-parcelas-por-documento.md).

## 1. Identificador e nome

SPEC-043. Pagamentos a fornecedores no Dinheiro do evento.

## 2. Objetivo

Deixar a aba Dinheiro do evento só com a gestão financeira dos fornecedores contratados: um **pagamento por fornecedor contratado**, que pode ser parcelado, marcado como pago (inteiro ou parcela a parcela) e receber **comprovante** por pagamento ou por parcela. Saem as caixas de Comprovantes e de Despesas e entradas.

## 3. Requisitos relacionados

RF-068 (parcelas a fornecedores), RF-096 (comprovantes; a parte de despesas avulsas sai), RF-097 (exportação do orçamento continua). Regra 7 do [roteiro de execução](../roteiro-execucao.md).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Admin, Organizer | Tudo no dinheiro dos próprios eventos. |
| Assistant | Só com "pode ver o financeiro" e, se restrita, nos eventos liberados (SPEC-032), como já era. |
| Outra conta | Não vê (404). |

O casal marcar como pago e subir comprovante pelo link é o card #34, sobre esta estrutura (feito na [SPEC-046](046-link-do-casal-financeiro.md); a leitura do pagamento ganhou `contratoAssinado`).

## 5. Pré-condições

Evento da conta com serviço contratado (Fornecedores > Contratar).

## 6. Fluxo principal

### 6.1. Lista de pagamentos

1. Cada serviço **contratado** do evento é um pagamento: serviço, fornecedor, valor contratado, situação (pendente ou pago), comprovante. A lista é agrupada por mês do vencimento (parcela mais próxima ainda pendente, ou a última); pagamentos sem parcelas ficam no grupo "Sem vencimento".
2. Pagamento **parcelado** tem botão de expandir: as parcelas aparecem com vencimento, valor, entrada, checkbox "paga" e comprovante.
3. Totais no cabeçalho: contratado, pago e a pagar.

### 6.2. Parcelar

1. Em um pagamento, "Parcelar" abre um modal: número de parcelas, vencimento da 1ª e entrada opcional (valor e data). O total é o valor contratado do serviço. As parcelas nascem pendentes.
2. "Refazer parcelamento" substitui as parcelas; só é possível enquanto **nenhuma parcela estiver paga** e o pagamento não tiver comprovante.
3. "Remover parcelamento" volta o pagamento a inteiro (nas mesmas condições).

### 6.3. Marcar como pago

1. Checkbox da parcela: marca ou desmarca (data de pagamento = hoje; ao desmarcar, a data e o comprovante da parcela continuam, só a situação volta a pendente).
2. Todas as parcelas pagas: o pagamento passa a **pago** sozinho. Desmarcar uma parcela o devolve a pendente.
3. "Marcar como pago" no pagamento marca **todas** as parcelas (ou o pagamento inteiro, se não tem parcelas). "Desfazer" volta tudo a pendente.

### 6.4. Comprovante

1. Cada parcela, ou o pagamento quando **não tem parcelas**, aceita **um** comprovante (JPG, JPEG, PNG ou PDF até 5 MB; imagens reduzidas, como já era). Enviar outro substitui e apaga o arquivo anterior. É possível abrir e excluir.
2. Em pagamento parcelado não há comprovante do pagamento inteiro: é por parcela.

### 6.5. O que sai da aba

As caixas **Comprovantes e documentos** e **Despesas e entradas** saem da tela, da API e do banco, com os dados. Fica o botão Exportar orçamento.

## 7. Fluxos alternativos

- Parcelar com número fora de 1 a 120, sem 1ª data ou com entrada que não fecha: 400.
- Refazer ou remover o parcelamento com parcela paga ou comprovante enviado: 400 com mensagem.
- Arquivo de outro tipo ou acima de 5 MB: 400. Pagamento ou parcela de outra conta ou de outro evento: 404.
- Serviço sem valor contratado: não parcela (400).

## 8. Regras de negócio

- Pagamento a fornecedor existe só dentro do evento; o dinheiro é do casal e a organizadora marca o que o casal informa.
- Pagamento pago = todas as parcelas pagas (parcelado) ou marcado pago (sem parcelas).
- O resumo do evento e o card "Pagamentos da semana" da Hoje seguem contando parcelas pagas e pendentes.
- **Banco (migration `PagamentosAFornecedores`, uma só):** `ParcelasContratoFornecedor` ganha `PagoEm` e o comprovante (arquivo, nome, tipo); `ContratosFornecedor` ganha `Pago`, `PagoEm` e o comprovante; `LancamentosEvento` e `ComprovantesEvento` são apagadas (dados perdidos). Saem da API: `POST/PUT/DELETE /eventos/{id}/dinheiro/lancamentos`, `POST/DELETE /eventos/{id}/dinheiro/comprovantes`, e `despesas`, `entradas`, `lancamentos` e `comprovantes` da leitura do Dinheiro.

## 9. Validações

Parcelas inteiras de 1 a 120; entrada maior que zero e até o total; arquivo JPG, JPEG, PNG ou PDF de até 5 MB.

## 10. Estados

Pagamento e parcela: pendente ou paga.

## 11. Dados necessários

Contrato do fornecedor (valor do serviço, situação, data, comprovante) e parcelas (número, vencimento, valor, entrada, situação, data, comprovante).

## 12. Interface

Tudo em modal (design-system 5.10). Linha expansível com as parcelas e checkbox; menu de ações do pagamento (Parcelar, Marcar como pago, Comprovante); ação do comprovante na parcela.

## 13. Erros

Mensagem no modal ou aviso. Outra conta: indisponível.

## 14. Critérios de aceite

1. Parcelar um pagamento gera as parcelas certas (com e sem entrada) e a linha expande.
2. Marcar todas as parcelas como pagas muda o pagamento para pago; desmarcar uma o devolve a pendente.
3. Marcar o pagamento como pago marca todas as parcelas; Desfazer reverte.
4. Comprovante por parcela e por pagamento sem parcelas: aceita PDF, recusa outro tipo, substitui, abre e exclui; arquivo de outra conta não abre.
5. Refazer parcelamento com parcela paga é recusado.
6. As caixas e os endpoints de despesas e comprovantes do evento não existem mais; outra conta não vê nada.

## 15. Cenários de teste

Unitários: situação do pagamento (parcelado e sem parcelas), marcar tudo e desfazer. Integração: parcelar, marcar parcela, marcar pagamento, comprovante (PDF, texto recusado, excesso, substituir, excluir), refazer recusado, isolamento.

## 16. Dependências

SPEC-040 (banco), SPEC-041 (parte do casal saiu), SPEC-018, SPEC-029. Depois: #28 (Contratar sem parcelas, arquivo assinado) e #34 (casal marca pelo link).

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono):

1. **O que é um "pagamento".** Um por serviço contratado. Serviço contratado sem contrato de fornecedor (caso que o card #28 cria) aparece como pagamento sem parcelas, e o contrato é criado ao primeiro uso. *(Resolvido pela SPEC-045: o contrato nasce ao contratar e a migration cria o dos serviços já contratados.)*
2. **Despesas e comprovantes antigos.** O card manda definir o destino antes de remover: ficam **apagados com os dados** (regra 7). Os arquivos físicos do volume e as linhas da tabela `Arquivos` ficam órfãos (limpeza manual; não há migração de dados para a nova estrutura).
3. **Data do pagamento.** Marcar como pago usa a data de hoje, sem perguntar. Forma de pagamento e "pago por" não existem.
4. **Comprovante no pagamento inteiro** só quando não há parcelas.
5. **Refazer parcelamento** só sem parcela paga e sem comprovante.
6. **Contratar** continua pedindo parcelas até o card #28 tirá-las. *(Resolvido pela [SPEC-045](045-contratar-fornecedor-e-contrato-assinado.md): Contratar não pede mais parcelas e contratar de novo mantém o contrato, os pagos e os comprovantes.)*
7. **Hoje.** O card "Pagamentos da semana" continua e lê só parcelas; pagamento sem parcelas não aparece nele.
8. **Exportar orçamento** fica (o card só manda tirar os dois boxes).
