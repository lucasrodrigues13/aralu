# 034. Menu lateral

**Status: aprovada (21/11/2026).** Aprovação antecipada pelo dono do projeto, repassada pela sessão coordenadora. Nasce do card #37 (pedido de 21/11/2026). Não existia spec do menu lateral: até aqui o menu só era citado na SPEC-032 §8 (o que a assistente vê) e no [produto-v1.md](../produto-v1.md) §4. Esta spec descreve o menu **como está no código** e a mudança do card. O número 034 é o próximo livre hoje; outro card pode ocupá-lo antes do commit (renumerar então).

## 1. Identificador e nome

SPEC-034. Menu lateral da casca (computador) e acesso a ele no celular.

## 2. Objetivo

Agrupar o menu pelo ritmo de uso: o que se usa todo dia no alto, o que se configura uma vez e muda pouco (modelos, o trabalho pré-feito da organizadora) por último.

## 3. Requisitos relacionados

RF-080 (a tela Hoje é a primeira; o menu leva aos módulos) e RF-045 (o que a assistente não vê). Não há RF para a ordem e a composição dos grupos: **não definido**, decisão do pedido de 21/11/2026 registrada no [produto-v1.md](../produto-v1.md) §4.

## 4. Atores e permissões

Organizer e Assistant veem o menu; Admin sem conta escolhida vê só "Administração / Início Admin". A visibilidade por item não muda (SPEC-032 §8): itens "só da dona" somem para a assistente e itens financeiros somem sem a permissão. Grupo que fica sem item some.

## 5. Pré-condições

Usuário autenticado na casca.

## 6. Fluxo principal

1. O menu lateral mostra os grupos na ordem abaixo.
2. Tocar num item abre a tela e, em tela estreita, fecha o menu.

### 6.1. Grupos, na ordem (muda neste card)

| # | Grupo | Itens |
|---|---|---|
| 1 | Principal | Hoje, Perfil (só dona), Assistentes (só dona) |
| 2 | Gestão de eventos | Eventos, Tarefas, Clientes, Serviços e fornecedores, Pagamentos (financeiro) |
| 3 | Agenda | Minha agenda |
| 4 | Funil de vendas | Oportunidades, Oportunidades de RSVP, Contratos (do funil), Orçamentos, Tarefas do funil, Relatórios, **Modelos de contrato** (ver §7.1) |
| 5 | **Modelos** (último) | Modelos de evento, Contratos (só dona), Modelos de briefing, Modelos de roteiro, Modelos de cronograma, Modelos de inspirações, Modelos de mensagens, **Modelos de serviços**, **Modelo de orçamento** |

Antes: a ordem era Principal, Gestão de eventos, Modelos, Agenda, Funil de vendas; "Modelos de serviços" e "Modelo de orçamento" ficavam no fim do Funil de vendas.

## 7. Fluxos alternativos e regras

1. **Modelos de contrato continua no Funil de vendas** neste card. Ele e o item "Contratos" do grupo Modelos viram uma tela única no card #38, que decide o lugar final. Assim os dois cards não editam o mesmo trecho do menu.
2. Mudam só o grupo e a posição de "Modelos de serviços" e "Modelo de orçamento" (mesmas rotas, mesmos ícones, mesmos nomes) e a ordem dos grupos. Nenhuma rota, tela, permissão ou dado muda.
3. A visibilidade desses dois itens para a assistente fica como está hoje (aparecem, pois não são "só da dona"); SPEC-032 §8 não os lista e este card não a altera.
4. Item ativo continua marcado pela rota, em qualquer grupo.

## 8. Validações, estados, dados

Nenhuma. Sem banco, sem API, sem migration.

## 9. Interface

Menu lateral no computador (`sidebarNav`); no celular, o mesmo menu abre pelo botão "Mais" da barra inferior ou pelo botão de menu da barra superior. A barra inferior (Hoje, Eventos, Novo, Dinheiro, Mais) não muda.

## 10. Erros

Nenhum novo.

## 11. Critérios de aceite

1. Para a dona, os rótulos dos grupos aparecem na ordem Principal, Gestão de eventos, Agenda, Funil de vendas, Modelos.
2. "Modelos de serviços" e "Modelo de orçamento" aparecem dentro de Modelos e não aparecem em Funil de vendas.
3. "Modelos de contrato" segue em Funil de vendas.
4. As rotas dos itens movidos continuam as mesmas (`/modelos-servicos-funil`, `/modelos-orcamento-funil`).
5. Para a assistente, Perfil, Assistentes e os itens financeiros continuam ocultos.

## 12. Cenários de teste

- Dona, tela larga: a ordem dos cabeçalhos do menu é a do critério 1.
- Dona: os dois itens movidos estão sob o cabeçalho Modelos e a lista do Funil de vendas não os traz.
- Assistente sem financeiro: sem Perfil, Assistentes e Pagamentos; o grupo Modelos continua visível.
- Tela estreita: menu fechado e abrir/fechar funcionando (já testado).

## 13. Dependências

SPEC-032 §8 (visibilidade). Card #38 (Modelos de contrato em tela única) decide o lugar final de "Modelos de contrato" e "Contratos".

## 14. Premissas e pontos não definidos

1. A tabela de grupos do produto-v1 §4 é uma proposta anterior, diferente do menu do código (Principal, Gestão de eventos…). Este card só atualiza a linha de Modelos e a ordem; reescrever a seção para o menu real fica de fora (ponto para o dono do projeto).
2. **Decisões tomadas pela opção mais simples e conservadora (21/11/2026):** (a) "Modelos de contrato" e "Contratos" não se mexem neste card (ficam para o #38); (b) a visibilidade dos itens movidos para a assistente não muda; (c) o produto-v1 §4 só tem a linha de Modelos atualizada, sem reescrever a seção; (d) o código do menu fica em um único arquivo, sem ícones ou rotas novas.
