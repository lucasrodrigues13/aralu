# 047. Gráficos de orçamento na aba Fornecedores do evento

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #29, com as opções mais simples e conservadoras nos pontos em aberto).** Fonte: card #29 do Trello; [produto-v1.md](../produto-v1.md) 5.6. Revisa a [SPEC-018](018-servicos-e-fornecedores.md) (planejamento de budget, §1.9) e a [SPEC-045](045-contratar-fornecedor-e-contrato-assinado.md) (mesma tela).

## 1. Identificador e nome

SPEC-047. Gráficos de orçamento no topo da aba Fornecedores do evento.

## 2. Objetivo

Trocar o botão "Orçamento" e o modal "Planejamento de orçamento" por **cards com gráficos no topo** da aba Fornecedores, para ver o orçamento do evento de relance.

## 3. Requisitos relacionados

RF-058 (serviços e budget no evento). Regra 7 do [roteiro de execução](../roteiro-execucao.md): o que sai da tela e perde uso sai também da API (ver §8).

## 4. Atores e permissões

Mesma regra do orçamento de hoje: quem tem a permissão do financeiro (Admin, Organizer e Assistant com financeiro) vê os gráficos. Quem não tem vê a aba sem os gráficos (a leitura devolve 403 e o bloco simplesmente não aparece). Outra conta: 404, nada aparece.

## 5. Pré-condições

Evento da conta com ao menos um serviço. Sem serviços, não há gráficos.

## 6. Fluxo principal

1. Ao abrir a aba, acima da tabela, aparece o bloco **Orçamento** com:
   - **Indicadores** (cards pequenos): Orçamento, Estimado, Contratado, Prova real e, quando há convidados estimados, Por convidado. Mesmos números do modal antigo.
   - **Gráfico "Contratado e estimado frente ao orçamento"**: barra horizontal empilhada com Contratado, Estimado (ainda não contratado) e o que sobra do orçamento; abaixo, legenda com valores e percentuais. Se contratado + estimado passa do orçamento, a barra mostra o excesso em cor de alerta e um aviso "Acima do orçamento em R$ X".
   - **Gráfico "Por serviço"**: uma linha por serviço com duas barras (Estimado e Contratado) na mesma escala, com os valores.
2. Os gráficos recarregam sempre que a tela recarrega (contratar, voltar para orçamento, editar estimado e subitens, adicionar serviço ou fornecedor).
3. O botão "Orçamento" e o modal saem da tela. "Adicionar serviço" e "Adicionar fornecedor" continuam.

## 7. Fluxos alternativos

- Orçamento do evento zerado ou não informado: a barra empilhada mostra só Contratado e Estimado, sem "restante" nem percentuais sobre o orçamento, com a nota "Orçamento do evento não informado".
- Tudo zerado (nenhum estimado nem contratado): estado vazio "Informe o estimado dos serviços para ver os gráficos".
- Falha ao carregar (exceto 403): o bloco some e a tabela segue funcionando; sem aviso de erro (o orçamento é complementar).

## 8. Regras de negócio

- **Sem mudança de cálculo.** Os valores vêm do `GET /eventos/{id}/budget` já existente (Budget, Estimado, Contratado, Prova real, Por convidado e a lista por serviço). Nenhum endpoint, DTO ou coluna é criado ou apagado: o endpoint continua em uso pelos gráficos, então não há legado a remover (regra 7). **Sem migration.**
- Estimado = soma dos estimados dos serviços (com subitens, a soma deles); Contratado = soma dos contratados (SPEC-018 §8).
- **Na barra "frente ao orçamento" (revisão de 22/11/2026):** a fatia "Estimado (a contratar)" soma só o estimado dos serviços **ainda sem valor contratado**; serviço contratado entra só pelo contratado, para não contar o mesmo serviço duas vezes. O excesso é contratado + estimado a contratar − orçamento, calculado no frontend com a lista por serviço que o `GET /budget` já devolve. Os indicadores Estimado e Prova real seguem a regra da SPEC-018 §8, sem mudança.
- A exportação do orçamento em Excel continua na aba Dinheiro (SPEC-029 §6.6), fora do escopo.
- Percentuais da barra: sobre o maior entre o orçamento e (contratado + estimado), para a barra nunca passar de 100% da largura.

## 9. Validações

Nenhuma entrada do usuário. Valores negativos não ocorrem; se vierem, são tratados como zero no desenho.

## 10. Estados

Bloco visível, oculto (sem permissão, falha ou sem serviços), vazio (tudo zerado).

## 11. Dados necessários

Só leitura do `BudgetEvento` existente.

## 12. Interface

Cards do tema (mat-card, tokens do [design system](../design-system.md)), desenhados com HTML e CSS (barras), **sem biblioteca de gráficos nova**. Cada barra tem `role="img"` e texto alternativo com os valores; cor não é o único sinal (legenda com valores escritos). Em tela estreita os indicadores quebram em duas colunas e as barras ocupam a largura toda.

## 13. Erros

Ver §7.

## 14. Critérios de aceite

1. A aba não tem mais o botão "Orçamento" nem o modal.
2. No topo aparecem os indicadores, o gráfico frente ao orçamento e o gráfico por serviço, com os mesmos valores do modal antigo.
3. Contratar um fornecedor atualiza os gráficos (Contratado sobe).
4. Com contratado + estimado acima do orçamento, aparece o aviso de excesso.
5. Sem orçamento informado, a nota aparece e não há divisão por zero.
6. Quem não tem a permissão do financeiro vê a aba sem o bloco e sem erro.

## 15. Cenários de teste

Unitários (frontend) da função que monta as barras: dentro do orçamento, acima dele, orçamento zero, tudo zero, escala do por serviço. Nenhum teste de backend novo (nada muda no backend).

## 16. Dependências

SPEC-018, SPEC-045 (mesma tela, já na main).

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono). O card não marcava "a decidir"; as escolhas abaixo são da implementação:

1. **Quais gráficos.** Dois: frente ao orçamento (barra empilhada) e por serviço (barras). Não há gráfico de pizza por etapa nem série no tempo.
2. **Sem biblioteca de gráficos.** Barras em CSS, para não somar dependência ao bundle.
3. **Prova real e Por convidado** ficam como indicadores, como no modal (o card não pede para tirar).
4. **Mesma permissão** do orçamento atual (financeiro). Quem não tem não vê o bloco, em vez de ver valores sem checar a permissão.
5. **Sem alterar o backend.** O `GET /budget` segue como está; nada foi apagado.
