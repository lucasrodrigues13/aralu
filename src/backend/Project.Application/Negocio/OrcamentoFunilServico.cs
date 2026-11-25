using System.Security.Cryptography;
using Project.Application.Comum;
using Project.Domain.Dinheiro;
using Project.Domain.Funil;

namespace Project.Application.Negocio;

public sealed record OrcamentoFunilLeitura(
    Guid Id,
    Guid OportunidadeId,
    string OportunidadeNome,
    string Conteudo,
    decimal? Valor,
    string Situacao,
    DateTimeOffset CriadoEm,
    DateTimeOffset? EnviadoEm,
    DateTimeOffset? RespondidoEm,
    Guid? ModeloId,
    string? TokenLink = null,
    DateTimeOffset? ValidoAte = null,
    DateTimeOffset? AbertoEm = null,
    string? SituacaoProposta = null,
    string? RespostaMensagem = null,
    DateTimeOffset? RespostaEm = null,
    string? CriadoPor = null,
    IReadOnlyList<ParcelaOrcamentoLeitura>? Parcelas = null);

public sealed record SalvarOrcamentoFunil(
    Guid? OportunidadeId,
    string? Conteudo,
    decimal? Valor,
    Guid? ModeloId);

/// <summary>Situação da proposta por link no cartão do lead (SPEC-031 §6.6, item 6).</summary>
public sealed record PropostaResumo(
    Guid OrcamentoId,
    string Situacao,
    DateTimeOffset? AbertaEm,
    string? Mensagem,
    DateTimeOffset? RespondidaEm,
    string? TokenLink = null);

/// <summary>
/// O que a página pública da proposta mostra. <c>Estado</c>: Disponivel, Vencida ou Cancelada.
/// Vencida e Cancelada só trazem a marca e o contato da assessoria.
/// </summary>
public sealed record PropostaPublica(
    string Estado,
    string? Empresa,
    string? Contato,
    string? Titulo,
    string? Conteudo,
    decimal? Valor,
    DateTimeOffset? ValidoAte,
    string? Resposta,
    string? RespostaMensagem,
    DateTimeOffset? RespostaEm,
    bool DaPropriaConta = false,
    IReadOnlyList<ParcelaOrcamentoLeitura>? Parcelas = null,
    ContratanteDados? Contratante = null,
    string? PaginaAceite = null);

/// <summary>Resposta à proposta. <c>Contratante</c> só vale no aceite pelo link (SPEC-049).</summary>
public sealed record ResponderProposta(string? Tipo, string? Mensagem, ContratanteDados? Contratante = null);

public sealed class OrcamentoFunilServico(IDados dados)
{
    public const int LimiteMensagem = 1000;

    public async Task<IReadOnlyList<OrcamentoFunilLeitura>> ListarAsync(
        string contaId,
        string? situacao,
        string? busca,
        DateOnly? criadoDe,
        DateOnly? criadoAte,
        CancellationToken ct)
    {
        SituacaoOrcamentoFunil? filtro = null;
        if (!string.IsNullOrWhiteSpace(situacao) &&
            Enum.TryParse<SituacaoOrcamentoFunil>(situacao, true, out var lido) &&
            Enum.IsDefined(lido))
        {
            filtro = lido;
        }

        var itens = await dados.ListarOrcamentosFunilAsync(contaId, filtro, busca, criadoDe, criadoAte, ct);
        var nomes = await dados.NomesOportunidadesAsync(contaId, itens.Select(i => i.OportunidadeId), ct);
        return itens.Select(item => Ler(item, nomes.GetValueOrDefault(item.OportunidadeId, ""))).ToArray();
    }

    public async Task<Resultado<OrcamentoFunilLeitura>> ObterAsync(string contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterOrcamentoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<OrcamentoFunilLeitura>.Sucesso(await LerAsync(contaId, item, ct));
    }

    /// <summary>Texto do modelo com os parâmetros trocados pelos dados do lead (SPEC-031 §17, ponto 12).</summary>
    public async Task<Resultado<string>> TextoDoModeloAsync(string contaId, Guid modeloId, Guid oportunidadeId, decimal? valor, CancellationToken ct)
    {
        var modelo = await dados.ObterModeloOrcamentoFunilAsync(contaId, modeloId, ct);
        var oportunidade = await dados.ObterOportunidadeAsync(contaId, oportunidadeId, ct);
        if (modelo is null || oportunidade is null)
        {
            return Resultado<string>.Erro(Codigos.Validacao, "Escolha a oportunidade e o modelo.");
        }

        var perfil = await dados.ObterPerfilAsync(contaId, ct);
        return Resultado<string>.Sucesso(ParametrosOrcamento.Aplicar(modelo.Texto, oportunidade, valor, DateOnly.FromDateTime(DateTime.UtcNow), perfil));
    }

    public async Task<Resultado<OrcamentoFunilLeitura>> CriarAsync(string contaId, SalvarOrcamentoFunil pedido, CancellationToken ct, string? criadoPor = null)
    {
        if (pedido.OportunidadeId is not Guid oportunidadeId ||
            await dados.ObterOportunidadeAsync(contaId, oportunidadeId, ct) is not { } oportunidade)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "Informe a oportunidade.");
        }

        if (pedido.Valor is < 0)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "O valor não pode ser negativo.");
        }

        var conteudo = HtmlSeguro.LimparRico(pedido.Conteudo);
        Guid? modeloId = pedido.ModeloId;
        string? htmlAceite = null;
        string? extrasAceite = null;
        if (conteudo is null && modeloId is Guid mid)
        {
            var modelo = await dados.ObterModeloOrcamentoFunilAsync(contaId, mid, ct);
            if (modelo is null)
            {
                return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "Modelo inválido.");
            }

            htmlAceite = modelo.HtmlAceite;
            extrasAceite = modelo.ExtrasAceite;
            var perfil = await dados.ObterPerfilAsync(contaId, ct);
            conteudo = ParametrosOrcamento.Aplicar(modelo.Texto, oportunidade, pedido.Valor, DateOnly.FromDateTime(DateTime.UtcNow), perfil);
        }
        else if (modeloId is Guid mid2)
        {
            var modelo = await dados.ObterModeloOrcamentoFunilAsync(contaId, mid2, ct);
            if (modelo is null)
            {
                return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "Modelo inválido.");
            }

            htmlAceite = modelo.HtmlAceite;
            extrasAceite = modelo.ExtrasAceite;
        }

        if (conteudo is null)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "Informe o conteúdo do orçamento.");
        }

        var item = new OrcamentoFunil
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            OportunidadeId = oportunidadeId,
            Conteudo = conteudo,
            Valor = pedido.Valor,
            Situacao = SituacaoOrcamentoFunil.EmAndamento,
            CriadoEm = DateTimeOffset.UtcNow,
            ModeloId = modeloId,
            HtmlAceite = htmlAceite,
            ExtrasAceite = extrasAceite,
            CriadoPor = criadoPor,
        };
        await dados.InserirOrcamentoFunilAsync(item, ct);
        return Resultado<OrcamentoFunilLeitura>.Sucesso(Ler(item, oportunidade.Nome));
    }

    public async Task<Resultado<OrcamentoFunilLeitura>> AtualizarAsync(
        string contaId,
        Guid id,
        SalvarOrcamentoFunil pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterOrcamentoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (item.Situacao != SituacaoOrcamentoFunil.EmAndamento)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "Só orçamentos em andamento podem ser editados.");
        }

        var conteudo = HtmlSeguro.LimparRico(pedido.Conteudo);
        if (conteudo is null)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "Informe o conteúdo do orçamento.");
        }

        if (pedido.Valor is < 0)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "O valor não pode ser negativo.");
        }

        var mudou = item.Conteudo != conteudo || item.Valor != pedido.Valor;
        if (item.Valor != pedido.Valor && item.Parcelas.Count > 0)
        {
            // As parcelas foram calculadas sobre o valor antigo: o organizador define de novo (SPEC-040).
            await dados.SubstituirParcelasOrcamentoAsync(item.Id, [], ct);
            item.Parcelas.Clear();
        }

        item.Conteudo = conteudo;
        item.Valor = pedido.Valor;
        if (mudou && item.TokenLink is not null)
        {
            // SPEC-031 §17, ponto 10: o link continua o mesmo e a proposta volta a "ainda não foi aberta".
            // A resposta anterior fica só no histórico.
            item.AbertoEm = null;
            item.Resposta = null;
            item.RespostaMensagem = null;
            item.RespostaEm = null;
        }

        await dados.SalvarNegocioAsync(ct);
        return Resultado<OrcamentoFunilLeitura>.Sucesso(await LerAsync(contaId, item, ct));
    }

    /// <summary>Define as parcelas do orçamento a partir do valor dele (SPEC-040). Substitui as anteriores.</summary>
    public async Task<Resultado<OrcamentoFunilLeitura>> DefinirParcelasAsync(string contaId, Guid id, PedidoParcelas pedido, CancellationToken ct)
    {
        var item = await dados.ObterOrcamentoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (item.Situacao != SituacaoOrcamentoFunil.EmAndamento)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "Só orçamentos em andamento podem ser parcelados.");
        }

        var calculadas = ParcelasDosDocumentos.Gerar(item.Valor, pedido);
        if (!calculadas.Ok)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(calculadas.Falha!.Codigo, calculadas.Falha.Mensagem);
        }

        var novas = calculadas.Valor!
            .Select(parcela => new ParcelaOrcamento
            {
                Id = Guid.NewGuid(),
                OrcamentoFunilId = item.Id,
                Numero = parcela.Numero,
                Vencimento = parcela.Vencimento,
                Valor = parcela.Valor,
                Entrada = parcela.Entrada,
            })
            .ToArray();
        await dados.SubstituirParcelasOrcamentoAsync(item.Id, novas, ct);
        item.Parcelas.Clear();
        item.Parcelas.AddRange(novas);
        if (item.TokenLink is not null)
        {
            // SPEC-042 §17, ponto 1: mudar as parcelas depois de enviar vale como mudar a proposta; o aceite
            // anterior não vale para o novo parcelamento e a proposta volta a "ainda não foi aberta".
            item.AbertoEm = null;
            item.Resposta = null;
            item.RespostaMensagem = null;
            item.RespostaEm = null;
            await dados.SalvarNegocioAsync(ct);
        }

        return Resultado<OrcamentoFunilLeitura>.Sucesso(await LerAsync(contaId, item, ct));
    }

    /// <summary>
    /// Enviar proposta (SPEC-031 §6.6): gera o link no primeiro envio (o mesmo link vale nos reenvios,
    /// com a validade renovada) e leva o lead para "Orçamento enviado" quando ele está antes desse estágio.
    /// </summary>
    public async Task<Resultado<OrcamentoFunilLeitura>> EnviarAsync(string contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterOrcamentoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (item.Situacao == SituacaoOrcamentoFunil.Cancelado)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "Orçamento cancelado não pode ser enviado.");
        }

        var agora = DateTimeOffset.UtcNow;
        item.TokenLink ??= NovoToken();
        item.ValidoAte = agora.Add(OrcamentoFunil.ValidadeLink);
        item.EnviadoEm = agora;

        var oportunidade = await dados.ObterOportunidadeAsync(contaId, item.OportunidadeId, ct);
        if (oportunidade?.EstagioFunil is { Tipo: TipoEstagioFunil.Aberto } atual)
        {
            var estagios = await dados.ListarEstagiosFunilAsync(contaId, ct);
            var alvo = estagios.FirstOrDefault(e =>
                e.Tipo == TipoEstagioFunil.Aberto &&
                string.Equals(e.Nome, EstagiosFunil.NomeOrcamentoEnviado, StringComparison.OrdinalIgnoreCase));
            if (alvo is not null && atual.Ordem < alvo.Ordem)
            {
                OportunidadeServico.ColocarNoEstagio(oportunidade, alvo);
            }
        }

        await dados.SalvarNegocioAsync(ct);
        return Resultado<OrcamentoFunilLeitura>.Sucesso(await LerAsync(contaId, item, ct));
    }

    public Task<Resultado<OrcamentoFunilLeitura>> ResponderAsync(string contaId, Guid id, CancellationToken ct) =>
        MudarAsync(contaId, id, item =>
        {
            if (item.Situacao != SituacaoOrcamentoFunil.EmAndamento)
            {
                return "Só orçamentos em andamento podem receber resposta.";
            }

            item.Situacao = SituacaoOrcamentoFunil.Respondido;
            item.RespondidoEm = DateTimeOffset.UtcNow;
            return null;
        }, ct);

    public Task<Resultado<OrcamentoFunilLeitura>> CancelarAsync(string contaId, Guid id, CancellationToken ct) =>
        MudarAsync(contaId, id, item =>
        {
            if (item.Situacao != SituacaoOrcamentoFunil.EmAndamento)
            {
                return "Só orçamentos em andamento podem ser cancelados.";
            }

            item.Situacao = SituacaoOrcamentoFunil.Cancelado;
            return null;
        }, ct);

    /// <param name="soCriadoPor">Quando informado (assistente), só exclui o que ele mesmo criou (SPEC-032 §18, passo 1).</param>
    public async Task<Resultado<bool>> ExcluirAsync(string contaId, Guid id, CancellationToken ct, string? soCriadoPor = null)
    {
        var item = await dados.ObterOrcamentoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (soCriadoPor is not null && item.CriadoPor != soCriadoPor)
        {
            return Resultado<bool>.Erro(Codigos.Proibido, "Você só pode excluir o que criou.");
        }

        if (item.Situacao != SituacaoOrcamentoFunil.EmAndamento)
        {
            return Resultado<bool>.Erro(Codigos.Validacao, "Só orçamentos em andamento podem ser excluídos.");
        }

        await dados.RemoverOrcamentoFunilAsync(item, ct);
        return Resultado<bool>.Sucesso(true);
    }

    /// <summary>
    /// Página pública da proposta. Registra a primeira abertura, menos quando quem abre é a própria
    /// conta logada (<paramref name="contaDoVisitante"/>).
    /// </summary>
    public async Task<Resultado<PropostaPublica>> PublicaAsync(string token, string? contaDoVisitante, CancellationToken ct)
    {
        var item = await PorTokenAsync(token, ct);
        if (item is null)
        {
            return Resultado<PropostaPublica>.Erro(Codigos.Indisponivel, "Link inválido.");
        }

        var agora = DateTimeOffset.UtcNow;
        if (item.Situacao != SituacaoOrcamentoFunil.Cancelado &&
            item.LinkValido(agora) &&
            item.AbertoEm is null &&
            !DaPropriaConta(item, contaDoVisitante))
        {
            item.AbertoEm = agora;
            await dados.SalvarNegocioAsync(ct);
        }

        return Resultado<PropostaPublica>.Sucesso(
            await LerPublicaAsync(item, agora, ct) with { DaPropriaConta = DaPropriaConta(item, contaDoVisitante) });
    }

    /// <summary>Resposta do lead (SPEC-031 §6.6, itens 5 e 7). Vale a última; todas ficam no histórico.</summary>
    public async Task<Resultado<PropostaPublica>> ResponderPublicaAsync(
        string token,
        string? contaDoVisitante,
        ResponderProposta pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        var item = await PorTokenAsync(token, ct);
        if (item is null)
        {
            return Resultado<PropostaPublica>.Erro(Codigos.Indisponivel, "Link inválido.");
        }

        var agora = DateTimeOffset.UtcNow;
        if (item.Situacao == SituacaoOrcamentoFunil.Cancelado || !item.LinkValido(agora))
        {
            return Resultado<PropostaPublica>.Erro(Codigos.Validacao, "Esta proposta não aceita mais resposta.");
        }

        if (DaPropriaConta(item, contaDoVisitante))
        {
            return Resultado<PropostaPublica>.Erro(
                Codigos.Proibido,
                "Você está logada na conta da assessoria. A resposta é do lead: abra o link numa janela anônima para testar.");
        }

        // Aceitar pede os dados do contratante, para gerar o contrato (SPEC-049 §6.3).
        if (Enum.TryParse<RespostaProposta>(pedido.Tipo, true, out var tipo) && tipo == RespostaProposta.Aceitar)
        {
            var oportunidade = await dados.ObterOportunidadeAsync(item.ContaId, item.OportunidadeId, ct);
            if (oportunidade is null)
            {
                return Resultado<PropostaPublica>.Erro(Codigos.Indisponivel, "Link inválido.");
            }

            if (oportunidade.EstagioFunil?.Tipo == TipoEstagioFunil.Descartado)
            {
                return Resultado<PropostaPublica>.Erro(Codigos.Validacao, "Esta proposta não aceita mais resposta.");
            }

            var normalizado = ContratanteRegras.Normalizar(
                pedido.Contratante ?? ContratanteRegras.Ler(oportunidade),
                hoje.AddDays(1));
            if (!normalizado.Ok)
            {
                return Resultado<PropostaPublica>.Erro(normalizado.Falha!.Codigo, normalizado.Falha.Mensagem);
            }

            var faltam = ContratanteRegras.Faltando(normalizado.Valor!);
            if (faltam.Count > 0)
            {
                return Resultado<PropostaPublica>.Erro(
                    Codigos.Validacao,
                    $"{ContratanteRegras.Justificativa} Falta: {string.Join(", ", faltam)}.");
            }

            ContratanteRegras.Aplicar(oportunidade, normalizado.Valor!);
        }

        if (await GravarRespostaAsync(item, pedido, hoje, agora, lead: true, ct) is { } falha)
        {
            return Resultado<PropostaPublica>.Erro(Codigos.Validacao, falha);
        }

        return Resultado<PropostaPublica>.Sucesso(await LerPublicaAsync(item, agora, ct));
    }

    /// <summary>
    /// Resposta que a assessoria registra por ligação ou conversa (o cliente respondeu fora do link).
    /// Segue as mesmas regras da resposta pelo link, mas não conta como abertura do link.
    /// </summary>
    public async Task<Resultado<OrcamentoFunilLeitura>> RegistrarRespostaAsync(
        string contaId,
        Guid id,
        ResponderProposta pedido,
        DateOnly hoje,
        CancellationToken ct)
    {
        var item = await dados.ObterOrcamentoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (item.Situacao != SituacaoOrcamentoFunil.EmAndamento)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, "Só orçamentos em andamento podem receber resposta.");
        }

        if (await GravarRespostaAsync(item, pedido, hoje, DateTimeOffset.UtcNow, lead: false, ct) is { } falha)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, falha);
        }

        return Resultado<OrcamentoFunilLeitura>.Sucesso(await LerAsync(contaId, item, ct));
    }

    /// <summary>Valida, aplica e grava a resposta. Devolve a mensagem de erro, ou nulo se gravou.</summary>
    private async Task<string?> GravarRespostaAsync(
        OrcamentoFunil item,
        ResponderProposta pedido,
        DateOnly hoje,
        DateTimeOffset agora,
        bool lead,
        CancellationToken ct)
    {
        if (!Enum.TryParse<RespostaProposta>(pedido.Tipo, true, out var tipo) || !Enum.IsDefined(tipo))
        {
            return "Escolha uma resposta.";
        }

        var mensagem = Domain.Comum.Texto.Limpo(pedido.Mensagem);
        if (tipo == RespostaProposta.Duvidas && mensagem is null)
        {
            return lead ? "Escreva a sua dúvida." : "Escreva a dúvida do cliente.";
        }

        if (mensagem is { Length: > LimiteMensagem })
        {
            return $"A mensagem pode ter até {LimiteMensagem} caracteres.";
        }

        if (tipo == RespostaProposta.Aceitar)
        {
            mensagem = null;
        }

        if (lead)
        {
            item.AbertoEm ??= agora;
        }

        item.Resposta = tipo;
        item.RespostaMensagem = mensagem;
        item.RespostaEm = agora;
        if (tipo == RespostaProposta.Duvidas)
        {
            // A conversa continua: o orçamento segue em andamento e pode ser editado.
            item.Situacao = SituacaoOrcamentoFunil.EmAndamento;
            item.RespondidoEm = null;
        }
        else
        {
            item.Situacao = SituacaoOrcamentoFunil.Respondido;
            item.RespondidoEm = agora;
        }

        dados.AdicionarRespostaProposta(new RespostaPropostaFunil
        {
            Id = Guid.NewGuid(),
            ContaId = item.ContaId,
            OrcamentoFunilId = item.Id,
            Tipo = tipo,
            Mensagem = mensagem,
            Em = agora,
        });

        if (tipo == RespostaProposta.Duvidas &&
            await dados.ObterOportunidadeAsync(item.ContaId, item.OportunidadeId, ct) is { EstagioFunil.Tipo: TipoEstagioFunil.Aberto } oportunidade)
        {
            oportunidade.RetornarEm = hoje;
            oportunidade.RetornarHora = null;
        }

        await dados.SalvarNegocioAsync(ct);
        return null;
    }

    public static string? SituacaoProposta(OrcamentoFunil item) =>
        (item.TokenLink is null && item.Resposta is null) || item.Situacao == SituacaoOrcamentoFunil.Cancelado
            ? null
            : item.Resposta switch
            {
                RespostaProposta.Aceitar => "Aceita",
                RespostaProposta.Duvidas => "Duvidas",
                RespostaProposta.Recusar => "Recusada",
                _ => item.AbertoEm is null ? "NaoAberta" : "Aberta",
            };

    public static PropostaResumo? Resumo(OrcamentoFunil? item) =>
        item is null || SituacaoProposta(item) is not { } situacao
            ? null
            : new PropostaResumo(item.Id, situacao, item.AbertoEm, item.RespostaMensagem, item.RespostaEm, item.TokenLink);

    private async Task<OrcamentoFunil?> PorTokenAsync(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 64)
        {
            return null;
        }

        return await dados.OrcamentoFunilPorTokenAsync(token, ct);
    }

    private static bool DaPropriaConta(OrcamentoFunil item, string? contaDoVisitante) =>
        !string.IsNullOrEmpty(contaDoVisitante) && contaDoVisitante == item.ContaId;

    private async Task<PropostaPublica> LerPublicaAsync(OrcamentoFunil item, DateTimeOffset agora, CancellationToken ct)
    {
        var perfil = await dados.ObterPerfilAsync(item.ContaId, ct);
        var empresa = perfil?.NomeEmpresa;
        var contato = perfil?.Celular;
        if (item.Situacao == SituacaoOrcamentoFunil.Cancelado)
        {
            return new PropostaPublica("Cancelada", empresa, contato, null, null, null, null, null, null, null);
        }

        if (!item.LinkValido(agora))
        {
            return new PropostaPublica("Vencida", empresa, contato, null, null, null, item.ValidoAte, null, null, null);
        }

        var nomes = await dados.NomesOportunidadesAsync(item.ContaId, [item.OportunidadeId], ct);
        var oportunidade = await dados.ObterOportunidadeAsync(item.ContaId, item.OportunidadeId, ct);
        var parcelas = item.Parcelas
            .OrderBy(parcela => parcela.Numero)
            .Select(parcela => new ParcelaOrcamentoLeitura(parcela.Numero, parcela.Vencimento, parcela.Valor, parcela.Entrada))
            .ToArray();
        string? pagina = null;
        if (HtmlSeguro.SanitizarPagina(item.HtmlAceite) is { Length: > 0 } htmlPagina && oportunidade is not null)
        {
            var modelo = item.ModeloId is Guid modeloId ? await dados.ObterModeloOrcamentoFunilAsync(item.ContaId, modeloId, ct) : null;
            var validade = DateOnly.FromDateTime((item.ValidoAte ?? agora).UtcDateTime);
            pagina = PaginaAceite.Montar(new DadosPaginaAceite(
                htmlPagina,
                ParametrosOrcamento.Valores(oportunidade, item.Valor, validade, perfil, parcelas, validadeJaCalculada: true),
                ExtrasAceite.Ler(item.ExtrasAceite),
                perfil?.FotoId,
                item.Conteudo,
                item.Valor,
                parcelas,
                modelo?.CorPrimaria,
                modelo?.CorSecundaria,
                Previa: false));
        }

        return new PropostaPublica(
            "Disponivel",
            empresa,
            contato,
            nomes.GetValueOrDefault(item.OportunidadeId),
            item.Conteudo,
            item.Valor,
            item.ValidoAte,
            item.Resposta?.ToString(),
            item.RespostaMensagem,
            item.RespostaEm,
            Parcelas: parcelas,
            Contratante: oportunidade is null ? null : ContratanteRegras.Ler(oportunidade),
            PaginaAceite: pagina);
    }

    /// <summary>Foto da página de aceite pelo link da proposta: só as do orçamento (e o logo do perfil). SPEC-061 §8.5.</summary>
    public async Task<(string ContaId, Guid ArquivoId)?> MidiaPublicaAsync(string token, Guid arquivoId, CancellationToken ct)
    {
        var item = await PorTokenAsync(token, ct);
        if (item is null || item.Situacao == SituacaoOrcamentoFunil.Cancelado || !item.LinkValido(DateTimeOffset.UtcNow))
        {
            return null;
        }

        if (ExtrasAceite.Ler(item.ExtrasAceite).Midias.Any(m => m.ArquivoId == arquivoId))
        {
            return (item.ContaId, arquivoId);
        }

        var perfil = await dados.ObterPerfilAsync(item.ContaId, ct);
        return perfil?.FotoId == arquivoId ? (item.ContaId, arquivoId) : null;
    }

    private async Task<Resultado<OrcamentoFunilLeitura>> MudarAsync(
        string contaId,
        Guid id,
        Func<OrcamentoFunil, string?> aplicar,
        CancellationToken ct)
    {
        var item = await dados.ObterOrcamentoFunilAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var erro = aplicar(item);
        if (erro is not null)
        {
            return Resultado<OrcamentoFunilLeitura>.Erro(Codigos.Validacao, erro);
        }

        await dados.SalvarNegocioAsync(ct);
        return Resultado<OrcamentoFunilLeitura>.Sucesso(await LerAsync(contaId, item, ct));
    }

    private async Task<OrcamentoFunilLeitura> LerAsync(string contaId, OrcamentoFunil item, CancellationToken ct)
    {
        var nomes = await dados.NomesOportunidadesAsync(contaId, [item.OportunidadeId], ct);
        return Ler(item, nomes.GetValueOrDefault(item.OportunidadeId, ""));
    }

    private static string NovoToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static OrcamentoFunilLeitura Ler(OrcamentoFunil item, string oportunidadeNome) =>
        new(
            item.Id,
            item.OportunidadeId,
            oportunidadeNome,
            item.Conteudo,
            item.Valor,
            item.Situacao.ToString(),
            item.CriadoEm,
            item.EnviadoEm,
            item.RespondidoEm,
            item.ModeloId,
            item.TokenLink,
            item.ValidoAte,
            item.AbertoEm,
            SituacaoProposta(item),
            item.RespostaMensagem,
            item.RespostaEm,
            item.CriadoPor,
            item.Parcelas
                .OrderBy(parcela => parcela.Numero)
                .Select(parcela => new ParcelaOrcamentoLeitura(parcela.Numero, parcela.Vencimento, parcela.Valor, parcela.Entrada))
                .ToArray());
}
