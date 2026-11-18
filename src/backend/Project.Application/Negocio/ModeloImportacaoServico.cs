using Project.Application.Comum;
using Project.Domain.Eventos;
using Project.Domain.Tarefas;

namespace Project.Application.Negocio;

public sealed record PreviaTarefaImportada(string Titulo, string? Grupo, int? DiasAntes, string? PrazoLegivel, string? Aviso);

public sealed record PreviaImportacaoTarefas(
    IReadOnlyList<PreviaTarefaImportada> Tarefas,
    IReadOnlyList<string> LinhasIgnoradas,
    int Total);

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

public sealed class ModeloImportacaoServico(IDados dados, IPlanilhaTarefasModelo planilha)
{
    public PreviaImportacaoTarefas PreviaTexto(string? texto)
    {
        var lido = ImportacaoTarefasModelo.LerTexto(texto);
        return ParaPrevia(lido);
    }

    public Resultado<PreviaImportacaoTarefas> PreviaArquivo(Stream arquivo, string? nomeArquivo)
    {
        var lido = planilha.Ler(arquivo, nomeArquivo);
        return lido.Ok
            ? Resultado<PreviaImportacaoTarefas>.Sucesso(ParaPrevia(lido.Valor!))
            : Resultado<PreviaImportacaoTarefas>.Erro(lido.Falha!.Codigo, lido.Falha.Mensagem);
    }

    public byte[] PlanilhaPadrao() => planilha.Modelo();

    public async Task<Resultado<ModeloLeitura>> ImportarNovoAsync(
        string contaId,
        string? nome,
        TipoEvento? tipo,
        string? texto,
        Stream? arquivo,
        string? nomeArquivo,
        CancellationToken ct)
    {
        var leitura = await LerAsync(texto, arquivo, nomeArquivo);
        if (!leitura.Ok)
        {
            return Resultado<ModeloLeitura>.Erro(leitura.Falha!.Codigo, leitura.Falha.Mensagem);
        }

        if (leitura.Valor!.Tarefas.Count == 0)
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Validacao, "Nenhuma tarefa encontrada.");
        }

        var nomeLimpo = Domain.Comum.Texto.Limpo(nome);
        if (nomeLimpo is null)
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Validacao, "Informe o nome do modelo.");
        }

        if (tipo is not TipoEvento tipoEvento || !Enum.IsDefined(tipoEvento))
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Validacao, "Informe o tipo do modelo.");
        }

        var modelo = new ModeloEvento
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            Nome = nomeLimpo,
            Tipo = tipoEvento,
        };
        foreach (var item in leitura.Valor.Tarefas)
        {
            modelo.Tarefas.Add(new TarefaModelo
            {
                Id = Guid.NewGuid(),
                ModeloId = modelo.Id,
                Titulo = item.Titulo,
                Grupo = item.Grupo,
                DiasAntes = item.DiasAntes,
            });
        }

        await dados.InserirModeloAsync(modelo, ct);
        return await new ModeloServico(dados).ObterAsync(contaId, modelo.Id, ct);
    }

    public async Task<Resultado<ModeloLeitura>> ImportarNoModeloAsync(
        string contaId,
        Guid modeloId,
        string? texto,
        Stream? arquivo,
        string? nomeArquivo,
        CancellationToken ct)
    {
        var leitura = await LerAsync(texto, arquivo, nomeArquivo);
        if (!leitura.Ok)
        {
            return Resultado<ModeloLeitura>.Erro(leitura.Falha!.Codigo, leitura.Falha.Mensagem);
        }

        if (leitura.Valor!.Tarefas.Count == 0)
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Validacao, "Nenhuma tarefa encontrada.");
        }

        return await AcrescentarTarefasAsync(contaId, modeloId, leitura.Valor, ct);
    }

    public async Task<Resultado<PreviaAplicarModelo>> PreviaAplicarAsync(
        string contaId, Guid eventoId, Guid modeloId, CancellationToken ct)
    {
        var montado = await MontarAplicacaoAsync(contaId, eventoId, modeloId, ct);
        if (!montado.Ok)
        {
            return Resultado<PreviaAplicarModelo>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        return Resultado<PreviaAplicarModelo>.Sucesso(montado.Valor!.Previa);
    }

    public async Task<Resultado<PreviaAplicarModelo>> AplicarAsync(
        string contaId, Guid eventoId, Guid modeloId, CancellationToken ct)
    {
        var montado = await MontarAplicacaoAsync(contaId, eventoId, modeloId, ct);
        if (!montado.Ok)
        {
            return Resultado<PreviaAplicarModelo>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        var (evento, _, tarefasNovas, servicosNovos, previa) = montado.Valor!;
        var ordem = evento.Servicos.Count == 0 ? 0 : evento.Servicos.Max(s => s.Ordem) + 1;
        foreach (var servico in servicosNovos)
        {
            servico.Ordem = ordem++;
        }

        await dados.AcrescentarTarefasEServicosAsync(tarefasNovas, servicosNovos, ct);
        return Resultado<PreviaAplicarModelo>.Sucesso(previa);
    }

    public async Task<Resultado<PreviaSalvarComoModelo>> PreviaSalvarComoModeloAsync(
        string contaId, Guid eventoId, string? nome, CancellationToken ct)
    {
        var montado = await MontarSalvarComoModeloAsync(contaId, eventoId, nome, ct);
        return montado.Ok
            ? Resultado<PreviaSalvarComoModelo>.Sucesso(montado.Valor!.Previa)
            : Resultado<PreviaSalvarComoModelo>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
    }

    public async Task<Resultado<ModeloLeitura>> SalvarComoModeloAsync(
        string contaId, Guid eventoId, string? nome, CancellationToken ct)
    {
        var montado = await MontarSalvarComoModeloAsync(contaId, eventoId, nome, ct);
        if (!montado.Ok)
        {
            return Resultado<ModeloLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        await dados.InserirModeloAsync(montado.Valor!.Modelo, ct);
        return await new ModeloServico(dados).ObterAsync(contaId, montado.Valor.Modelo.Id, ct);
    }

    private async Task<Resultado<ResultadoLeituraTarefas>> LerAsync(string? texto, Stream? arquivo, string? nomeArquivo)
    {
        if (arquivo is not null)
        {
            var lido = planilha.Ler(arquivo, nomeArquivo);
            return lido.Ok
                ? Resultado<ResultadoLeituraTarefas>.Sucesso(lido.Valor!)
                : Resultado<ResultadoLeituraTarefas>.Erro(lido.Falha!.Codigo, lido.Falha.Mensagem);
        }

        return Resultado<ResultadoLeituraTarefas>.Sucesso(ImportacaoTarefasModelo.LerTexto(texto));
    }

    private async Task<Resultado<ModeloLeitura>> AcrescentarTarefasAsync(
        string contaId, Guid modeloId, ResultadoLeituraTarefas leitura, CancellationToken ct)
    {
        var modelo = await dados.ObterModeloAsync(contaId, modeloId, ct);
        if (modelo is null)
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var novas = leitura.Tarefas.Select(item => new TarefaModelo
        {
            Id = Guid.NewGuid(),
            ModeloId = modelo.Id,
            Titulo = item.Titulo,
            Grupo = item.Grupo,
            DiasAntes = item.DiasAntes,
        }).ToArray();

        await dados.AcrescentarTarefasModeloAsync(novas, ct);
        return await new ModeloServico(dados).ObterAsync(contaId, modeloId, ct);
    }

    private async Task<Resultado<(Evento Evento, ModeloEvento Modelo, List<Tarefa> Tarefas, List<ServicoEvento> Servicos, PreviaAplicarModelo Previa)>> MontarAplicacaoAsync(
        string contaId, Guid eventoId, Guid modeloId, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null || evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return Resultado<(Evento, ModeloEvento, List<Tarefa>, List<ServicoEvento>, PreviaAplicarModelo)>.Erro(
                Codigos.Indisponivel, "Indisponível.");
        }

        var modelo = await dados.ObterModeloAsync(contaId, modeloId, ct);
        if (modelo is null || modelo.Tipo != evento.Tipo)
        {
            return Resultado<(Evento, ModeloEvento, List<Tarefa>, List<ServicoEvento>, PreviaAplicarModelo)>.Erro(
                Codigos.Indisponivel, "Indisponível.");
        }

        var existentes = await dados.ListarTarefasAsync(contaId, eventoId, ct);
        var titulos = existentes.Select(t => Domain.Comum.Texto.ChaveComparacao(t.Titulo)).ToHashSet();
        var nomesServico = evento.Servicos.Select(s => Domain.Comum.Texto.ChaveComparacao(s.Nome)).ToHashSet();

        var tarefasNovas = new List<Tarefa>();
        var tarefasExistentes = 0;
        foreach (var tarefa in modelo.Tarefas)
        {
            if (titulos.Contains(Domain.Comum.Texto.ChaveComparacao(tarefa.Titulo)))
            {
                tarefasExistentes++;
                continue;
            }

            DateOnly? prazo = null;
            if (tarefa.DiasAntes is int dias && evento.Data is DateOnly data)
            {
                prazo = data.AddDays(-dias);
            }

            tarefasNovas.Add(new Tarefa
            {
                Id = Guid.NewGuid(),
                EventoId = evento.Id,
                ContaId = contaId,
                Titulo = tarefa.Titulo,
                Grupo = tarefa.Grupo,
                Prazo = prazo,
                Situacao = SituacaoTarefa.Pendente,
                ResponsavelContaId = contaId,
            });
            titulos.Add(Domain.Comum.Texto.ChaveComparacao(tarefa.Titulo));
        }

        var servicosNovos = new List<ServicoEvento>();
        var servicosExistentes = 0;
        foreach (var servico in modelo.Servicos)
        {
            if (nomesServico.Contains(Domain.Comum.Texto.ChaveComparacao(servico.Nome)))
            {
                servicosExistentes++;
                continue;
            }

            servicosNovos.Add(new ServicoEvento
            {
                Id = Guid.NewGuid(),
                EventoId = evento.Id,
                Nome = servico.Nome,
                ValorEstimado = servico.ValorEstimado,
            });
            nomesServico.Add(Domain.Comum.Texto.ChaveComparacao(servico.Nome));
        }

        var semData = evento.Data is null;
        var previa = new PreviaAplicarModelo(
            tarefasNovas.Count,
            servicosNovos.Count,
            tarefasExistentes,
            servicosExistentes,
            semData,
            $"{tarefasNovas.Count} tarefas e {servicosNovos.Count} serviços novos. {tarefasExistentes + servicosExistentes} já existem no evento e serão ignorados."
            + (semData ? " O evento não tem data: as tarefas entram sem prazo." : ""));

        return Resultado<(Evento, ModeloEvento, List<Tarefa>, List<ServicoEvento>, PreviaAplicarModelo)>.Sucesso(
            (evento, modelo, tarefasNovas, servicosNovos, previa));
    }

    private async Task<Resultado<(ModeloEvento Modelo, PreviaSalvarComoModelo Previa)>> MontarSalvarComoModeloAsync(
        string contaId, Guid eventoId, string? nome, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null || evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return Resultado<(ModeloEvento, PreviaSalvarComoModelo)>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var nomeLimpo = Domain.Comum.Texto.Limpo(nome) ?? $"Modelo — {evento.Nome}";
        var tarefas = await dados.ListarTarefasAsync(contaId, eventoId, ct);
        var modelo = new ModeloEvento
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            Nome = nomeLimpo,
            Tipo = evento.Tipo,
        };

        var semPrazo = 0;
        foreach (var tarefa in tarefas)
        {
            int? dias = null;
            if (evento.Data is DateOnly data && tarefa.Prazo is DateOnly prazo)
            {
                var diff = data.DayNumber - prazo.DayNumber;
                dias = diff < 0 ? 0 : diff;
            }
            else
            {
                semPrazo++;
            }

            modelo.Tarefas.Add(new TarefaModelo
            {
                Id = Guid.NewGuid(),
                ModeloId = modelo.Id,
                Titulo = tarefa.Titulo,
                Grupo = tarefa.Grupo,
                DiasAntes = dias,
            });
        }

        foreach (var servico in evento.Servicos)
        {
            modelo.Servicos.Add(new ServicoModelo
            {
                Id = Guid.NewGuid(),
                ModeloId = modelo.Id,
                Nome = servico.Nome,
                ValorEstimado = servico.ValorEstimado,
            });
        }

        var semData = evento.Data is null;
        var previa = new PreviaSalvarComoModelo(
            nomeLimpo,
            modelo.Tarefas.Count,
            modelo.Servicos.Count,
            semPrazo,
            semData,
            $"{modelo.Tarefas.Count} tarefas e {modelo.Servicos.Count} serviços."
            + (semPrazo > 0 ? $" {semPrazo} tarefas ficarão sem prazo." : "")
            + (semData ? " O evento não tem data: todas as tarefas vão sem prazo." : ""));

        return Resultado<(ModeloEvento, PreviaSalvarComoModelo)>.Sucesso((modelo, previa));
    }

    private static PreviaImportacaoTarefas ParaPrevia(ResultadoLeituraTarefas lido) => new(
        lido.Tarefas.Select(t => new PreviaTarefaImportada(
            t.Titulo,
            t.Grupo,
            t.DiasAntes,
            PrazoModelo.Exibir(t.DiasAntes),
            t.Aviso)).ToArray(),
        lido.LinhasIgnoradas,
        lido.Tarefas.Count);
}
