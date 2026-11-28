# 067. Equipe de apoio do evento: links individuais com código por e-mail

**Status: implementada (27/11/2026).** Fonte: card #74. Usa a portaria da [SPEC-058](058-portaria-do-evento.md), os modelos de roteiro e de cronograma da biblioteca e as regras de código de acesso da [SPEC-063](063-codigo-de-acesso-do-cliente.md)/[SPEC-066](066-briefing-preenchido-pelo-cliente.md). Substitui o link aberto da portaria da SPEC-058: a portaria agora só abre pelo link de uma pessoa da equipe.

## 1. Identificador e nome

SPEC-067. Equipe de apoio do evento: cadastro de quem trabalha no dia e envio de links sem login (portaria, cronograma, roteiro), com código por e-mail.

## 2. Objetivo

No dia do evento trabalham pessoas que não são membros da conta: segurança, buffet, cozinha, decoração, música. A Organizer cadastra essas pessoas no evento, escolhe o que cada uma recebe e envia um link individual que só abre com código enviado ao e-mail dela.

## 3. Fora do escopo

- Cardápio, montagem, contatos e ocorrências: não existem no sistema e ficam para depois.
- Confirmação de presença da equipe: não terá (decisão do dono).
- Banco de equipe reaproveitável entre eventos: o cadastro é por evento.
- Envio do link por e-mail: o link vai pelo WhatsApp ou copiado; o e-mail só leva o código.
- A equipe não é `MembroConta`, não ocupa vaga do plano e não acessa nada além do que foi marcado.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer (dona) | Escolher o roteiro e o cronograma do evento; cadastrar, editar e remover pessoas; marcar o que cada uma recebe; enviar, copiar e encerrar o link de cada uma. |
| Assistant | Não vê **Equipe de apoio** no menu. A API responde 403. |
| Pessoa da equipe (sem login) | Receber o código no próprio e-mail (mascarado na tela) e ver só os itens marcados, apenas daquele evento. Na portaria, marcar quem compareceu como na SPEC-058. Não envia nem repassa links. |
| Sistema | Gerar e enviar o código, contar tentativas e pedidos, expirar código, sessão e link. |

## 5. Comportamento

### 5.1. Organizer: menu **Mais › Equipe de apoio**

1. O diálogo abre com dois campos: **Cronograma do evento** e **Roteiro do evento**, com os modelos da biblioteca (ou "Nenhum"). A escolha é uma referência: editar o modelo na biblioteca muda o que a equipe vê; excluir o modelo desvincula.
2. Abaixo, a lista de pessoas: nome, função, o que recebe e a situação (Não enviado, Enviado, Acessou, Vencido, Encerrado), com a validade quando o link está aberto.
3. **Adicionar pessoa**: nome e e-mail obrigatórios (o código chega no e-mail), função e WhatsApp opcionais, e ao menos uma opção marcada entre **Portaria**, **Cronograma** e **Roteiro**. Cronograma ou roteiro sem modelo escolhido podem ser marcados: aparecem para a pessoa quando o modelo for escolhido.
4. Por pessoa: **WhatsApp** (abre o wa.me com o link e o aviso do código; sem telefone, abre para escolher o contato), e no menu **Copiar link**, **Editar**, **Encerrar link** e **Remover**.
5. **Validade**: enviar ou copiar libera o link até o fim do dia seguinte ao evento (horário de Brasília). Evento sem data: 30 dias. Enviar ou copiar de novo renova a validade e reabre um link encerrado, no mesmo endereço.
6. **Encerrar link** fecha na hora e derruba as sessões. **Remover** apaga a pessoa e o link.
7. Mudar o que a pessoa recebe vale na próxima vez que ela abrir a página, sem novo código. Trocar o e-mail derruba as sessões abertas.

### 5.2. Pessoa da equipe (`/equipe/<token>`)

1. Antes de liberado, encerrado, vencido ou removido: "Este link não está mais disponível. Fale com quem organizou o evento."
2. Vê o nome do evento e o próprio e-mail mascarado, pede o código e digita.
3. Depois do código, o painel mostra a assessoria, o evento, a data e a hora, os locais (cerimônia e recepção), o nome e a função dela, e um botão por item liberado: **Portaria**, **Cronograma**, **Roteiro**.
4. **Cronograma**: cada item com rótulo, data e hora, descrição, responsável e o **recado aos fornecedores**. **Roteiro**: cada momento com horário, música e itens.
5. **Portaria** (`/equipe/<token>/portaria`): a tela da SPEC-058 (lista de confirmados, QR, marcar quem compareceu). Sem sessão, volta ao painel para pedir o código.
6. A sessão dura até o link vencer, no mesmo navegador. Em outro aparelho, pede código de novo.

### 5.3. Regras do código (as mesmas da SPEC-063)

- 6 dígitos, vale 10 minutos, 5 tentativas.
- 1 pedido a cada 2 minutos; depois de 3 pedidos, espera de 15 minutos.
- Pedir um código novo invalida o anterior.
- Código e sessão ficam no banco só como hash. A sessão vai num cookie `HttpOnly` (`aralu_equipe`) restrito às rotas daquele link.

## 6. Dados e API

- Migration `EquipeDoEvento`:
  - `Eventos` ganha `RoteiroId` e `CronogramaId` (FK para os modelos, `SET NULL` ao excluir).
  - Tabela `PessoasEquipeEvento`: `Nome`, `Email`, `Telefone`, `Funcao`, `RecebePortaria`, `RecebeRoteiro`, `RecebeCronograma`, `Token` (único), `EnviadoEm`, `ValidoAte`, `UltimoAcessoEm`, `EncerradoEm`, `CriadoEm`.
  - Tabelas `CodigosAcessoEquipe` e `SessoesEquipe` (apagadas junto com a pessoa).
  - Tabela `LinksPortaria` removida.
  - `deploy/schema.sql` regerado.
- Organizer (Assistant recebe 403), em `/api/v1/eventos/{id}/equipe`: `GET`, `PUT /modelos` (`{ roteiroId, cronogramaId }`), `POST`, `PUT /{pessoaId}`, `DELETE /{pessoaId}`, `POST /{pessoaId}/liberacao` (liberar ou renovar) e `DELETE /{pessoaId}/liberacao` (encerrar).
- Público, em `/api/v1/publico/equipe/{token}`:
  - `GET /acesso`, `POST /acesso/codigo` e `POST /acesso/confirmar` (`{ codigo }`) não pedem sessão.
  - `GET` (painel), `GET /roteiro`, `GET /cronograma`, `GET /portaria`, `GET /portaria/qr/{codigo}`, `GET /portaria/convites/{id}` e `PUT /portaria/convites/{id}/comparecimento` pedem sessão. Sem ela, 401; item não marcado, 404.
  - Link inexistente, não liberado, encerrado ou vencido responde 404.
- As rotas `/api/v1/eventos/{id}/link-portaria` e `/api/v1/publico/portaria/{token}` deixaram de existir. O `PortariaServico` passou a receber o evento já autorizado.

## 7. Testes

- Integração (`EquipeEventoFluxoTests`): validação do cadastro, isolamento por conta, link fechado antes de liberar, código por e-mail, só os itens marcados, portaria aberta ao marcar, encerrar derruba a sessão, reabrir pede código e remover fecha o link.
- Unitários da portaria ajustados para o evento autorizado; isolamento de contas cobre `/equipe`.
- Frontend: link, WhatsApp e chamadas da API da equipe.

## 8. Para o manual

> **Equipe de apoio.** No evento, abra **Mais › Equipe de apoio**. Escolha o cronograma e o roteiro que a equipe vai ver e cadastre quem trabalha no dia (segurança, buffet, DJ…) com nome, e-mail e função. Marque o que cada pessoa recebe: portaria, cronograma e roteiro. Envie o link pelo WhatsApp ou copie. A pessoa não precisa de conta: ela abre o link, recebe um código no e-mail e vê só o que você liberou. O link vale até o dia seguinte ao evento; para cortar o acesso antes, use **Encerrar link**. A portaria só abre por aqui: cadastre quem vai receber os convidados com **Portaria** marcada.
