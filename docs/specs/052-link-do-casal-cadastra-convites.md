# 052. Link do casal cadastra os convites

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #23, com as opções mais simples e conservadoras nos pontos em aberto).** **Revisada pela [SPEC-059](059-formulario-unico-de-convite.md) (22/11/2026): o formulário de convite passou a ser o mesmo da organizadora (telefone por convidado, obrigatório no primeiro; exceção do prazo), o convite do cliente grava a observação "Preenchido pelo casal" e a data de envio virou uma só por evento. Onde esta spec diverge, vale a SPEC-059.** Fonte: card #23 do Trello; [produto-v1.md](../produto-v1.md) 5.7 e 5.11. Estende o link do casal da [SPEC-046](046-link-do-casal-financeiro.md) (a marcação "o que o casal vê e edita" ficou para este card) e usa o convite e o RSVP das [SPEC-004](004-convites-e-rsvp.md) e [SPEC-010](010-convites-convidados-completo.md).

## 1. Identificador e nome

SPEC-052. Link do casal: cadastro de convites sem login.

## 2. Objetivo

O casal preenche a lista de convites pelo mesmo link `/casal/{código}`, sem login, quando a organizadora liberar. A organizadora vê todos os convites na aba Convidados e define a data de envio dos convites do evento (uma só, SPEC-059). Quem recebe o convite confirma presença por convidado pelo link de RSVP que já existe.

## 3. Requisitos relacionados

RF-056 (acesso do cliente pelo link), RF-063, RF-064. Regra 7 do [roteiro de execução](../roteiro-execucao.md).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer (dona) | Liga e desliga "O casal cadastra os convidados" na janela do link; vê e edita todos os convites; define o e-mail e a data de envio do evento (SPEC-059). |
| Assistant | Como hoje na aba Convidados; não gerencia o link. |
| Casal (quem tem o link) | Com a marcação ligada: ver os convites do evento, criar convite e editar pelo formulário único da SPEC-059 (nome, e-mail, convidados com telefone, exceção do prazo). Nada mais. |
| Link inválido ou desligado | 404. |

## 5. Pré-condições

Evento da conta em andamento, link ativo e marcação de convidados ligada.

## 6. Fluxo principal

### 6.1. Organizadora

1. Na janela **Link do cliente** há uma segunda marcação, **"O cliente cadastra os convidados"**, que liga e desliga na hora. Nasce desligada.
2. Na aba **Convidados**, o modal de convite ganha **E-mail**. A lista mostra o e-mail em cada convite. ~~Data de envio do convite~~: substituída pela data de envio única do evento (SPEC-059 §6.2).
3. Os convites cadastrados pelo casal aparecem na lista como os demais.

### 6.2. Página do casal

1. Com a marcação desligada, a página não mostra convidados.
2. Ligada, aparece a aba **Convidados**: lista dos convites (nome, telefone, e-mail, convidados com a situação) e o botão **Novo convite**.
3. O modal de convite é o formulário único da SPEC-059: nome do convite, e-mail, cada convidado com nome completo, DDI e telefone (obrigatório no primeiro), com adicionar e remover, e a exceção do prazo. Sem observação. Salvar grava e a lista se atualiza.
4. O casal edita um convite pelo mesmo modal. Convidado removido sai do convite; pelo menos um convidado fica.

### 6.3. Quem recebe o convite

Segue a SPEC-004: abre o link de RSVP do convite e confirma presença por convidado (todos, alguns ou nenhum). Nada muda aqui.

## 7. Fluxos alternativos

- Marcação desligada: 403 com mensagem nas ações e na lista de convites.
- Convite de outro evento ou conta: 404.
- Evento que não está em andamento: 400 ("O evento não está em andamento.").
- Sem nome do convite, sem convidado, convidado sem nome, primeiro convidado sem telefone (SPEC-059) ou e-mail inválido: 400 com mensagem no campo.

## 8. Regras de negócio

- O telefone do convite é do convidado principal (SPEC-010). **Desde a SPEC-059, cada convidado tem o próprio telefone**; o do primeiro é obrigatório e ele nasce principal. Ao editar, o principal atual continua se ficou com telefone; senão, o primeiro assume.
- O casal não mexe em situação, mesa, gênero, faixa, custo nem CPF; convidado novo nasce Pendente. A observação do convite criado pelo casal é gravada pelo backend como "Preenchido pelo casal" (SPEC-059) e o casal não a vê nem altera.
- A data de envio é só da organizadora e é uma só por evento (SPEC-059); o casal não a altera.
- **Banco (migration `ConvitesDoCasal`, uma só):** `LinksCasal.ConvidadosLiberado` (bool, padrão falso), `Convites.Email` (texto, opcional) e `Convites.DataEnvio` (data, opcional). Nada é apagado. `Convites.DataEnvio` foi apagada depois pela migration `DataDeEnvioDosConvitesNoEvento` (SPEC-059), que criou `Eventos.DataEnvioConvites`.
- **API da organizadora:** `PUT /api/v1/eventos/{id}/link-casal` recebe `{ financeiroLiberado, convidadosLiberado }`; o convite ganha `email`. O corpo de criar e editar convite passou a ser o `FormularioConvitePedido` da SPEC-059, e `dataEnvio` saiu do convite.
- **API pública** (base `/api/v1/publico/casal/{token}`): `GET` passa a trazer `convidadosLiberado` e `convites`; `POST convites` cria; `PUT convites/{conviteId}` edita, os dois com o corpo único da SPEC-059.

## 9. Validações

Nome do convite e nome de cada convidado obrigatórios; ao menos um convidado; telefone do primeiro convidado obrigatório (SPEC-059); e-mail, se informado, válido e de até 200 caracteres; telefone livre como no cadastro da organizadora.

## 10. Estados

Marcação de convidados: desligada ou ligada (independente da marcação do financeiro).

## 11. Dados necessários

Convite: nome, e-mail, exceção do prazo, observação (gravada pelo sistema no caso do casal); convidados: nome, DDI e telefone. Evento: data de envio dos convites (SPEC-059).

## 12. Interface

Casal: aba **Convidados** ao lado da aba **Financeiro** (SPEC-046 §12; design-system 5.4) e modal conforme o design-system (modal para cadastro). Organizadora: segunda marcação na janela do link; campos novos no modal de convite e na lista.

## 13. Erros

Mensagem no modal; aviso simples na página do casal para link indisponível.

## 14. Critérios de aceite

1. A dona liga a marcação; o casal cria convite com nome, telefone, e-mail e convidados e o convite aparece na aba Convidados da organizadora.
2. Com a marcação desligada, o casal não vê nem altera convites.
3. A dona define a data de envio do evento e ela aparece na aba Convidados (SPEC-059).
4. O casal edita o convite (inclusive remover convidado) sem alterar situação dos demais convidados.
5. Link de um evento não alcança convite de outro evento ou conta.
6. O link de RSVP do convite cadastrado pelo casal funciona como o dos demais.

## 15. Cenários de teste

Unitários (dados em memória): marcação desligada recusa lista e ações; criar com principal e telefone; criar sem convidado ou sem nome; e-mail inválido; editar renomeando, incluindo e removendo convidado mantendo a situação dos que ficam; convite de outro evento é 404; evento não em andamento recusa. Frontend: cliente do casal. Integração: escrita e compilando; execução no fim das ondas.

## 16. Dependências

SPEC-046, SPEC-004, SPEC-010. Depois: #24 (prazo de RSVP) e #25 (portaria).

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono):

1. **Marcação própria e desligada por padrão**: "O casal cadastra os convidados" é independente do financeiro. O card fala em "ver e editar"; fica uma marcação só (ver e editar juntos).
2. **O casal vê e edita todos os convites do evento**, inclusive os da organizadora, mas só os campos do cadastro (nome, telefone, e-mail, nomes dos convidados). Não vê CPF, mesa, faixa, custo nem observações.
3. ~~Telefone único por convite~~: substituído pela SPEC-059 (telefone por convidado, obrigatório no primeiro, que é o principal).
4. **O casal não exclui convite**; remove convidados dentro do convite (fica ao menos um). Excluir convite continua sem existir na plataforma.
5. **Data de envio é uma data** (sem hora) e **o envio em si continua manual** (WhatsApp pelo botão do convite); a plataforma não envia e-mail nem agenda disparo.
6. **O e-mail do convite não dispara nada** neste card; só é guardado e mostrado.
7. **Importação por planilha** não ganha a coluna e-mail (nem data de envio, que agora é do evento).
8. ~~Não identifica quem cadastrou~~: desde a SPEC-059, o convite criado pelo casal grava a observação "Preenchido pelo casal".
9. **O prazo de confirmação (#24, feito na [SPEC-054](054-rsvp-com-prazo.md)) e a portaria (#25)** não entram aqui.
