# 059. Formulário único de convite, planilha e lista de convites

**Status: aprovada (22/11/2026, pelo dono do projeto, com as respostas dele nos pontos em aberto: telefone obrigatório só no primeiro convidado; datas de envio por convite descartadas; o mesmo formulário ao criar e ao editar, com a exceção do prazo nas duas telas). Ampliada no mesmo dia, também a pedido dele: a planilha de importação segue o mesmo formato (telefone obrigatório no primeiro convidado de cada convite) e ganha um modal de instruções; a lista de convites fica recolhida nas duas telas. Depois, ainda a pedido dele: a aba Convidados do link do cliente ganha os cards por situação, os filtros e as ferramentas da organizadora (data de envio, prazo de confirmação, lista de presença, planilha padrão e importar). Por fim: o modelo da planilha vem com dois convites de exemplo para apagar, sem Mesa e Custo, com listas suspensas; e os formulários ganham gênero e faixa etária por convidado. Depois, o dono pediu o **convidado principal** marcado explicitamente (na planilha e nos formulários): um, e só um, por convite, obrigatório e com telefone. Essa regra substituiu a do "telefone obrigatório no primeiro convidado". E a importação passou a ir para uma **fila** processada em segundo plano na própria API, com um modal de histórico (§6.6).** Altera a [SPEC-052](052-link-do-cliente-cadastra-convites.md) (link do cliente cadastra convites), a [SPEC-010](010-convites-convidados-completo.md) (convite e principal) e a [SPEC-054](054-rsvp-com-prazo.md) (exceção do prazo).

## 1. Identificador e nome

SPEC-059. Formulário único de convite (organizadora e link do cliente), data de envio única por evento, planilha de importação no mesmo formato e lista de convites recolhida.

## 2. Objetivo

A organizadora e o cliente (pelo link do cliente) usam o mesmo formulário para criar e editar convites, com as mesmas regras: vários convidados, telefone por convidado e a exceção do prazo. A única diferença é a observação: a organizadora escreve; no link do cliente ela não aparece e o sistema grava "Preenchido pelo cliente". A data de envio deixa de ser de cada convite e passa a ser uma só para o evento, configurada fora do formulário.

## 3. Requisitos relacionados

RF-056, RF-063, RF-064. Regra 7 do [roteiro de execução](../roteiro-execucao.md) (funcionalidade removida sai do banco).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer e Assistant com o módulo Convidados | Criar e editar convites pelo formulário único, com observação; definir a data de envio dos convites do evento. |
| Cliente (quem tem o link, com a marcação de convidados ligada) | Criar e editar convites pelo mesmo formulário, sem observação; ver os cards por situação e filtrar a lista; definir a data de envio e o prazo de confirmação; ver a lista de presença; baixar o modelo e importar a planilha (§6.5). |

## 5. Pré-condições

Evento da conta em andamento. No link do cliente, link ativo e marcação de convidados ligada (SPEC-052).

## 6. Fluxo principal

### 6.1. Formulário (as duas telas, criar e editar)

1. Campos, nesta ordem: **Nome do convite**, **E-mail**, **Observação** (só a organizadora), **Convidados** e a marcação **"Aceitar confirmação pelo link após o prazo"**.
2. Cada convidado tem **nome completo**, **DDI**, **telefone**, **Gênero** (Masculino ou Feminino) e **Faixa etária** (Adulto, Adolescente, Criança, Criança de colo ou Idoso), com **Adicionar convidado** e remover (fica ao menos um). Gênero e faixa são opcionais e usam as mesmas opções da planilha.
3. Cada convidado tem a opção **"Convidado principal (recebe as comunicações)"**, um botão de rádio: é obrigatório marcar um, e só um, por convite. O telefone do principal é obrigatório; o dos demais é opcional. Na edição, o principal atual vem marcado; num convite novo, nenhum vem marcado.
4. Na edição, os convidados existentes mantêm situação, mesa, gênero, faixa, custo, CPF e observação; convidado removido sai do convite; convidado novo nasce Pendente. O convidado principal aparece primeiro.
5. Componente compartilhado: `shared/convite-form.dialog.ts` (`ConviteFormDialog`), com o parâmetro `mostrarObservacao`.

### 6.2. Data de envio dos convites

Na aba **Convidados** do evento, ao lado de **Prazo de confirmação**, o botão **Data de envio** abre um modal com uma data (opcional) e **Salvar**. A aba mostra "Envio dos convites em dd/mm/aaaa" ou "Data de envio dos convites não definida." A lista de convites não mostra mais data de envio por convite.

### 6.3. Planilha de importação

1. O botão **Planilha padrão** (aba Convidados da organizadora) abre o modal **Planilha de convidados** com as instruções de preenchimento (uma linha por convidado; o mesmo nome do convite agrupa; telefone obrigatório no primeiro convidado de cada convite; campos obrigatórios e opcionais com os valores aceitos; não mexer no cabeçalho) e um exemplo com dois convites. O botão **Download do modelo** fica dentro do modal.
2. O modelo tem 8 colunas: Nome do convite *, DDI, DDD + Telefone para confirmação de presença, Observação do convite, Nome dos convidados *, Gênero, Faixa etária e Situação. **Mesa e Custo/pagamento saíram**: ficam só para edição nas telas da organizadora e do cliente. Cabeçalho em negrito e congelado.
2a. A aba **Convidados** (a que se importa) **já vem com dois convites de exemplo** ("Família Souza (exemplo)", com três convidados e telefone no primeiro, e "Ana Lima (exemplo)"), destacados em amarelo, com um comentário no cabeçalho mandando apagá-los. A aba **Instruções** repete as orientações. O modal também avisa para apagar as linhas de exemplo.
2b. Listas suspensas (validação de dados do Excel) em **Gênero** (Masculino, Feminino), **Faixa etária** e **Situação**.
2c. Se as linhas de exemplo continuarem na planilha (mesmo convite e convidado do exemplo), a importação é recusada: "Linha N: É uma linha de exemplo do modelo. Apague as linhas de exemplo antes de importar." Nada é importado.
2d. As colunas são lidas pelo nome, em qualquer ordem. Planilhas do modelo antigo, com Mesa e Custo/pagamento, continuam aceitas e essas colunas são ignoradas.
3. Agrupamento: linhas com o mesmo **Nome do convite** (sem diferença entre maiúsculas e minúsculas) formam um convite; a ordem das linhas define a ordem dos convidados. A observação do convite vem da primeira linha.
4. Coluna **Convidado principal \*** (lista Sim/Não; vazio vale Não). Em cada convite, um convidado, e só um, com Sim; ele precisa de DDI e telefone e vira o principal. Os exemplos do modelo trazem a coluna preenchida. Planilha sem essa coluna é recusada dizendo a coluna que falta.
5. A importação junta **todos** os erros da planilha, cada um com o número da linha, por exemplo: "Linha N: Informe o nome do convite.", "Linha N: Informe o nome do convidado.", "Linha N: Em \"Convidado principal\", use Sim ou Não.", "Linha N: O convite \"X\" já tem um convidado principal (linha M). Marque só um por convite.", "Linha N: O convidado principal precisa de telefone.", "Linha N: O convite \"X\" não tem convidado principal. Marque Sim em um convidado dele." e as mensagens de valor fora da lista. Com qualquer erro, nada é importado. Até 500 erros são guardados.

### 6.4. Lista de convites recolhida

Na aba Convidados da organizadora (visão **Por convite**) e na aba Convidados do link do cliente, cada convite aparece recolhido: nome, e-mail, telefone do principal e o resumo "N convidados · X confirmados · Y pendentes" (e o que mais já havia na linha da organizadora: observação, exceção, acessada/respondida e as ações). Um botão com seta (`aria-expanded`, `aria-controls`, rótulo "Expandir/Recolher convidados de …", acionável por teclado) mostra os convidados, cada um com a situação e só os dados preenchidos (telefone, mesa, faixa, gênero, custo, CPF, observação na organizadora; telefone no cliente). Na organizadora, "Usar este telefone" e excluir convidado ficam na linha expandida. Mesmo padrão da linha expansível de Tarefas.

### 6.5. Aba Convidados igual nas duas telas

1. O topo da aba é um componente só (`shared/convidados-topo.component.ts`), usado pela organizadora e pelo link do cliente: os três cards (Pendentes, Confirmados, Não confirmados, clicáveis para filtrar pela situação), o prazo de confirmação e a data de envio, as ferramentas **Data de envio**, **Prazo de confirmação**, **Lista de presença**, **Planilha padrão**, **Importar** e **Novo convite**, e os filtros (Convite, Situação, Telefone, Só confirmados). O filtro **Observação** só aparece para a organizadora, porque o cliente não vê a observação.
2. Os modais também são compartilhados: data (`data-convites.dialog.ts`, para prazo e data de envio), lista de presença (`presencas.dialog.ts`) e instruções da planilha (`planilha-instrucoes.dialog.ts`, que recebe a função de download de cada tela).
3. Na organizadora, o filtro roda na API, como antes. No link do cliente, que já recebe todos os convites, o filtro roda na tela com as mesmas regras (`filtrarConvites` em `shared/convite-lista.ts`): o convidado passa se atende a todos os filtros, o nome vale para o convidado ou o convite, e o convite fica com os convidados que passaram.
4. O prazo e a data de envio definidos pelo cliente são os do evento: a organizadora vê o mesmo valor, e vice-versa.
5. Convites importados pelo cliente gravam a observação "Preenchido pelo cliente", como os criados pelo formulário; a coluna de observação da planilha é ignorada nesse caso.
6. A organizadora mantém só para ela a troca "Por convite / Por convidado" e as ações do convite (link de RSVP, QR, WhatsApp, excluir).

### 6.6. Importação em fila, com histórico

1. **Importar** (nas duas telas) abre o modal **Importar planilha**: o botão **Escolher planilha** e a lista das últimas 20 importações do evento, da mais nova para a mais antiga, com o nome do arquivo, quando foi enviada e a situação: **Pendente**, **Processando**, **Importado** (com quantos convites) ou **Erro**.
2. O envio responde na hora com a importação Pendente e a mensagem "A lista está sendo verificada e em breve será confirmada." O modal consulta a lista a cada 2 segundos enquanto houver importação Pendente ou Processando; pode ser fechado e reaberto depois.
3. Importação com **Erro** mostra "N erros na planilha. Nada foi importado." num acordeão (botão com `aria-expanded`); aberto, lista todos os erros com o número da linha (§6.3).
4. Ao fechar o modal depois de uma importação terminar como Importado, a lista de convites recarrega.
5. **Como funciona, sem worker separado nem tecnologia nova:** o envio grava o arquivo na tabela `ImportacoesConvidados` (migration `FilaDeImportacaoDeConvidados`) como Pendente. Um serviço em segundo plano nativo do .NET (`ProcessadorImportacoes`, dentro da própria API) processa as Pendentes, uma por vez, quando chega um envio ou a cada 30 segundos; passa para Processando, lê e grava pelas regras do §6.3 e termina em Importado ou Erro, esvaziando o arquivo. Se a API reiniciar no meio, ao subir ela volta as que estavam em Processando para Pendente e processa de novo, porque o arquivo continua guardado.
6. Arquivo .xlsx ou .xls de até 10 MB. A organizadora e o cliente usam a mesma fila; o histórico é do evento, então os dois veem as mesmas importações.
7. **Desempenho:** o navegador só envia o arquivo (uma planilha de 10 mil convidados tem cerca de 0,5 a 1 MB); a leitura e a gravação rodam no servidor, fora da requisição do envio, que por isso não corre risco de estourar o tempo limite.

## 7. Fluxos alternativos

- Sem nome do convite, sem convidado, convidado sem nome, sem principal ("Marque o convidado principal do convite."), mais de um principal ("Marque só um convidado principal por convite."), principal sem telefone ("O convidado principal precisa de telefone.") ou e-mail inválido: 400 com mensagem.
- Convidado com `id` que não é do convite: 404.
- Planilha com erro em alguma linha, ou com as linhas de exemplo: 400 com o número da linha (§6.3); nada é importado.
- Gênero ou faixa etária fora da lista no formulário: 400 ("Há um valor de convidado que não faz parte da lista.").
- Evento fora de andamento: 400 ("O evento não está em andamento.").

## 8. Regras de negócio

- **Principal:** é o convidado marcado no formulário ou com Sim na planilha; obrigatório, um por convite e com telefone. "Usar este telefone" na lista da organizadora segue trocando o principal (SPEC-010).
- **Observação:** a organizadora envia e grava livremente. No link do cliente, o backend grava "Preenchido pelo cliente" ao criar (`ConviteRegras.ObservacaoDoCliente`) e ignora qualquer observação enviada; ao editar pelo link, a observação do convite não muda. O cliente não vê a observação.
- **Exceção do prazo:** o formulário envia `excecaoPrazoRsvp`; nulo mantém como está. O endpoint `PUT /convites/{id}/excecao-rsvp` (SPEC-054) continua existindo.
- **Mesmas validações nos dois caminhos:** `FormularioConvite.Validar` e `FormularioConvite.Aplicar` (Application/Convidados), chamados por `ConviteServico` e `LinkClienteServico`.
- **Banco (migration `DataDeEnvioDosConvitesNoEvento`):** apaga `Convites.DataEnvio` (as datas existentes são descartadas, por decisão do dono) e cria `Eventos.DataEnvioConvites` (data, opcional). `deploy/schema.sql` gerado de novo.

## 9. API

- Corpo único dos dois caminhos (`FormularioConvitePedido`): `{ nome, email, excecaoPrazoRsvp?, observacao?, convidados: [{ id?, nome, ddi, celular, genero?, faixa?, principal }] }`. A leitura do link do cliente traz `genero`, `faixa` e `principal` em cada convidado.
- Importação em fila (§6.6): `POST /api/v1/eventos/{id}/convites/importar` e `POST /api/v1/publico/cliente/{token}/convites/importar` (multipart, campo `arquivo`) respondem com a importação `{ id, nomeArquivo, situacao, criadaEm, concluidaEm, convites, erros }` Pendente; `GET .../convites/importacoes` lista as últimas 20.
- Organizadora: `POST /api/v1/eventos/{id}/convites` e `PUT /api/v1/convites/{id}` recebem esse corpo (saem `principal`, `dataEnvio` e os campos de situação, mesa etc. na criação; esses seguem no cadastro do convidado). A leitura do convite perde `dataEnvio`; a lista ganha `dataEnvioConvites`.
- Nova rota: `PUT /api/v1/eventos/{id}/envio-convites` com `{ data }` (nula remove), mesmo controle de acesso do prazo de confirmação.
- Link do cliente: `POST convites` e `PUT convites/{conviteId}` recebem o mesmo corpo (observação ignorada). A leitura traz `excecaoPrazoRsvp` no convite, `ddi` e `celular` em cada convidado, e `prazoRsvp` e `dataEnvioConvites` do evento.
- Ferramentas do link do cliente (base `/api/v1/publico/cliente/{token}`, exigem a marcação de convidados ligada e o evento em andamento; 403 com a marcação desligada): `PUT prazo-rsvp` `{ prazo }`, `PUT envio-convites` `{ data }`, `GET presencas`, `GET convites/planilha` e `POST convites/importar` (multipart, campo `arquivo`). Usam as regras de `ConviteServico`; as escritas devolvem a leitura do cliente atualizada.

## 10. Estados

Sem estados novos.

## 11. Dados necessários

Evento: data de envio dos convites. Convite: nome, e-mail, observação, exceção do prazo. Convidado: nome, DDI, telefone, gênero e faixa etária.

## 12. Interface

Formulário em modal padrão (design-system). Organizadora: botões **Data de envio** e **Prazo de confirmação** no cabeçalho da aba Convidados; a observação aparece abaixo do nome do convite na lista. Cliente: cada convidado mostra o telefone na lista.

## 13. Erros

Mensagem no modal (toast) com o texto do backend.

## 14. Critérios de aceite

1. Os dois formulários têm os mesmos campos, menos a Observação, ao criar e ao editar.
2. A organizadora cadastra um convite com vários convidados.
3. Os dois pedem telefone por convidado; sem o do primeiro, não salva.
4. A data de envio é uma só para o evento e fica fora do formulário.
5. O convite criado pelo link do cliente grava "Preenchido pelo cliente", sem mostrar isso ao cliente.
6. Editar pelo link do cliente não muda a observação.

## 15. Cenários de teste

Modelo e gênero/faixa: `RegrasNegocioTests` (modelo com exemplos, comentário, listas e aba Instruções; planilha antiga com Mesa e Custo lida ignorando essas colunas; 8 colunas), `LinkClienteTests.Formulario_grava_genero_e_faixa_etaria_de_cada_convidado`, integração `Importacao_agrupa_por_convite_e_exige_telefone_do_primeiro_convidado` (modelo sem apagar os exemplos é recusado), frontend `convite-form.dialog.spec.ts` e `planilha-instrucoes.dialog.spec.ts`.

Aba do cliente: integração `Link_do_cliente_usa_as_ferramentas_da_aba_convidados`; frontend `convidados-topo.component.spec.ts` (mesmas ferramentas nas duas telas, observação só na organizadora, card filtra, filtro e cards do cliente, prazo encerrado) e `cliente.client.spec.ts`. Planilha e lista: `RegrasNegocioTests` (modelo com a aba Exemplo, que não é importada; número da linha na leitura), integração `Importacao_agrupa_por_convite_e_exige_telefone_do_primeiro_convidado`, frontend `planilha-instrucoes.dialog.spec.ts` e `convite-lista.spec.ts`.

Principal e fila: `LinkClienteTests.Principal_e_obrigatorio_unico_e_precisa_de_telefone`, `RegrasNegocioTests` (coluna Convidado principal com lista Sim/Não; coluna que falta avisada), integração `Importacao_vai_para_a_fila_e_junta_todos_os_erros_da_planilha` (modelo sem apagar os exemplos, vários erros de principal na mesma planilha, principal fora da primeira linha, histórico e isolamento entre contas) e a importação pelo link do cliente em `Link_do_cliente_usa_as_ferramentas_da_aba_convidados`; frontend `convite-form.dialog.spec.ts` (marcar o principal; telefone obrigatório só nele) e `importacoes.dialog.spec.ts` (situações, acordeão de erros, consulta enquanto há fila).

Unitários (`LinkClienteTests`): telefone por convidado e principal; observação gravada pelo backend e ignorada quando enviada; edição não muda a observação; exceção do prazo; primeiro convidado sem telefone recusado; edição incluindo e removendo convidados. Integração: `Link_do_cliente_cadastra_convites_quando_liberado_e_a_organizadora_define_o_envio` e `Convite_rsvp_e_planilha`. Frontend: `convite-form.dialog.spec.ts` (mesmos campos menos a observação; telefone obrigatório só no primeiro; ids mantidos na edição), `convidados.page.spec.ts` e `cliente.client.spec.ts`.

## 16. Dependências

SPEC-052, SPEC-010, SPEC-054.

## 17. Premissas e pontos não definidos

1. ~~A importação por planilha não muda~~: passou a seguir o formulário (§6.3). O telefone da linha continua indo para o convidado da linha. O cabeçalho do modelo não mudou, para não invalidar planilhas já preenchidas.
2. O texto gravado é "Preenchido pelo cliente" (era "Preenchido pelo casal"; trocado na [SPEC-060](060-cliente-sem-login-e-link-do-cliente.md), porque a plataforma não atende só casamentos).
3. A edição de um convidado pela organizadora (situação, mesa, CPF etc.) continua fora do formulário de convite.
4. Na edição, convidado removido pelo formulário é apagado do banco, como já acontecia no link do cliente.
