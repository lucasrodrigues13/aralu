# 063. Código de acesso do link do cliente

**Status: aprovada (26/11/2026).** Fecha a Fase 5 do [plano de implementação](../banco/plano-implementacao.md) da SPEC-062, que deixou o tema para uma spec própria. Ajustes do dono em 26/11/2026: o código é pedido **sempre**, sem opção de desligar; e o limite de pedidos é **1 a cada 2 minutos, com espera de 15 minutos depois de 3 pedidos**.

## 1. Identificador e nome

SPEC-063. Código de acesso do link do cliente: confirmar por e-mail que quem abre o link é o cliente do evento.

## 2. Objetivo

- Hoje quem tem o endereço do link do cliente (`/cliente/<token>`) vê tudo o que a organizadora liberou, inclusive o financeiro. Se o link for encaminhado, outra pessoa também vê.
- Com esta spec, todo link do cliente só abre depois que o cliente digita um código enviado para o e-mail dele.
- O cliente continua sem login e sem senha (SPEC-060).

## 3. Requisitos relacionados

- **Novos (§13):** RF-122 e RF-123.
- **Mantidos:** RF-056 (link do cliente), SPEC-046 (financeiro no link), SPEC-052 (convidados pelo link), SPEC-060 (cliente sem login), R9 da SPEC-062 (link funciona com a conta bloqueada).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Dono | Gerar link novo (derruba as sessões abertas). |
| Membro | Nada muda: a janela do link segue só para o Dono. |
| Cliente do evento | Abrir o link, pedir o código, digitar o código e usar o link durante a sessão. |
| Sistema | Gerar e enviar o código, contar tentativas e pedidos, expirar código e sessão. |

## 5. Pré-condições

- Envio de e-mail funcionando (o mesmo SMTP dos e-mails da conta).
- Para o link abrir, o evento precisa ter pelo menos um cliente vinculado com e-mail cadastrado.

## 6. Fluxo principal

1. O cliente abre o link. Sem sessão válida, a página mostra o nome do evento e **"Para sua segurança, enviaremos um código para o seu e-mail"**, com a lista dos e-mails dos clientes do evento **mascarados** (ex.: `an***@gmail.com`).
2. O cliente escolhe o e-mail dele e clica em "Enviar código".
3. O sistema envia um código de **6 dígitos** para esse e-mail. O código vale **10 minutos**.
4. O cliente digita o código. Certo: o link abre normalmente, com o que a organizadora liberou.
5. O navegador guarda uma **sessão** do link, que vale **7 dias** e renova a cada uso. Vencida, a página pede código de novo.

## 7. Fluxos alternativos

- **Código errado:** "Código incorreto. Você tem mais N tentativas." Depois de **5** erros no mesmo código, ele deixa de valer e é preciso pedir outro.
- **Código expirado:** "Este código expirou. Peça um novo."
- **Reenvio muito rápido:** um código a cada **2 minutos** por link. Antes disso, o botão "Reenviar código" mostra a contagem e o servidor recusa com "Aguarde N segundos para pedir outro código."
- **Pedidos demais:** depois de **3 pedidos**, o link espera **15 minutos** antes de aceitar outro: "Você pediu vários códigos. Aguarde N minutos para pedir outro." A contagem recomeça depois da espera.
- **Novo código:** pedir outro código invalida o anterior.
- **Nenhum cliente com e-mail:** a página do link mostra "Fale com a organizadora do evento." e não envia código. A janela "Link do cliente" avisa o Dono: "Cadastre o e-mail de um cliente do evento para que ele consiga abrir o link."
- **Links já enviados:** passam a pedir código a partir da publicação desta spec. Nada muda no endereço.
- **Link novo:** gerar outro link (o token muda) derruba todas as sessões do link anterior.
- **Conta bloqueada (SPEC-062 R9):** o código e o link continuam funcionando.
- **Portaria, RSVP e proposta:** não pedem código. A portaria é usada por terceiros no dia do evento, e o RSVP e a proposta são abertos por convidados e leads, que não são clientes do evento.

## 8. Regras

| # | Regra | RF |
|---|---|---|
| R1 | Todo link do cliente exige código. Nenhum dado do link (resumo, financeiro, convidados, ações) é entregue sem sessão válida. A verificação é no servidor, em todas as rotas do link. | RF-122 |
| R2 | O código só vai para e-mail de cliente vinculado ao evento. O cliente escolhe entre os e-mails mascarados; o endereço completo nunca aparece na página nem na resposta da API. | RF-122 |
| R3 | O código e a sessão são guardados só como hash. | RF-123 |
| R4 | Código: 6 dígitos, 5 tentativas, um válido por vez, validade de 10 minutos. | RF-123 |
| R5 | Pedidos por link: no máximo 1 a cada 2 minutos; depois de 3 pedidos, espera de 15 minutos. | RF-123 |
| R6 | Sessão: 7 dias, no mesmo navegador, renovada a cada uso; cai quando o link é gerado de novo. | RF-123 |

## 9. Dados

Comportamento, não estrutura. Cada código pedido guarda o link, o e-mail de destino, o hash do código, quando expira, as tentativas e quando foi usado. Cada sessão guarda o link, o hash do token da sessão, quando expira e o último acesso. Modelo de referência no explorador do banco: `CodigosAcessoCliente` e `SessoesLinkCliente`. A coluna `LinksCliente.ExigeCodigo` do explorador **não entra**: o código vale para todos os links.

## 10. Interface

- **Janela "Link do cliente":** frase fixa "O cliente recebe um código no e-mail cadastrado para abrir o link." e o aviso do §7 quando nenhum cliente do evento tem e-mail.
- **Página do link sem sessão:** nome do evento, explicação curta, lista dos e-mails mascarados (um botão por e-mail), campo de 6 dígitos depois do envio, "Reenviar código" com contagem regressiva, e as mensagens do §11.
- **E-mail do código:** assunto "Seu código para abrir o link do evento"; o código em destaque, a validade em minutos e "Se você não pediu este código, ignore este e-mail."

## 11. Erros

| Situação | Mensagem |
|---|---|
| Código errado | "Código incorreto. Você tem mais N tentativas." |
| Tentativas esgotadas | "Este código não vale mais. Peça um novo." |
| Código expirado | "Este código expirou. Peça um novo." |
| Reenvio antes de 2 minutos | "Aguarde N segundos para pedir outro código." |
| Mais de 3 pedidos | "Você pediu vários códigos. Aguarde N minutos para pedir outro." |
| E-mail que não é de cliente do evento | "Escolha um dos e-mails da lista." |
| Nenhum cliente com e-mail | "Fale com a organizadora do evento." |
| Sessão vencida | A página volta para o pedido de código. |

## 12. Critérios de aceite e testes

| # | Condição | Resultado esperado |
|---|---|---|
| C1 | Qualquer link do cliente, sem sessão. | A página pede o código; a API recusa resumo, financeiro e convidados. |
| C2 | Cliente pede código para um e-mail do evento e digita certo. | O link abre; o navegador recebe a sessão. |
| C3 | Pedido de código para um e-mail que não é de cliente do evento. | Recusado; nenhum e-mail é enviado. |
| C4 | Cinco códigos errados. | O código deixa de valer, mesmo que o sexto esteja certo. |
| C5 | Código digitado depois de 10 minutos. | Recusado como expirado. |
| C6 | Segundo pedido antes de 2 minutos. | Recusado com os segundos que faltam; nenhum e-mail é enviado. |
| C7 | Quarto pedido (depois de 3, respeitando os 2 minutos). | Recusado até passarem 15 minutos; nenhum e-mail é enviado. |
| C8 | Dono gera link novo. | A sessão anterior deixa de valer. |
| C9 | Conta bloqueada. | Pedir e usar o código funcionam. |
| C10 | Página do link. | Os e-mails aparecem mascarados; o endereço completo não vem na resposta da API. |
| C11 | Evento sem cliente com e-mail. | A página mostra "Fale com a organizadora do evento."; nenhum código é enviado. |
| C12 | Portaria e RSVP do mesmo evento. | Abrem sem código. |

## 13. Requisitos novos

| ID | Requisito |
|---|---|
| RF-122 | Todo link do cliente exige um código enviado ao e-mail de um cliente do evento antes de abrir. O servidor só entrega os dados do link com sessão válida. |
| RF-123 | O código tem 6 dígitos, vale 10 minutos e aceita 5 tentativas. Cada link aceita 1 pedido a cada 2 minutos e, depois de 3 pedidos, espera 15 minutos. A sessão vale 7 dias no mesmo navegador, renova a cada uso e cai quando o link é gerado de novo. Código e sessão são guardados só como hash. |

## 14. Dependências e pendências

**Dependências:** SPEC-046, SPEC-052 e SPEC-060 (link do cliente), SPEC-062 (R9: link funciona com a conta bloqueada).

**Pendências:**
("Validade da proposta" pedida em 26/11/2026 é a validade do orçamento do funil: ficou na [SPEC-064](064-validade-da-proposta-configuravel.md).)
1. **SMS:** enviar o código também por SMS para o celular do cliente. O provedor de SMS ainda não foi escolhido (pendência 5 da SPEC-062). Esta versão é só e-mail.
2. **Membro gerenciar o link:** hoje a janela do link é só do Dono. Se o grupo do Membro puder gerenciar o link, isso precisa de decisão.
