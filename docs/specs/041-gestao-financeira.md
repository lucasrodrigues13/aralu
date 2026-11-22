# 041. Gestão Financeira

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #32, com as opções mais simples e conservadoras nos pontos em aberto da §17).** Implementada em 21/11/2026. Fonte: card #32 do Trello; [produto-v1.md](../produto-v1.md) 5.9, 5.10 e o menu (§4). Depende da [SPEC-040](040-parcelas-por-documento.md) (parcelas por documento) e muda o menu da [SPEC-035](035-menu-lateral.md).

## 1. Identificador e nome

SPEC-041. Gestão Financeira da organizadora.

## 2. Objetivo

Dar à organizadora o lugar do **faturamento pelo serviço prestado**: os contratos fechados com cada cliente e o que falta receber de cada um, sem nada específico de evento. Substitui a tela Pagamentos (pagamentos a fornecedores de todos os eventos), que deixa de existir: pagamento a fornecedor fica só na aba Dinheiro do evento.

## 3. Requisitos relacionados

RF-095 (recebimentos do cliente), RF-098 (contrato) e RF-097, que trazia "pagamentos de todos os eventos" (essa parte sai; o texto do RF não foi alterado, ver §17.8). Regra 7 do [roteiro de execução](../roteiro-execucao.md): o que sai da aplicação sai também da API.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Admin, Organizer | Tudo: ver a lista, parcelar, cobrar, registrar e desfazer recebimento. |
| Assistant com "pode ver o financeiro" (SPEC-032) | O mesmo. Sem a permissão, o item some do menu e a rota leva a "sem acesso". |
| Outra conta | Não vê nem altera (404). |

## 5. Pré-condições

Usuário autenticado (SPEC-001) com acesso ao financeiro.

## 6. Fluxo principal

### 6.1. Menu

O item **Gestão Financeira** fica no grupo **Principal** (depois de Perfil e Assistentes), rota `/gestao-financeira`, visível só com acesso ao financeiro. Sai o item "Pagamentos" do grupo Gestão de eventos. Na barra inferior do celular, o atalho "Dinheiro" vira "Financeiro" e leva à mesma tela.

### 6.2. Lista de contratos por cliente

1. A tela lista os contratos **não cancelados** do funil (em andamento ou assinados), ordenados pelo nome do cliente (a oportunidade) e depois pela data de criação. Cliente com mais de um contrato aparece em mais de uma linha.
2. Cada linha mostra: cliente, situação do contrato (em andamento ou assinado) e data de criação, valor, recebido, saldo e o selo de parcelas: **Sem parcelas**, **À vista, a receber** (1 parcela), **N parcelas**, **Parcela atrasada** ou **Quitado**; com saldo, "próxima em" o vencimento mais próximo com saldo.
3. Três totais no alto (Contratado, Recebido, A receber) somam o que a lista mostra, já com os filtros.
4. Filtros: situação (Todos, Em aberto, Com parcela atrasada, Quitados, Sem parcelas) e busca pelo nome do cliente.
5. Valor do contrato = soma das parcelas (SPEC-040); contrato sem parcelas mostra R$ 0,00.

### 6.3. Gerenciar cada contrato

1. **Parcelas do contrato** (ícone de pagamentos; só com parcelas): o diálogo da SPEC-040 §6.2, que sai da tela Contratos do funil e passa a abrir **só** daqui. Tem **Cobrar** (WhatsApp, com Pix), **Recebi** (valor parcial, forma, data) e **Desfazer último recebimento**.
2. **Parcelar contrato / Refazer parcelamento** (ícone de calendário): modal com número de parcelas (1 a 120), vencimento da 1ª parcela e entrada opcional (valor e data). **"Configurando parcelamento ou não": 1 parcela = à vista.** O total é o **valor do orçamento aprovado** da oportunidade (SPEC-040 §17.2); o servidor calcula com o mesmo gerador de parcelas do orçamento e **substitui** as parcelas anteriores.
3. Só se pode refazer o parcelamento **sem recebimento registrado** e em contrato não cancelado. Sem orçamento aprovado com valor, o servidor recusa com mensagem (o valor do contrato vem do orçamento; não se digita um valor solto).
4. A tela Contratos do funil perde o ícone de parcelas; continua só com o texto do contrato (editar, enviar, assinar, cancelar, excluir).
5. A tela Hoje: o card "Cobranças a fazer" leva à Gestão Financeira (antes, à tela Contratos). O card "Pagar a fornecedores" (pagamentos da semana) **fica como está** e leva à lista de eventos, onde a organizadora abre a aba Dinheiro do evento.

### 6.4. O que sai

1. Tela `/pagamentos` e `GET /api/v1/pagamentos` (lista de pagamentos a fornecedores de todos os eventos) saem do frontend e da API, com `DinheiroServico.PagamentosAsync` e o método `pagamentos()` do cliente.
2. O cartão "Pagamentos" da tela Eventos (um atalho sem número, "—", para essa tela) sai, com o campo `rotuloPagamentos` das estatísticas.
3. **Sem migration**: nenhuma tabela ou coluna muda (as parcelas por documento já existem, SPEC-040).

## 7. Fluxos alternativos

- Parcelar sem data da 1ª parcela, com quantidade fora de 1 a 120 ou com entrada que não fecha com o total: 400 com mensagem no modal.
- Parcelar contrato cancelado, com recebimento registrado ou sem orçamento aprovado com valor: 400 com mensagem.
- Contrato ou parcela de outra conta: 404.
- Falha ao carregar a lista: aviso de erro, lista vazia.

## 8. Regras de negócio

- A Gestão Financeira mostra **só** o dinheiro entre organizadora e cliente. O dinheiro do cliente para fornecedores existe só dentro de cada evento (produto-v1 5.9).
- Cobrar, Recebi e Desfazer seguem as regras da SPEC-029 §6.2 e §6.3 e da SPEC-040 §6.2 sem mudança.
- Refazer o parcelamento apaga as parcelas antigas (sem recebimentos, então não perde dado de pagamento).
- Nova API: `PUT /api/v1/contratos-funil/{id}/parcelas`, mesmo corpo do orçamento (`quantidadeParcelas`, `primeiraParcela`, `comEntrada`, `baseEntrada`, `valorEntrada`, `dataEntrada`), com a política do financeiro. Devolve o contrato como a leitura de sempre.

## 9. Validações

Quantidade inteira de 1 a 120; vencimento da 1ª parcela obrigatório; entrada > 0 e menor ou igual ao total, com data; total (valor do orçamento aprovado) > 0.

## 10. Estados

Selo financeiro do contrato (derivado, não guardado): Sem parcelas; A receber (em aberto); Parcela atrasada (alguma parcela atrasada); Quitado (saldo zero).

## 11. Dados necessários

Nenhum dado novo. Usa `ContratosFunil`, `ParcelasContrato`, `RecebimentosParcela` e `ParcelasOrcamento` (SPEC-040).

## 12. Interface

Tela "Gestão Financeira" (cartões de totais, filtros, tabela). Modais: Parcelas do contrato (já existente, movido) e Parcelar contrato (novo). Segue o design system: cadastro e edição em modal.

## 13. Erros

Mensagem do servidor no modal de parcelamento; toast nos demais. Outra conta: indisponível.

## 14. Critérios de aceite

1. O menu lateral da dona traz Gestão Financeira no grupo Principal e não traz Pagamentos; a assistente sem financeiro não vê o item.
2. A tela lista contratos não cancelados por cliente, com valor, recebido, saldo e selo; os filtros e a busca funcionam.
3. Parcelar um contrato com orçamento aprovado gera as parcelas (1 = à vista; com e sem entrada) e refazer substitui; com recebimento registrado, recusa.
4. Cobrar, Recebi e Desfazer funcionam a partir da Gestão Financeira; a tela Contratos do funil não tem mais o ícone de parcelas.
5. `GET /api/v1/pagamentos` não existe mais (404); a aba Dinheiro do evento segue com os pagamentos a fornecedores.
6. Outra conta recebe 404 ao parcelar contrato alheio.

## 15. Cenários de teste

Unitário (frontend): selo/filtro financeiro (sem parcelas, atrasado, em aberto, quitado); menu com o item no grupo Principal e ausente sem financeiro. Integração: contrato sem orçamento aceito recusa; à vista e em três parcelas (a segunda substitui a primeira); recusa com recebimento e aceita depois de desfazer; isolamento entre contas; contrato cancelado recusa.

## 16. Dependências

Card #41 (SPEC-040), SPEC-032 (permissão do financeiro), SPEC-035 (menu), SPEC-029 e SPEC-007 (Hoje). Quem usa depois: #31 (Dinheiro do evento sem a parte do cliente), #33 (parcelas do mês na Gestão Financeira) e #34.

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono):

1. **Que contratos aparecem.** Todos os não cancelados, assinados ou não (mesma regra da SPEC-040 §17.4); cancelados ficam fora da tela.
2. **"Configurando parcelamento ou não".** Entendido como: o contrato pode ficar **sem parcelas**, ter **1 parcela (à vista)** ou várias. O valor total não é digitável: vem do orçamento aprovado (a SPEC-040 §17.3 dizia que parcelas só vêm do orçamento; esta spec acrescenta definir o parcelamento no contrato, só enquanto não há recebimento, porque o card pede gerenciar o parcelamento contrato a contrato). Sem orçamento aprovado com valor, o contrato não pode ser parcelado.
3. **Contrato sem parcelas.** Aparece com "Sem parcelas" e valor R$ 0,00 (o valor do contrato é a soma das parcelas, SPEC-040). Mostrar o valor do orçamento aprovado nesses casos fica para um card futuro.
4. **Sem tela de detalhe por cliente.** "Listar contratos por cliente" foi feito como lista ordenada e buscável por cliente, não como páginas por cliente nem agrupamento com subtotais. Subtotal por cliente fica para depois.
5. **Atalho do celular.** "Dinheiro" (que levava a Pagamentos) vira "Financeiro" e leva à Gestão Financeira.
6. **Links da tela Hoje.** O card de pagamentos da semana, que levava à tela Pagamentos, passa a levar à lista de eventos (card #31 decide se ganha destino próprio); o de cobranças leva à Gestão Financeira.
7. **Cartão da tela Eventos.** O cartão "Pagamentos" (atalho sem número) foi removido, não redirecionado.
8. **RF-097.** O texto do RF ("pagamentos de todos os eventos") não foi alterado nem renumerado; ele fica desatualizado até o dono pedir a mudança.
9. **Assistente sem financeiro.** A lista de contratos do funil (`GET /contratos-funil`) continua aberta à assistente, como já era (traz valor e parcelas); só a nova tela e as ações de dinheiro exigem o financeiro. Não alterado neste card.
