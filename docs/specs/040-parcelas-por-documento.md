# 040. Parcelas por documento

**Status: aprovada (21/11/2026; aprovação do dono do projeto repassada pela sessão que abriu o card #41, com as opções mais simples e conservadoras nos pontos em aberto).** Implementada em 21/11/2026. Fonte: card #41 do Trello (decidido em 21/11/2026); [produto-v1.md](../produto-v1.md) 5.9, 5.10 e 5.13. Substitui a parte de parcelas da [SPEC-029](029-dinheiro-do-evento.md) (parcelas do casal presas ao evento) e da [SPEC-018](018-servicos-e-fornecedores.md) (parcelas do serviço).

## 1. Identificador e nome

SPEC-040. Parcelas por documento.

## 2. Objetivo

Trocar as duas tabelas de parcelas antigas (`ParcelasCasal`, presa ao evento, e `ParcelaServico`, presa ao serviço do evento) por **parcelas que pertencem a um documento**: o orçamento do funil, o contrato com o cliente e o contrato com o fornecedor. É a base dos cards seguintes (Gestão Financeira, Dinheiro do evento, Contratar fornecedor, parcelas no orçamento e no contrato do funil).

## 3. Requisitos relacionados

RF-095 (recebimentos do cliente), RF-068 (parcelas a fornecedores), RF-097 (pagamentos), RF-098 (contrato). Regra 7 do [roteiro de execução](../roteiro-execucao.md): o que sai da aplicação sai também do banco e da API, mesmo perdendo dados.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Admin, Organizer | Tudo: parcelar o orçamento, ver as parcelas do contrato, cobrar, registrar e desfazer recebimento. |
| Assistant | Vê o contrato e as parcelas como já via o funil. Registrar e desfazer recebimento exige "pode ver o financeiro" (SPEC-032). A cobrança da tela Hoje só aparece para quem tem financeiro e não é restrita a eventos marcados (o contrato não tem evento). |
| Outra conta | Não vê nem altera (404). |

## 5. Pré-condições

Usuário autenticado (SPEC-001). Para parcelar o orçamento: valor do orçamento maior que zero e orçamento em andamento.

## 6. Fluxo principal

### 6.1. Orçamento (`ParcelaOrcamento`)

1. `PUT /orcamentos-funil/{id}/parcelas` recebe quantidade (1 a 120), vencimento da 1ª parcela e, se houver, entrada (valor ou %, e data). O total é o **valor do orçamento**; o gerador é o `ParcelasDaAssessoria` de sempre (entrada + parcelas mensais, sobra de centavos na última).
2. As parcelas **substituem** as anteriores. Se o valor do orçamento muda depois, as parcelas são apagadas (foram calculadas sobre o valor antigo) e o organizador define de novo.
3. A leitura do orçamento traz `parcelas` (número, vencimento, valor, entrada). A tela de definir parcelas no orçamento e a exibição na proposta por link são do card #44; este card entrega o modelo e a API.

### 6.2. Contrato com o cliente (`ParcelaContrato`)

1. Ao criar o contrato do funil, o sistema procura o **orçamento aprovado** da oportunidade (o mais recente com resposta Aceitar, não cancelado) e **copia** suas parcelas para o contrato. Sem orçamento aprovado ou sem parcelas, o contrato nasce sem parcelas.
2. A leitura do contrato traz as parcelas, o **valor total** (soma), o **recebido** e o **saldo**. A leitura de um contrato só traz também o telefone do contato e a chave Pix, que o "Cobrar" usa.
3. **Cobrar** (texto muda se é lembrete, se vence hoje ou se atrasou, e leva a chave Pix; sem chave no Perfil, o modal pede), **Recebi** (valor parcial, forma, data; não passa do saldo) e **Desfazer último recebimento** seguem a SPEC-029 §6.2 e §6.3, agora no diálogo **Parcelas do contrato**, aberto da Gestão Financeira ([SPEC-041](041-gestao-financeira.md); no card #41 abria da tela Contratos do funil). Endpoints: `POST /contratos-funil/{id}/parcelas/{parcelaId}/recebimentos` e `DELETE .../recebimentos/ultimo`.
4. Contrato cancelado não recebe.

### 6.3. Contrato com o fornecedor (`ContratoFornecedor`, `ParcelaContratoFornecedor`)

1. Um `ContratoFornecedor` por serviço do evento (índice único), com as parcelas a pagar.
2. Hoje ele nasce em **Contratar** (como as parcelas nasciam): valor, quantidade, 1ª parcela e entrada. Contratar de novo substitui o contrato e as parcelas.
3. O que muda de tela: as parcelas aparecem como antes na aba Fornecedores, na aba Dinheiro do evento (Pagamentos a fornecedores), na tela Pagamentos e na tela Hoje (pagamentos da semana). O arquivo assinado e o pagamento com comprovante entram com os cards #28 e #31.

### 6.4. Tela Hoje

O card "Cobranças a fazer" lista as parcelas de **contratos não cancelados** com saldo e vencimento até 7 dias à frente, uma linha por parcela, com o nome da oportunidade e link para a tela Contratos.

### 6.5. Aba Dinheiro do evento

Perde as parcelas do casal e os totais Contrato, Recebido e Saldo (e `Evento.ValorContrato`). Fica com pagamentos a fornecedores, despesas e entradas, comprovantes e a exportação do orçamento. O card #31 reorganiza o resto.

## 7. Fluxos alternativos

- Parcelar orçamento sem valor, em outra situação que não "em andamento", com quantidade fora de 1 a 120, sem data da 1ª parcela ou com entrada que não fecha: 400 com mensagem.
- Recebi maior que o saldo da parcela, sem forma ou sem data: 400. Desfazer sem recebimento: 400.
- Contrato ou orçamento de outra conta: 404.

## 8. Regras de negócio

- A estrutura é a mesma nos três documentos: número, vencimento, valor, entrada. O contrato com o cliente tem recebimentos (valor, forma, data); o do fornecedor tem situação pendente/pago.
- O contrato **copia** as parcelas do orçamento ao ser criado e passa a ter vida própria: mudar o orçamento depois não muda um contrato já gerado.
- Não existe mais parcela do casal presa ao evento, nem o "serviço" Assessoria e Organização (que só guardava essas parcelas), nem `POST /eventos/{id}/assessoria`.
- **Banco (migration `ParcelasPorDocumento`, uma só):** apaga `ParcelasCasal`, `ParcelaServico`, `RecebimentosParcela` (os dados) e `Eventos.ValorContrato`, e os serviços "Assessoria e Organização" da própria conta; cria `ParcelasOrcamento`, `ParcelasContrato`, `ContratosFornecedor` e `ParcelasContratoFornecedor`; `RecebimentosParcela` passa a apontar para `ParcelasContrato`. Os dados antigos são perdidos (aceito pelo dono, regra 7).
- Saem da API: `PUT /eventos/{id}/dinheiro/contrato`, `POST/DELETE /eventos/{id}/dinheiro/parcelas/{parcelaId}/recebimentos`, `POST /eventos/{id}/assessoria`. A leitura do Dinheiro do evento perde `valorContrato`, `recebido`, `saldo`, `chavePix` e `parcelas`.

## 9. Validações

Valor do orçamento > 0; quantidade de parcelas inteira de 1 a 120; entrada > 0 e menor ou igual ao total; valor recebido > 0 e até o saldo; forma de pagamento no conjunto definido (SPEC-029 §17.3).

## 10. Estados

Parcela do contrato: a receber, parcial, recebida; atrasada é derivada (vencimento + não recebida). Parcela de fornecedor: pendente ou paga.

## 11. Dados necessários

`ParcelasOrcamento` (orçamento, número, vencimento, valor, entrada); `ParcelasContrato` (contrato do funil, mesmos campos) e `RecebimentosParcela`; `ContratosFornecedor` (serviço do evento, único) e `ParcelasContratoFornecedor` (mesmos campos + situação).

## 12. Interface

Diálogo "Parcelas do contrato" (tabela com Cobrar, Recebi e menu Desfazer; totais no subtítulo) aberto da tela Contratos. Aba Dinheiro do evento sem o bloco do casal. Hoje com a coluna Contrato.

## 13. Erros

Validação com mensagem no modal. Outra conta: indisponível.

## 14. Critérios de aceite

1. Parcelar um orçamento gera as parcelas corretas (com e sem entrada); trocar o valor do orçamento apaga as parcelas.
2. Gerar o contrato depois do aceite do orçamento copia as parcelas; sem aceite, o contrato nasce sem parcelas.
3. Recebi parcial atualiza recebido e saldo do contrato; Desfazer reverte; passar do saldo não grava.
4. A tela Hoje lista só parcelas de contratos não cancelados.
5. Contratar fornecedor cria o `ContratoFornecedor` com as parcelas; elas aparecem em Fornecedores, Dinheiro, Pagamentos e Hoje.
6. As duas tabelas antigas, `ValorContrato` e os endpoints removidos não existem mais; outra conta não vê nada.

## 15. Cenários de teste

Unitários: gerador de parcelas (entrada, sobra de centavos, valores e quantidades inválidos), situação e saldo da parcela do contrato, resumo do evento com o contrato do fornecedor. Integração: orçamento → parcelas → aceite → contrato com parcelas → recebi, parcial, desfazer, isolamento; Dinheiro do evento (despesa, planilha, isolamento); assistente com pagamentos de fornecedor.

## 16. Dependências

Card #41. SPEC-018, SPEC-025, SPEC-022, SPEC-029, SPEC-007 (Hoje). Quem usa depois: #32, #31, #28, #34, #33 e #44.

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono):

1. **Onde ficam Cobrar e Recebi.** O card diz que mudam, sem dizer a tela. Ficavam num diálogo na tela Contratos (funil), até o card #32 criar a Gestão Financeira. **Atualizado no card #32 ([SPEC-041](041-gestao-financeira.md)): o diálogo foi para a Gestão Financeira e saiu da tela Contratos.**
2. **O que é "orçamento aprovado".** O orçamento com resposta Aceitar (pelo link ou registrada pela organizadora), não cancelado, o mais recente. Respondido "sem corpo" (marcação antiga) não conta.
3. **Parcela só do orçamento ao gerar o contrato.** Não havia edição das parcelas direto no contrato; mudava-se o orçamento e gerava-se um contrato novo. **Atualizado no card #32 (SPEC-041 §17.2): a Gestão Financeira define ou refaz o parcelamento do contrato, só sem recebimento registrado, sobre o valor do orçamento aprovado.**
4. **Quais contratos cobram.** Todo contrato não cancelado (assinado ou não), para a organizadora poder registrar o que o cliente pagou sem depender do botão Assinar.
5. **ContratoFornecedor mínimo.** Só `Id` e o serviço (único); o arquivo do contrato assinado e o comprovante por parcela entram com os cards #28 e #31, que têm migration própria.
6. **Evento.ValorContrato saiu.** Só servia às parcelas do casal.
7. **Cobranças na tela Hoje.** O contrato não tem evento: o card aparece para Admin e Organizer e para a assistente com financeiro que não é restrita a eventos marcados.
8. **Dados antigos.** Perdem-se recebimentos, parcelas do casal, parcelas de fornecedor e o serviço "Assessoria e Organização" (aceito pelo dono).
