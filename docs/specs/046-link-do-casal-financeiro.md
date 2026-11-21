# 046. Link do casal: acesso ao financeiro do evento

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #34, com as opções mais simples e conservadoras nos pontos em aberto).** Fonte: card #34 do Trello; [produto-v1.md](../produto-v1.md) 5.9, 5.10 e 5.11. Usa a [SPEC-043](043-pagamentos-a-fornecedores.md) (pagamentos) e a [SPEC-045](045-contratar-fornecedor-e-contrato-assinado.md) (contrato assinado). Cria a base do link do casal, que o card #23 (convites) também usa.

## 1. Identificador e nome

SPEC-046. Link do casal e acesso ao financeiro do evento.

## 2. Objetivo

Dar ao casal um **link por evento, sem login nem senha**, que a organizadora liga, desliga e troca. Com o acesso ao financeiro liberado, o casal acompanha os pagamentos a fornecedores e os atualiza: marca como pago, parcela, sobe comprovantes e o contrato assinado do fornecedor.

## 3. Requisitos relacionados

RF-056 (acesso do cliente; o login `Client` continua fora, o link o substitui), RF-068, RF-096. Regra 7 do [roteiro de execução](../roteiro-execucao.md).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer (dona) | Criar, trocar, desativar o link do evento e liberar ou fechar o financeiro. |
| Assistant | Não gerencia o link (só a dona). Continua vendo e operando o financeiro como na SPEC-043. |
| Casal (quem tem o link) | Só o que a dona liberou: com o financeiro liberado, tudo da §6.3. Nada mais. |
| Outra conta ou link desligado | Link inválido (404). |

## 5. Pré-condições

Evento da conta. Para o casal agir: link ativo e financeiro liberado.

## 6. Fluxo principal

### 6.1. Organizadora gerencia o link

1. No evento (tela inicial), o menu **Mais** traz **Link do casal**, que abre um modal.
2. Sem link: "Gerar link". Gera um endereço único (`/casal/{código}`), com o financeiro **fechado**.
3. Com link: o modal mostra o endereço com **Copiar**, a marcação **"O casal acessa o financeiro do evento"** (liga e desliga na hora), **Trocar link** (gera outro código; o antigo para de funcionar) e **Desativar link** (apaga; o endereço para de funcionar).

### 6.2. Página do casal

1. `/casal/{código}`, sem login. Mostra o nome do evento e a data.
2. Financeiro fechado: aviso "A organizadora ainda não liberou o financeiro deste evento." Link inválido ou trocado: "Este link não está mais disponível."

### 6.3. Financeiro, quando liberado

Lista dos pagamentos a fornecedores (serviço, fornecedor, valor, situação, vencimento) com totais contratado, pago e a pagar, agrupada por mês como na SPEC-043. O casal pode:

1. **Marcar como paga** cada parcela, ou o pagamento inteiro (marca todas as parcelas), e desfazer. Sem etapa de confirmação da organizadora; ela vê e pode desfazer.
2. **Parcelar** e **refazer ou remover** o parcelamento, com as mesmas regras da SPEC-043 §6.2.
3. **Subir, abrir e excluir o comprovante** da parcela, ou do pagamento sem parcelas (SPEC-043 §6.4).
4. **Subir, abrir e excluir o contrato assinado** do fornecedor (SPEC-045 §6.4; a plataforma só recebe o arquivo).

Fora do alcance do casal: Gestão Financeira, contrato com o cliente, orçamento estimado, tarefas, observações e qualquer dado interno da organizadora; contratar ou voltar fornecedor para orçamento; valor de cada serviço.

## 7. Fluxos alternativos

- Código desconhecido, trocado ou desativado: 404 em todos os endereços do casal.
- Financeiro fechado: leitura do financeiro e todas as ações recusadas (403 com mensagem); a página mostra só o aviso.
- Arquivo de outro evento ou de outra conta: 404. Tipo ou tamanho inválido: 400 (como a SPEC-043).
- Parcela ou serviço que não é do evento do link: 404.

## 8. Regras de negócio

- Um link por evento. Trocar gera um código novo e o antigo deixa de valer na hora; desativar apaga o link.
- O código tem 32 bytes aleatórios (base64 sem símbolos), como o link da proposta; quem tem o endereço acessa. A segurança é o sigilo do endereço (a verificação por código no e-mail é o card #35 da versão dois).
- Toda ação do casal usa as regras de negócio da SPEC-043 e da SPEC-045; a única diferença é a identificação: o link resolve a conta e o evento.
- O arquivo só abre se é comprovante ou contrato assinado de um pagamento do evento do link.
- **Banco (migration `LinkDoCasal`, uma só):** tabela nova `LinksCasal` (`Id`, `EventoId` único com exclusão em cascata, `ContaId`, `Token` único, `FinanceiroLiberado`, `CriadoEm`). Nada é apagado.
- **API da organizadora** (Organizer): `GET`, `POST` (gera ou troca), `PUT` (`{ financeiroLiberado }`) e `DELETE` em `/api/v1/eventos/{id}/link-casal`.
- **API pública** (sem login), base `/api/v1/publico/casal/{token}`: `GET` (evento e financeiro), `PUT pagamentos/{servicoId}/parcelamento`, `DELETE pagamentos/{servicoId}/parcelamento`, `PUT pagamentos/{servicoId}/pago`, `PUT pagamentos/{servicoId}/parcelas/{parcelaId}/pago`, `POST` e `DELETE pagamentos/{servicoId}/comprovante` e `.../parcelas/{parcelaId}/comprovante`, `POST` e `DELETE pagamentos/{servicoId}/contrato-assinado`, `GET arquivos/{arquivoId}`. A leitura do pagamento ganha `contratoAssinado` (também na tela do organizador).

## 9. Validações

As da SPEC-043 (parcelas de 1 a 120, entrada, arquivo JPG, JPEG, PNG ou PDF até 5 MB).

## 10. Estados

Link: inexistente, ativo com financeiro fechado ou ativo com financeiro liberado.

## 11. Dados necessários

Evento, código, marcação do financeiro, data de criação.

## 12. Interface

Modal em dois cliques no evento (design-system 5.10). A página do casal é pública, sem a casca do aplicativo, com a mesma tabela expansível da aba Dinheiro e os mesmos modais de parcelar e comprovante.

## 13. Erros

Mensagem no modal ou aviso; página do casal com texto simples para link indisponível ou financeiro fechado.

## 14. Critérios de aceite

1. A dona gera o link, copia, liga e desliga o financeiro, troca (o antigo para de abrir) e desativa.
2. O casal abre o link sem login e vê o evento; com o financeiro fechado não vê valores nem consegue agir.
3. Com o financeiro liberado, o casal marca parcela e pagamento como pagos, desfaz, parcela, sobe e exclui comprovante e contrato assinado, e a organizadora vê o resultado na aba Dinheiro.
4. Link de um evento não alcança outro evento nem outra conta; arquivo alheio não abre.
5. Assistente não gerencia o link.

## 15. Cenários de teste

Unitários: regras do serviço do link com dados em memória (gerar, trocar, desativar, financeiro fechado recusa, link inválido, arquivo só do evento). Integração (escritos e compilando; execução no fim das ondas): ciclo completo pela API pública, isolamento entre contas e assistente sem acesso.

## 16. Dependências

SPEC-043, SPEC-045, SPEC-040. Depois: #23 (convites usam a mesma base do link), #30 (aba Contratos do evento lista o que o casal subir), #35 (verificação por código, versão dois).

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono):

1. **"O que o casal vê e edita" é uma marcação só**: financeiro liberado ou não. O card fala em marcar ver e editar, mas lista só o que se faz com o financeiro liberado; ver sem editar não entra. Outras marcações (convidados, tarefas, roteiro) entram nos cards que as usam (#23 e seguintes).
2. **O link nasce com o financeiro fechado**; a dona liga depois.
3. **Quem gerencia**: só a dona (Organizer). Assistente não gera nem troca o link.
4. **Contratar, voltar para orçamento e valor do serviço** não são do casal; ele só atua sobre o que já está contratado.
5. **Sem expiração e sem limite de acessos** no link; sem registro de quem abriu. Segurança é o sigilo do endereço (versão dois: código por e-mail, card #35).
6. **O casal não é identificado** nas ações: o histórico não diz "marcado pelo casal". Hoje o sistema também não registra quem marcou na tela da organizadora.
7. **Marca da cerimonialista, mensagem, contagem regressiva, "ver como o casal vê"** e demais itens de 5.11 não entram neste card.
8. **Dados do evento na página**: só nome e data.
