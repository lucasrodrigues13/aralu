# 044. Gestão Financeira: parcelas do mês e atrasadas, com cobrança por WhatsApp

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #33, com as opções mais simples e conservadoras nos pontos em aberto da §17).** Implementada em 21/11/2026. Fonte: card #33 do Trello; [produto-v1.md](../produto-v1.md) 5.9. Estende a [SPEC-041](041-gestao-financeira.md) (tela Gestão Financeira) sobre as parcelas da [SPEC-040](040-parcelas-por-documento.md); reaproveita Cobrar e Recebi da [SPEC-029](029-dinheiro-do-evento.md).

## 1. Identificador e nome

SPEC-044. Parcelas do mês e atrasadas na Gestão Financeira.

## 2. Objetivo

Dar à organizadora, no topo da Gestão Financeira, o que pede ação agora: quanto vence neste mês e o que já passou do vencimento, com a lista das parcelas atrasadas para cobrar pelo WhatsApp e marcar como paga sem abrir contrato a contrato.

## 3. Requisitos relacionados

RF-095 (recebimentos do cliente). Sem RF novo.

## 4. Atores e permissões

Os da SPEC-041: Admin, Organizer e assistente com "pode ver o financeiro". Outra conta não vê nada (os dados vêm da lista de contratos da própria conta).

## 5. Pré-condições

Usuário autenticado com acesso ao financeiro.

## 6. Fluxo principal

1. No topo da tela, em evidência, dois cartões: **A receber no mês** (soma do saldo das parcelas com vencimento no mês corrente que ainda não venceram, e quantas são) e **Atrasadas** (soma do saldo das parcelas atrasadas, de qualquer mês, e quantas são). Os cartões somam todos os contratos não cancelados e **não mudam** com o filtro e a busca da lista abaixo. Os três totais da SPEC-041 (Contratado, Recebido, A receber) continuam, abaixo dos cartões.
2. **Havendo parcelas atrasadas**, logo abaixo dos cartões aparece a lista **Parcelas atrasadas**, uma linha por parcela, da mais antiga para a mais nova: cliente (a oportunidade do contrato), parcela (Entrada ou Parcela N), vencimento, saldo e dois botões: **Cobrar** (abre o WhatsApp com a mensagem de atraso e a chave Pix, como na SPEC-029 §6.2) e **Recebi** (valor, forma e data, aceita valor parcial, como na SPEC-029 §6.3). Sem parcelas atrasadas a lista não aparece.
3. Registrar o recebimento atualiza os cartões e a lista na hora; uma parcela quitada sai da lista.
4. A lista de contratos por cliente (SPEC-041 §6.2) segue como estava.

## 7. Fluxos alternativos

- Cobrar sem chave Pix no Perfil: o modal pede a chave (como no diálogo Parcelas do contrato).
- Cliente sem telefone: o WhatsApp abre para escolher o contato.
- Recebi acima do saldo, sem forma ou sem data: o servidor recusa com mensagem (toast).
- Falha ao carregar: aviso de erro; cartões zerados e sem lista.

## 8. Regras de negócio

- "Atrasada" é a situação que o servidor já devolve na parcela (vencimento passado e saldo em aberto, SPEC-040 §10). O cálculo do mês usa a data local do navegador.
- **A receber no mês** e **Atrasadas** não se sobrepõem: parcela atrasada, mesmo vencida neste mês, conta só em Atrasadas.
- Valores são o **saldo** da parcela (o que falta), não o valor cheio.
- Só entram parcelas de contratos não cancelados (a lista de contratos da tela já os exclui).
- Nenhum endpoint novo: tudo sai de `GET /contratos-funil` e das ações de recebimento de sempre.

## 9. Validações

As do Recebi (SPEC-029): valor > 0 e até o saldo; forma e data obrigatórias.

## 10. Estados

Parcela: a receber, parcial, atrasada, recebida (SPEC-040 §10). A lista mostra as atrasadas.

## 11. Dados necessários

Nenhum dado novo; **sem migration**.

## 12. Interface

Dois cartões de destaque no topo e a lista de atrasadas num cartão logo abaixo, no padrão da tela (tabela do design system). Cobrar e Recebi usam os mesmos modais já existentes.

## 13. Erros

Toast com a mensagem do servidor.

## 14. Critérios de aceite

1. Os cartões mostram o saldo e a quantidade de parcelas a vencer no mês e de atrasadas.
2. Com parcela atrasada, a lista aparece abaixo dos cartões com cliente, número da parcela, Cobrar e Recebi; sem parcela atrasada, não aparece.
3. Cobrar abre o WhatsApp com o texto de atraso; Recebi registra e atualiza cartões e lista.
4. Filtro e busca da lista de contratos não alteram os cartões.

## 15. Cenários de teste

Unitário (frontend): parcelas do mês (dentro do mês, fora do mês, atrasada fora da conta, quitada fora da conta) e parcelas atrasadas (ordem por vencimento, quitada fora, de qualquer mês).

## 16. Dependências

SPEC-040, SPEC-041, SPEC-029 (Cobrar e Recebi). Card #41 e #32.

## 17. Premissas e pontos não definidos

Decididos pela opção mais simples e conservadora (a conferir pelo dono):

1. **"Nome do evento".** O card pede o nome do evento na lista, mas o contrato com o cliente não tem evento (SPEC-036/SPEC-041). A linha mostra o **cliente (oportunidade)**.
2. **"Adicionar comprovante".** O recebimento do contrato não guarda comprovante e criá-lo exige migration, que este card não pode ter (o #31 é a única sessão com migration agora). Entregue só o **Recebi**; o comprovante do recebimento fica para um card com migration.
3. **Mês vigente.** Mês-calendário corrente pela data local do navegador; atrasadas de meses anteriores ficam só no cartão Atrasadas.
4. **Cartões globais.** Não obedecem ao filtro e à busca da lista.
5. **Sem destaque visual de clique.** Os cartões são informativos; não filtram a lista.
