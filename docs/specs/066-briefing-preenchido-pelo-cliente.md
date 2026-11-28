# 066. Briefing preenchido pelo cliente

**Status: implementada (26/11/2026, pedido do dono do projeto).** Spec curta, base para o capítulo 8 do manual. Decisão do dono: nada de link aberto sem verificação. O briefing só vai ao cliente com e-mail cadastrado, e o link pede código enviado a esse e-mail, como o link do cliente (SPEC-063).

## 1. Identificador e nome

SPEC-066. Briefing preenchido pelo cliente, por link com código de acesso, enviado pelo WhatsApp.

## 2. Objetivo

Hoje o briefing do lead (SPEC-031 §6.7, ponto 4) é um roteiro interno: a organizadora faz as perguntas na conversa e anota as respostas. Com esta spec, ela pode liberar o mesmo briefing para o cliente responder sozinho, por um link enviado no WhatsApp.

## 3. Por que um link próprio

O link do cliente (`/cliente/<token>`) é do **evento**. O briefing acontece antes, quando ainda é **lead** (oportunidade sem evento). Por isso o briefing tem endereço próprio, `/briefing/<token>`, mas com a **mesma segurança** do link do cliente: o cliente continua sem login e sem senha (SPEC-060), e só entra com o código enviado ao e-mail.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Equipe com o módulo Funil | Aplicar o briefing, liberar, reenviar, copiar o link, encerrar e reabrir. |
| Cliente (sem login) | Escolher o e-mail (mascarado), receber o código, responder, salvar, voltar depois e concluir. |
| Sistema | Gerar e enviar o código, contar tentativas e pedidos, expirar código, sessão e link. |

## 5. Comportamento

### 5.1. Organizadora

1. No cartão da oportunidade, **⋮ › Briefing / enviar ao cliente** abre o briefing do lead. Primeiro é preciso aplicar um modelo de briefing.
2. **E-mail obrigatório.** O botão **Liberar e enviar pelo WhatsApp** só fica ativo se algum contato do lead (ou o contratante) tiver e-mail. Sem e-mail, aparece o aviso "Cadastre o e-mail do contato para enviar o briefing. O cliente recebe nele o código de acesso." A API recusa do mesmo jeito.
3. Ao liberar, a Aralu abre o WhatsApp (wa.me) para o telefone do contato (o contratante, se houver; senão o primeiro com telefone), com a mensagem pronta: o link e o aviso de que ele pede um código enviado ao e-mail. Sem telefone, o WhatsApp abre para escolher o contato.
4. **Validade de 7 dias.** Cada liberação vale 7 dias. Depois disso o link fecha sozinho e o diálogo mostra "O prazo do link venceu em…", com o botão para liberar de novo.
5. Enquanto está aberto, o diálogo mostra até quando vale, se o cliente já salvou respostas e os botões **Enviar pelo WhatsApp**, **Copiar link** e **Encerrar link**.
6. **Encerrar link** fecha na hora e derruba as sessões abertas.
7. Liberar de novo (depois de encerrar, vencer ou concluir) reabre **o mesmo endereço** por mais 7 dias. O cliente precisa digitar um código novo.
8. **Trocar o modelo** mantém o link e a validade; o cliente passa a ver as perguntas novas (as respostas antigas se perdem, como já era) e precisa de código novo. **Remover briefing** apaga também o link.

### 5.2. Cliente

1. Abre `/briefing/<token>`. Vê o nome da assessoria e a lista de e-mails do lead, mascarados (ex.: `da***@ex.com`), e escolhe o dele.
2. Recebe um código de 6 dígitos no e-mail ("Seu código para abrir o briefing") e digita na página.
3. Vê as perguntas por seção, com as respostas já anotadas pela organizadora, e o prazo do link.
4. **Salvar e continuar depois** grava e mantém o link aberto. A sessão dura 7 dias no mesmo navegador; em outro aparelho, pede código de novo.
5. **Concluir e enviar** grava, fecha o link e mostra "Briefing enviado". Quem abrir o endereço depois vê "Este briefing já foi enviado".
6. Se a sessão vencer no meio do preenchimento, a página pede o código de novo sem perder o que foi digitado.

### 5.3. Regras do código (as mesmas da SPEC-063)

- 6 dígitos, vale 10 minutos, 5 tentativas.
- 1 pedido a cada 2 minutos; depois de 3 pedidos, espera de 15 minutos.
- Pedir um código novo invalida o anterior.
- O código e a sessão ficam no banco só como hash. A sessão vai num cookie `HttpOnly` que vale só para as rotas daquele briefing.

## 6. Cuidados

- Vale a última gravação: se a organizadora estiver com o diálogo aberto e salvar depois que o cliente respondeu, as respostas dela substituem as do cliente. Reabra o diálogo antes de editar.
- Resposta com até 2.000 caracteres, como no briefing interno.

## 7. Dados e API

- Migration `BriefingPeloCliente`:
  - `BriefingsOportunidade` ganha `TokenLink` (único), `LiberadoEm`, `ValidoAte`, `RespondidoEm` e `ConcluidoEm`.
  - Tabelas novas `CodigosAcessoBriefing` e `SessoesBriefing` (apagadas junto com o briefing).
  - `deploy/schema.sql` regerado.
- Equipe: `POST /api/v1/oportunidades/{id}/briefing/liberacao` (liberar por 7 dias; 400 sem e-mail) e `DELETE` na mesma rota (encerrar). A leitura do briefing traz `token`, `liberadoEm`, `validoAte`, `respondidoEm` e `concluidoEm`.
- Público, em `/api/v1/publico/briefings/{token}`:
  - `GET /acesso`, `POST /acesso/codigo` (`{ emailId }`) e `POST /acesso/confirmar` (`{ codigo }`) não pedem sessão.
  - `GET` e `PUT` (`{ respostas, concluir }`) pedem sessão: sem ela respondem 401.
  - Link inexistente, encerrado, vencido ou concluído responde 404.

## 8. Para o manual (capítulo 8)

Sugestão de texto:

> **O cliente responde o briefing.** No cartão, abra **⋮ › Briefing / enviar ao cliente**, aplique o modelo e clique em **Liberar e enviar pelo WhatsApp**. O contato precisa ter e-mail: é nele que o cliente recebe o código para abrir o link. O link vale 7 dias. O cliente pode salvar e voltar depois, e clica em **Concluir e enviar** quando terminar. As respostas aparecem no mesmo briefing. Para fechar antes, use **Encerrar link**; para dar mais prazo, libere de novo.
