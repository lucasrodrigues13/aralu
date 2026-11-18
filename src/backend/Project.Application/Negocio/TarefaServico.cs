using Project.Application.Comum;
using Project.Domain.Eventos;
using Project.Domain.Tarefas;

namespace Project.Application.Negocio;

public sealed record ResponsavelPedido(PapelResponsavel Papel);

public sealed record ItemChecklistPedido(string? Texto, bool Feito, bool Cancelado = false);

public sealed record MarcarItemChecklist(bool Feito, bool Cancelado);

public sealed record SalvarTarefa(
    string? Titulo,
    string? Descricao,
    string? Grupo,
    DateOnly? Prazo,
    SituacaoTarefa? Situacao,
    PrioridadeTarefa? Prioridade,
    VisibilidadeTarefa? Visibilidade,
    Guid? ServicoEventoId,
    bool AtualizarServico,
    IReadOnlyList<ResponsavelPedido>? Responsaveis,
    IReadOnlyList<ItemChecklistPedido>? Checklist);

public sealed record ComentarioPedido(string? Texto);

public sealed record ResponsavelLeitura(PapelResponsavel Papel, string? ReferenciaId);

public sealed record ItemChecklistLeitura(Guid Id, string Texto, bool Feito, bool Cancelado);

public sealed record ComentarioLeitura(Guid Id, string AutorContaId, string Texto, DateTimeOffset CriadoEm);

public sealed record TarefaLeitura(
    Guid Id,
    Guid EventoId,
    string Evento,
    string Titulo,
    string? Descricao,
    string? Grupo,
    DateOnly? Prazo,
    SituacaoTarefa Situacao,
    string ResponsavelContaId,
    PrioridadeTarefa Prioridade,
    VisibilidadeTarefa Visibilidade,
    Guid? ServicoEventoId,
    string? Servico,
    IReadOnlyList<ResponsavelLeitura> Responsaveis,
    IReadOnlyList<ItemChecklistLeitura> Checklist,
    IReadOnlyList<ComentarioLeitura> Comentarios,
    GrupoPrazo? GrupoPrazo,
    bool EventoEmAndamento,
    IReadOnlyList<string> Tags);

public sealed record ContextoEvento(string Nome, SituacaoEvento Situacao, DateTimeOffset? CriadoEm, IReadOnlyList<string> Tags);

public sealed class TarefaServico(IDados dados)
{
    public async Task<Resultado<IReadOnlyList<TarefaLeitura>>> DoEventoAsync(string contaId, Guid eventoId, DateOnly hoje, CancellationToken ct)
    {
        if (!await dados.EventoDaContaAsync(contaId, eventoId, ct))
        {
            return Resultado<IReadOnlyList<TarefaLeitura>>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var tarefas = await dados.ListarTarefasAsync(contaId, eventoId, ct);
        return Resultado<IReadOnlyList<TarefaLeitura>>.Sucesso(await LerListaAsync(contaId, tarefas, hoje, ct));
    }

    public async Task<IReadOnlyList<TarefaLeitura>> DaContaAsync(string contaId, DateOnly hoje, CancellationToken ct)
    {
        var tarefas = await dados.ListarTarefasAsync(contaId, null, ct);
        return await LerListaAsync(contaId, tarefas, hoje, ct);
    }

    public async Task<Resultado<TarefaLeitura>> CriarAsync(string contaId, Guid eventoId, SalvarTarefa pedido, DateOnly hoje, CancellationToken ct)
    {
        var situacaoEvento = await dados.SituacaoDoEventoAsync(contaId, eventoId, ct);
        if (situacaoEvento is null)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (situacaoEvento != SituacaoEvento.EmAndamento)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        var titulo = Domain.Comum.Texto.Limpo(pedido.Titulo);
        if (titulo is null)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "Informe o título.");
        }

        var grupo = Domain.Comum.Texto.Limpo(pedido.Grupo);
        if (grupo is { Length: > 80 })
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "O grupo tem no máximo 80 caracteres.");
        }

        if (FalhaDeEnum(pedido.Prioridade, "Escolha a prioridade.") is Falha prioridade)
        {
            return Resultado<TarefaLeitura>.Erro(prioridade.Codigo, prioridade.Mensagem);
        }

        if (FalhaDeEnum(pedido.Visibilidade, "Escolha a visibilidade.") is Falha visibilidade)
        {
            return Resultado<TarefaLeitura>.Erro(visibilidade.Codigo, visibilidade.Mensagem);
        }

        if (pedido.Responsaveis is not null && ValidarResponsaveis(pedido.Responsaveis) is Falha responsaveis)
        {
            return Resultado<TarefaLeitura>.Erro(responsaveis.Codigo, responsaveis.Mensagem);
        }

        if (pedido.Checklist is not null && ValidarChecklist(pedido.Checklist) is Falha checklist)
        {
            return Resultado<TarefaLeitura>.Erro(checklist.Codigo, checklist.Mensagem);
        }

        if (pedido.AtualizarServico && pedido.ServicoEventoId is Guid servicoId
            && await dados.ObterServicoEventoAsync(contaId, eventoId, servicoId, ct) is null)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "Escolha um serviço deste evento.");
        }

        var tarefa = new Tarefa
        {
            Id = Guid.NewGuid(),
            EventoId = eventoId,
            ContaId = contaId,
            Titulo = titulo,
            Descricao = Domain.Comum.Texto.Limpo(pedido.Descricao),
            Grupo = grupo,
            Prazo = pedido.Prazo,
            Situacao = SituacaoTarefa.Pendente,
            ResponsavelContaId = contaId,
            Prioridade = pedido.Prioridade ?? PrioridadeTarefa.Media,
            Visibilidade = pedido.Visibilidade ?? VisibilidadeTarefa.SoEu,
            ServicoEventoId = pedido.AtualizarServico ? pedido.ServicoEventoId : null,
        };
        AplicarResponsaveis(tarefa, contaId, pedido.Responsaveis);
        AplicarChecklist(tarefa, pedido.Checklist);
        await dados.InserirTarefaAsync(tarefa, ct);
        return Resultado<TarefaLeitura>.Sucesso(await LerUmaAsync(contaId, tarefa, hoje, ct));
    }

    public async Task<Resultado<TarefaLeitura>> AtualizarAsync(string contaId, Guid id, SalvarTarefa pedido, DateOnly hoje, CancellationToken ct)
    {
        var tarefa = await dados.ObterTarefaAsync(contaId, id, ct);
        if (tarefa is null)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var situacaoEvento = await dados.SituacaoDoEventoAsync(contaId, tarefa.EventoId, ct);
        if (situacaoEvento != SituacaoEvento.EmAndamento)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        var titulo = Domain.Comum.Texto.Limpo(pedido.Titulo);
        if (titulo is null)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "Informe o título.");
        }

        if (pedido.Situacao is not SituacaoTarefa situacao || !Enum.IsDefined(situacao))
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "Escolha a situação da tarefa.");
        }

        var grupo = Domain.Comum.Texto.Limpo(pedido.Grupo);
        if (grupo is { Length: > 80 })
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "O grupo tem no máximo 80 caracteres.");
        }

        if (FalhaDeEnum(pedido.Prioridade, "Escolha a prioridade.") is Falha prioridade)
        {
            return Resultado<TarefaLeitura>.Erro(prioridade.Codigo, prioridade.Mensagem);
        }

        if (FalhaDeEnum(pedido.Visibilidade, "Escolha a visibilidade.") is Falha visibilidade)
        {
            return Resultado<TarefaLeitura>.Erro(visibilidade.Codigo, visibilidade.Mensagem);
        }

        if (pedido.Responsaveis is not null && ValidarResponsaveis(pedido.Responsaveis) is Falha responsaveis)
        {
            return Resultado<TarefaLeitura>.Erro(responsaveis.Codigo, responsaveis.Mensagem);
        }

        if (pedido.Checklist is not null && ValidarChecklist(pedido.Checklist) is Falha checklist)
        {
            return Resultado<TarefaLeitura>.Erro(checklist.Codigo, checklist.Mensagem);
        }

        if (pedido.AtualizarServico && pedido.ServicoEventoId is Guid servicoId
            && await dados.ObterServicoEventoAsync(contaId, tarefa.EventoId, servicoId, ct) is null)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "Escolha um serviço deste evento.");
        }

        tarefa.Titulo = titulo;
        tarefa.Descricao = Domain.Comum.Texto.Limpo(pedido.Descricao);
        tarefa.Grupo = grupo;
        tarefa.Prazo = pedido.Prazo;
        tarefa.Situacao = situacao;
        if (pedido.Prioridade is PrioridadeTarefa novaPrioridade)
        {
            tarefa.Prioridade = novaPrioridade;
        }

        if (pedido.Visibilidade is VisibilidadeTarefa novaVisibilidade)
        {
            tarefa.Visibilidade = novaVisibilidade;
        }

        if (pedido.AtualizarServico)
        {
            tarefa.ServicoEventoId = pedido.ServicoEventoId;
        }

        if (pedido.Responsaveis is not null)
        {
            await dados.SubstituirResponsaveisAsync(tarefa.Id, MontarResponsaveis(tarefa, contaId, pedido.Responsaveis), ct);
        }

        if (pedido.Checklist is not null)
        {
            await dados.SubstituirChecklistAsync(tarefa.Id, MontarChecklist(tarefa, pedido.Checklist), ct);
        }

        await dados.SalvarTarefaAsync(ct);
        return Resultado<TarefaLeitura>.Sucesso(await LerUmaAsync(contaId, tarefa, hoje, ct));
    }

    public async Task<Resultado<TarefaLeitura>> ComentarAsync(string contaId, Guid id, ComentarioPedido pedido, DateOnly hoje, CancellationToken ct)
    {
        var tarefa = await dados.ObterTarefaAsync(contaId, id, ct);
        if (tarefa is null)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var situacaoEvento = await dados.SituacaoDoEventoAsync(contaId, tarefa.EventoId, ct);
        if (situacaoEvento != SituacaoEvento.EmAndamento)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        var texto = Domain.Comum.Texto.Limpo(pedido.Texto);
        if (texto is null)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "Informe o comentário.");
        }

        await dados.InserirComentarioAsync(new ComentarioTarefa
        {
            Id = Guid.NewGuid(),
            TarefaId = tarefa.Id,
            AutorContaId = contaId,
            Texto = texto,
            CriadoEm = DateTimeOffset.UtcNow,
        }, ct);
        return Resultado<TarefaLeitura>.Sucesso(await LerUmaAsync(contaId, tarefa, hoje, ct));
    }

    /// <summary>Marca um item da checklist como feito, cancelado (riscado) ou pendente, sem regravar a tarefa.</summary>
    public async Task<Resultado<TarefaLeitura>> MarcarItemChecklistAsync(
        string contaId,
        Guid id,
        Guid itemId,
        MarcarItemChecklist pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        var tarefa = await dados.ObterTarefaAsync(contaId, id, ct);
        if (tarefa is null)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var situacaoEvento = await dados.SituacaoDoEventoAsync(contaId, tarefa.EventoId, ct);
        if (situacaoEvento != SituacaoEvento.EmAndamento)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        if (pedido.Feito && pedido.Cancelado)
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Validacao, "O item não pode estar feito e cancelado ao mesmo tempo.");
        }

        if (!await dados.MarcarItemChecklistAsync(tarefa.Id, itemId, pedido.Feito, pedido.Cancelado, ct))
        {
            return Resultado<TarefaLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var atual = (await dados.ListarTarefasAsync(contaId, tarefa.EventoId, ct)).Single(item => item.Id == tarefa.Id);
        return Resultado<TarefaLeitura>.Sucesso(await LerUmaAsync(contaId, atual, hoje, ct));
    }

    private async Task<IReadOnlyList<TarefaLeitura>> LerListaAsync(string contaId, IReadOnlyList<Tarefa> tarefas, DateOnly hoje, CancellationToken ct)
    {
        var ids = tarefas.Select(tarefa => tarefa.EventoId).Distinct().ToArray();
        var contextos = await dados.ContextosEventoAsync(contaId, ids, ct);
        var servicos = await dados.NomesDeServicosAsync(
            contaId,
            tarefas.Where(tarefa => tarefa.ServicoEventoId is not null).Select(tarefa => tarefa.ServicoEventoId!.Value).Distinct().ToArray(),
            ct);
        return tarefas.Select(tarefa => Ler(tarefa, contextos, servicos, hoje)).ToArray();
    }

    private async Task<TarefaLeitura> LerUmaAsync(string contaId, Tarefa tarefa, DateOnly hoje, CancellationToken ct)
    {
        var lista = await LerListaAsync(contaId, [tarefa], hoje, ct);
        return lista[0];
    }

    private static TarefaLeitura Ler(
        Tarefa tarefa,
        IReadOnlyDictionary<Guid, ContextoEvento> contextos,
        IReadOnlyDictionary<Guid, string> servicos,
        DateOnly hoje)
    {
        contextos.TryGetValue(tarefa.EventoId, out var contexto);
        var criadoEm = contexto?.CriadoEm is DateTimeOffset criado ? DateOnly.FromDateTime(criado.UtcDateTime) : (DateOnly?)null;
        string? servico = null;
        if (tarefa.ServicoEventoId is Guid servicoId)
        {
            servicos.TryGetValue(servicoId, out servico);
        }

        var responsaveis = tarefa.Responsaveis
            .Select(item => new ResponsavelLeitura(item.Papel, item.ReferenciaId))
            .ToArray();
        if (responsaveis.Length == 0)
        {
            responsaveis = [new ResponsavelLeitura(PapelResponsavel.Organizer, tarefa.ResponsavelContaId)];
        }

        return new TarefaLeitura(
            tarefa.Id,
            tarefa.EventoId,
            contexto?.Nome ?? "",
            tarefa.Titulo,
            tarefa.Descricao,
            tarefa.Grupo,
            tarefa.Prazo,
            tarefa.Situacao,
            tarefa.ResponsavelContaId,
            tarefa.Prioridade,
            tarefa.Visibilidade,
            tarefa.ServicoEventoId,
            servico,
            responsaveis,
            tarefa.Checklist
                .OrderBy(item => item.Ordem)
                .Select(item => new ItemChecklistLeitura(item.Id, item.Texto, item.Feito, item.Cancelado))
                .ToArray(),
            tarefa.Comentarios
                .OrderBy(item => item.CriadoEm)
                .Select(item => new ComentarioLeitura(item.Id, item.AutorContaId, item.Texto, item.CriadoEm))
                .ToArray(),
            GruposDePrazo.Classificar(tarefa.Situacao, tarefa.Prazo, criadoEm, hoje),
            contexto?.Situacao == SituacaoEvento.EmAndamento,
            contexto?.Tags ?? []);
    }

    private static void AplicarResponsaveis(Tarefa tarefa, string contaId, IReadOnlyList<ResponsavelPedido>? pedidos)
    {
        tarefa.Responsaveis.AddRange(MontarResponsaveis(tarefa, contaId, pedidos));
    }

    private static List<ResponsavelTarefa> MontarResponsaveis(Tarefa tarefa, string contaId, IReadOnlyList<ResponsavelPedido>? pedidos)
    {
        var lista = pedidos is { Count: > 0 }
            ? pedidos
            : [new ResponsavelPedido(PapelResponsavel.Organizer)];
        return lista.Select(pedido => new ResponsavelTarefa
        {
            Id = Guid.NewGuid(),
            TarefaId = tarefa.Id,
            Papel = pedido.Papel,
            ReferenciaId = pedido.Papel == PapelResponsavel.Organizer ? contaId : null,
        }).ToList();
    }

    private static void AplicarChecklist(Tarefa tarefa, IReadOnlyList<ItemChecklistPedido>? pedidos)
    {
        if (pedidos is null)
        {
            return;
        }

        tarefa.Checklist.AddRange(MontarChecklist(tarefa, pedidos));
    }

    private static List<ItemChecklistTarefa> MontarChecklist(Tarefa tarefa, IReadOnlyList<ItemChecklistPedido> pedidos)
    {
        var ordem = 0;
        return pedidos.Select(pedido => new ItemChecklistTarefa
        {
            Id = Guid.NewGuid(),
            TarefaId = tarefa.Id,
            Texto = Domain.Comum.Texto.Limpo(pedido.Texto) ?? "",
            Feito = pedido.Feito && !pedido.Cancelado,
            Cancelado = pedido.Cancelado,
            Ordem = ordem++,
        }).ToList();
    }

    private static Falha? FalhaDeEnum<TEnum>(TEnum? valor, string mensagem)
        where TEnum : struct, Enum =>
        valor is TEnum definido && !Enum.IsDefined(definido) ? new Falha(Codigos.Validacao, mensagem) : null;

    private static Falha? ValidarResponsaveis(IReadOnlyList<ResponsavelPedido> pedidos)
    {
        if (pedidos.Count == 0)
        {
            return new Falha(Codigos.Validacao, "Informe ao menos um responsável.");
        }

        var vistos = new HashSet<PapelResponsavel>();
        foreach (var pedido in pedidos)
        {
            if (!Enum.IsDefined(pedido.Papel))
            {
                return new Falha(Codigos.Validacao, "Escolha o responsável.");
            }

            if (pedido.Papel is PapelResponsavel.Assistente or PapelResponsavel.Equipe)
            {
                return new Falha(Codigos.Validacao, "Assistente e membro da equipe ainda não podem ser responsáveis.");
            }

            if (!vistos.Add(pedido.Papel))
            {
                return new Falha(Codigos.Validacao, "Responsável repetido.");
            }
        }

        return null;
    }

    private static Falha? ValidarChecklist(IReadOnlyList<ItemChecklistPedido> pedidos)
    {
        if (pedidos.Any(item => Domain.Comum.Texto.Limpo(item.Texto) is null))
        {
            return new Falha(Codigos.Validacao, "Informe o texto do item da checklist.");
        }

        return null;
    }
}
