using Project.Application.Comum;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;

namespace Project.Application.Negocio;

public sealed record ServicoContaLeitura(Guid Id, string Nome, bool Padrao);

public sealed record NovoServicoConta(string? Nome);

/// <summary>Cadastro em massa: nomes separados por vírgula.</summary>
public sealed record NovosServicosConta(string? Nomes);

public sealed record TelefoneFornecedorPedido(string? Responsavel, string? Ddi, string? Numero, bool? Movel);

public sealed record EmailFornecedorPedido(string? Endereco);

public sealed record OrcamentoFornecedorPedido(string? Titulo, string? Link, Guid? AnexoId, bool? VisivelClientes);

public sealed record SalvarFornecedor(
    string? Nome,
    Guid? FotoId,
    string? RazaoSocial,
    string? Cnpj,
    string? Cpf,
    string? NomeResponsavel,
    decimal? PrecoDe,
    decimal? PrecoAte,
    string? Site,
    string? Facebook,
    string? Instagram,
    string? Youtube,
    string? Pinterest,
    string? Pais,
    string? Cep,
    string? Endereco,
    string? Numero,
    string? Estado,
    string? Cidade,
    string? Bairro,
    string? Complemento,
    string? Banco,
    string? Agencia,
    string? ContaBancaria,
    string? TitularConta,
    string? TipoConta,
    string? DocumentosBancarios,
    string? PixTipo,
    string? PixChave,
    string? Diferencial,
    bool? DiferencialVisivelCliente,
    string? InformacoesGerais,
    string? Portfolio,
    IReadOnlyList<Guid>? ServicoContaIds,
    IReadOnlyList<TelefoneFornecedorPedido>? Telefones,
    IReadOnlyList<EmailFornecedorPedido>? Emails,
    IReadOnlyList<OrcamentoFornecedorPedido>? Orcamentos);

public sealed record TelefoneFornecedorLeitura(Guid Id, string? Responsavel, string? Ddi, string Numero, bool Movel);

public sealed record EmailFornecedorLeitura(Guid Id, string Endereco);

public sealed record OrcamentoFornecedorLeitura(Guid Id, string Titulo, string? Link, Guid? AnexoId, bool VisivelClientes);

public sealed record FornecedorResumo(Guid Id, string Nome, IReadOnlyList<string> Servicos, bool Completo);

public sealed record FornecedorLeitura(
    Guid Id,
    string Nome,
    Guid? FotoId,
    string? RazaoSocial,
    string? Cnpj,
    string? Cpf,
    string? NomeResponsavel,
    decimal? PrecoDe,
    decimal? PrecoAte,
    string? Site,
    string? Facebook,
    string? Instagram,
    string? Youtube,
    string? Pinterest,
    string? Pais,
    string? Cep,
    string? Endereco,
    string? Numero,
    string? Estado,
    string? Cidade,
    string? Bairro,
    string? Complemento,
    string? Banco,
    string? Agencia,
    string? ContaBancaria,
    string? TitularConta,
    string? TipoConta,
    string? DocumentosBancarios,
    string? PixTipo,
    string? PixChave,
    string? Diferencial,
    bool DiferencialVisivelCliente,
    string? InformacoesGerais,
    string? Portfolio,
    bool Completo,
    IReadOnlyList<Guid> ServicoContaIds,
    IReadOnlyList<string> Servicos,
    IReadOnlyList<TelefoneFornecedorLeitura> Telefones,
    IReadOnlyList<EmailFornecedorLeitura> Emails,
    IReadOnlyList<OrcamentoFornecedorLeitura> Orcamentos);

public sealed record AdicionarServicoEvento(string? Nome);

public sealed record AtualizarEstimadoServico(decimal? ValorEstimado, IReadOnlyList<SubitemPedido>? Subitens);

public sealed record SubitemPedido(string? Descricao, int? Quantidade, decimal? ValorUnitario);

public sealed record AdicionarFornecedorServico(Guid? FornecedorId, EtapaNegociacao? Etapa);

/// <summary>Contratar: só o valor. O parcelamento é feito depois, na aba Dinheiro (SPEC-045).</summary>
public sealed record ContratarFornecedorPedido(decimal? Valor);

public sealed record BudgetServicoLinha(Guid Id, string Nome, decimal Estimado, decimal Contratado);

public sealed record BudgetEvento(
    decimal Budget,
    decimal Estimado,
    decimal Contratado,
    decimal ProvaReal,
    decimal? CustoPorConvidado,
    IReadOnlyList<BudgetServicoLinha> Servicos);

public sealed class FornecedorServico(IDados dados, Arquivos.IArmazenamentoArquivo armazenamento)
{
    public async Task<IReadOnlyList<ServicoContaLeitura>> ListarServicosAsync(Guid contaId, string? nome, CancellationToken ct)
    {
        var servicos = await dados.ListarServicosContaAsync(contaId, nome, ct);
        return servicos.Select(servico => new ServicoContaLeitura(servico.Id, servico.Nome, servico.Padrao)).ToArray();
    }

    public async Task<Resultado<ServicoContaLeitura>> CriarServicoAsync(Guid contaId, NovoServicoConta pedido, CancellationToken ct)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<ServicoContaLeitura>.Erro(Codigos.Validacao, "Informe o nome do serviço.");
        }

        if (nome.Length > 200)
        {
            return Resultado<ServicoContaLeitura>.Erro(Codigos.Validacao, "O nome do serviço pode ter no máximo 200 caracteres.");
        }

        var existente = await dados.ObterServicoContaPorNomeAsync(contaId, nome, ct);
        if (existente is not null)
        {
            return Resultado<ServicoContaLeitura>.Sucesso(new ServicoContaLeitura(existente.Id, existente.Nome, existente.Padrao));
        }

        var servico = new ServicoConta
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            Nome = nome,
            Padrao = false,
        };
        await dados.InserirServicoContaAsync(servico, ct);
        return Resultado<ServicoContaLeitura>.Sucesso(new ServicoContaLeitura(servico.Id, servico.Nome, servico.Padrao));
    }

    public async Task<Resultado<IReadOnlyList<ServicoContaLeitura>>> CriarServicosAsync(Guid contaId, NovosServicosConta pedido, CancellationToken ct)
    {
        var nomes = (pedido.Nomes ?? "")
            .Split(',')
            .Select(Domain.Comum.Texto.Limpo)
            .OfType<string>()
            .DistinctBy(nome => nome.ToLowerInvariant())
            .ToArray();
        if (nomes.Length == 0)
        {
            return Resultado<IReadOnlyList<ServicoContaLeitura>>.Erro(Codigos.Validacao, "Informe ao menos um nome de serviço.");
        }

        var longo = nomes.FirstOrDefault(nome => nome.Length > 200);
        if (longo is not null)
        {
            return Resultado<IReadOnlyList<ServicoContaLeitura>>.Erro(Codigos.Validacao, "O nome do serviço pode ter no máximo 200 caracteres.");
        }

        var criados = new List<ServicoContaLeitura>(nomes.Length);
        foreach (var nome in nomes)
        {
            // Nomes já validados acima: a criação individual não falha (e reaproveita os existentes).
            var resultado = await CriarServicoAsync(contaId, new NovoServicoConta(nome), ct);
            criados.Add(resultado.Valor!);
        }

        return Resultado<IReadOnlyList<ServicoContaLeitura>>.Sucesso(criados);
    }

    public async Task<Resultado<bool>> ExcluirServicoAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var servico = await dados.ObterServicoContaAsync(contaId, id, ct);
        if (servico is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverServicoContaAsync(servico, ct);
        return Resultado<bool>.Sucesso(true);
    }

    public async Task<IReadOnlyList<FornecedorResumo>> ListarAsync(Guid contaId, string? nome, CancellationToken ct)
    {
        var fornecedores = await dados.ListarFornecedoresAsync(contaId, nome, ct);
        var nomes = await dados.NomesServicosContaAsync(
            contaId,
            fornecedores.SelectMany(item => item.Servicos.Select(ligacao => ligacao.ServicoContaId)),
            ct);
        return fornecedores.Select(fornecedor => new FornecedorResumo(
            fornecedor.Id,
            fornecedor.Nome,
            fornecedor.Servicos
                .Select(ligacao => nomes.GetValueOrDefault(ligacao.ServicoContaId, ""))
                .Where(texto => texto.Length > 0)
                .ToArray(),
            fornecedor.CadastroCompleto)).ToArray();
    }

    public async Task<Resultado<FornecedorLeitura>> ObterAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var fornecedor = await dados.ObterFornecedorAsync(contaId, id, ct);
        if (fornecedor is null)
        {
            return Resultado<FornecedorLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<FornecedorLeitura>.Sucesso(await LerAsync(contaId, fornecedor, ct));
    }

    public async Task<Resultado<FornecedorLeitura>> CriarAsync(Guid contaId, SalvarFornecedor pedido, CancellationToken ct)
    {
        var montado = await MontarAsync(contaId, Guid.NewGuid(), pedido, ct);
        if (!montado.Ok)
        {
            return Resultado<FornecedorLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        await dados.InserirFornecedorAsync(montado.Valor!, ct);
        return Resultado<FornecedorLeitura>.Sucesso(await LerAsync(contaId, montado.Valor!, ct));
    }

    /// <summary>
    /// Cria vários de uma vez (importação por planilha): monta todos e grava numa só transação; se um falhar, nenhum
    /// entra. Os serviços já vêm do catálogo da conta, então não são conferidos de novo um a um.
    /// </summary>
    public async Task<Resultado<int>> CriarVariosAsync(
        Guid contaId, IReadOnlyList<(int Linha, SalvarFornecedor Pedido)> pedidos, CancellationToken ct)
    {
        var montados = new List<Fornecedor>(pedidos.Count);
        foreach (var (linha, pedido) in pedidos)
        {
            var montado = await MontarAsync(contaId, Guid.NewGuid(), pedido, ct, conferirServicos: false);
            if (!montado.Ok)
            {
                return Resultado<int>.Erro(montado.Falha!.Codigo, $"Linha {linha}: {montado.Falha.Mensagem}");
            }

            montados.Add(montado.Valor!);
        }

        await dados.InserirFornecedoresAsync(montados, ct);
        return Resultado<int>.Sucesso(montados.Count);
    }

    public async Task<Resultado<FornecedorLeitura>> AtualizarAsync(Guid contaId, Guid id, SalvarFornecedor pedido, CancellationToken ct)
    {
        var fornecedor = await dados.ObterFornecedorAsync(contaId, id, ct);
        if (fornecedor is null)
        {
            return Resultado<FornecedorLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var montado = await MontarAsync(contaId, fornecedor.Id, pedido, ct);
        if (!montado.Ok)
        {
            return Resultado<FornecedorLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        Copiar(fornecedor, montado.Valor!);
        await dados.SalvarFornecedorAsync(ct);
        return Resultado<FornecedorLeitura>.Sucesso(await LerAsync(contaId, fornecedor, ct));
    }

    public async Task<Resultado<bool>> ExcluirAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var fornecedor = await dados.ObterFornecedorAsync(contaId, id, ct);
        if (fornecedor is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverFornecedorAsync(fornecedor, ct);
        return Resultado<bool>.Sucesso(true);
    }

    public async Task<Resultado<EventoDetalhe>> AdicionarServicoNoEventoAsync(
        Guid contaId,
        Guid eventoId,
        AdicionarServicoEvento pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        if (!await dados.EventoDaContaAsync(contaId, eventoId, ct))
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Informe o nome do serviço.");
        }

        var catalogo = await dados.ObterServicoContaPorNomeAsync(contaId, nome, ct);
        if (catalogo is null)
        {
            catalogo = new ServicoConta
            {
                Id = Guid.NewGuid(),
                ContaId = contaId,
                Nome = nome,
                Padrao = false,
            };
            await dados.InserirServicoContaAsync(catalogo, ct);
        }

        await dados.AdicionarServicoAsync(new ServicoEvento
        {
            Id = Guid.NewGuid(),
            EventoId = eventoId,
            Nome = catalogo.Nome,
            ServicoContaId = catalogo.Id,
            Ordem = Relogio.AgoraUtc.Millisecond,
        }, ct);
        return await DetalheEventoAsync(contaId, eventoId, hoje, ct);
    }

    public async Task<Resultado<EventoDetalhe>> AtualizarEstimadoAsync(
        Guid contaId,
        Guid eventoId,
        Guid servicoId,
        AtualizarEstimadoServico pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        var servico = await dados.ObterServicoEventoAsync(contaId, eventoId, servicoId, ct);
        if (servico is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (pedido.Subitens is { Count: > 0 })
        {
            var subitens = new List<SubitemServico>();
            foreach (var item in pedido.Subitens)
            {
                var descricao = Domain.Comum.Texto.Limpo(item.Descricao);
                if (descricao is null || item.Quantidade is not int quantidade || quantidade <= 0
                    || item.ValorUnitario is not decimal unitario || unitario < 0)
                {
                    return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Informe descrição, quantidade e valor unitário válidos.");
                }

                subitens.Add(new SubitemServico
                {
                    Id = Guid.NewGuid(),
                    ServicoId = servico.Id,
                    Descricao = descricao,
                    Quantidade = quantidade,
                    ValorUnitario = unitario,
                });
            }

            await dados.SubstituirSubitensAsync(servico.Id, subitens, BudgetCalculo.SomaSubitens(subitens), ct);
        }
        else
        {
            if (pedido.ValorEstimado is < 0)
            {
                return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Use um número maior ou igual a zero.");
            }

            await dados.SubstituirSubitensAsync(servico.Id, [], pedido.ValorEstimado, ct);
        }

        return await DetalheEventoAsync(contaId, eventoId, hoje, ct);
    }

    public async Task<Resultado<EventoDetalhe>> AdicionarFornecedorNoServicoAsync(
        Guid contaId,
        Guid eventoId,
        Guid servicoId,
        AdicionarFornecedorServico pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        var servico = await dados.ObterServicoEventoAsync(contaId, eventoId, servicoId, ct);
        if (servico is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (pedido.FornecedorId is not Guid fornecedorId)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Escolha um fornecedor.");
        }

        var fornecedor = await dados.ObterFornecedorAsync(contaId, fornecedorId, ct);
        if (fornecedor is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Escolha um fornecedor.");
        }

        var etapa = pedido.Etapa ?? EtapaNegociacao.Orcamento;
        if (!Enum.IsDefined(etapa))
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Informe a etapa da negociação.");
        }

        if (servico.Fornecedores.Any(item => item.FornecedorId == fornecedorId))
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Este fornecedor já está no serviço.");
        }

        var novo = new FornecedorNoServico
        {
            Id = Guid.NewGuid(),
            ServicoId = servico.Id,
            FornecedorId = fornecedorId,
            Etapa = etapa,
        };
        await dados.InserirFornecedorNoServicoAsync(novo, ct);

        if (etapa == EtapaNegociacao.Contratado)
        {
            await dados.GarantirContratoFornecedorAsync(servico.Id, novo.Id, ct);
            await dados.RecalcularContratadoAsync(servico.Id, ct);
            await dados.ConcluirTarefasLigadasAsync(contaId, servico.Id, ct);
        }

        return await DetalheEventoAsync(contaId, eventoId, hoje, ct);
    }

    public async Task<Resultado<EventoDetalhe>> AvancarEtapaAsync(
        Guid contaId,
        Guid eventoId,
        Guid servicoId,
        Guid vinculoId,
        DateOnly hoje,
        CancellationToken ct) =>
        await MoverEtapaAsync(contaId, eventoId, servicoId, vinculoId, avancar: true, hoje, ct);

    public async Task<Resultado<EventoDetalhe>> VoltarEtapaAsync(
        Guid contaId,
        Guid eventoId,
        Guid servicoId,
        Guid vinculoId,
        DateOnly hoje,
        CancellationToken ct) =>
        await MoverEtapaAsync(contaId, eventoId, servicoId, vinculoId, avancar: false, hoje, ct);

    public async Task<Resultado<EventoDetalhe>> ContratarAsync(
        Guid contaId,
        Guid eventoId,
        Guid servicoId,
        Guid vinculoId,
        ContratarFornecedorPedido pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        var servico = await dados.ObterServicoEventoAsync(contaId, eventoId, servicoId, ct);
        var vinculo = servico?.Fornecedores.FirstOrDefault(item => item.Id == vinculoId);
        if (servico is null || vinculo is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (pedido.Valor is not decimal valor || valor < 0)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Informe o valor do contrato.");
        }

        // Contratar de novo mantém o contrato (parcelas, pagos, comprovantes); o valor não pode destoar das parcelas.
        var existente = servico.Contratos.FirstOrDefault(contrato => contrato.VinculoId == vinculo.Id);
        if (existente is { Parcelas.Count: > 0 } && existente.Parcelas.Sum(parcela => parcela.Valor) != valor)
        {
            return Resultado<EventoDetalhe>.Erro(
                Codigos.Validacao,
                "O pagamento está parcelado e o valor não bate com as parcelas. Refaça o parcelamento na aba Dinheiro antes.");
        }

        await dados.AtualizarEtapaNegociacaoAsync(vinculo.Id, EtapaNegociacao.Contratado, valor, ct);
        await dados.GarantirContratoFornecedorAsync(servico.Id, vinculo.Id, ct);
        await dados.RecalcularContratadoAsync(servico.Id, ct);
        await dados.ConcluirTarefasLigadasAsync(contaId, servico.Id, ct);
        return await DetalheEventoAsync(contaId, eventoId, hoje, ct);
    }

    /// <summary>Tira o fornecedor do serviço. Com pagamento ou comprovante no Dinheiro, fica bloqueado.</summary>
    public async Task<Resultado<EventoDetalhe>> RemoverFornecedorDoServicoAsync(
        Guid contaId,
        Guid eventoId,
        Guid servicoId,
        Guid vinculoId,
        DateOnly hoje,
        CancellationToken ct)
    {
        var servico = await dados.ObterServicoEventoAsync(contaId, eventoId, servicoId, ct);
        var vinculo = servico?.Fornecedores.FirstOrDefault(item => item.Id == vinculoId);
        if (servico is null || vinculo is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var contrato = servico.Contratos.FirstOrDefault(item => item.VinculoId == vinculoId);
        if (contrato?.TemPagamento == true)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Este fornecedor tem pagamento registrado. Desfaça os pagamentos na aba Dinheiro antes.");
        }

        await dados.RemoverFornecedorDoServicoAsync(vinculoId, ct);
        await dados.RecalcularContratadoAsync(servico.Id, ct);
        if (contrato?.ContratoAssinadoArquivoId is Guid arquivoId)
        {
            await armazenamento.DescartarAsync(arquivoId, ct);
        }

        return await DetalheEventoAsync(contaId, eventoId, hoje, ct);
    }

    /// <summary>Tira o serviço do evento. Com pagamento de algum fornecedor no Dinheiro, fica bloqueado.</summary>
    public async Task<Resultado<EventoDetalhe>> RemoverServicoAsync(
        Guid contaId,
        Guid eventoId,
        Guid servicoId,
        DateOnly hoje,
        CancellationToken ct)
    {
        var servico = await dados.ObterServicoEventoAsync(contaId, eventoId, servicoId, ct);
        if (servico is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (servico.Contratos.Any(contrato => contrato.TemPagamento))
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "O serviço tem pagamento registrado. Desfaça os pagamentos na aba Dinheiro antes.");
        }

        await dados.RemoverServicoAsync(servico.Id, ct);
        foreach (var arquivoId in servico.Contratos.Select(contrato => contrato.ContratoAssinadoArquivoId).OfType<Guid>())
        {
            await armazenamento.DescartarAsync(arquivoId, ct);
        }

        return await DetalheEventoAsync(contaId, eventoId, hoje, ct);
    }

    /// <summary>Guarda o contrato assinado do fornecedor (vínculo) e apaga o anterior (SPEC-045 §6.4). Vale antes de contratar.</summary>
    public async Task<Resultado<EventoDetalhe>> EnviarContratoAssinadoAsync(
        Guid contaId,
        Guid eventoId,
        Guid vinculoId,
        Stream conteudo,
        string? nomeArquivo,
        DateOnly hoje,
        CancellationToken ct,
        bool peloCliente = false)
    {
        var (servico, contrato) = await ServicoDoVinculoAsync(contaId, eventoId, vinculoId, ct);
        if (servico is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var guardado = await armazenamento.GuardarDocumentoAsync(conteudo, nomeArquivo, contaId, ct);
        if (!guardado.Ok)
        {
            return Resultado<EventoDetalhe>.Erro(guardado.Falha!.Codigo, guardado.Falha.Mensagem);
        }

        var arquivo = guardado.Valor!;
        var nome = arquivo.NomeOriginal.Length > 260 ? arquivo.NomeOriginal[..260] : arquivo.NomeOriginal;
        await dados.GarantirContratoFornecedorAsync(servico.Id, vinculoId, ct);
        await dados.GravarContratoAssinadoAsync(vinculoId, arquivo.Id, nome, arquivo.TipoConteudo, peloCliente ? "Cliente" : "Organizadora", hoje, ct);
        if (contrato?.ContratoAssinadoArquivoId is Guid anterior)
        {
            await armazenamento.DescartarAsync(anterior, ct);
        }

        return await DetalheEventoAsync(contaId, eventoId, hoje, ct);
    }

    public async Task<Resultado<EventoDetalhe>> ExcluirContratoAssinadoAsync(
        Guid contaId,
        Guid eventoId,
        Guid vinculoId,
        DateOnly hoje,
        CancellationToken ct)
    {
        var (_, contrato) = await ServicoDoVinculoAsync(contaId, eventoId, vinculoId, ct);
        if (contrato?.ContratoAssinadoArquivoId is not Guid arquivoId)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.GravarContratoAssinadoAsync(vinculoId, null, null, null, null, null, ct);
        await armazenamento.DescartarAsync(arquivoId, ct);
        return await DetalheEventoAsync(contaId, eventoId, hoje, ct);
    }

    private async Task<(ServicoEvento? Servico, Domain.Dinheiro.ContratoFornecedor? Contrato)> ServicoDoVinculoAsync(
        Guid contaId,
        Guid eventoId,
        Guid vinculoId,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        var servico = evento?.Servicos.FirstOrDefault(item => item.Fornecedores.Any(vinculo => vinculo.Id == vinculoId));
        return (servico, servico?.Contratos.FirstOrDefault(item => item.VinculoId == vinculoId));
    }

    public async Task<Resultado<BudgetEvento>> BudgetAsync(Guid contaId, Guid eventoId, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<BudgetEvento>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var (estimado, contratado, provaReal, custo) = BudgetCalculo.Resumo(evento);
        return Resultado<BudgetEvento>.Sucesso(new BudgetEvento(
            evento.OrcamentoEstimado ?? 0m,
            estimado,
            contratado,
            provaReal,
            custo,
            evento.Servicos
                .OrderBy(servico => servico.Ordem)
                .Select(servico => new BudgetServicoLinha(
                    servico.Id,
                    servico.Nome,
                    BudgetCalculo.EstimadoDoServico(servico),
                    BudgetCalculo.ContratadoDoServico(servico)))
                .ToArray()));
    }

    private async Task<Resultado<EventoDetalhe>> MoverEtapaAsync(
        Guid contaId,
        Guid eventoId,
        Guid servicoId,
        Guid vinculoId,
        bool avancar,
        DateOnly hoje,
        CancellationToken ct)
    {
        var servico = await dados.ObterServicoEventoAsync(contaId, eventoId, servicoId, ct);
        var vinculo = servico?.Fornecedores.FirstOrDefault(item => item.Id == vinculoId);
        if (servico is null || vinculo is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var destino = avancar ? NegociacaoRegras.Avancar(vinculo.Etapa) : NegociacaoRegras.Voltar(vinculo.Etapa);
        if (destino is null)
        {
            return Resultado<EventoDetalhe>.Erro(
                Codigos.Validacao,
                avancar ? "Não é possível avançar esta etapa." : "Não é possível voltar esta etapa.");
        }

        // Sair de Contratado com pagamento registrado deixaria o Dinheiro sem dono: bloqueia.
        if (vinculo.Etapa == EtapaNegociacao.Contratado
            && servico.Contratos.FirstOrDefault(item => item.VinculoId == vinculo.Id)?.TemPagamento == true)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Validacao, "Este fornecedor tem pagamento registrado. Desfaça os pagamentos na aba Dinheiro antes.");
        }

        await dados.AtualizarEtapaNegociacaoAsync(vinculo.Id, destino.Value, vinculo.ValorOrcamento, ct);
        if (destino == EtapaNegociacao.Contratado)
        {
            await dados.GarantirContratoFornecedorAsync(servico.Id, vinculo.Id, ct);
            await dados.ConcluirTarefasLigadasAsync(contaId, servico.Id, ct);
        }

        await dados.RecalcularContratadoAsync(servico.Id, ct);

        return await DetalheEventoAsync(contaId, eventoId, hoje, ct);
    }

    private async Task<Resultado<EventoDetalhe>> DetalheEventoAsync(Guid contaId, Guid eventoId, DateOnly hoje, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<EventoDetalhe>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<EventoDetalhe>.Sucesso(await EventoMapeamento.DetalheAsync(dados, contaId, evento, hoje, ct));
    }

    /// <summary>Confere o pedido sem gravar; os serviços ficam de fora (a importação ainda vai criá-los).</summary>
    public async Task<Resultado<bool>> ValidarSemServicosAsync(Guid contaId, SalvarFornecedor pedido, CancellationToken ct)
    {
        var montado = await MontarAsync(contaId, Guid.NewGuid(), pedido, ct, conferirServicos: false);
        return montado.Ok ? Resultado<bool>.Sucesso(true) : Resultado<bool>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
    }

    private async Task<Resultado<Fornecedor>> MontarAsync(
        Guid contaId, Guid id, SalvarFornecedor pedido, CancellationToken ct, bool conferirServicos = true)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<Fornecedor>.Erro(Codigos.Validacao, "Informe o nome do fornecedor.");
        }

        var servicoIds = (pedido.ServicoContaIds ?? []).Distinct().ToArray();
        if (conferirServicos && servicoIds.Length == 0)
        {
            return Resultado<Fornecedor>.Erro(Codigos.Validacao, "Informe ao menos um serviço.");
        }

        if (conferirServicos && (await dados.NomesServicosContaAsync(contaId, servicoIds, ct)).Count != servicoIds.Length)
        {
            return Resultado<Fornecedor>.Erro(Codigos.Validacao, "Informe serviços válidos da conta.");
        }

        if (pedido.PrecoDe is < 0 || pedido.PrecoAte is < 0)
        {
            return Resultado<Fornecedor>.Erro(Codigos.Validacao, "Use um número maior ou igual a zero.");
        }

        var cnpj = Documentos.Cnpj(pedido.Cnpj);
        if (cnpj == "")
        {
            return Resultado<Fornecedor>.Erro(Codigos.Validacao, "Informe um CNPJ válido.");
        }

        var cpf = Documentos.Cpf(pedido.Cpf);
        if (cpf == "")
        {
            return Resultado<Fornecedor>.Erro(Codigos.Validacao, "Informe um CPF válido.");
        }

        var documentoBancario = Documentos.CpfOuCnpj(pedido.DocumentosBancarios);
        if (documentoBancario == "")
        {
            return Resultado<Fornecedor>.Erro(Codigos.Validacao, "Informe um CPF ou CNPJ válido para os dados bancários.");
        }

        var pixChave = Domain.Comum.Texto.Limpo(pedido.PixChave);
        if (pixChave is not null && pedido.PixTipo is "Cpf" or "Cnpj")
        {
            pixChave = Documentos.Limpar(pixChave);
        }

        var fornecedor = new Fornecedor
        {
            Id = id,
            ContaId = contaId,
            Nome = nome,
            FotoId = pedido.FotoId,
            RazaoSocial = Domain.Comum.Texto.Limpo(pedido.RazaoSocial),
            Cnpj = cnpj,
            Cpf = cpf,
            NomeResponsavel = Domain.Comum.Texto.Limpo(pedido.NomeResponsavel),
            PrecoDe = pedido.PrecoDe,
            PrecoAte = pedido.PrecoAte,
            Site = Domain.Comum.Texto.Limpo(pedido.Site),
            Facebook = Domain.Comum.Texto.Limpo(pedido.Facebook),
            Instagram = Domain.Comum.Texto.Limpo(pedido.Instagram),
            Youtube = Domain.Comum.Texto.Limpo(pedido.Youtube),
            Pinterest = Domain.Comum.Texto.Limpo(pedido.Pinterest),
            Pais = Domain.Comum.Texto.Limpo(pedido.Pais),
            Cep = Mascaras.Cep(pedido.Cep) is { Length: > 0 } cep ? cep : Domain.Comum.Texto.Limpo(pedido.Cep),
            Endereco = Domain.Comum.Texto.Limpo(pedido.Endereco),
            Numero = Domain.Comum.Texto.Limpo(pedido.Numero),
            Estado = Domain.Comum.Texto.Limpo(pedido.Estado),
            Cidade = Domain.Comum.Texto.Limpo(pedido.Cidade),
            Bairro = Domain.Comum.Texto.Limpo(pedido.Bairro),
            Complemento = Domain.Comum.Texto.Limpo(pedido.Complemento),
            Banco = Domain.Comum.Texto.Limpo(pedido.Banco),
            Agencia = Domain.Comum.Texto.Limpo(pedido.Agencia),
            ContaBancaria = Domain.Comum.Texto.Limpo(pedido.ContaBancaria),
            TitularConta = Domain.Comum.Texto.Limpo(pedido.TitularConta),
            TipoConta = Domain.Comum.Texto.Limpo(pedido.TipoConta),
            DocumentosBancarios = documentoBancario,
            PixTipo = Domain.Comum.Texto.Limpo(pedido.PixTipo),
            PixChave = pixChave,
            Diferencial = HtmlSeguro.LimparRico(pedido.Diferencial),
            DiferencialVisivelCliente = pedido.DiferencialVisivelCliente ?? false,
            InformacoesGerais = HtmlSeguro.LimparRico(pedido.InformacoesGerais),
            Portfolio = HtmlSeguro.LimparRico(pedido.Portfolio),
        };

        foreach (var servicoId in servicoIds)
        {
            fornecedor.Servicos.Add(new Domain.Fornecedores.FornecedorServico { FornecedorId = id, ServicoContaId = servicoId });
        }

        foreach (var telefone in pedido.Telefones ?? [])
        {
            var numero = Domain.Comum.Texto.Limpo(telefone.Numero);
            if (numero is null)
            {
                continue;
            }

            fornecedor.Telefones.Add(new TelefoneFornecedor
            {
                Id = Guid.NewGuid(),
                FornecedorId = id,
                Responsavel = Domain.Comum.Texto.Limpo(telefone.Responsavel),
                Ddi = Domain.Comum.Texto.Limpo(telefone.Ddi),
                Numero = numero,
                Movel = telefone.Movel ?? true,
            });
        }

        foreach (var email in pedido.Emails ?? [])
        {
            var endereco = Domain.Comum.Texto.Limpo(email.Endereco);
            if (endereco is null)
            {
                continue;
            }

            if (!Domain.Comum.Texto.EmailValido(endereco))
            {
                return Resultado<Fornecedor>.Erro(Codigos.Validacao, "Informe um e-mail válido.");
            }

            fornecedor.Emails.Add(new EmailFornecedor
            {
                Id = Guid.NewGuid(),
                FornecedorId = id,
                Endereco = endereco,
            });
        }

        foreach (var orcamento in pedido.Orcamentos ?? [])
        {
            var titulo = Domain.Comum.Texto.Limpo(orcamento.Titulo);
            if (titulo is null)
            {
                continue;
            }

            fornecedor.Orcamentos.Add(new OrcamentoFornecedor
            {
                Id = Guid.NewGuid(),
                FornecedorId = id,
                Titulo = titulo,
                Link = Domain.Comum.Texto.Limpo(orcamento.Link),
                AnexoId = orcamento.AnexoId,
                VisivelClientes = orcamento.VisivelClientes ?? false,
            });
        }

        return Resultado<Fornecedor>.Sucesso(fornecedor);
    }

    private static void Copiar(Fornecedor destino, Fornecedor origem)
    {
        destino.Nome = origem.Nome;
        destino.FotoId = origem.FotoId;
        destino.RazaoSocial = origem.RazaoSocial;
        destino.Cnpj = origem.Cnpj;
        destino.Cpf = origem.Cpf;
        destino.NomeResponsavel = origem.NomeResponsavel;
        destino.PrecoDe = origem.PrecoDe;
        destino.PrecoAte = origem.PrecoAte;
        destino.Site = origem.Site;
        destino.Facebook = origem.Facebook;
        destino.Instagram = origem.Instagram;
        destino.Youtube = origem.Youtube;
        destino.Pinterest = origem.Pinterest;
        destino.Pais = origem.Pais;
        destino.Cep = origem.Cep;
        destino.Endereco = origem.Endereco;
        destino.Numero = origem.Numero;
        destino.Estado = origem.Estado;
        destino.Cidade = origem.Cidade;
        destino.Bairro = origem.Bairro;
        destino.Complemento = origem.Complemento;
        destino.Banco = origem.Banco;
        destino.Agencia = origem.Agencia;
        destino.ContaBancaria = origem.ContaBancaria;
        destino.TitularConta = origem.TitularConta;
        destino.TipoConta = origem.TipoConta;
        destino.DocumentosBancarios = origem.DocumentosBancarios;
        destino.PixTipo = origem.PixTipo;
        destino.PixChave = origem.PixChave;
        destino.Diferencial = origem.Diferencial;
        destino.DiferencialVisivelCliente = origem.DiferencialVisivelCliente;
        destino.InformacoesGerais = origem.InformacoesGerais;
        destino.Portfolio = origem.Portfolio;
        destino.Telefones.Clear();
        foreach (var telefone in origem.Telefones)
        {
            destino.Telefones.Add(telefone);
        }

        destino.Emails.Clear();
        foreach (var email in origem.Emails)
        {
            destino.Emails.Add(email);
        }

        destino.Orcamentos.Clear();
        foreach (var orcamento in origem.Orcamentos)
        {
            destino.Orcamentos.Add(orcamento);
        }

        destino.Servicos.Clear();
        foreach (var servico in origem.Servicos)
        {
            destino.Servicos.Add(servico);
        }
    }

    private async Task<FornecedorLeitura> LerAsync(Guid contaId, Fornecedor fornecedor, CancellationToken ct)
    {
        var nomes = await dados.NomesServicosContaAsync(
            contaId,
            fornecedor.Servicos.Select(item => item.ServicoContaId),
            ct);
        return new FornecedorLeitura(
            fornecedor.Id,
            fornecedor.Nome,
            fornecedor.FotoId,
            fornecedor.RazaoSocial,
            fornecedor.Cnpj,
            fornecedor.Cpf,
            fornecedor.NomeResponsavel,
            fornecedor.PrecoDe,
            fornecedor.PrecoAte,
            fornecedor.Site,
            fornecedor.Facebook,
            fornecedor.Instagram,
            fornecedor.Youtube,
            fornecedor.Pinterest,
            fornecedor.Pais,
            fornecedor.Cep,
            fornecedor.Endereco,
            fornecedor.Numero,
            fornecedor.Estado,
            fornecedor.Cidade,
            fornecedor.Bairro,
            fornecedor.Complemento,
            fornecedor.Banco,
            fornecedor.Agencia,
            fornecedor.ContaBancaria,
            fornecedor.TitularConta,
            fornecedor.TipoConta,
            fornecedor.DocumentosBancarios,
            fornecedor.PixTipo,
            fornecedor.PixChave,
            fornecedor.Diferencial,
            fornecedor.DiferencialVisivelCliente,
            fornecedor.InformacoesGerais,
            fornecedor.Portfolio,
            fornecedor.CadastroCompleto,
            fornecedor.Servicos.Select(item => item.ServicoContaId).ToArray(),
            fornecedor.Servicos
                .Select(item => nomes.GetValueOrDefault(item.ServicoContaId, ""))
                .Where(texto => texto.Length > 0)
                .ToArray(),
            fornecedor.Telefones.Select(item => new TelefoneFornecedorLeitura(
                item.Id, item.Responsavel, item.Ddi, item.Numero, item.Movel)).ToArray(),
            fornecedor.Emails.Select(item => new EmailFornecedorLeitura(item.Id, item.Endereco)).ToArray(),
            fornecedor.Orcamentos.Select(item => new OrcamentoFornecedorLeitura(
                item.Id, item.Titulo, item.Link, item.AnexoId, item.VisivelClientes)).ToArray());
    }
}
