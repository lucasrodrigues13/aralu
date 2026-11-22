# 029. Dinheiro do evento

**Status: aprovada (18/11/2026).** O código deve seguir esta spec. Fonte: [produto-v1.md](../produto-v1.md) 5.9 e 5.1 (Pix), RF-095, RF-096, RF-097, RF-088. Os itens 2, 4 e 6 da seção 17 foram decididos em 18/11/2026. Implementada em 18/11/2026. Comprovantes decididos em 18/11/2026 (§6.6).

> **Versão 2 (card #41, 21/11/2026, [SPEC-040](040-parcelas-por-documento.md)).** As parcelas do cliente (§6.1 a §6.4: contrato, Cobrar, Recebi e totais) deixaram a aba Dinheiro do evento: viraram **parcelas do contrato com o cliente** (`Contrato.Parcelas`, copiadas do orçamento aprovado), com Cobrar, Recebi e Desfazer no diálogo Parcelas do contrato da tela Contratos (funil). `ParcelaCasal` e `Evento.ValorContrato` saíram do banco e da API. A aba Dinheiro do evento fica com pagamentos a fornecedores (`ContratoFornecedor.Parcelas`), despesas e entradas, comprovantes e a exportação do orçamento. O texto das seções 6.1 a 6.4 vale como regra de Cobrar, Recebi e Desfazer, agora no contrato.

> **Versão 3 (card #31, 21/11/2026, [SPEC-043](043-pagamentos-a-fornecedores.md)).** A aba Dinheiro do evento ficou só com os pagamentos a fornecedores (parcelas, marcar pago, comprovante por pagamento ou parcela) e o botão Exportar orçamento. As caixas **Despesas e entradas** e **Comprovantes e documentos** (§6.6) saíram da tela, da API e do banco; vale a SPEC-043 no lugar delas.

## 1. Identificador e nome

SPEC-029. Dinheiro do evento.

## 2. Objetivo

Separar o que a cerimonialista **recebe do cliente** do que ela **paga aos fornecedores**: gerar parcelas do contrato, cobrar pelo WhatsApp com Pix, registrar recebimento, ver totais e despesas do evento.

## 3. Requisitos relacionados

RF-095 (recebimentos do cliente), RF-096 (despesas e comprovantes), RF-097 (pagamentos de todos os eventos / exportação), RF-088 (chave Pix), RF-068 (parcelas a fornecedores — já em SPEC-018), RF-098 (parcelas do contrato vêm do contrato, bloco 7).

Fora: cobrança automática sem aprovação; financeiro da empresa (RF-076, outro bloco).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Tudo no dinheiro dos próprios eventos. |
| Assistant | Só se a dona marcou "pode ver o financeiro" (RF-045, SPEC-032). |
| Cliente (link) | Vê parcelas e Pix se a dona liberar no link (RF-056); não registra "Recebi". |
| Outra conta | Não vê. |

## 5. Pré-condições

Evento da conta. A chave Pix fica no Perfil da assessoria (campo "Chave Pix", RF-088). Sem chave cadastrada, "Cobrar" pede a chave na hora (§6.2).

## 6. Fluxo principal

### 6.1. Parcelas do cliente

1. Na aba Dinheiro do evento (ou cartão do Resumo), a dona informa **valor do contrato**, se há **entrada**, valor/data da entrada e **número de parcelas**.
2. O sistema gera todas as parcelas (entrada + demais), com vencimentos (§17 para a regra de datas — reaproveitar a lógica atual de assessoria se couber).
3. A lista mostra cada parcela: vencimento, valor, situação (a receber / parcial / recebida / atrasada).

### 6.2. Cobrar

1. Em uma parcela a receber, "Cobrar" abre o WhatsApp (link `wa.me`) com texto pronto e a chave Pix do Perfil. Se o Perfil não tem chave Pix, "Cobrar" abre antes um modal com o campo "Chave Pix"; a chave digitada vai na mensagem.
2. O texto muda se é lembrete, se vence hoje ou se está atrasada.
3. A plataforma **não envia** a mensagem sozinha.

### 6.3. Recebi

1. "Recebi" abre modal: valor, forma de pagamento, data. Aceita valor **parcial**.
2. Atualiza a parcela e os totais. "Desfazer" do último recebimento volta o estado anterior dessa parcela.

### 6.4. Totais

Sempre visíveis: **Contrato**, **Recebido** e **Saldo**. Saldo = valor do contrato − recebido (o que falta o cliente quitar). "Resultado" e "A receber" saem: o Saldo cobre os dois.

### 6.5. Pagamentos a fornecedores

Continuam os da SPEC-018 (parcelas do serviço). Nesta aba aparecem por mês e por fornecedor no evento. ~~A lista de todos os eventos ficava numa tela Pagamentos da conta (RF-097).~~ **Saiu no card #32 ([SPEC-041](041-gestao-financeira.md)):** a tela e `GET /api/v1/pagamentos` não existem mais; o menu Principal tem a Gestão Financeira, só com contratos de clientes.

### 6.6. Despesas, comprovantes e budget

- Despesas e entradas do evento por categoria.
- Comprovantes/documentos do evento (upload no volume): JPG, JPEG, PNG ou PDF de até **5 MB** cada. Imagens são reduzidas ao guardar (lado maior até 2000 px, recompressão) para economizar disco sem perder a leitura; PDF fica como veio.
- Budget estimado/contratado com **exportação para Excel** (RF-097).

## 7. Fluxos alternativos

- Sem valor de contrato: não gera parcelas.
- Cobrar sem Pix cadastrado: o modal pede a chave Pix e ela vai na mensagem.
- Recebi maior que o saldo da parcela: não grava.
- Desfazer sem recebimento: ação indisponível.
- Assistant sem financeiro: aba/rotas indisponíveis.

## 8. Regras de negócio

- Parcelas do cliente ≠ parcelas a fornecedores.
- Sem cobrança automática.
- O passo de valor da assessoria na criação (SPEC-008) deixa de ser usado; o valor mora aqui (e/ou no contrato, SPEC-030).
- O Saldo é do evento; o caixa da empresa é RF-076.
- O valor do contrato e as parcelas moram aqui. O contrato do evento (SPEC-030) só lê esses dados pelos campos de mesclagem.

## 9. Validações

Valores ≥ 0. Número de parcelas inteiro ≥ 1. Datas válidas. Forma de pagamento num conjunto definido (§17).

## 10. Estados

Parcela do cliente: a receber, parcialmente recebida, recebida; atrasada é derivada do vencimento + não recebida.

## 11. Dados necessários

Contrato (valor, entrada, nº parcelas); parcelas (vencimento, valor, recebimentos); Pix da conta; despesas/entradas; comprovantes; totais.

## 12. Interface

Tudo em modal para criar/editar parcela, receber e despesa (design-system 5.10). Totais em `.gd-numeros`. "Cobrar" abre o WhatsApp externo.

## 13. Erros

Validação no campo. Outra conta: indisponível. Falha ao gravar recebimento não deixa saldo inconsistente.

## 14. Critérios de aceite

1. Informar valor, entrada e N parcelas gera as parcelas corretas.
2. Cobrar abre WhatsApp com texto distinto para atrasada / vence hoje / lembrete.
3. Recebi parcial atualiza saldo; Desfazer reverte.
4. Totais Contrato, Recebido e Saldo batem com os lançamentos.
5. Assistant sem permissão financeira não acessa.
6. Outra conta não vê.

## 15. Cenários de teste

Gerar parcelas com e sem entrada. Cobrar nos três textos. Recebi total e parcial + Desfazer. Totais (Saldo). Isolamento. Cobrar sem Pix no Perfil (pede a chave).

## 16. Dependências

SPEC-008 (evento), SPEC-018 (fornecedores), RF-088 (Pix), SPEC-030 (contrato → parcelas), RF-045 (Assistant).

## 17. Premissas e pontos não definidos

1. Regra exata de vencimentos das parcelas. Implementado como na criação do evento: uma por mês a partir da 1ª, mesmo dia.
2. ~~Fórmula do Resultado.~~ Decidido: vira **Saldo** = contrato − recebido.
3. Formas de pagamento aceitas. Implementado com Pix, Dinheiro, Cartão, Transferência, Boleto e Outro; ajustar se o usuário pedir.
4. ~~Cobrar sem Pix.~~ Decidido: modal pede a chave Pix e ela vai na mensagem.
5. Categorias padrão de despesa. Por ora a categoria é texto livre.
6. ~~Valor do contrato aqui × no contrato.~~ Decidido: o valor mora aqui; o contrato (SPEC-030) lê pelos campos de mesclagem.
7. ~~Limites de arquivo de comprovante.~~ Decidido: JPG, JPEG, PNG e PDF até 5 MB; imagens reduzidas sem perder a leitura (§6.6).
