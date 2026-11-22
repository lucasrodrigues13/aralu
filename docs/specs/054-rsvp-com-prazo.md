# 054. RSVP com prazo e lista de presença

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #24, com as opções mais simples e conservadoras nos pontos em aberto).** Fonte: card #24 do Trello; [produto-v1.md](../produto-v1.md) 5.7. Estende o RSVP da [SPEC-004](004-convites-e-rsvp.md) e [SPEC-010](010-convites-convidados-completo.md) e a aba Convidados da [SPEC-052](052-link-do-casal-cadastra-convites.md). Não muda o lead pelo RSVP ([SPEC-021](021-oportunidades-de-rsvp.md)).

## 1. Identificador e nome

SPEC-054. RSVP com prazo, exceção manual e lista de presença.

## 2. Objetivo

A organizadora define até quando os convidados podem confirmar presença pelo link. Depois da data, o link mostra que o convite expirou. Ela pode abrir exceção para um convite e confirmar manualmente na plataforma. Cada confirmação gera uma entrada na lista de presença do evento, com id único, que a portaria (card #25) vai usar.

## 3. Requisitos relacionados

RF-063, RF-064. Regra 7 do [roteiro de execução](../roteiro-execucao.md).

Fora: check-in na portaria, QR e link da equipe (card #25); aviso automático de prazo; envio de e-mail ou WhatsApp.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer (dona) e Assistant com a permissão de Convidados | Definir, trocar e remover o prazo; abrir e fechar a exceção de um convite; confirmar manualmente; ver a lista de presença. |
| Quem tem o link de RSVP | Antes do fim do prazo (ou com exceção): como na SPEC-004. Depois: ver a tela de convite expirado. |
| Casal (link do casal) | Não mexe no prazo nem na exceção. |

## 5. Pré-condições

Evento da conta em andamento.

## 6. Fluxo principal

### 6.1. Organizadora

1. Na aba **Convidados**, o botão **Prazo de confirmação** abre um modal com uma data limite (opcional) e **Salvar**. Data vazia = sem prazo. A aba mostra o prazo definido e, passado o prazo, "Prazo encerrado".
2. Passado o prazo, cada convite que ainda aceita resposta por exceção mostra "Exceção aberta". No modal de edição do convite, a marcação **"Aceitar confirmação pelo link após o prazo"** abre e fecha a exceção daquele convite. Desde a [SPEC-059](059-formulario-unico-de-convite.md), a marcação está no formulário único de convite, também ao criar e também no link do cliente.
3. A organizadora confirma manualmente pela edição do convidado (situação), como já fazia; o prazo não bloqueia a edição dela.
4. O botão **Lista de presença** abre um modal com os confirmados do evento: id, convidado, convite e quando confirmou.

### 6.2. Quem recebe o convite

1. Abre o link de RSVP. Dentro do prazo, tudo como na SPEC-004.
2. Depois do prazo, sem exceção: a página mostra "Este convite expirou", o nome do convite e a data limite, sem mostrar convidados nem formulário.
3. Enviar a resposta de um link expirado é recusado (400, "O prazo para confirmar presença terminou.").
4. Com a exceção aberta no convite, o link funciona normalmente, mesmo depois do prazo.

## 7. Fluxos alternativos

- Evento sem prazo: o link nunca expira por prazo (continua só valendo "evento em andamento").
- A organizadora muda o prazo para uma data futura: os links voltam a funcionar na hora.
- Convite de outro evento ou conta: 404.
- Evento que não está em andamento: 400 ("O evento não está em andamento.") ao definir o prazo; o link de RSVP segue indisponível como hoje.

## 8. Regras de negócio

- **Prazo** é uma data (sem hora), por evento. A confirmação vale **até o fim do dia do prazo**; expira no dia seguinte. O dia é o dia calendário em UTC, como o restante da plataforma.
- A exceção é **por convite** (todos os convidados dele), fica ligada até a organizadora desligar, e só vale para o link; não altera o prazo do evento.
- Abrir o link expirado **não** marca "acessada" nem conta visualização do lead (SPEC-021), e responder nele não grava nada.
- **Lista de presença:** uma entrada por convidado **Confirmado**, com id único (Guid), convite, convidado, evento e data/hora da confirmação. A entrada nasce quando o convidado passa a Confirmado (pelo link, pela edição da organizadora, pelo convite novo já confirmado ou pela importação) e **some** quando ele deixa de ser Confirmado ou é removido. Reconfirmar gera um id novo. A data/hora é a do momento da confirmação.
- **Banco (migration `PrazoDoRsvp`, uma só):** `Eventos.PrazoRsvp` (data, opcional), `Convites.ExcecaoPrazoRsvp` (bool, padrão falso) e tabela nova `PresencasEvento` (`Id`, `EventoId`, `ConviteId`, `ConvidadoId` único, `ConfirmadoEm`). Os convidados já Confirmados na hora da migration ganham a entrada. Nada é apagado.
- **API da organizadora:** `PUT /api/v1/eventos/{id}/prazo-rsvp` recebe `{ prazo }` (nulo remove); `PUT /api/v1/convites/{id}/excecao-rsvp` recebe `{ liberada }`; `GET /api/v1/eventos/{id}/presencas` lista a lista de presença. A listagem de convites traz `prazoRsvp` e `prazoEncerrado`, e cada convite traz `excecaoPrazoRsvp`.
- **API pública:** `GET /api/v1/rsvp/{token}` traz `expirado` e `prazo`; quando expirado, sem convidados.

## 9. Validações

Prazo é uma data válida ou nulo. Não há outra regra (inclusive data anterior a hoje é aceita: encerra os links na hora).

## 10. Estados

Link do convite: aberto (sem prazo, dentro do prazo ou com exceção) ou expirado (prazo vencido, sem exceção).

## 11. Dados necessários

Evento: prazo. Convite: exceção. Presença: id, evento, convite, convidado, confirmado em.

## 12. Interface

Modais conforme o design-system. Página pública com a mesma casca da SPEC-004 e uma mensagem simples de expirado.

## 13. Erros

Mensagem no modal; link expirado mostra a tela de expirado (não um erro).

## 14. Critérios de aceite

1. A dona define o prazo e o vê na aba Convidados.
2. Dentro do prazo, o RSVP funciona e a confirmação aparece na lista de presença com id único.
3. No dia seguinte ao prazo, o link mostra que o convite expirou e recusa respostas.
4. Com a exceção aberta, o link do convite volta a funcionar; fechando, expira de novo.
5. A organizadora confirma manualmente depois do prazo e a entrada aparece na lista de presença.
6. Quem deixa de estar confirmado sai da lista de presença.
7. Sem prazo, o link nunca expira por prazo.

## 15. Cenários de teste

Unitários: sem prazo abre e responde; no último dia ainda aceita; um dia depois expira (abrir não marca acessada, responder é recusado); exceção reabre; definir prazo em evento de outra conta é 404; evento fora de andamento recusa. Frontend: cliente. Integração: escrita e compilando; execução no fim das ondas (inclui criação, troca e remoção da entrada de presença).

## 16. Dependências

SPEC-004, SPEC-010, SPEC-052. Depois: card #25 (portaria usa a lista de presença).

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono):

1. **Prazo por evento, uma data sem hora**, valendo até o fim do dia (UTC). O card diz "data limite"; hora fica de fora.
2. **Sem prazo = sem expiração por prazo.** O card diz que, sem data limite, qualquer confirmado consegue fazer check-in até a hora do evento; essa parte é do card #25. Aqui o link só segue valendo enquanto o evento estiver em andamento.
3. **Exceção por convite, ligada e desligada à mão**, sem data de validade. Não há exceção por convidado.
4. **Confirmação manual = a edição que já existe** (situação do convidado). O prazo não a bloqueia.
5. **Lista de presença é uma entrada por convidado confirmado**, não uma lista por convite. O card diz "cada confirmação de convites gera uma lista de presença com um id único"; entendido como um id único por confirmação. Quem confirmou, sai e volta tem id novo. A entrada não guarda a origem (link ou organizadora); o check-in (hora de chegada) ficou no card #25 ([SPEC-058](058-portaria-do-evento.md)), na coluna `CompareceuEm` da mesma lista.
6. **Sem aviso automático** de prazo próximo ou encerrado e sem mensagem pronta de WhatsApp sobre o prazo.
7. **Prazo depois da data do evento é aceito**; a plataforma não compara as duas datas.
8. **A tela do casal (SPEC-052) não mostra nem edita prazo ou exceção.**
