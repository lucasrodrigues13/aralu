using Project.Application.Comum;
using Project.Application.Negocio;
using Project.Domain.Convidados;

namespace Project.Application.Convidados;

public sealed record ImportacaoLeitura(
    Guid Id,
    string NomeArquivo,
    SituacaoImportacao Situacao,
    DateTimeOffset CriadaEm,
    DateTimeOffset? ConcluidaEm,
    int Convites,
    IReadOnlyList<string> Erros);

public interface IDadosImportacao
{
    /// <summary>Nulo se o evento não é da conta; senão, se está em andamento.</summary>
    Task<bool?> EventoEmAndamentoAsync(Guid contaId, Guid eventoId, CancellationToken ct);

    Task InserirAsync(ImportacaoConvidados importacao, CancellationToken ct);

    Task<IReadOnlyList<ImportacaoConvidados>> ListarAsync(Guid contaId, Guid eventoId, int quantidade, CancellationToken ct);

    /// <summary>Há alguma importação Pendente na fila.</summary>
    Task<bool> TemPendenteAsync(CancellationToken ct);

    /// <summary>A Pendente mais antiga, já marcada como Processando (ou nula se não há).</summary>
    Task<ImportacaoConvidados?> PegarProximaAsync(DateTimeOffset agora, CancellationToken ct);

    /// <summary>Volta para Pendente as que ficaram em Processando (a API reiniciou no meio).</summary>
    Task<int> RetomarInterrompidasAsync(CancellationToken ct);

    Task SalvarAsync(CancellationToken ct);
}

/// <summary>Avisa o processamento em segundo plano que há importação nova na fila.</summary>
public interface ISinalImportacao
{
    void Avisar();
}

/// <summary>
/// Fila de importações de convidados (SPEC-059 §6.6), sem worker separado: o envio responde na hora com a importação
/// Pendente; o processamento roda em segundo plano na própria API e, se ela reiniciar no meio, a importação é retomada,
/// porque o arquivo fica guardado até terminar.
/// </summary>
public sealed class ImportacaoServico(IDadosImportacao dados, ConviteServico convites, ISinalImportacao sinal)
{
    public const int TamanhoMaximo = 10 * 1024 * 1024;
    private const int Historico = 20;
    private const int MaximoDeErros = 500;

    public async Task<Resultado<ImportacaoLeitura>> EnfileirarAsync(
        Guid contaId,
        Guid eventoId,
        Stream arquivo,
        string? nomeArquivo,
        string? observacaoFixa,
        DateTimeOffset agora,
        CancellationToken ct)
    {
        var emAndamento = await dados.EventoEmAndamentoAsync(contaId, eventoId, ct);
        if (emAndamento is null)
        {
            return Resultado<ImportacaoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (emAndamento == false)
        {
            return Resultado<ImportacaoLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        var extensao = Path.GetExtension(nomeArquivo ?? "").ToLowerInvariant();
        if (extensao is not ".xlsx" and not ".xls")
        {
            return Resultado<ImportacaoLeitura>.Erro(Codigos.Validacao, "Envie uma planilha .xlsx ou .xls.");
        }

        using var memoria = new MemoryStream();
        await arquivo.CopyToAsync(memoria, ct);
        if (memoria.Length == 0 || memoria.Length > TamanhoMaximo)
        {
            return Resultado<ImportacaoLeitura>.Erro(Codigos.Validacao, "Envie uma planilha de até 10 MB.");
        }

        var importacao = new ImportacaoConvidados
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            EventoId = eventoId,
            NomeArquivo = Path.GetFileName(nomeArquivo!),
            Arquivo = memoria.ToArray(),
            ObservacaoFixa = observacaoFixa,
            CriadaEm = agora,
        };
        await dados.InserirAsync(importacao, ct);
        sinal.Avisar();
        return Resultado<ImportacaoLeitura>.Sucesso(Ler(importacao));
    }

    public async Task<Resultado<IReadOnlyList<ImportacaoLeitura>>> ListarAsync(Guid contaId, Guid eventoId, CancellationToken ct)
    {
        if (await dados.EventoEmAndamentoAsync(contaId, eventoId, ct) is null)
        {
            return Resultado<IReadOnlyList<ImportacaoLeitura>>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var lista = await dados.ListarAsync(contaId, eventoId, Historico, ct);
        return Resultado<IReadOnlyList<ImportacaoLeitura>>.Sucesso(lista.Select(Ler).ToArray());
    }

    /// <summary>
    /// Processa a próxima Pendente. Devolve falso quando a fila está vazia.
    /// <paramref name="atraso"/>, se maior que zero, segura a importação em Pendente e de novo em Processando
    /// para a tela conseguir mostrar a troca (a consulta é a cada 2 segundos). Zero no uso normal.
    /// </summary>
    public async Task<bool> ProcessarProximaAsync(Func<DateTimeOffset> agora, CancellationToken ct, TimeSpan atraso = default)
    {
        if (atraso > TimeSpan.Zero && !await dados.TemPendenteAsync(ct))
        {
            return false;
        }

        if (atraso > TimeSpan.Zero)
        {
            await Task.Delay(atraso, ct);
        }

        var importacao = await dados.PegarProximaAsync(agora(), ct);
        if (importacao is null)
        {
            return false;
        }

        if (atraso > TimeSpan.Zero)
        {
            await Task.Delay(atraso, ct);
        }

        ResultadoImportacao resultado;
        try
        {
            using var arquivo = new MemoryStream(importacao.Arquivo);
            resultado = await convites.ProcessarPlanilhaAsync(
                importacao.ContaId, importacao.EventoId, arquivo, importacao.NomeArquivo, importacao.ObservacaoFixa, ct);
        }
        catch (Exception erro) when (erro is not OperationCanceledException)
        {
            resultado = ResultadoImportacao.Falha("Não foi possível processar a planilha. Envie de novo.");
        }

        var erros = resultado.Erros.Take(MaximoDeErros).ToList();
        if (resultado.Erros.Count > MaximoDeErros)
        {
            erros.Add($"E mais {resultado.Erros.Count - MaximoDeErros} erros. Corrija os acima e envie de novo.");
        }

        importacao.Situacao = erros.Count == 0 ? SituacaoImportacao.Importado : SituacaoImportacao.Erro;
        importacao.Erros = erros;
        importacao.Convites = resultado.Convites;
        importacao.ConcluidaEm = agora();
        importacao.Arquivo = [];
        await dados.SalvarAsync(ct);
        return true;
    }

    public Task<int> RetomarInterrompidasAsync(CancellationToken ct) => dados.RetomarInterrompidasAsync(ct);

    private static ImportacaoLeitura Ler(ImportacaoConvidados item) =>
        new(item.Id, item.NomeArquivo, item.Situacao, item.CriadaEm, item.ConcluidaEm, item.Convites, item.Erros);
}
