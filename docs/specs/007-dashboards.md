# 007. Tela Hoje

**Status: aprovada (versão 2, 18/11/2026).** Substitui a SPEC-007 de dashboards. O código deve seguir esta spec. Fonte: [produto-v1.md](../produto-v1.md) 5.2, RF-080 a RF-082. Os itens 1 e 2 da seção 17 foram decididos em 18/11/2026. Implementada em 18/11/2026 (rota `/hoje`), sem o cartão "Retornos do funil" (§17, item 7).

## 1. Identificador e nome

SPEC-007. Tela Hoje (substitui Dashboards).

## 2. Objetivo

Depois do login, mostrar o que pede ação hoje — não uma grade de atalhos. Saudação, cartões de ação, próximo evento, carteira e números do funil.

## 3. Requisitos relacionados

RF-080 (cartões de ação), RF-081 (próximo evento, carteira, checklist inicial), RF-082 (números do funil). Estágios do funil em RF-075. Pix e marca em RF-087/RF-088 (checklist).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Vê a Hoje da própria conta. |
| Assistant | Vê a Hoje com os eventos que a dona liberou; cartões financeiros só se "pode ver o financeiro" (RF-045). |
| Outra conta / casal / convidado | Não vê. |

## 5. Pré-condições

Organizer ou Assistant autenticado (SPEC-001). A casca e a navegação (bloco 1) já existem.

## 6. Fluxo principal

1. Login bem-sucedido abre **Hoje** (rota inicial).
2. **Saudação** com a data de hoje e a frase "N tarefas pedem você hoje" ("1 tarefa pede você hoje"). Se N = 0: "Nada pede você hoje". N é o total de tarefas ativas (não concluídas) com prazo hoje, somando todos os eventos visíveis.
3. **Cartões de ação** (somando todos os eventos visíveis), cada um com número e link para a tela que resolve:
   - Tarefas da semana e atrasadas → Tarefas (filtro adequado).
   - Cobranças a fazer (atrasadas e próximos 7 dias) → Dinheiro / pagamentos do casal (quando o bloco 6 existir; até lá, destino na §17).
   - Pagamentos a fornecedores da semana → Fornecedores / pagamentos.
   - Respostas de convidados: quantos convidados ainda não responderam, quantos confirmaram (sim) e quantos não vão (não), somando os eventos em andamento.
   - Retornos do funil → Funil.
4. **Próximo evento** com nome e contagem de dias (ou "É hoje").
5. **Carteira** em tabela: casal (nome do evento), data, % de tarefas feitas, convidados que responderam, coluna **Atenção** (tarefas atrasadas e/ou respostas abaixo do esperado). "Respostas abaixo do esperado": faltam menos de 2 meses para o evento e 50% ou mais dos convidados ainda não responderam.
6. **Números do funil**: quantidade e valor por estágio (os quatro já usados hoje).
7. Conta nova: **checklist de configuração** (contrato da conta, Pix, marca, página pública, equipe) com "pular" por item ou no conjunto. Some quando completo ou pulado.

## 7. Fluxos alternativos

- Conta sem eventos: cartões em zero; carteira vazia; saudação "Nada pede você hoje".
- Sem próximo evento com data: o bloco do próximo evento não aparece ou diz que não há data (§17).
- Assistant sem financeiro: cartões de cobrança/pagamento a fornecedor não aparecem ou aparecem vazios sem link (§17).
- Checklist já completo: não mostra.

## 8. Regras de negócio

- A Hoje **não** é uma grade de atalhos dos módulos; o menu lateral/inferior leva aos módulos.
- "N tarefas pedem você hoje" conta só as tarefas ativas com prazo hoje, de qualquer evento da conta. Os cartões de ação não entram nessa soma.
- Números isolam a conta; Assistant só vê o recorte liberado.
- Esta tela não cria evento nem oportunidade.

## 9. Validações

Não há formulário além de "pular" no checklist.

## 10. Estados

Sem estado próprio; reflete eventos, tarefas, parcelas, convites e funil.

## 11. Dados necessários

Agregados do dia: contagens dos cartões; próximo evento; linhas da carteira; estágios do funil; itens do checklist (flags da conta).

## 12. Interface

Miolo da casca. Cartões no padrão `.gd-numeros` / ação. Carteira em `.gd-grade`. Sem gráfico enquanto um RF não pedir série.

## 13. Erros

Falha ao carregar: mensagem genérica; não mistura dados de outra conta.

## 14. Critérios de aceite

1. Após o login, a rota inicial é Hoje com a saudação e a data.
2. Com tarefas atrasadas, o cartão correspondente mostra o número e leva à lista filtrada.
3. O próximo evento com data mostra a contagem de dias.
4. A carteira lista os eventos em andamento com % de tarefas e Atenção.
5. Os quatro estágios do funil aparecem com quantidade e valor.
6. Conta nova vê o checklist; "pular" esconde o item.
7. Outra conta não vê os números desta.

## 15. Cenários de teste

Conta vazia. Conta com tarefa atrasada e cobrança vencida. Próximo evento amanhã e hoje. Assistant com e sem financeiro. Checklist completo vs incompleto. Isolamento entre contas.

## 16. Dependências

SPEC-001, casca (bloco 1), SPEC-002/008 (eventos), SPEC-003 (tarefas), SPEC-004/010 (convidados), funil (RF-075), bloco 6 (dinheiro) para cobranças, RF-087/088 e contrato da conta para o checklist.

## 17. Premissas e pontos não definidos

1. ~~O que entra no "N" da saudação.~~ Decidido: tarefas ativas com prazo hoje, de todos os eventos (§6, item 2).
2. ~~Limiar de "respostas abaixo do esperado".~~ Decidido: menos de 2 meses para o evento e 50% ou mais dos convidados sem resposta (§6, item 5).
3. Destino dos cartões de cobrança antes do bloco 6 existir.
4. Comportamento do cartão financeiro para Assistant sem permissão (ocultar vs zero).
5. ~~Definição de "respostas de convidados".~~ Decidido: pendentes, sim e não (§6, item 3).
6. Se o bloco "próximo evento" some quando não há data. Implementado: mostra "Nenhum evento com data marcada".
7. "Retornos do funil" só entra quando o funil (bloco 16) ganhar a data de retorno. Decidido em 18/11/2026.
8. O checklist de configuração mostra só o que já existe (perfil, Pix, contrato). Marca, página pública e equipe entram com os blocos deles. "Pular" fica guardado no navegador.
