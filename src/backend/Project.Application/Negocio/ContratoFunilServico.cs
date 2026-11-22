using Project.Application.Comum;
using Project.Domain.Contratos;
using Project.Domain.Dinheiro;
using Project.Domain.Funil;

namespace Project.Application.Negocio;

public sealed record ContratoFunilLeitura(
    Guid Id,
    Guid OportunidadeId,
    string OportunidadeNome,
    string Conteudo,
    string Situacao,
    DateTimeOffset CriadoEm,
    DateTimeOffset? EnviadoEm,
    DateTimeOffset? AssinadoEm,
    Guid? ModeloId,
    string? CriadoPor = null,
    IReadOnlyList<ParcelaContratoLeitura>? Parcelas = null,
    decimal ValorTotal = 0,
    decimal Recebido = 0,
    decimal Saldo = 0,
    string? OportunidadeTelefone = null,
    string? ChavePix = null,
    Guid? LogoArquivoId = null,
    Guid? FundoArquivoId = null);

public sealed record SalvarContratoFunil(Guid? OportunidadeId, string? Conteudo, Guid? ModeloId);

/// <summary>Modelo de contrato da tela única "Modelos de Contrato" (SPEC-039), como o contrato do funil o enxerga.</summary>
public sealed record ModeloParaContratoFunil(Guid Id, string Nome, string Texto);

/// <summary>Contratos das oportunidades. O modelo vem da tela única de modelos de contrato (SPEC-039).</summary>
public sealed class ContratoFunilServico(IDados dados, IDadosContrato modelos)
{
    /// <summary>Modelos da conta para escolher ao criar o contrato (a assistente também escolhe, sem abrir a tela de modelos).</summary>
    public async Task<IReadOnlyList<ModeloParaContratoFunil>> ModelosAsync(string contaId, CancellationToken ct) =>
        (await modelos.ListarAsync(contaId, ct))
            .OrderBy(item => item.Nome, StringComparer.CurrentCultureIgnoreCase)
            .Select(item => new ModeloParaContratoFunil(item.Id, item.Nome, item.Texto))
            .ToArray();

    public async Task<IReadOnlyList<ContratoFunilLeitura>> ListarAsync(
        string contaId,
        string? situacao,
        string? busca,
        DateOnly? criadoDe,
        DateOnly? criadoAte,
        CancellationToken ct)
    {
        SituacaoContratoFunil? filtro = null;
        if (!string.IsNullOrWhiteSpace(situacao) &&
            Enum.TryParse<SituacaoContratoFunil>(situacao, true, out var lido) &&
            Enum.IsDefined(lido))
        {
            filtro = lido;
        }

        var itens = await dados.ListarContratosFunilAsync(contaId, filtro, busca, criadoDe, criadoAte, ct);
        var nomes = await dados.NomesOportunidadesAsync(contaId, itens.Select(i => i.OportunidadeId), ct);
        return itens.Select(item => Ler(item, nomes.GetValueOrDefault(item.OportunidadeId, ""))).ToArray();
    }

    public async Task<Resultado<ContratoFunilLeitura>> ObterAsync(string contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterContratoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var nomes = await dados.NomesOportunidadesAsync(contaId, [item.OportunidadeId], ct);
        return Resultado<ContratoFunilLeitura>.Sucesso(await LerComDetalheAsync(contaId, item, nomes.GetValueOrDefault(item.OportunidadeId, ""), ct));
    }

    public async Task<Resultado<ContratoFunilLeitura>> CriarAsync(string contaId, SalvarContratoFunil pedido, CancellationToken ct, string? criadoPor = null)
    {
        if (pedido.OportunidadeId is not Guid oportunidadeId ||
            await dados.ObterOportunidadeAsync(contaId, oportunidadeId, ct) is not { } oportunidade)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Informe a oportunidade.");
        }

        // Só gera com orçamento aprovado e dados do contratante completos (SPEC-050 §6.1).
        var aprovado = await dados.OrcamentoAprovadoDaOportunidadeAsync(contaId, oportunidadeId, ct);
        if (aprovado is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(
                Codigos.Validacao,
                "Esta oportunidade ainda não tem orçamento aprovado. Aprove o orçamento antes de gerar o contrato.");
        }

        var cliente = oportunidade.ClienteId is Guid clienteId ? await dados.ObterClienteAsync(contaId, clienteId, ct) : null;
        var contratante = ContratoPreenchimento.Contratante(oportunidade, cliente);
        var faltam = ContratanteRegras.Faltando(contratante);
        if (faltam.Count > 0)
        {
            return Resultado<ContratoFunilLeitura>.Erro(
                Codigos.Validacao,
                $"Faltam dados do contratante para gerar o contrato: {string.Join(", ", faltam)}. Preencha na oportunidade ou no cadastro do cliente.");
        }

        var conteudo = Domain.Comum.Texto.Limpo(pedido.Conteudo);
        Guid? modeloId = pedido.ModeloId;
        Guid? logoId = null;
        Guid? fundoId = null;
        if (modeloId is Guid mid)
        {
            var modelo = await modelos.ObterAsync(contaId, mid, ct);
            if (modelo is null)
            {
                return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Modelo inválido.");
            }

            conteudo ??= modelo.Texto;
            logoId = modelo.LogoArquivoId;
            fundoId = modelo.FundoArquivoId;
        }

        if (conteudo is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Informe o conteúdo do contrato.");
        }

        var perfil = await dados.ObterPerfilAsync(contaId, ct);
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        conteudo = Mesclagem.Preencher(conteudo, ContratoPreenchimento.Valores(contratante, oportunidade, perfil, aprovado, hoje));

        var item = new ContratoFunil
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            OportunidadeId = oportunidadeId,
            Conteudo = conteudo,
            Situacao = SituacaoContratoFunil.EmAndamento,
            CriadoEm = DateTimeOffset.UtcNow,
            ModeloId = modeloId,
            LogoArquivoId = logoId,
            FundoArquivoId = fundoId,
            CriadoPor = criadoPor,
            Parcelas = (aprovado?.Parcelas ?? [])
                .OrderBy(parcela => parcela.Numero)
                .Select(parcela => new ParcelaContrato
                {
                    Id = Guid.NewGuid(),
                    Numero = parcela.Numero,
                    Vencimento = parcela.Vencimento,
                    Valor = parcela.Valor,
                    Entrada = parcela.Entrada,
                })
                .ToList(),
        };
        await dados.InserirContratoFunilAsync(item, ct);
        return Resultado<ContratoFunilLeitura>.Sucesso(Ler(item, oportunidade.Nome));
    }

    public async Task<Resultado<ContratoFunilLeitura>> AtualizarAsync(
        string contaId,
        Guid id,
        SalvarContratoFunil pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterContratoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (item.Situacao != SituacaoContratoFunil.EmAndamento)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Só contratos em andamento podem ser editados.");
        }

        var conteudo = Domain.Comum.Texto.Limpo(pedido.Conteudo);
        if (conteudo is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Informe o conteúdo do contrato.");
        }

        item.Conteudo = conteudo;
        await dados.SalvarNegocioAsync(ct);
        var nomes = await dados.NomesOportunidadesAsync(contaId, [item.OportunidadeId], ct);
        return Resultado<ContratoFunilLeitura>.Sucesso(Ler(item, nomes.GetValueOrDefault(item.OportunidadeId, "")));
    }

    public Task<Resultado<ContratoFunilLeitura>> EnviarAsync(string contaId, Guid id, CancellationToken ct) =>
        MudarAsync(contaId, id, item =>
        {
            if (item.Situacao != SituacaoContratoFunil.EmAndamento)
            {
                return "Só contratos em andamento podem ser enviados.";
            }

            item.EnviadoEm = DateTimeOffset.UtcNow;
            return null;
        }, ct);

    public Task<Resultado<ContratoFunilLeitura>> AssinarAsync(string contaId, Guid id, CancellationToken ct) =>
        MudarAsync(contaId, id, item =>
        {
            if (item.Situacao != SituacaoContratoFunil.EmAndamento)
            {
                return "Só contratos em andamento podem ser assinados.";
            }

            item.Situacao = SituacaoContratoFunil.Assinado;
            item.AssinadoEm = DateTimeOffset.UtcNow;
            return null;
        }, ct);

    public Task<Resultado<ContratoFunilLeitura>> CancelarAsync(string contaId, Guid id, CancellationToken ct) =>
        MudarAsync(contaId, id, item =>
        {
            if (item.Situacao == SituacaoContratoFunil.Cancelado)
            {
                return "Contrato já cancelado.";
            }

            item.Situacao = SituacaoContratoFunil.Cancelado;
            return null;
        }, ct);

    /// <param name="soCriadoPor">Quando informado (assistente), só exclui o que ele mesmo criou (SPEC-032 §18, passo 1).</param>
    public async Task<Resultado<bool>> ExcluirAsync(string contaId, Guid id, CancellationToken ct, string? soCriadoPor = null)
    {
        var item = await dados.ObterContratoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (soCriadoPor is not null && item.CriadoPor != soCriadoPor)
        {
            return Resultado<bool>.Erro(Codigos.Proibido, "Você só pode excluir o que criou.");
        }

        if (item.Situacao != SituacaoContratoFunil.EmAndamento)
        {
            return Resultado<bool>.Erro(Codigos.Validacao, "Só contratos em andamento podem ser excluídos.");
        }

        await dados.RemoverContratoFunilAsync(item, ct);
        return Resultado<bool>.Sucesso(true);
    }

    private async Task<Resultado<ContratoFunilLeitura>> MudarAsync(
        string contaId,
        Guid id,
        Func<ContratoFunil, string?> aplicar,
        CancellationToken ct)
    {
        var item = await dados.ObterContratoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var erro = aplicar(item);
        if (erro is not null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, erro);
        }

        await dados.SalvarNegocioAsync(ct);
        var nomes = await dados.NomesOportunidadesAsync(contaId, [item.OportunidadeId], ct);
        return Resultado<ContratoFunilLeitura>.Sucesso(Ler(item, nomes.GetValueOrDefault(item.OportunidadeId, "")));
    }


    /// <summary>Registra o que o cliente pagou de uma parcela do contrato (SPEC-040; antigo "Recebi").</summary>
    public async Task<Resultado<ContratoFunilLeitura>> ReceberAsync(
        string contaId,
        Guid contratoId,
        Guid parcelaId,
        ReceberParcela pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterContratoFunilAsync(contaId, contratoId, ct);
        var parcela = item?.Parcelas.FirstOrDefault(p => p.Id == parcelaId);
        if (item is null || parcela is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (item.Situacao == SituacaoContratoFunil.Cancelado)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Contrato cancelado.");
        }

        if (pedido.Valor is not decimal valor || valor <= 0)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Informe o valor recebido.");
        }

        if (valor > parcela.Saldo)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "O valor passa do que falta receber nesta parcela.");
        }

        if (pedido.Forma is not FormaPagamento forma || !Enum.IsDefined(forma))
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Escolha a forma de pagamento.");
        }

        if (pedido.Data is not DateOnly data)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Informe a data do recebimento.");
        }

        var recebimento = new RecebimentoParcela
        {
            Id = Guid.NewGuid(),
            ParcelaId = parcela.Id,
            Valor = decimal.Round(valor, 2, MidpointRounding.AwayFromZero),
            Forma = forma,
            Data = data,
            CriadoEm = DateTimeOffset.UtcNow,
        };
        dados.AdicionarRecebimentoParcela(recebimento);
        await dados.SalvarNegocioAsync(ct);
        // Com EF a parcela rastreada já recebe o recebimento ao salvar; somar de novo dobrava o "recebido" (SPEC-040 §6.2).
        if (!parcela.Recebimentos.Contains(recebimento))
        {
            parcela.Recebimentos.Add(recebimento);
        }
        return await LerAposMudancaAsync(contaId, item, ct);
    }

    /// <summary>
    /// Define (ou refaz) o parcelamento do contrato na Gestão Financeira (SPEC-041). O total é o valor do orçamento
    /// aprovado da oportunidade; "à vista" é uma parcela só. Só vale enquanto não há recebimento registrado.
    /// </summary>
    public async Task<Resultado<ContratoFunilLeitura>> DefinirParcelasAsync(string contaId, Guid id, PedidoParcelas pedido, CancellationToken ct)
    {
        var item = await dados.ObterContratoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (item.Situacao == SituacaoContratoFunil.Cancelado)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Contrato cancelado.");
        }

        if (item.Parcelas.Any(parcela => parcela.Recebimentos.Count > 0))
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Já há recebimento registrado: desfaça os recebimentos antes de refazer o parcelamento.");
        }

        var aprovado = await dados.OrcamentoAprovadoDaOportunidadeAsync(contaId, item.OportunidadeId, ct);
        if (aprovado?.Valor is not decimal total || total <= 0)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Este contrato não tem orçamento aprovado com valor para parcelar.");
        }

        var calculadas = ParcelasDosDocumentos.Gerar(total, pedido);
        if (!calculadas.Ok)
        {
            return Resultado<ContratoFunilLeitura>.Erro(calculadas.Falha!.Codigo, calculadas.Falha.Mensagem);
        }

        var novas = calculadas.Valor!
            .Select(parcela => new ParcelaContrato
            {
                Id = Guid.NewGuid(),
                ContratoFunilId = item.Id,
                Numero = parcela.Numero,
                Vencimento = parcela.Vencimento,
                Valor = parcela.Valor,
                Entrada = parcela.Entrada,
            })
            .ToArray();
        await dados.SubstituirParcelasContratoAsync(item.Id, novas, ct);
        item.Parcelas.Clear();
        item.Parcelas.AddRange(novas);
        return await LerAposMudancaAsync(contaId, item, ct);
    }

    /// <summary>Desfaz o último recebimento da parcela.</summary>
    public async Task<Resultado<ContratoFunilLeitura>> DesfazerRecebimentoAsync(
        string contaId,
        Guid contratoId,
        Guid parcelaId,
        CancellationToken ct)
    {
        var item = await dados.ObterContratoFunilAsync(contaId, contratoId, ct);
        var parcela = item?.Parcelas.FirstOrDefault(p => p.Id == parcelaId);
        if (item is null || parcela is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var ultimo = parcela.Recebimentos.OrderByDescending(r => r.CriadoEm).FirstOrDefault();
        if (ultimo is null)
        {
            return Resultado<ContratoFunilLeitura>.Erro(Codigos.Validacao, "Esta parcela não tem recebimento para desfazer.");
        }

        dados.RemoverRecebimentoParcela(ultimo);
        await dados.SalvarNegocioAsync(ct);
        parcela.Recebimentos.Remove(ultimo);
        return await LerAposMudancaAsync(contaId, item, ct);
    }

    private async Task<Resultado<ContratoFunilLeitura>> LerAposMudancaAsync(string contaId, ContratoFunil item, CancellationToken ct)
    {
        var nomes = await dados.NomesOportunidadesAsync(contaId, [item.OportunidadeId], ct);
        return Resultado<ContratoFunilLeitura>.Sucesso(
            await LerComDetalheAsync(contaId, item, nomes.GetValueOrDefault(item.OportunidadeId, ""), ct));
    }

    /// <summary>Leitura de um contrato só: traz também o telefone do contato e a chave Pix, que o "Cobrar" usa.</summary>
    private async Task<ContratoFunilLeitura> LerComDetalheAsync(string contaId, ContratoFunil item, string oportunidadeNome, CancellationToken ct)
    {
        var oportunidade = await dados.ObterOportunidadeAsync(contaId, item.OportunidadeId, ct);
        var perfil = await dados.ObterPerfilAsync(contaId, ct);
        return Ler(item, oportunidadeNome) with { OportunidadeTelefone = oportunidade?.Contatos.Select(contato => contato.Telefone).FirstOrDefault(telefone => !string.IsNullOrWhiteSpace(telefone)), ChavePix = perfil?.ChavePix };
    }

    private static ContratoFunilLeitura Ler(ContratoFunil item, string oportunidadeNome)
    {
        var hoje = DateOnly.FromDateTime(DateTime.UtcNow);
        return new(
            item.Id,
            item.OportunidadeId,
            oportunidadeNome,
            item.Conteudo,
            item.Situacao.ToString(),
            item.CriadoEm,
            item.EnviadoEm,
            item.AssinadoEm,
            item.ModeloId,
            item.CriadoPor,
            item.Parcelas.OrderBy(parcela => parcela.Numero).Select(parcela => ParcelasDosDocumentos.Ler(parcela, hoje)).ToArray(),
            item.Parcelas.Sum(parcela => parcela.Valor),
            item.Parcelas.Sum(parcela => parcela.Recebido),
            item.Parcelas.Sum(parcela => parcela.Saldo),
            LogoArquivoId: item.LogoArquivoId,
            FundoArquivoId: item.FundoArquivoId);
    }
}
