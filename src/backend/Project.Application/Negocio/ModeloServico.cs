using Project.Application.Comum;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;
using Project.Domain.Tarefas;

namespace Project.Application.Negocio;

/// <summary>Serviço do modelo (SPEC-012 v3 §8.4). <c>NoCadastro</c> falso = o serviço saiu do cadastro da conta.</summary>
public sealed record ServicoModeloLeitura(Guid Id, Guid? ServicoContaId, string Nome, decimal? ValorEstimado, bool NoCadastro);

public sealed record ItemChecklistModeloLeitura(Guid Id, string Texto, int? PrazoRelativo, PapelResponsavel? ResponsavelPapel);

public sealed record TarefaModeloLeitura(
    Guid Id,
    Guid? ServicoModeloId,
    string Titulo,
    string? Descricao,
    int? PrazoRelativo,
    PrioridadeTarefa Prioridade,
    VisibilidadeTarefa Visibilidade,
    IReadOnlyList<PapelResponsavel> Responsaveis,
    IReadOnlyList<ItemChecklistModeloLeitura> Checklist);

public sealed record VinculoModeloLeitura(Guid Id, TipoVinculoModelo Tipo, Guid BibliotecaId);

public sealed record PermissoesModeloLeitura(
    bool Gerais,
    bool Planejamento,
    bool Tarefas,
    bool ServicosFornecedores,
    bool Convites);

public sealed record ModeloLeitura(
    Guid Id,
    string Nome,
    TipoEvento Tipo,
    IReadOnlyList<ServicoModeloLeitura> Servicos,
    IReadOnlyList<TarefaModeloLeitura> Tarefas,
    PermissoesModeloLeitura Permissoes,
    IReadOnlyList<VinculoModeloLeitura> Vinculos);

public sealed record NovoModelo(string? Nome, TipoEvento? Tipo, IReadOnlyList<string>? Servicos, IReadOnlyList<string>? Tarefas);

/// <summary>
/// Serviço no pedido de gravação. <c>Chave</c> é como as tarefas do mesmo pedido apontam para ele (o id atual ou um
/// valor provisório da tela). Sem <c>ServicoContaId</c>, o serviço é procurado no cadastro pelo nome e, se não existir,
/// é cadastrado.
/// </summary>
public sealed record ServicoModeloPedido(string? Chave, Guid? ServicoContaId, string? Nome, decimal? ValorEstimado);

public sealed record ItemChecklistModeloPedido(string? Texto, int? PrazoRelativo, PapelResponsavel? ResponsavelPapel);

public sealed record TarefaModeloPedido(
    string? ServicoChave,
    string? Titulo,
    string? Descricao,
    int? PrazoRelativo,
    PrioridadeTarefa? Prioridade,
    VisibilidadeTarefa? Visibilidade,
    IReadOnlyList<PapelResponsavel>? Responsaveis,
    IReadOnlyList<ItemChecklistModeloPedido>? Checklist);

public sealed record VinculoModeloPedido(TipoVinculoModelo? Tipo, Guid? BibliotecaId);

public sealed record PermissoesModeloPedido(
    bool? Gerais,
    bool? Planejamento,
    bool? Tarefas,
    bool? ServicosFornecedores,
    bool? Convites);

public sealed record AtualizarModelo(
    string? Nome,
    TipoEvento? Tipo,
    PermissoesModeloPedido? Permissoes,
    IReadOnlyList<ServicoModeloPedido>? Servicos,
    IReadOnlyList<TarefaModeloPedido>? Tarefas,
    IReadOnlyList<VinculoModeloPedido>? Vinculos);

public sealed class ModeloServico(IDados dados)
{
    public const int MaximoTitulo = 200;

    /// <summary>Papéis que podem ser escolhidos hoje (SPEC-012 v3 §8.3). "Equipe" fica reservado.</summary>
    public static bool PapelEscolhivel(PapelResponsavel papel) =>
        papel is PapelResponsavel.Organizer or PapelResponsavel.Assistente or PapelResponsavel.Cliente;

    public async Task<IReadOnlyList<ModeloLeitura>> ListarAsync(Guid contaId, string? nome, CancellationToken ct)
    {
        var modelos = await dados.ListarModelosAsync(contaId, nome, ct);
        var cadastro = await CadastroAsync(contaId, ct);
        return modelos.Select(modelo => Ler(modelo, cadastro)).ToArray();
    }

    public async Task<Resultado<ModeloLeitura>> ObterAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var modelo = await dados.ObterModeloAsync(contaId, id, ct);
        return modelo is null
            ? Resultado<ModeloLeitura>.Erro(Codigos.Indisponivel, "Indisponível.")
            : Resultado<ModeloLeitura>.Sucesso(Ler(modelo, await CadastroAsync(contaId, ct)));
    }

    public async Task<Resultado<ModeloLeitura>> CriarAsync(Guid contaId, NovoModelo pedido, CancellationToken ct)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Validacao, "Informe o nome do modelo.");
        }

        if (pedido.Tipo is not TipoEvento tipo || !Enum.IsDefined(tipo))
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Validacao, "Informe o tipo do modelo.");
        }

        var modelo = new ModeloEvento
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            Nome = nome,
            Tipo = tipo,
        };
        foreach (var servico in Nomes(pedido.Servicos))
        {
            var catalogo = await GarantirNoCadastroAsync(contaId, null, servico, ct);
            modelo.Servicos.Add(new ServicoModelo { Id = Guid.NewGuid(), ModeloId = modelo.Id, ServicoContaId = catalogo.Id, Nome = catalogo.Nome });
        }

        foreach (var tarefa in Nomes(pedido.Tarefas))
        {
            modelo.Tarefas.Add(new TarefaModelo { Id = Guid.NewGuid(), ModeloId = modelo.Id, Titulo = Cortar(tarefa) });
        }

        await dados.InserirModeloAsync(modelo, ct);
        return Resultado<ModeloLeitura>.Sucesso(Ler(modelo, await CadastroAsync(contaId, ct)));
    }

    public async Task<Resultado<ModeloLeitura>> AtualizarAsync(Guid contaId, Guid id, AtualizarModelo pedido, CancellationToken ct)
    {
        var modelo = await dados.ObterModeloAsync(contaId, id, ct);
        if (modelo is null)
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Validacao, "Informe o nome do modelo.");
        }

        if (pedido.Tipo is not TipoEvento tipo || !Enum.IsDefined(tipo))
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Validacao, "Informe o tipo do modelo.");
        }

        var validacao = ValidarConteudo(pedido);
        if (validacao is not null)
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Validacao, validacao);
        }

        var modeloId = modelo.Id;
        var atualizado = new ModeloEvento
        {
            Id = modeloId,
            ContaId = contaId,
            Nome = nome,
            Tipo = tipo,
            PermiteGerais = pedido.Permissoes?.Gerais ?? modelo.PermiteGerais,
            PermitePlanejamento = pedido.Permissoes?.Planejamento ?? modelo.PermitePlanejamento,
            PermiteTarefas = pedido.Permissoes?.Tarefas ?? modelo.PermiteTarefas,
            PermiteServicosFornecedores = pedido.Permissoes?.ServicosFornecedores ?? modelo.PermiteServicosFornecedores,
            PermiteConvites = pedido.Permissoes?.Convites ?? modelo.PermiteConvites,
        };

        // Serviços: um por serviço do cadastro; a chave do pedido aponta para o serviço gravado.
        var porChave = new Dictionary<string, Guid>(StringComparer.Ordinal);
        var porCadastro = new Dictionary<Guid, ServicoModelo>();
        foreach (var servico in pedido.Servicos ?? [])
        {
            var catalogo = await GarantirNoCadastroAsync(contaId, servico.ServicoContaId, Domain.Comum.Texto.Limpo(servico.Nome)!, ct);
            if (!porCadastro.TryGetValue(catalogo.Id, out var entidade))
            {
                entidade = new ServicoModelo
                {
                    Id = Guid.NewGuid(),
                    ModeloId = modeloId,
                    ServicoContaId = catalogo.Id,
                    Nome = catalogo.Nome,
                    ValorEstimado = servico.ValorEstimado,
                };
                porCadastro[catalogo.Id] = entidade;
                atualizado.Servicos.Add(entidade);
            }

            if (Domain.Comum.Texto.Limpo(servico.Chave) is string chave)
            {
                porChave[chave] = entidade.Id;
            }
        }

        foreach (var tarefa in pedido.Tarefas ?? [])
        {
            var tarefaId = Guid.NewGuid();
            var chave = Domain.Comum.Texto.Limpo(tarefa.ServicoChave);
            var entidade = new TarefaModelo
            {
                Id = tarefaId,
                ModeloId = modeloId,
                ServicoModeloId = chave is not null && porChave.TryGetValue(chave, out var servicoId) ? servicoId : null,
                Titulo = Cortar(Domain.Comum.Texto.Limpo(tarefa.Titulo)!),
                Descricao = Domain.Comum.Texto.Limpo(tarefa.Descricao),
                PrazoRelativo = tarefa.PrazoRelativo,
                Prioridade = tarefa.Prioridade ?? PrioridadeTarefa.Media,
                Visibilidade = tarefa.Visibilidade ?? VisibilidadeTarefa.SoEu,
                Responsaveis = PapeisResponsaveis.Escrever(PapeisOuOrganizador(tarefa.Responsaveis)),
            };
            var ordem = 0;
            foreach (var item in tarefa.Checklist ?? [])
            {
                entidade.Checklist.Add(new ItemChecklistTarefaModelo
                {
                    Id = Guid.NewGuid(),
                    TarefaModeloId = tarefaId,
                    Texto = Domain.Comum.Texto.Limpo(item.Texto)!,
                    Ordem = ordem++,
                    PrazoRelativo = item.PrazoRelativo,
                    ResponsavelPapel = item.ResponsavelPapel,
                });
            }

            atualizado.Tarefas.Add(entidade);
        }

        foreach (var vinculo in pedido.Vinculos ?? [])
        {
            atualizado.Vinculos.Add(new VinculoModeloEvento
            {
                Id = Guid.NewGuid(),
                ModeloId = modeloId,
                Tipo = vinculo.Tipo!.Value,
                BibliotecaId = vinculo.BibliotecaId!.Value,
            });
        }

        await dados.RemoverConteudoModeloAsync(modelo, ct);
        await dados.GravarModeloAtualizadoAsync(atualizado, ct);
        return Resultado<ModeloLeitura>.Sucesso(Ler(atualizado, await CadastroAsync(contaId, ct)));
    }

    public async Task<Resultado<ModeloLeitura>> ClonarAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var origem = await dados.ObterModeloAsync(contaId, id, ct);
        if (origem is null)
        {
            return Resultado<ModeloLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var copia = new ModeloEvento
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            Nome = origem.Nome + " (cópia)",
            Tipo = origem.Tipo,
            PermiteGerais = origem.PermiteGerais,
            PermitePlanejamento = origem.PermitePlanejamento,
            PermiteTarefas = origem.PermiteTarefas,
            PermiteServicosFornecedores = origem.PermiteServicosFornecedores,
            PermiteConvites = origem.PermiteConvites,
        };

        var novosIds = new Dictionary<Guid, Guid>();
        foreach (var servico in origem.Servicos)
        {
            var novoId = Guid.NewGuid();
            novosIds[servico.Id] = novoId;
            copia.Servicos.Add(new ServicoModelo
            {
                Id = novoId,
                ModeloId = copia.Id,
                ServicoContaId = servico.ServicoContaId,
                Nome = servico.Nome,
                ValorEstimado = servico.ValorEstimado,
            });
        }

        foreach (var tarefa in origem.Tarefas)
        {
            copia.Tarefas.Add(CopiarTarefa(tarefa, copia.Id, tarefa.ServicoModeloId is Guid antigo && novosIds.TryGetValue(antigo, out var novo) ? novo : null));
        }

        foreach (var vinculo in origem.Vinculos)
        {
            copia.Vinculos.Add(new VinculoModeloEvento
            {
                Id = Guid.NewGuid(),
                ModeloId = copia.Id,
                Tipo = vinculo.Tipo,
                BibliotecaId = vinculo.BibliotecaId,
            });
        }

        await dados.InserirModeloAsync(copia, ct);
        return Resultado<ModeloLeitura>.Sucesso(Ler(copia, await CadastroAsync(contaId, ct)));
    }

    public async Task<Resultado<bool>> ExcluirAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var modelo = await dados.ObterModeloAsync(contaId, id, ct);
        if (modelo is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverModeloAsync(modelo, ct);
        return Resultado<bool>.Sucesso(true);
    }

    /// <summary>Serviço do cadastro da conta pelo id; senão pelo nome; senão cadastra (SPEC-012 v3 §8.4).</summary>
    internal async Task<ServicoConta> GarantirNoCadastroAsync(Guid contaId, Guid? servicoContaId, string nome, CancellationToken ct)
    {
        if (servicoContaId is Guid id && await dados.ObterServicoContaAsync(contaId, id, ct) is ServicoConta pelaChave)
        {
            return pelaChave;
        }

        var limpo = nome.Length > 200 ? nome[..200] : nome;
        if (await dados.ObterServicoContaPorNomeAsync(contaId, limpo, ct) is ServicoConta peloNome)
        {
            return peloNome;
        }

        var novo = new ServicoConta { Id = Guid.NewGuid(), ContaId = contaId, Nome = limpo, Padrao = false };
        await dados.InserirServicoContaAsync(novo, ct);
        return novo;
    }

    internal static TarefaModelo CopiarTarefa(TarefaModelo tarefa, Guid modeloId, Guid? servicoModeloId)
    {
        var id = Guid.NewGuid();
        return new TarefaModelo
        {
            Id = id,
            ModeloId = modeloId,
            ServicoModeloId = servicoModeloId,
            Titulo = tarefa.Titulo,
            Descricao = tarefa.Descricao,
            PrazoRelativo = tarefa.PrazoRelativo,
            Prioridade = tarefa.Prioridade,
            Visibilidade = tarefa.Visibilidade,
            Responsaveis = tarefa.Responsaveis,
            Checklist = tarefa.Checklist
                .OrderBy(item => item.Ordem)
                .Select(item => new ItemChecklistTarefaModelo
                {
                    Id = Guid.NewGuid(),
                    TarefaModeloId = id,
                    Texto = item.Texto,
                    Ordem = item.Ordem,
                    PrazoRelativo = item.PrazoRelativo,
                    ResponsavelPapel = item.ResponsavelPapel,
                })
                .ToList(),
        };
    }

    internal static IReadOnlyList<PapelResponsavel> PapeisOuOrganizador(IReadOnlyList<PapelResponsavel>? papeis)
    {
        var validos = (papeis ?? []).Where(PapelEscolhivel).Distinct().ToArray();
        return validos.Length > 0 ? validos : [PapelResponsavel.Organizer];
    }

    internal static string Cortar(string titulo) => titulo.Length > MaximoTitulo ? titulo[..MaximoTitulo] : titulo;

    private async Task<IReadOnlyDictionary<Guid, string>> CadastroAsync(Guid contaId, CancellationToken ct) =>
        (await dados.ListarServicosContaAsync(contaId, null, ct)).ToDictionary(servico => servico.Id, servico => servico.Nome);

    private static string? ValidarConteudo(AtualizarModelo pedido)
    {
        foreach (var servico in pedido.Servicos ?? [])
        {
            if (Domain.Comum.Texto.Limpo(servico.Nome) is null)
            {
                return "Informe o nome do serviço.";
            }

            if (servico.ValorEstimado is < 0)
            {
                return "Use um número maior ou igual a zero.";
            }
        }

        foreach (var tarefa in pedido.Tarefas ?? [])
        {
            if (Domain.Comum.Texto.Limpo(tarefa.Titulo) is null)
            {
                return "Informe o título da tarefa.";
            }

            if (!PrazosRelativos.Valido(tarefa.PrazoRelativo))
            {
                return "Use um prazo de até 999 meses antes ou depois do evento.";
            }

            if (tarefa.Prioridade is PrioridadeTarefa prioridade && !Enum.IsDefined(prioridade))
            {
                return "Escolha a prioridade.";
            }

            if (tarefa.Visibilidade is VisibilidadeTarefa visibilidade && !Enum.IsDefined(visibilidade))
            {
                return "Escolha a visibilidade.";
            }

            if ((tarefa.Responsaveis ?? []).Any(papel => !Enum.IsDefined(papel) || !PapelEscolhivel(papel)))
            {
                return "Escolha o responsável: Organizador, Assistente ou Cliente.";
            }

            foreach (var item in tarefa.Checklist ?? [])
            {
                if (Domain.Comum.Texto.Limpo(item.Texto) is null)
                {
                    return "Informe o texto do item da checklist.";
                }

                if (!PrazosRelativos.Valido(item.PrazoRelativo))
                {
                    return "Use um prazo de até 999 meses antes ou depois do evento.";
                }

                if (item.ResponsavelPapel is PapelResponsavel papel && (!Enum.IsDefined(papel) || !PapelEscolhivel(papel)))
                {
                    return "Escolha o responsável do item.";
                }
            }
        }

        foreach (var vinculo in pedido.Vinculos ?? [])
        {
            if (vinculo.Tipo is not TipoVinculoModelo tipo || !Enum.IsDefined(tipo) || vinculo.BibliotecaId is null)
            {
                return "Informe o vínculo da biblioteca.";
            }
        }

        return null;
    }

    internal static ModeloLeitura Ler(ModeloEvento modelo, IReadOnlyDictionary<Guid, string> cadastro) => new(
        modelo.Id,
        modelo.Nome,
        modelo.Tipo,
        modelo.Servicos.Select(servico =>
        {
            var noCadastro = servico.ServicoContaId is Guid id && cadastro.ContainsKey(id);
            var nome = noCadastro ? cadastro[servico.ServicoContaId!.Value] : servico.Nome;
            return new ServicoModeloLeitura(servico.Id, servico.ServicoContaId, nome, servico.ValorEstimado, noCadastro);
        }).ToArray(),
        modelo.Tarefas.Select(tarefa => new TarefaModeloLeitura(
            tarefa.Id,
            tarefa.ServicoModeloId,
            tarefa.Titulo,
            tarefa.Descricao,
            tarefa.PrazoRelativo,
            tarefa.Prioridade,
            tarefa.Visibilidade,
            PapeisOuOrganizador(tarefa.Papeis()),
            tarefa.Checklist
                .OrderBy(item => item.Ordem)
                .Select(item => new ItemChecklistModeloLeitura(item.Id, item.Texto, item.PrazoRelativo, item.ResponsavelPapel))
                .ToArray())).ToArray(),
        new PermissoesModeloLeitura(
            modelo.PermiteGerais,
            modelo.PermitePlanejamento,
            modelo.PermiteTarefas,
            modelo.PermiteServicosFornecedores,
            modelo.PermiteConvites),
        modelo.Vinculos.Select(vinculo => new VinculoModeloLeitura(vinculo.Id, vinculo.Tipo, vinculo.BibliotecaId)).ToArray());

    private static IEnumerable<string> Nomes(IReadOnlyList<string>? valores) =>
        (valores ?? []).Select(Domain.Comum.Texto.Limpo).OfType<string>();
}
