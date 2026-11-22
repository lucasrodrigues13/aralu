# 059. Formulário único de convite, planilha e lista de convites

**Status: aprovada (22/11/2026, pelo dono do projeto, com as respostas dele nos pontos em aberto: telefone obrigatório só no primeiro convidado; datas de envio por convite descartadas; o mesmo formulário ao criar e ao editar, com a exceção do prazo nas duas telas). Ampliada no mesmo dia, também a pedido dele: a planilha de importação segue o mesmo formato (telefone obrigatório no primeiro convidado de cada convite) e ganha um modal de instruções; a lista de convites fica recolhida nas duas telas.** Altera a [SPEC-052](052-link-do-casal-cadastra-convites.md) (link do cliente cadastra convites), a [SPEC-010](010-convites-convidados-completo.md) (convite e principal) e a [SPEC-054](054-rsvp-com-prazo.md) (exceção do prazo).

## 1. Identificador e nome

SPEC-059. Formulário único de convite (organizadora e link do cliente), data de envio única por evento, planilha de importação no mesmo formato e lista de convites recolhida.

## 2. Objetivo

A organizadora e o cliente (pelo link do cliente) usam o mesmo formulário para criar e editar convites, com as mesmas regras: vários convidados, telefone por convidado e a exceção do prazo. A única diferença é a observação: a organizadora escreve; no link do cliente ela não aparece e o sistema grava "Preenchido pelo casal". A data de envio deixa de ser de cada convite e passa a ser uma só para o evento, configurada fora do formulário.

## 3. Requisitos relacionados

RF-056, RF-063, RF-064. Regra 7 do [roteiro de execução](../roteiro-execucao.md) (funcionalidade removida sai do banco).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer e Assistant com o módulo Convidados | Criar e editar convites pelo formulário único, com observação; definir a data de envio dos convites do evento. |
| Cliente (quem tem o link, com a marcação de convidados ligada) | Criar e editar convites pelo mesmo formulário, sem observação. |

## 5. Pré-condições

Evento da conta em andamento. No link do cliente, link ativo e marcação de convidados ligada (SPEC-052).

## 6. Fluxo principal

### 6.1. Formulário (as duas telas, criar e editar)

1. Campos, nesta ordem: **Nome do convite**, **E-mail**, **Observação** (só a organizadora), **Convidados** e a marcação **"Aceitar confirmação pelo link após o prazo"**.
2. Cada convidado tem **nome completo**, **DDI** e **telefone**, com **Adicionar convidado** e remover (fica ao menos um).
3. O telefone do **primeiro convidado é obrigatório**; o dos demais é opcional.
4. Na edição, os convidados existentes mantêm situação, mesa, gênero, faixa, custo, CPF e observação; convidado removido sai do convite; convidado novo nasce Pendente. O convidado principal aparece primeiro.
5. Componente compartilhado: `shared/convite-form.dialog.ts` (`ConviteFormDialog`), com o parâmetro `mostrarObservacao`.

### 6.2. Data de envio dos convites

Na aba **Convidados** do evento, ao lado de **Prazo de confirmação**, o botão **Data de envio** abre um modal com uma data (opcional) e **Salvar**. A aba mostra "Envio dos convites em dd/mm/aaaa" ou "Data de envio dos convites não definida." A lista de convites não mostra mais data de envio por convite.

### 6.3. Planilha de importação

1. O botão **Planilha padrão** (aba Convidados da organizadora) abre o modal **Planilha de convidados** com as instruções de preenchimento (uma linha por convidado; o mesmo nome do convite agrupa; telefone obrigatório no primeiro convidado de cada convite; campos obrigatórios e opcionais com os valores aceitos; não mexer no cabeçalho) e um exemplo com dois convites. O botão **Download do modelo** fica dentro do modal.
2. O modelo mantém as 10 colunas e o cabeçalho de antes (planilhas já preenchidas continuam valendo), com o cabeçalho em negrito e congelado. Ganha uma segunda aba, **Exemplo**, com o mesmo exemplo; a importação lê só a primeira aba (**Convidados**).
3. Agrupamento: linhas com o mesmo **Nome do convite** (sem diferença entre maiúsculas e minúsculas) formam um convite; a ordem das linhas define a ordem dos convidados. A observação do convite vem da primeira linha.
4. Validação, com o número da linha na mensagem: "Linha N: Informe o nome do convite.", "Linha N: Informe o nome do convidado.", "Linha N: O primeiro convidado do convite \"X\" precisa de telefone." e as mensagens de valor fora da lista. Com qualquer erro, nada é importado.
5. O primeiro convidado de cada convite é o principal (antes, o último com telefone).

### 6.4. Lista de convites recolhida

Na aba Convidados da organizadora (visão **Por convite**) e na aba Convidados do link do cliente, cada convite aparece recolhido: nome, e-mail, telefone do principal e o resumo "N convidados · X confirmados · Y pendentes" (e o que mais já havia na linha da organizadora: observação, exceção, acessada/respondida e as ações). Um botão com seta (`aria-expanded`, `aria-controls`, rótulo "Expandir/Recolher convidados de …", acionável por teclado) mostra os convidados, cada um com a situação e só os dados preenchidos (telefone, mesa, faixa, gênero, custo, CPF, observação na organizadora; telefone no cliente). Na organizadora, "Usar este telefone" e excluir convidado ficam na linha expandida. Mesmo padrão da linha expansível de Tarefas.

## 7. Fluxos alternativos

- Sem nome do convite, sem convidado, convidado sem nome, primeiro convidado sem telefone ou e-mail inválido: 400 com mensagem ("Informe o telefone do primeiro convidado." no caso do telefone).
- Convidado com `id` que não é do convite: 404.
- Planilha com erro em alguma linha: 400 com o número da linha (§6.3); nada é importado.
- Evento fora de andamento: 400 ("O evento não está em andamento.").

## 8. Regras de negócio

- **Principal:** ao salvar, o principal atual continua se ficou no convite com telefone; senão, o primeiro convidado vira principal. Ao criar, é o primeiro. "Usar este telefone" na lista da organizadora segue trocando o principal (SPEC-010).
- **Observação:** a organizadora envia e grava livremente. No link do cliente, o backend grava "Preenchido pelo casal" ao criar (`ConviteRegras.ObservacaoDoCliente`) e ignora qualquer observação enviada; ao editar pelo link, a observação do convite não muda. O cliente não vê a observação.
- **Exceção do prazo:** o formulário envia `excecaoPrazoRsvp`; nulo mantém como está. O endpoint `PUT /convites/{id}/excecao-rsvp` (SPEC-054) continua existindo.
- **Mesmas validações nos dois caminhos:** `FormularioConvite.Validar` e `FormularioConvite.Aplicar` (Application/Convidados), chamados por `ConviteServico` e `LinkCasalServico`.
- **Banco (migration `DataDeEnvioDosConvitesNoEvento`):** apaga `Convites.DataEnvio` (as datas existentes são descartadas, por decisão do dono) e cria `Eventos.DataEnvioConvites` (data, opcional). `deploy/schema.sql` gerado de novo.

## 9. API

- Corpo único dos dois caminhos (`FormularioConvitePedido`): `{ nome, email, excecaoPrazoRsvp?, observacao?, convidados: [{ id?, nome, ddi, celular }] }`.
- Organizadora: `POST /api/v1/eventos/{id}/convites` e `PUT /api/v1/convites/{id}` recebem esse corpo (saem `principal`, `dataEnvio` e os campos de situação, mesa etc. na criação; esses seguem no cadastro do convidado). A leitura do convite perde `dataEnvio`; a lista ganha `dataEnvioConvites`.
- Nova rota: `PUT /api/v1/eventos/{id}/envio-convites` com `{ data }` (nula remove), mesmo controle de acesso do prazo de confirmação.
- Link do cliente: `POST convites` e `PUT convites/{conviteId}` recebem o mesmo corpo (observação ignorada). A leitura traz `excecaoPrazoRsvp` no convite e `ddi` e `celular` em cada convidado.

## 10. Estados

Sem estados novos.

## 11. Dados necessários

Evento: data de envio dos convites. Convite: nome, e-mail, observação, exceção do prazo. Convidado: nome, DDI, telefone.

## 12. Interface

Formulário em modal padrão (design-system). Organizadora: botões **Data de envio** e **Prazo de confirmação** no cabeçalho da aba Convidados; a observação aparece abaixo do nome do convite na lista. Cliente: cada convidado mostra o telefone na lista.

## 13. Erros

Mensagem no modal (toast) com o texto do backend.

## 14. Critérios de aceite

1. Os dois formulários têm os mesmos campos, menos a Observação, ao criar e ao editar.
2. A organizadora cadastra um convite com vários convidados.
3. Os dois pedem telefone por convidado; sem o do primeiro, não salva.
4. A data de envio é uma só para o evento e fica fora do formulário.
5. O convite criado pelo link do cliente grava "Preenchido pelo casal", sem mostrar isso ao cliente.
6. Editar pelo link do cliente não muda a observação.

## 15. Cenários de teste

Planilha e lista: `RegrasNegocioTests` (modelo com a aba Exemplo, que não é importada; número da linha na leitura), integração `Importacao_agrupa_por_convite_e_exige_telefone_do_primeiro_convidado`, frontend `planilha-instrucoes.dialog.spec.ts` e `convite-lista.spec.ts`.

Unitários (`LinkCasalTests`): telefone por convidado e principal; observação gravada pelo backend e ignorada quando enviada; edição não muda a observação; exceção do prazo; primeiro convidado sem telefone recusado; edição incluindo e removendo convidados. Integração: `Link_do_casal_cadastra_convites_quando_liberado_e_a_organizadora_define_o_envio` e `Convite_rsvp_e_planilha`. Frontend: `convite-form.dialog.spec.ts` (mesmos campos menos a observação; telefone obrigatório só no primeiro; ids mantidos na edição), `convidados.page.spec.ts` e `casal.client.spec.ts`.

## 16. Dependências

SPEC-052, SPEC-010, SPEC-054.

## 17. Premissas e pontos não definidos

1. ~~A importação por planilha não muda~~: passou a seguir o formulário (§6.3). O telefone da linha continua indo para o convidado da linha. O cabeçalho do modelo não mudou, para não invalidar planilhas já preenchidas.
2. O texto "Preenchido pelo casal" segue o pedido do dono, mesmo a plataforma atendendo outros tipos de evento.
3. A edição de um convidado pela organizadora (situação, mesa, CPF etc.) continua fora do formulário de convite.
4. Na edição, convidado removido pelo formulário é apagado do banco, como já acontecia no link do cliente.
