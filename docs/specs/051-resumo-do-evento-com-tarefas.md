# 051. Resumo do evento absorve a aba Tarefas

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #20, com as opções mais simples e conservadoras nos pontos em aberto).** Fonte: card #20 do Trello; [produto-v1.md](../produto-v1.md) 5.2 e 5.5. Revisa a [SPEC-008](008-cadastro-completo-de-evento.md) §8.2 e §8.4 e a [SPEC-003](003-tarefas-do-evento.md) §6.1, §6.2 e §12.

## 1. Identificador e nome

SPEC-051. Resumo do evento com as tarefas.

## 2. Objetivo

Ter uma aba a menos no evento: a lista de tarefas, com todas as ações que ela já tem, passa a ficar **dentro da aba Resumo**, abaixo dos cartões. Inspirado no Wedy Pro.

## 3. Requisitos relacionados

RF-061 (tarefas), RF-056 (visibilidade para o casal), SPEC-003 v4 (checklist com prazo e responsável), SPEC-008 (resumo e alertas).

## 4. Atores e permissões

Os mesmos da SPEC-003 §4. Não muda quem pode ver ou editar.

## 5. Pré-condições

Evento da conta. Criar e editar tarefa só com o evento em andamento (SPEC-003 §7).

## 6. Fluxo principal

1. As abas do evento passam a ser **Resumo, Convidados, Fornecedores, Contratos e Dinheiro**. A aba Tarefas some.
2. O Resumo mostra, de cima para baixo: cabeçalho do evento, alertas, cartões e a **lista de tarefas do evento**.
3. A lista é a mesma da antiga aba (SPEC-003 §6.2 a §6.8): agrupada pela distância até o evento, com busca, filtros de situação, responsável, serviço e "só com checklist", seta que expande a checklist, marcar item feito ou cancelado na hora, leitura ao tocar, Editar, Excluir, **Nova tarefa** e **Aplicar modelo** (este também continua no menu "Mais" do cabeçalho). Nada da lista muda de comportamento.
4. O cartão **Tarefas** do Resumo deixa de abrir outra página: rola até a lista, na própria tela.
5. O alerta "N tarefas atrasadas" (botão "Ver tarefas") filtra a lista para só as atrasadas, mostra o aviso "Mostrando só as tarefas atrasadas" com "Ver todas", e rola até a lista.
6. Os cartões de contagem se refazem sozinhos quando a lista muda (tarefa criada, editada, item marcado, modelo aplicado).
7. O endereço antigo `/eventos/{id}/tarefas` continua válido e leva ao Resumo. A agenda, ao abrir uma tarefa, leva ao Resumo do evento.
8. A lista de **todos os eventos** (menu Tarefas, `/tarefas`) não muda: segue com filtros e visões lista, quadro por situação e quadro por dia (SPEC-003 §6.7). O nome do evento nela leva ao Resumo do evento.

## 7. Fluxos alternativos

Os da SPEC-003 §7. Evento concluído ou cancelado: a lista aparece sem "Nova tarefa" nem "Aplicar modelo", só consulta.

## 8. Regras de negócio

Sem regra nova. Só muda **onde** a lista aparece.

## 9. Validações

Sem mudança.

## 10. Estados

Sem mudança.

## 11. Dados necessários

Nenhum dado novo. **Sem migration, sem mudança de API**: usa os mesmos endpoints de tarefas e de resumo.

## 12. Interface

Cartão "Tarefas do evento" (título e frase de apoio) logo abaixo dos cartões do Resumo, com os botões Aplicar modelo e Nova tarefa no cabeçalho do cartão, barra de filtros e a tabela agrupada da SPEC-003 §12.

## 13. Erros

Falha ao carregar as tarefas: aviso na tela, sem esconder o resto do Resumo.

## 14. Critérios de aceite

1. O evento tem as abas Resumo, Convidados, Fornecedores, Contratos e Dinheiro; não há aba Tarefas.
2. O Resumo mostra a lista agrupada, com Nova tarefa, Aplicar modelo, Editar, leitura, checklist e filtros funcionando como antes.
3. O alerta de tarefas atrasadas filtra a lista no próprio Resumo.
4. Criar ou concluir uma tarefa atualiza o cartão Tarefas sem recarregar a página.
5. `/eventos/{id}/tarefas` abre o Resumo.
6. A lista de todos os eventos continua igual.

## 15. Cenários de teste

Testes de tela (Angular): lista agrupada e "Nova tarefa" dentro do componente; sem botões com evento concluído; filtro de atrasadas. Manual: abrir o Resumo, criar tarefa, marcar item, alerta, endereço antigo.

## 16. Dependências

SPEC-003 v4, SPEC-008, SPEC-018 (serviço da tarefa), SPEC-045 e SPEC-048 (contrato assinado do fornecedor).

## 17. Premissas e pontos não definidos

Decidido em 21/11/2026 (aprovação antecipada, opção mais simples):

1. **Vínculos de fornecedor, contrato, documento e pagamento na tarefa: só o de fornecedor, pelo serviço.** A tarefa já se liga a um **serviço do evento** (SPEC-003 §6.6), e o serviço tem o fornecedor contratado; isso fica como está e aparece na coluna Serviço. Ligar a tarefa direto a **contrato**, **documento** e **pagamento** pede colunas novas na tarefa (migration), o que este card não faz. **Parado aqui**; vira card próprio se o dono quiser (ver "Dúvidas para o usuário").
2. Quando a lista cresce, ela é só rolada; não há paginação nem recolher a lista toda.
3. O cartão Tarefas rola até a lista em vez de navegar.
4. Nada foi apagado do banco nem da API. Foram apagados: a aba Tarefas do evento (item do menu de abas) e o modo "evento" da tela de tarefas de todos os eventos, que virou o componente da lista no Resumo.
