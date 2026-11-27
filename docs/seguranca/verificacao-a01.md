# Verificação manual A01 — Lote 10

Referência: [plano-correcoes-owasp.md](plano-correcoes-owasp.md), Lote 10. Escopo: Assistente com "só os eventos em que estou atribuída" (`EscopoAssistente.Restrito`) e impersonação do Admin.

Legenda: **ok** = já filtrava ou não devolve dado de evento; **corrigida** = mudou neste lote; **ok (nota)** = sem mudança, com decisão registrada.

## 1. `GET /api/v1/arquivos/{id}` — corrigida

O filtro de grupo (`EscopoAssistente.Filtro`) não cobre `/arquivos/`; o arquivo só era checado pela conta. Agora `EscopoAssistente.PodeAbrirArquivoAsync` descobre os eventos ligados ao arquivo e responde 404 quando algum está fora do alcance:

| Vínculo do arquivo | Evento | Situação |
|---|---|---|
| `Evento.ImagemId` | o próprio evento | filtrado |
| `AnexoTarefa.ArquivoId` | `Tarefa.EventoId` | filtrado |
| `ContratoFornecedor.ComprovanteArquivoId` / `ContratoAssinadoArquivoId` | contrato → `FornecedorNoServico` → `ServicoEvento.EventoId` | filtrado |
| `ParcelaContratoFornecedor.ComprovanteArquivoId` | parcela → contrato → idem | filtrado |
| Modelos (inspiração), perfil, foto de cliente/fornecedor, funil (contrato, tarefa, orçamento de fornecedor) | sem evento | liberado |

## 2. Rotas de `NegocioEndpoints.cs` (e `/hoje`) sem `{id}` de evento

Rotas com `{id}` de evento, tarefa, convite ou convidado já passam pelo `EscopoAssistente.Filtro` do grupo.

| Rota | Situação | Observação |
|---|---|---|
| `GET /eventos` | ok | filtra por `LiberadosAsync` |
| `GET /tarefas` | ok | filtra por `LiberadosAsync` |
| `GET /agenda` | ok | filtra compromissos com evento; os sem evento seguem visíveis |
| `GET /eventos/estatisticas` | ok | `LiberadosAsync` passado ao serviço |
| `GET /hoje` (`DinheiroEndpoints`) | ok | `LiberadosAsync` passado ao serviço |
| `GET /painel` | **corrigida** | contava e listava todos os eventos em andamento da conta; agora usa `LiberadosAsync` (o funil comercial continua da conta) |
| `GET /clientes` | **corrigida** | o cadastro é da conta, mas cada cliente trazia nomes de eventos vinculados fora do alcance; a lista de eventos agora é filtrada |
| `GET /arquivos/{id}` | **corrigida** | ver seção 1 |
| `GET /modelos*`, `/servicos-conta`, `/fornecedores*`, `/estagios-funil` | ok | cadastros da conta, sem dado de evento |
| `GET /oportunidades*`, `/contratos-funil*`, `/orcamentos-funil*`, `/tarefas-funil`, `/relatorios-funil*` | ok | funil comercial (antes do evento), fora do escopo SPEC-062 §9 |
| `GET /leads-rsvp` | ok (nota) | lead comercial do funil; traz o nome do evento de origem. Mantido para não esconder leads da Assistente; revisar se o produto quiser restringir |
| `POST /tarefas/em-massa/leitura` | ok | só lê a planilha enviada |
| `GET /cep/{cep}` | ok | sem dado da conta |

## 3. Impersonação do Admin — corrigida (endurecimento)

- `ListarUsuarios` devolve `ContaAssessoria.Id`; `AplicarContaDoAdmin` buscava esse valor como **id de usuário** e gravava `dona.Id` em `conta_id`.
- O único caminho de criação (`CadastroDeConta`) usa `Id = Guid.Parse(usuario.Id)`, então `ContaAssessoria.Id == DonoUsuarioId` e o fluxo funcionava.
- Risco: um sócio convidado como Dono também é Organizer; com o id dele no cabeçalho, o Admin ganhava um `conta_id` que não é conta nenhuma.
- Correção: o middleware resolve a conta em `Contas` pelo id do cabeçalho, confere que o dono é Organizer e grava `conta.Id`. Id inexistente ou não-GUID responde 400.

## Testes

- `AssistentesFluxoTests.Somente_dela_nao_ve_painel_clientes_nem_arquivos_de_evento_fora_do_alcance`
- `PlanosAdminTests.Admin_entra_na_conta_pelo_id_que_a_lista_devolve`
