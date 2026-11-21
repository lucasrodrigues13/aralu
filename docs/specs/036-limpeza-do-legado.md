# 036. Limpeza do legado removido da aplicação

**Status: aprovada (21/11/2026).** Aprovação antecipada pelo dono do projeto, repassada pela sessão coordenadora. Nasce da regra 7 do [roteiro-execucao.md](../roteiro-execucao.md): funcionalidade removida sai também do banco e da API, por migration, mesmo perdendo dados. Esta spec não cria comportamento novo: só lista o que sai.

## 1. Identificador e nome

SPEC-036. Limpeza do legado deixado pelos cards #22 (convidados) e #36 (contrato sem vínculo com o evento).

## 2. Objetivo

A 1.0 não pode ter tabela, coluna, endpoint, campo de resposta ou teste de funcionalidade que a aplicação não usa mais.

## 3. Requisitos relacionados

Nenhum RF novo. RF-063 (convites e convidados) cita grupos e transfer; o texto do RF não foi mexido (RF não se altera sem pedido do dono), vale esta spec. A SPEC-030 (contrato) é ajustada.

## 4. Atores e permissões

Sem mudança. Nenhuma tela muda: tudo o que sai já estava fora das telas.

## 5. O que sai (lista fechada)

### 5.1. Contratos por evento (card #36, SPEC-030 v3)

- Tabelas: `ContratosDoModelo`, `ContratosDoEvento`, `LinksLeituraContrato`.
- Classes de domínio `ContratoDoModelo`, `ContratoDoEvento`, `LinkLeituraContrato` (`Project.Domain/Contratos/Contratos.cs`), os três mapeamentos em `Mapa.cs` e a limpeza dessas linhas ao excluir um contrato (`DadosContratoEf.cs`). A exclusão do contrato passa a só remover o contrato.
- Fica: a tabela `ContratosConta`, o contrato da conta, os campos de mesclagem, o contrato do funil.

### 5.2. Grupos de convite (card #22, SPEC-010 §18)

- Tabela `Grupos` e a coluna `GrupoId` de `Convites`.
- Classe `GrupoConvidados`, `DbSet`, métodos `ListarGrupos`, `InserirGrupo`, `ObterGrupo` e `GarantirGrupo` (`IDados`, `DadosEf`), `CriarGrupoAsync` e `ListarGruposAsync` do serviço de convites.
- Endpoints `GET /api/v1/grupos` e `POST /api/v1/grupos` (e `GrupoPedido`).
- Em convites: `grupoId` e `grupo` na resposta, `grupoId` no pedido de criar e editar, filtro `grupoId` da lista.
- Planilha de importação: a coluna **"Grupo do convite"** sai do modelo (de 11 para 10 colunas). A planilha antiga com a coluna deixa de ser aceita ("A planilha não tem as colunas do modelo"); quem tem planilha antiga baixa o modelo de novo.

### 5.3. Transfer do evento e do convite (card #22)

Conferido: o transfer saiu da 1.0 ([produto-v1.md](../produto-v1.md) 5.7, linha do card #22; a SPEC-008 v4 diz que a criação não tem transfer; a SPEC-010 §18 retirou o campo do convite). No código, o transfer só era lido por `ConviteServico` (validação, filtro e leitura do convite) e por `EventoServico` e `EventoMapeamento` (detalhe do evento). Não há uso em estatísticas, resumo, Hoje, exportação nem planilha. Sem uso vivo, sai tudo:

- Tabela `LocalTransfer` (locais do transfer do evento).
- Colunas `Eventos.TransferAtivo`, `Convites.UsaTransfer` e `Convites.LocalOrigem`.
- Classe `LocalTransfer`, `Evento.TransferAtivo`, `Evento.LocaisTransfer`, `Convite.UsaTransfer`, `Convite.LocalOrigem`.
- Endpoint `PUT /api/v1/eventos/{id}/transfer`, `TransferPedido`, `EventoServico.DefinirTransferAsync`, `ValidarTransfer`.
- Em eventos e convites: `transferAtivo` e `locaisTransfer` na resposta do evento, `usaTransfer` e `localOrigem` no pedido e na resposta do convite, filtro `transfer` da lista de convites.
- Frontend: os mesmos campos em `negocio.client.ts`, o método `transfer()` e o envio de `usaTransfer` e `localOrigem` na tela de convidados.

### 5.4. Testes

- Teste de unidade da planilha: o modelo passa a ter 10 colunas.
- Teste de integração `Convite_rsvp_e_planilha` (antes `Convite_rsvp_transfer_e_planilha`): sai o uso de grupo e transfer; entra a conferência de que `/api/v1/grupos` e `/api/v1/eventos/{id}/transfer` não existem mais.

## 6. O que NÃO sai (e por quê)

- **`Evento.ModeloId` e a criação de evento com `modeloId` na API** (card #19, SPEC-008 v4): a tela não manda mais o modelo, mas a API ainda aceita (copia serviços e tarefas do modelo) e três testes de integração dependem disso. **Decidido pelo dono em 21/11/2026: o evento continua tendo modelo.** Ele só deixa de ser escolhido no modal de criação rápida; depois, se a organizadora quiser, aplica um modelo de evento (RF-053). Nada disso sai.
- **Forma de pagamento `Transferencia`** (SPEC-029): é pagamento por transferência bancária, outra coisa; segue em uso.
- **Campos "grupo" de tarefa e de modelo, grupos de prazo da tarefa e "grupos" do menu**: homônimos, em uso.
- **Resíduos do card #37**: o card só mexeu na ordem do menu (frontend); não deixou nada no banco nem na API.
- **Migrations já geradas**: não são editadas; a limpeza é uma migration nova.

## 7. Regras e validações

- Uma migration (`LimpezaDoLegado`) remove as tabelas e colunas acima e perde os dados delas. A reversão recria a estrutura vazia.
- Convite continua com nome, observação, convidados, principal e link de RSVP; evento continua com tudo o que a tela mostra.

## 8. Dados

Removidos: ver seção 5. Nenhum dado novo.

## 9. Interface

Nenhuma tela muda. O modelo de planilha de convidados baixado tem uma coluna a menos.

## 10. Erros

Planilha antiga (com "Grupo do convite") é recusada com "A planilha não tem as colunas do modelo.".

## 11. Critérios de aceite

1. O banco, com todas as migrations, não tem as tabelas `ContratosDoModelo`, `ContratosDoEvento`, `LinksLeituraContrato`, `Grupos`, `LocalTransfer` nem as colunas `TransferAtivo`, `UsaTransfer`, `LocalOrigem` e `GrupoId`.
2. `GET /api/v1/grupos`, `POST /api/v1/grupos` e `PUT /api/v1/eventos/{id}/transfer` respondem 404.
3. Criar, editar, listar e importar convites e excluir contrato seguem funcionando.
4. Testes de unidade e do frontend passam; os de integração compilam (rodam no fim das ondas).

## 12. Dependências

SPEC-030 v3, SPEC-010 §18, SPEC-008 v4, regra 7 do roteiro.

## 13. Pendências

Nenhuma.
