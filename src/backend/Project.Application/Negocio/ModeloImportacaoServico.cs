using Project.Application.Comum;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;
using Project.Domain.Tarefas;
using static Project.Domain.Comum.Texto;

namespace Project.Application.Negocio;

public sealed record PreviaAplicarModelo(
    int TarefasNovas,
    int ServicosNovos,
    int TarefasExistentes,
    int ServicosExistentes,
    bool EventoSemData,
    string Resumo);

public sealed record PreviaSalvarComoModelo(
    string NomeSugerido,
    int Tarefas,
    int Servicos,
    int TarefasSemPrazo,
    bool EventoSemData,
    string Resumo);

/// <summary>
/// Linha de "Adicionar tarefas em massa" no evento (SPEC-012 v3 §6.4). Serviço pelo cadastro (<c>ServicoContaId</c>)
/// ou pelo nome (cadastrado se não existir). Prazo como na tarefa: relativo, data exata ou nenhum.
/// </summary>
public sealed record TarefaEmMassaEvento(
    string? Titulo,
    Guid? ServicoContaId,
    string? ServicoNome,
    int? PrazoRelativo,
    DateOnly? Prazo,
    IReadOnlyList<ResponsavelPedido>? Responsaveis,
    PrioridadeTarefa? Prioridade,
    string? Descricao);

public sealed record TarefasEmMassaEvento(IReadOnlyList<TarefaEmMassaEvento>? Linhas);

public sealed record ResultadoEmMassa(int Adicionadas, int Repetidas, int ServicosNovos);

/// <summary>Leitura em massa, aplicar modelo, salvar evento como modelo e adicionar em massa no evento (SPEC-012 v3).</summary>
public sealed class ModeloImportacaoServico(IDados dados, IPlanilhaTarefasModelo planilha)
{
    /// <summary>Lê a lista colada ou a planilha para a grade. Não grava nada.</summary>
    public Resultado<ResultadoLeituraTarefas> Ler(string? texto, Stream? arquivo, string? nomeArquivo, bool paraModelo)
    {
        if (arquivo is not null)
        {
            return planilha.Ler(arquivo, nomeArquivo, aceitaData: !paraModelo);
        }

        return Resultado<ResultadoLeituraTarefas>.Sucesso(ImportacaoTarefasModelo.LerTexto(texto, aceitaData: !paraModelo));
    }

    public byte[] PlanilhaPadrao() => planilha.Modelo();

    public async Task<Resultado<PreviaAplicarModelo>> PreviaAplicarAsync(
        string contaId, Guid eventoId, Guid modeloId, CancellationToken ct)
    {
        var montado = await MontarAplicacaoAsync(contaId, eventoId, modeloId, gravarCadastro: false, ct);
        return montado.Ok
            ? Resultado<PreviaAplicarModelo>.Sucesso(montado.Valor!.Previa)
            : Resultado<PreviaAplicarModelo>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
    }

    public async Task<Resultado<PreviaAplicarModelo>> AplicarAsync(
        string contaId, Guid eventoId, Guid modeloId, CancellationToken ct)
    {
        var montado = await MontarAplicacaoAsync(contaId, eventoId, modeloId, gravarCadastro: true, ct);
        if (!montado.Ok)
        {
            return Resultado<PreviaAplicarModelo>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        var (tarefasNovas, servicosNovos, previa) = montado.Valor!;
        await dados.AcrescentarTarefasEServicosAsync(tarefasNovas, servicosNovos, ct);
        return Resultado<PreviaAplicarModelo>.Sucesso(previa);
    }

    public async Task<Resultado<PreviaSalvarComoModelo>> PreviaSalvarComoModeloAsync(
        string contaId, Guid eventoId, string? nome, CancellationToken ct)
    {
        var montado = await MontarSalvarComoModeloAsync(contaId, eventoId, nome, gravarCadastro: false, ct);
        return montado.Ok
            ? Resultado<PreviaSalvarComoModelo>.Sucesso(montado.Valor!.Previa)
            : Resultado<PreviaSalvarComoModelo>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
    }

    public async Task<Resultado<ModeloLeitura>> SalvarComoModeloAsync(
        string contaId, Guid eventoId, string? nome, CancellationToken ct)
    {
        var montado = await MontarSalvarComoModeloAsync(contaId, eventoId, nome, gravarCadastro: true, ct);
        if (!montado.Ok)
        {
            return Resultado<ModeloLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        await dados.InserirModeloAsync(montado.Valor!.Modelo, ct);
        return await new ModeloServico(dados).ObterAsync(contaId, montado.Valor.Modelo.Id, ct);
    }

    /// <summary>Adicionar tarefas em massa no evento (SPEC-012 v3 §6.4 e SPEC-003 v5): tudo grava junto.</summary>
    public async Task<Resultado<ResultadoEmMassa>> AdicionarEmMassaNoEventoAsync(
        string contaId, Guid eventoId, TarefasEmMassaEvento pedido, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<ResultadoEmMassa>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return Resultado<ResultadoEmMassa>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        var linhas = pedido.Linhas ?? [];
        if (linhas.Count == 0)
        {
            return Resultado<ResultadoEmMassa>.Erro(Codigos.Validacao, "Nenhuma tarefa para adicionar.");
        }

        if (linhas.Count > ImportacaoTarefasModelo.MaximoLinhas)
        {
            return Resultado<ResultadoEmMassa>.Erro(Codigos.Validacao, "Adicione no máximo 500 tarefas por vez.");
        }

        var ativas = (await dados.IdsAssistentesAtivasAsync(contaId, ct)).Select(id => id.ToString()).ToHashSet();
        foreach (var linha in linhas)
        {
            if (Limpo(linha.Titulo) is null)
            {
                return Resultado<ResultadoEmMassa>.Erro(Codigos.Validacao, "Informe o título de todas as tarefas.");
            }

            if (!PrazosRelativos.Valido(linha.PrazoRelativo))
            {
                return Resultado<ResultadoEmMassa>.Erro(Codigos.Validacao, "Use um prazo de até 999 meses antes ou depois do evento.");
            }

            if (linha.Prioridade is PrioridadeTarefa prioridade && !Enum.IsDefined(prioridade))
            {
                return Resultado<ResultadoEmMassa>.Erro(Codigos.Validacao, "Escolha a prioridade.");
            }

            foreach (var responsavel in linha.Responsaveis ?? [])
            {
                if (!Enum.IsDefined(responsavel.Papel) || !ModeloServico.PapelEscolhivel(responsavel.Papel)
                    || (responsavel.Papel == PapelResponsavel.Assistente && responsavel.ReferenciaId is not null && !ativas.Contains(responsavel.ReferenciaId)))
                {
                    return Resultado<ResultadoEmMassa>.Erro(Codigos.Validacao, "Escolha responsáveis válidos: Organizador, Assistente (ou uma assistente ativa) ou Cliente.");
                }
            }
        }

        var servicosDoEvento = new ServicosDoEvento(evento);
        var catalogo = new ModeloServico(dados);
        var existentes = (await dados.ListarTarefasAsync(contaId, eventoId, ct))
            .Select(tarefa => ChaveTarefa(tarefa.ServicoEventoId, tarefa.Titulo))
            .ToHashSet();
        var novas = new List<Tarefa>();
        var repetidas = 0;
        foreach (var linha in linhas)
        {
            Guid? servicoEventoId = null;
            var nomeServico = Limpo(linha.ServicoNome);
            var noCadastro = linha.ServicoContaId is Guid servicoContaId
                ? await dados.ObterServicoContaAsync(contaId, servicoContaId, ct)
                : null;
            if (noCadastro is null && nomeServico is not null)
            {
                noCadastro = await catalogo.GarantirNoCadastroAsync(contaId, null, nomeServico, ct);
            }

            if (noCadastro is not null)
            {
                servicoEventoId = servicosDoEvento.Garantir(noCadastro, null).Id;
            }

            var titulo = ModeloServico.Cortar(Limpo(linha.Titulo)!);
            if (!existentes.Add(ChaveTarefa(servicoEventoId, titulo)))
            {
                repetidas++;
                continue;
            }

            var tarefaId = Guid.NewGuid();
            var tarefa = new Tarefa
            {
                Id = tarefaId,
                EventoId = evento.Id,
                ContaId = contaId,
                Titulo = titulo,
                Descricao = Limpo(linha.Descricao),
                PrazoRelativo = linha.PrazoRelativo,
                Prazo = linha.PrazoRelativo is null ? linha.Prazo : null,
                Situacao = SituacaoTarefa.Pendente,
                ResponsavelContaId = contaId,
                Prioridade = linha.Prioridade ?? PrioridadeTarefa.Media,
                Visibilidade = VisibilidadeTarefa.SoEu,
                ServicoEventoId = servicoEventoId,
            };
            var responsaveis = linha.Responsaveis is { Count: > 0 } lista ? lista : [new ResponsavelPedido(PapelResponsavel.Organizer)];
            foreach (var responsavel in responsaveis.DistinctBy(item => (item.Papel, item.ReferenciaId)))
            {
                tarefa.Responsaveis.Add(Responsavel(tarefaId, contaId, responsavel.Papel, responsavel.ReferenciaId));
            }

            PrazosRelativos.Recalcular(tarefa, evento.Data);
            novas.Add(tarefa);
        }

        servicosDoEvento.Ordenar();
        await dados.AcrescentarTarefasEServicosAsync(novas, servicosDoEvento.Novos, ct);
        return Resultado<ResultadoEmMassa>.Sucesso(new ResultadoEmMassa(novas.Count, repetidas, servicosDoEvento.Novos.Count));
    }

    private async Task<Resultado<(List<Tarefa> Tarefas, List<ServicoEvento> Servicos, PreviaAplicarModelo Previa)>> MontarAplicacaoAsync(
        string contaId, Guid eventoId, Guid modeloId, bool gravarCadastro, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null || evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return Resultado<(List<Tarefa>, List<ServicoEvento>, PreviaAplicarModelo)>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var modelo = await dados.ObterModeloAsync(contaId, modeloId, ct);
        if (modelo is null || modelo.Tipo != evento.Tipo)
        {
            return Resultado<(List<Tarefa>, List<ServicoEvento>, PreviaAplicarModelo)>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        // Serviços: mesmo serviço do cadastro, ou mesmo nome (SPEC-012 v3 §8.5).
        var servicosDoEvento = new ServicosDoEvento(evento);
        var catalogo = new ModeloServico(dados);
        var servicoDoModeloNoEvento = new Dictionary<Guid, Guid>();
        var servicosExistentes = 0;
        foreach (var servico in modelo.Servicos)
        {
            ServicoConta noCadastro;
            if (gravarCadastro)
            {
                noCadastro = await catalogo.GarantirNoCadastroAsync(contaId, servico.ServicoContaId, servico.Nome, ct);
            }
            else
            {
                noCadastro = (servico.ServicoContaId is Guid id ? await dados.ObterServicoContaAsync(contaId, id, ct) : null)
                    ?? new ServicoConta { Id = servico.ServicoContaId ?? Guid.NewGuid(), ContaId = contaId, Nome = servico.Nome };
            }

            var antes = servicosDoEvento.Novos.Count;
            var doEvento = servicosDoEvento.Garantir(noCadastro, servico.ValorEstimado);
            if (servicosDoEvento.Novos.Count == antes)
            {
                servicosExistentes++;
            }

            servicoDoModeloNoEvento[servico.Id] = doEvento.Id;
        }

        // Tarefas: mesmo serviço e mesmo título já existem (SPEC-012 v3 §8.5).
        var existentes = (await dados.ListarTarefasAsync(contaId, eventoId, ct))
            .Select(tarefa => ChaveTarefa(tarefa.ServicoEventoId, tarefa.Titulo))
            .ToHashSet();
        var tarefasNovas = new List<Tarefa>();
        var tarefasExistentes = 0;
        foreach (var tarefa in modelo.Tarefas)
        {
            Guid? servicoEventoId = tarefa.ServicoModeloId is Guid servicoModeloId && servicoDoModeloNoEvento.TryGetValue(servicoModeloId, out var id)
                ? id
                : null;
            if (!existentes.Add(ChaveTarefa(servicoEventoId, tarefa.Titulo)))
            {
                tarefasExistentes++;
                continue;
            }

            tarefasNovas.Add(TarefaDoModelo(tarefa, evento, contaId, servicoEventoId));
        }

        servicosDoEvento.Ordenar();
        var semData = evento.Data is null;
        var previa = new PreviaAplicarModelo(
            tarefasNovas.Count,
            servicosDoEvento.Novos.Count,
            tarefasExistentes,
            servicosExistentes,
            semData,
            $"{servicosDoEvento.Novos.Count} serviços e {tarefasNovas.Count} tarefas novos. {tarefasExistentes + servicosExistentes} já existem no evento e serão ignorados."
            + (semData ? " O evento não tem data: os prazos aparecem quando a data for definida." : ""));

        return Resultado<(List<Tarefa>, List<ServicoEvento>, PreviaAplicarModelo)>.Sucesso((tarefasNovas, servicosDoEvento.Novos, previa));
    }

    /// <summary>Tarefa do evento a partir da tarefa do modelo (SPEC-012 v3 §8.8): pendente, papéis, prazo relativo.</summary>
    private static Tarefa TarefaDoModelo(TarefaModelo origem, Evento evento, string contaId, Guid? servicoEventoId)
    {
        var tarefaId = Guid.NewGuid();
        var tarefa = new Tarefa
        {
            Id = tarefaId,
            EventoId = evento.Id,
            ContaId = contaId,
            Titulo = origem.Titulo,
            Descricao = origem.Descricao,
            PrazoRelativo = origem.PrazoRelativo,
            Situacao = SituacaoTarefa.Pendente,
            ResponsavelContaId = contaId,
            Prioridade = origem.Prioridade,
            Visibilidade = origem.Visibilidade,
            ServicoEventoId = servicoEventoId,
        };
        foreach (var papel in ModeloServico.PapeisOuOrganizador(origem.Papeis()))
        {
            tarefa.Responsaveis.Add(Responsavel(tarefaId, contaId, papel, null));
        }

        foreach (var item in origem.Checklist.OrderBy(item => item.Ordem))
        {
            tarefa.Checklist.Add(new ItemChecklistTarefa
            {
                Id = Guid.NewGuid(),
                TarefaId = tarefaId,
                Texto = item.Texto,
                Ordem = item.Ordem,
                PrazoRelativo = item.PrazoRelativo,
                ResponsavelPapel = item.ResponsavelPapel,
                ResponsavelReferenciaId = item.ResponsavelPapel == PapelResponsavel.Organizer ? contaId : null,
            });
        }

        PrazosRelativos.Recalcular(tarefa, evento.Data);
        return tarefa;
    }

    private async Task<Resultado<(ModeloEvento Modelo, PreviaSalvarComoModelo Previa)>> MontarSalvarComoModeloAsync(
        string contaId, Guid eventoId, string? nome, bool gravarCadastro, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null || evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return Resultado<(ModeloEvento, PreviaSalvarComoModelo)>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var nomeLimpo = Limpo(nome) ?? $"Modelo — {evento.Nome}";
        var modelo = new ModeloEvento
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            Nome = nomeLimpo,
            Tipo = evento.Tipo,
        };

        var catalogo = new ModeloServico(dados);
        var servicoDoEventoNoModelo = new Dictionary<Guid, Guid>();
        foreach (var servico in evento.Servicos.OrderBy(item => item.Ordem))
        {
            var servicoContaId = servico.ServicoContaId;
            if (gravarCadastro)
            {
                servicoContaId = (await catalogo.GarantirNoCadastroAsync(contaId, servico.ServicoContaId, servico.Nome, ct)).Id;
            }

            var novoId = Guid.NewGuid();
            servicoDoEventoNoModelo[servico.Id] = novoId;
            modelo.Servicos.Add(new ServicoModelo
            {
                Id = novoId,
                ModeloId = modelo.Id,
                ServicoContaId = servicoContaId,
                Nome = servico.Nome,
                ValorEstimado = servico.ValorEstimado,
            });
        }

        var semPrazo = 0;
        foreach (var tarefa in await dados.ListarTarefasAsync(contaId, eventoId, ct))
        {
            var relativo = tarefa.PrazoRelativo ?? PrazosRelativos.DeDataExata(evento.Data, tarefa.Prazo);
            if (relativo is null)
            {
                semPrazo++;
            }

            var tarefaId = Guid.NewGuid();
            var papeis = tarefa.Responsaveis.Select(item => item.Papel).Where(ModeloServico.PapelEscolhivel).ToArray();
            modelo.Tarefas.Add(new TarefaModelo
            {
                Id = tarefaId,
                ModeloId = modelo.Id,
                ServicoModeloId = tarefa.ServicoEventoId is Guid servicoId && servicoDoEventoNoModelo.TryGetValue(servicoId, out var noModelo) ? noModelo : null,
                Titulo = tarefa.Titulo,
                Descricao = tarefa.Descricao,
                PrazoRelativo = relativo,
                Prioridade = tarefa.Prioridade,
                Visibilidade = tarefa.Visibilidade,
                Responsaveis = PapeisResponsaveis.Escrever(ModeloServico.PapeisOuOrganizador(papeis)),
                Checklist = tarefa.Checklist
                    .OrderBy(item => item.Ordem)
                    .Select(item => new ItemChecklistTarefaModelo
                    {
                        Id = Guid.NewGuid(),
                        TarefaModeloId = tarefaId,
                        Texto = item.Texto,
                        Ordem = item.Ordem,
                        PrazoRelativo = item.PrazoRelativo ?? PrazosRelativos.DeDataExata(evento.Data, item.Prazo),
                        ResponsavelPapel = item.ResponsavelPapel is PapelResponsavel papel && ModeloServico.PapelEscolhivel(papel) ? papel : null,
                    })
                    .ToList(),
            });
        }

        var semData = evento.Data is null;
        var previa = new PreviaSalvarComoModelo(
            nomeLimpo,
            modelo.Tarefas.Count,
            modelo.Servicos.Count,
            semPrazo,
            semData,
            $"{modelo.Servicos.Count} serviços e {modelo.Tarefas.Count} tarefas."
            + (semPrazo > 0 ? $" {semPrazo} tarefas ficarão sem prazo." : "")
            + (semData ? " O evento não tem data: as tarefas com data exata vão sem prazo." : ""));

        return Resultado<(ModeloEvento, PreviaSalvarComoModelo)>.Sucesso((modelo, previa));
    }

    private static ResponsavelTarefa Responsavel(Guid tarefaId, string contaId, PapelResponsavel papel, string? referenciaId) => new()
    {
        Id = Guid.NewGuid(),
        TarefaId = tarefaId,
        Papel = papel,
        ReferenciaId = papel switch
        {
            PapelResponsavel.Organizer => contaId,
            PapelResponsavel.Assistente => referenciaId,
            _ => null,
        },
    };

    private static string ChaveTarefa(Guid? servicoEventoId, string titulo) => $"{servicoEventoId}\u001f{ChaveComparacao(titulo)}";

    /// <summary>Serviços do evento por serviço do cadastro e por nome; cria os que faltam (sem gravar).</summary>
    private sealed class ServicosDoEvento(Evento evento)
    {
        private readonly List<ServicoEvento> todos = [.. evento.Servicos];

        public List<ServicoEvento> Novos { get; } = [];

        public ServicoEvento Garantir(ServicoConta noCadastro, decimal? valorEstimado)
        {
            var chave = ChaveComparacao(noCadastro.Nome);
            var existente = todos.FirstOrDefault(servico => servico.ServicoContaId == noCadastro.Id)
                ?? todos.FirstOrDefault(servico => ChaveComparacao(servico.Nome) == chave);
            if (existente is not null)
            {
                return existente;
            }

            var novo = new ServicoEvento
            {
                Id = Guid.NewGuid(),
                EventoId = evento.Id,
                Nome = noCadastro.Nome,
                ServicoContaId = noCadastro.Id,
                ValorEstimado = valorEstimado,
            };
            todos.Add(novo);
            Novos.Add(novo);
            return novo;
        }

        public void Ordenar()
        {
            var ordem = evento.Servicos.Count == 0 ? 0 : evento.Servicos.Max(servico => servico.Ordem) + 1;
            foreach (var servico in Novos)
            {
                servico.Ordem = ordem++;
            }
        }
    }
}
