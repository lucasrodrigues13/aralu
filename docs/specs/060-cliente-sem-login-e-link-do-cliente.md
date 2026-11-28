# 060. Cliente sem login e link do cliente

**Status: aprovada (22/11/2026, pedido do dono do projeto depois dos testes de ponta a ponta).** Duas decisões dele: (a) o cliente não acessa a plataforma, só o link público com o token gerado pelo organizador; (b) a plataforma não é só para casamentos, então nenhum contexto genérico fala em "casal". Segue a regra 7 do [roteiro de execução](../roteiro-execucao.md): o que sai, sai também do banco e da API.

## 1. Identificador e nome

SPEC-060. Cliente sem login e link do cliente.

## 2. Objetivo

- Fechar de vez o acesso do cliente à plataforma. A role `Client` já tinha saído dos requisitos (RF-024, DA-034), mas o código ainda permitia ao organizador dar login ao cliente, com permissões por módulo.
- Trocar "casal" por "cliente" em tudo o que vale para qualquer tipo de evento: endereço do link, nomes na tela, valores gravados e textos.

## 3. Requisitos relacionados

RF-024 (roles: `Admin`, `Organizer`, `Assistant`), RF-056 (link do cliente), RF-055 (cadastro de cliente), DA-007 e DA-034. Ajusta a [SPEC-001](001-autenticacao-e-conta.md), a [SPEC-006](006-clientes.md), a [SPEC-009](009-cadastro-completo-de-cliente.md), a [SPEC-046](046-link-do-cliente-financeiro.md), a [SPEC-052](052-link-do-cliente-cadastra-convites.md) e a [SPEC-059](059-formulario-unico-de-convite.md).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Admin, Organizer, Assistant | Entrar na plataforma, como antes. |
| Cliente | Não entra na plataforma. Usa só o link público do evento (`/cliente/<token>`), com o que a organizadora liberou (SPEC-046, SPEC-052). |
| Conta sem um dos três papéis (inclusive contas antigas de cliente) | Login recusado como credencial inválida. Token emitido antes para ela é recusado pela API. |

## 5. Pré-condições

Nenhuma nova.

## 6. Comportamento

### 6.1. Cliente sem login

1. O login só é aceito para contas com `Admin`, `Organizer` ou `Assistant`. Qualquer outra conta recebe a mesma resposta de senha errada (não revela que a conta existe).
2. A API interna (`/api/v1`) e a área da conta (`/api/v1/conta/area`) exigem um desses três papéis. Um token sem eles recebe 403.
3. Cadastrar ou editar cliente não cria conta, não envia e-mail de primeiro acesso e não tem aba "Acesso" nem permissões por módulo. Campos `acessoPlataforma` e `permissoes` enviados por clientes antigos da API são ignorados.
4. A lista de clientes perde a coluna "Último acesso" (sempre vazia).
5. As contas de cliente criadas antes ficam no banco, sem o papel `Client`; o papel deixa de existir.

### 6.2. Link do cliente

1. O endereço público passa de `/casal/<token>` para `/cliente/<token>`. O token não muda: basta reenviar o endereço novo. O endereço antigo deixa de abrir (sem redirecionamento).
2. Rotas da API: `/api/v1/eventos/{id}/link-cliente` (gestão pela dona) e `/api/v1/publico/cliente/{token}` (página pública e suas ações).
3. Nomes na tela: "Link do cliente", "O cliente acessa o financeiro do evento", "O cliente cadastra os convidados".
4. Valores gravados que diziam "Casal" passam a "Cliente": responsável de tarefa e de item da checklist, visibilidade da tarefa ("só eu / cliente / compartilhada") e quem enviou o contrato assinado do fornecedor ("Organizadora" ou "Cliente").
5. A observação gravada nos convites criados ou importados pelo link passa de "Preenchido pelo casal" para "Preenchido pelo cliente", inclusive nos convites já gravados.
6. O cadastro de cliente novo não vem com o papel "Noiva" marcado: a organizadora escolhe o papel.

## 7. O que não muda

- Campos "Nome da noiva" e "Nome do noivo" do evento: só aparecem quando o tipo é Casamento (contexto específico).
- "Noiva" e "Noivo" seguem na lista fechada de papéis do cliente, ao lado de Aniversariante, Formando(a) etc.
- Migrations antigas e registros históricos (inventários, roteiro de execução, notas de versão) mantêm os nomes da época.

## 8. Dados

Uma migration (`ClienteSemAcessoELinkDoCliente`):

- `Clientes` perde `AcessoPlataforma`, `UsuarioId` (e o índice) e as sete colunas `Permite*`.
- `LinksCasal` é renomeada para `LinksCliente` (chave, índices e chave estrangeira junto), sem perder os links gerados.
- Atualiza "Casal" para "Cliente" em `ResponsaveisTarefa`, `ResponsaveisTarefaFunil`, `ItensChecklistTarefa`, `Tarefas` (visibilidade) e `ContratosFornecedor` (quem enviou), e a observação "Preenchido pelo casal" em `Convites` e `ImportacoesConvidados`.
- Apaga o papel `Client` e os vínculos de conta com ele.

## 9. Erros

Login de conta sem papel da plataforma: 401 "credencial inválida". Token sem papel da plataforma: 403.

## 10. Critérios de aceite

1. Cadastrar cliente com qualquer combinação de campos não cria conta nem envia e-mail.
2. Conta com papel antigo `Client`, mesmo vinculada a um organizador, não entra.
3. Token com papel fora dos três é recusado em `/api/v1/eventos`, `/api/v1/clientes` e `/api/v1/conta/area`.
4. O link copiado na janela "Link do cliente" é `<origem>/cliente/<token>` e abre a página do cliente.
5. Nenhum texto da janela do link nem da página do cliente fala em "casal".
6. Convite criado pelo link grava "Preenchido pelo cliente".

## 11. Testes

Integração (`ClienteAcessoFluxoTests`): cadastro sem conta; conta legada não entra; token fora da equipe recusado; isolamento entre organizadores. `ContaFluxoTests`: bootstrap garante `Admin`, `Organizer` e `Assistant`; conta sem papel não entra. Unitários renomeados (`LinkClienteTests`). Frontend: `link-cliente.dialog.spec.ts` (endereço `/cliente/<token>`, sem "casal" no texto), `link-cliente.client.spec.ts`, `responsaveis.spec.ts` ("Cliente" como responsável).

## 12. Pendências

1. Redirecionar `/casal/<token>` para `/cliente/<token>` para quem já recebeu o endereço antigo? Hoje não redireciona; decisão do dono se houver links enviados em produção.
