using Project.Application.Comum;
using Project.Application.Convidados;
using Project.Domain.Convidados;
using Project.Domain.Eventos;

namespace Project.Application.Negocio;

public sealed record ConvidadoPedido(
    string? Nome,
    string? Ddi,
    string? Celular,
    SituacaoConvidado? Situacao,
    string? Mesa,
    GeneroConvidado? Genero,
    FaixaEtaria? Faixa,
    CustoConvidado? Custo,
    string? Cpf,
    string? Observacao);

public sealed record ConvidadoLeitura(
    Guid Id,
    string Nome,
    string? Ddi,
    string? Celular,
    SituacaoConvidado Situacao,
    string SituacaoTela,
    string SituacaoIcone,
    string? Mesa,
    GeneroConvidado? Genero,
    FaixaEtaria? Faixa,
    CustoConvidado? Custo,
    string? Cpf,
    string? Observacao,
    bool Principal);

public sealed record ConviteLeitura(
    Guid Id,
    Guid EventoId,
    string Nome,
    string? Observacao,
    string? Telefone,
    string Token,
    bool Acessada,
    bool Respondida,
    IReadOnlyList<ConvidadoLeitura> Convidados,
    string? Email = null,
    bool ExcecaoPrazoRsvp = false);

public sealed record TotaisLeitura(string Rotulo, int Quantidade);

public sealed record ListaConvites(
    IReadOnlyList<ConviteLeitura> Convites,
    IReadOnlyList<TotaisLeitura> PorSituacao,
    IReadOnlyList<TotaisLeitura> PorFaixa,
    IReadOnlyList<TotaisLeitura> PorCusto,
    IReadOnlyList<string> Mesas,
    DateOnly? PrazoRsvp = null,
    bool PrazoEncerrado = false,
    DateOnly? DataEnvioConvites = null);

/// <summary>Página pública do RSVP. Expirado = prazo vencido sem exceção: não traz convidados (SPEC-054).</summary>
public sealed record RsvpPublico(
    string Convite,
    IReadOnlyList<ConvidadoPublico> Convidados,
    bool Expirado = false,
    DateOnly? Prazo = null);

public sealed record PrazoRsvpPedido(DateOnly? Prazo);

public sealed record ExcecaoRsvpPedido(bool Liberada);

public sealed record PrazoRsvpLeitura(DateOnly? Prazo, bool Encerrado);

/// <summary>Data de envio dos convites do evento (SPEC-059); nula remove.</summary>
public sealed record EnvioConvitesPedido(DateOnly? Data);

public sealed record EnvioConvitesLeitura(DateOnly? Data);

public sealed record PresencaLeitura(
    Guid Id,
    Guid ConviteId,
    string Convite,
    Guid ConvidadoId,
    string Convidado,
    DateTimeOffset ConfirmadoEm,
    DateTimeOffset? CompareceuEm = null);

public sealed record ConvidadoPublico(Guid Id, string Nome, SituacaoConvidado Situacao);

public sealed record RespostaRsvp(Guid ConvidadoId, SituacaoConvidado Situacao);

public sealed record WhatsAppLeitura(string? Url);

/// <summary>Resultado de processar uma planilha (SPEC-059): convites gravados ou todos os erros, com o número da linha.</summary>
public sealed record ResultadoImportacao(int Convites, IReadOnlyList<string> Erros)
{
    public static ResultadoImportacao Falha(string erro) => new(0, [erro]);
}

public sealed class ConviteServico(IDados dados, IPlanilhaConvites planilha, IGeradorQr qr)
{
    public async Task<Resultado<ListaConvites>> ListarAsync(
        string contaId,
        Guid eventoId,
        FiltroConvites filtro,
        DateOnly hoje,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<ListaConvites>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var convites = await dados.ListarConvitesAsync(contaId, eventoId, ct);
        var todos = convites.SelectMany(convite => convite.Convidados).ToArray();
        var filtrados = convites
            .Select(convite => Filtrar(convite, filtro))
            .Where(convite => convite is not null)
            .Cast<Convite>()
            .Select(Ler)
            .ToArray();

        return Resultado<ListaConvites>.Sucesso(new ListaConvites(
            filtrados,
            Contar(todos, item => Rotulos.SituacaoTela(item.Situacao)),
            Contar(todos.Where(item => item.Faixa is not null), item => RotuloFaixa(item.Faixa!.Value)),
            Contar(todos.Where(item => item.Custo is not null), item => RotuloCusto(item.Custo!.Value)),
            todos.Select(item => Domain.Comum.Texto.Limpo(item.Mesa)).OfType<string>().Distinct(StringComparer.OrdinalIgnoreCase).ToArray(),
            evento.PrazoRsvp,
            PrazoDoRsvp.Encerrado(evento.PrazoRsvp, hoje),
            evento.DataEnvioConvites));
    }

    /// <summary>Define ou remove a data de envio dos convites, uma só para o evento (SPEC-059).</summary>
    public async Task<Resultado<EnvioConvitesLeitura>> DefinirEnvioAsync(string contaId, Guid eventoId, DateOnly? data, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<EnvioConvitesLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return Resultado<EnvioConvitesLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        evento.DataEnvioConvites = data;
        await dados.SalvarEventoAsync(ct);
        return Resultado<EnvioConvitesLeitura>.Sucesso(new EnvioConvitesLeitura(data));
    }

    /// <summary>Define ou remove a data limite de confirmação do evento (SPEC-054).</summary>
    public async Task<Resultado<PrazoRsvpLeitura>> DefinirPrazoAsync(string contaId, Guid eventoId, DateOnly? prazo, DateOnly hoje, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<PrazoRsvpLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return Resultado<PrazoRsvpLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        evento.PrazoRsvp = prazo;
        await dados.SalvarEventoAsync(ct);
        return Resultado<PrazoRsvpLeitura>.Sucesso(new PrazoRsvpLeitura(prazo, PrazoDoRsvp.Encerrado(prazo, hoje)));
    }

    /// <summary>Abre ou fecha a exceção do prazo para o link de um convite (SPEC-054).</summary>
    public async Task<Resultado<ConviteLeitura>> DefinirExcecaoAsync(string contaId, Guid conviteId, bool liberada, CancellationToken ct)
    {
        var convite = await dados.ObterConviteAsync(contaId, conviteId, ct);
        if (convite is null)
        {
            return Resultado<ConviteLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        convite.ExcecaoPrazoRsvp = liberada;
        await dados.SalvarConvitesAsync(ct);
        return Resultado<ConviteLeitura>.Sucesso(Ler(convite));
    }

    /// <summary>Lista de presença do evento: uma entrada por convidado confirmado (SPEC-054).</summary>
    public async Task<Resultado<IReadOnlyList<PresencaLeitura>>> ListarPresencasAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        if (!await dados.EventoDaContaAsync(contaId, eventoId, ct))
        {
            return Resultado<IReadOnlyList<PresencaLeitura>>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<IReadOnlyList<PresencaLeitura>>.Sucesso(await dados.ListarPresencasAsync(contaId, eventoId, ct));
    }

    /// <summary>Cria o convite pelo formulário único (SPEC-059); a observação é livre para a organizadora.</summary>
    public async Task<Resultado<ConviteLeitura>> CriarAsync(string contaId, Guid eventoId, FormularioConvitePedido pedido, CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return Resultado<ConviteLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return Resultado<ConviteLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        var validado = FormularioConvite.Validar(pedido);
        if (!validado.Ok)
        {
            return Resultado<ConviteLeitura>.Erro(validado.Falha!.Codigo, validado.Falha.Mensagem);
        }

        var convite = new Convite
        {
            Id = Guid.NewGuid(),
            EventoId = evento.Id,
            ContaId = contaId,
            Observacao = Domain.Comum.Texto.Limpo(pedido.Observacao),
            Token = Guid.NewGuid().ToString("N"),
        };
        FormularioConvite.Aplicar(convite, validado.Valor!, pedido);
        await dados.InserirConvitesAsync([convite], ct);
        return Resultado<ConviteLeitura>.Sucesso(Ler(convite));
    }

    /// <summary>Edita pelo mesmo formulário da criação (SPEC-059): convidados mantêm situação, mesa e demais dados.</summary>
    public async Task<Resultado<ConviteLeitura>> AtualizarAsync(string contaId, Guid id, FormularioConvitePedido pedido, CancellationToken ct)
    {
        var convite = await dados.ObterConviteAsync(contaId, id, ct);
        if (convite is null)
        {
            return Resultado<ConviteLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var evento = await dados.ObterEventoAsync(contaId, convite.EventoId, ct);
        if (evento is null || evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return Resultado<ConviteLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        var validado = FormularioConvite.Validar(pedido);
        if (!validado.Ok)
        {
            return Resultado<ConviteLeitura>.Erro(validado.Falha!.Codigo, validado.Falha.Mensagem);
        }

        var aplicado = FormularioConvite.Aplicar(convite, validado.Valor!, pedido);
        if (!aplicado.Ok)
        {
            return Resultado<ConviteLeitura>.Erro(aplicado.Falha!.Codigo, aplicado.Falha.Mensagem);
        }

        convite.Observacao = Domain.Comum.Texto.Limpo(pedido.Observacao);
        foreach (var incluido in aplicado.Valor!.Incluidos)
        {
            await dados.IncluirConvidadoAsync(incluido, ct);
        }

        foreach (var removido in aplicado.Valor.Removidos)
        {
            await dados.RemoverConvidadoAsync(removido, ct);
        }

        await dados.SalvarConvitesAsync(ct);
        return Resultado<ConviteLeitura>.Sucesso(Ler(convite));
    }

    public async Task<Resultado<ConvidadoLeitura>> SalvarConvidadoAsync(
        string contaId,
        Guid conviteId,
        Guid? convidadoId,
        ConvidadoPedido pedido,
        CancellationToken ct)
    {
        var convite = await dados.ObterConviteAsync(contaId, conviteId, ct);
        if (convite is null)
        {
            return Resultado<ConvidadoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (!await dados.EventoEmAndamentoAsync(convite.EventoId, ct))
        {
            return Resultado<ConvidadoLeitura>.Erro(Codigos.Validacao, "O evento não está em andamento.");
        }

        var montado = MontarConvidado(pedido);
        if (!montado.Ok)
        {
            return Resultado<ConvidadoLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        Convidado convidado;
        if (convidadoId is Guid id)
        {
            var existente = convite.Convidados.FirstOrDefault(item => item.Id == id);
            if (existente is null)
            {
                return Resultado<ConvidadoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
            }

            convidado = existente;
            Copiar(convidado, montado.Valor!);
            if (convite.PrincipalId == convidado.Id && !ConviteRegras.TemTelefone(convidado.Celular))
            {
                convite.PrincipalId = null;
            }
        }
        else
        {
            convidado = montado.Valor!;
            convidado.ConviteId = convite.Id;
            convite.Convidados.Add(convidado);
        }

        await dados.SalvarConvitesAsync(ct);
        return Resultado<ConvidadoLeitura>.Sucesso(LerConvidado(convidado, convite.PrincipalId));
    }

    public async Task<Resultado<ConviteLeitura>> DefinirPrincipalAsync(string contaId, Guid conviteId, Guid convidadoId, CancellationToken ct)
    {
        var convite = await dados.ObterConviteAsync(contaId, conviteId, ct);
        if (convite is null)
        {
            return Resultado<ConviteLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var convidado = convite.Convidados.FirstOrDefault(item => item.Id == convidadoId);
        if (!ConviteRegras.PodeSerPrincipal(convidado is not null, convidado?.Celular))
        {
            return Resultado<ConviteLeitura>.Erro(Codigos.Validacao, "Escolha um convidado deste convite que tenha telefone.");
        }

        convite.PrincipalId = convidadoId;
        await dados.SalvarConvitesAsync(ct);
        return Resultado<ConviteLeitura>.Sucesso(Ler(convite));
    }

    public async Task<Resultado<bool>> RemoverConvidadoAsync(string contaId, Guid id, CancellationToken ct)
    {
        var convidado = await dados.ObterConvidadoAsync(contaId, id, ct);
        if (convidado is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var convite = await dados.ObterConviteAsync(contaId, convidado.ConviteId, ct);
        if (convite is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (convite.PrincipalId == convidado.Id)
        {
            convite.PrincipalId = null;
        }

        convite.Convidados.Remove(convidado);
        await dados.RemoverConvidadoAsync(convidado, ct);
        return Resultado<bool>.Sucesso(true);
    }

    /// <summary>
    /// Lê e grava a planilha (SPEC-059). Junta todos os erros, com o número da linha; com qualquer erro, nada é gravado.
    /// <paramref name="observacaoFixa"/> substitui a observação da planilha (importação pelo link do cliente).
    /// Usado pelo processamento da fila de importações (<see cref="ImportacaoServico"/>).
    /// </summary>
    public async Task<ResultadoImportacao> ProcessarPlanilhaAsync(
        string contaId,
        Guid eventoId,
        Stream arquivo,
        string? nomeArquivo,
        string? observacaoFixa,
        CancellationToken ct)
    {
        var evento = await dados.ObterEventoAsync(contaId, eventoId, ct);
        if (evento is null)
        {
            return ResultadoImportacao.Falha("O evento não foi encontrado.");
        }

        if (evento.Situacao != SituacaoEvento.EmAndamento)
        {
            return ResultadoImportacao.Falha("O evento não está em andamento.");
        }

        var linhas = planilha.Ler(arquivo, nomeArquivo);
        if (!linhas.Ok)
        {
            return ResultadoImportacao.Falha(linhas.Falha!.Mensagem);
        }

        if (linhas.Valor!.Count == 0)
        {
            return ResultadoImportacao.Falha("A planilha não tem convidados.");
        }

        var erros = new List<string>();
        var convites = new Dictionary<string, ConviteDaPlanilha>(StringComparer.OrdinalIgnoreCase);
        foreach (var linha in linhas.Valor)
        {
            var onde = linha.Linha > 0 ? $"Linha {linha.Linha}: " : "";
            var nomeConvite = Domain.Comum.Texto.Limpo(linha.Convite);
            var nomeConvidado = Domain.Comum.Texto.Limpo(linha.Convidado);
            if (PlanilhaConvites.LinhaDeExemplo(nomeConvite, nomeConvidado))
            {
                erros.Add($"{onde}É uma linha de exemplo do modelo. Apague as linhas de exemplo antes de importar.");
                continue;
            }

            if (nomeConvite is null)
            {
                erros.Add($"{onde}Informe o nome do convite.");
                continue;
            }

            if (nomeConvidado is null)
            {
                erros.Add($"{onde}Informe o nome do convidado.");
                continue;
            }

            var convidado = ConvidadoDaPlanilha(linha, nomeConvidado);
            if (!convidado.Ok)
            {
                erros.Add(onde + convidado.Falha!.Mensagem);
                continue;
            }

            var principal = PlanilhaConvites.LerSimNao(linha.Principal);
            if (principal is null)
            {
                erros.Add($"{onde}Em \"Convidado principal\", use Sim ou Não.");
                continue;
            }

            if (!convites.TryGetValue(nomeConvite, out var doConvite))
            {
                doConvite = new ConviteDaPlanilha(new Convite
                {
                    Id = Guid.NewGuid(),
                    EventoId = eventoId,
                    ContaId = contaId,
                    Nome = nomeConvite,
                    Observacao = observacaoFixa ?? Domain.Comum.Texto.Limpo(linha.Observacao),
                    Token = Guid.NewGuid().ToString("N"),
                }, linha.Linha);
                convites[nomeConvite] = doConvite;
            }

            convidado.Valor!.Id = Guid.NewGuid();
            convidado.Valor.ConviteId = doConvite.Convite.Id;
            doConvite.Convite.Convidados.Add(convidado.Valor);
            if (principal != true)
            {
                continue;
            }

            if (doConvite.LinhaDoPrincipal is int anterior)
            {
                erros.Add($"{onde}O convite \"{nomeConvite}\" já tem um convidado principal (linha {anterior}). Marque só um por convite.");
                continue;
            }

            doConvite.LinhaDoPrincipal = linha.Linha;
            if (!ConviteRegras.TemTelefone(convidado.Valor.Celular))
            {
                erros.Add($"{onde}{ConviteRegras.PrincipalSemTelefone}");
                continue;
            }

            doConvite.Convite.PrincipalId = convidado.Valor.Id;
        }

        foreach (var (nome, doConvite) in convites)
        {
            if (doConvite.LinhaDoPrincipal is null)
            {
                erros.Add($"Linha {doConvite.PrimeiraLinha}: O convite \"{nome}\" não tem convidado principal. Marque Sim em um convidado dele.");
            }
        }

        if (erros.Count > 0)
        {
            return new ResultadoImportacao(0, erros);
        }

        await dados.InserirConvitesAsync(convites.Values.Select(item => item.Convite).ToArray(), ct);
        return new ResultadoImportacao(convites.Count, []);
    }

    private sealed class ConviteDaPlanilha(Convite convite, int primeiraLinha)
    {
        public Convite Convite { get; } = convite;

        public int PrimeiraLinha { get; } = primeiraLinha;

        public int? LinhaDoPrincipal { get; set; }
    }

    public byte[] ModeloPlanilha() => planilha.Modelo();

    public async Task<Resultado<byte[]>> QrAsync(string contaId, Guid id, string basePublica, CancellationToken ct)
    {
        var convite = await dados.ObterConviteAsync(contaId, id, ct);
        if (convite is null)
        {
            return Resultado<byte[]>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<byte[]>.Sucesso(qr.Png(Link(basePublica, convite.Token)));
    }

    /// <summary>QR de entrada do convite (SPEC-058): só existe com ao menos um convidado confirmado.</summary>
    public async Task<Resultado<byte[]>> QrEntradaAsync(string contaId, Guid id, CancellationToken ct)
    {
        var convite = await dados.ObterConviteAsync(contaId, id, ct);
        if (convite is null || !convite.Convidados.Any(item => item.Situacao == SituacaoConvidado.Confirmado))
        {
            return Resultado<byte[]>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<byte[]>.Sucesso(qr.Png(PortariaServico.PrefixoQr + convite.Token));
    }

    public async Task<Resultado<WhatsAppLeitura>> WhatsAppAsync(string contaId, Guid id, string basePublica, CancellationToken ct)
    {
        var convite = await dados.ObterConviteAsync(contaId, id, ct);
        if (convite is null)
        {
            return Resultado<WhatsAppLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var principal = convite.Convidados.FirstOrDefault(item => item.Id == convite.PrincipalId);
        if (!ConviteRegras.TemTelefone(principal?.Celular))
        {
            return Resultado<WhatsAppLeitura>.Sucesso(new WhatsAppLeitura(null));
        }

        var digitos = new string($"{principal!.Ddi}{principal.Celular}".Where(char.IsDigit).ToArray());
        var texto = Uri.EscapeDataString($"Confirme presença: {Link(basePublica, convite.Token)}");
        return Resultado<WhatsAppLeitura>.Sucesso(new WhatsAppLeitura($"https://wa.me/{digitos}?text={texto}"));
    }

    public async Task<Resultado<RsvpPublico>> AbrirRsvpAsync(string token, DateOnly hoje, CancellationToken ct)
    {
        var convite = await dados.ObterConvitePorTokenAsync(token, ct);
        if (convite is null || !await dados.EventoEmAndamentoAsync(convite.EventoId, ct))
        {
            return Resultado<RsvpPublico>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var prazo = await dados.PrazoRsvpDoEventoAsync(convite.EventoId, ct);
        if (PrazoDoRsvp.Expirado(prazo, hoje, convite.ExcecaoPrazoRsvp))
        {
            return Resultado<RsvpPublico>.Sucesso(new RsvpPublico(convite.Nome, [], true, prazo));
        }

        if (convite.RespondidoEm is null && convite.AcessadoEm is null)
        {
            convite.AcessadoEm = DateTimeOffset.UtcNow;
            await dados.SalvarConvitesAsync(ct);
        }

        var resumo = await dados.ResumoEventoPorIdAsync(convite.EventoId, ct);
        if (resumo is { } dadosEvento)
        {
            var perfil = await dados.ObterPerfilAsync(dadosEvento.ContaId, ct);
            if (perfil?.CapturaLeadRsvp != false)
            {
                await dados.IncrementarVisualizacaoRsvpAsync(dadosEvento.ContaId, ct);
            }
        }

        return Resultado<RsvpPublico>.Sucesso(new RsvpPublico(
            convite.Nome,
            convite.Convidados.Select(item => new ConvidadoPublico(item.Id, item.Nome, item.Situacao)).ToArray()));
    }

    public async Task<Resultado<RsvpPublico>> ResponderAsync(
        string token,
        IReadOnlyList<RespostaRsvp>? respostas,
        bool? pretendeRealizarEvento,
        DateOnly hoje,
        CancellationToken ct)
    {
        var convite = await dados.ObterConvitePorTokenAsync(token, ct);
        if (convite is null || !await dados.EventoEmAndamentoAsync(convite.EventoId, ct))
        {
            return Resultado<RsvpPublico>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (PrazoDoRsvp.Expirado(await dados.PrazoRsvpDoEventoAsync(convite.EventoId, ct), hoje, convite.ExcecaoPrazoRsvp))
        {
            return Resultado<RsvpPublico>.Erro(Codigos.Validacao, "O prazo para confirmar presença terminou.");
        }

        if (respostas is null || respostas.Count == 0)
        {
            return Resultado<RsvpPublico>.Erro(Codigos.Validacao, "Não foi possível salvar.");
        }

        foreach (var resposta in respostas)
        {
            if (resposta.Situacao is not (SituacaoConvidado.Confirmado or SituacaoConvidado.NaoComparecera))
            {
                return Resultado<RsvpPublico>.Erro(Codigos.Validacao, "Informe se a pessoa comparece.");
            }

            var convidado = convite.Convidados.FirstOrDefault(item => item.Id == resposta.ConvidadoId);
            if (convidado is null)
            {
                return Resultado<RsvpPublico>.Erro(Codigos.Indisponivel, "Indisponível.");
            }

            convidado.Situacao = resposta.Situacao;
        }

        convite.RespondidoEm = DateTimeOffset.UtcNow;
        await dados.SalvarConvitesAsync(ct);

        if (pretendeRealizarEvento == true)
        {
            var resumo = await dados.ResumoEventoPorIdAsync(convite.EventoId, ct);
            if (resumo is { } dadosEvento)
            {
                var perfil = await dados.ObterPerfilAsync(dadosEvento.ContaId, ct);
                if (perfil?.CapturaLeadRsvp != false)
                {
                    var telefone = convite.Convidados
                        .Select(item => Domain.Comum.Texto.Limpo(item.Celular))
                        .FirstOrDefault(item => item is not null);
                    await dados.InserirLeadRsvpAsync(new Domain.Funil.LeadRsvp
                    {
                        Id = Guid.NewGuid(),
                        ContaId = dadosEvento.ContaId,
                        ConviteId = convite.Id,
                        EventoId = convite.EventoId,
                        NomeConvite = convite.Nome,
                        NomeEvento = dadosEvento.Nome,
                        Telefone = telefone,
                        CriadoEm = DateTimeOffset.UtcNow,
                        Situacao = Domain.Funil.SituacaoLeadRsvp.Ativo,
                    }, ct);
                    await dados.IncrementarCliqueRsvpAsync(dadosEvento.ContaId, ct);
                }
            }
        }

        return Resultado<RsvpPublico>.Sucesso(new RsvpPublico(
            convite.Nome,
            convite.Convidados.Select(item => new ConvidadoPublico(item.Id, item.Nome, item.Situacao)).ToArray()));
    }

    private static Resultado<Convidado> MontarConvidado(ConvidadoPedido pedido)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<Convidado>.Erro(Codigos.Validacao, "Informe o nome do convidado.");
        }

        if (pedido.Situacao is SituacaoConvidado situacao && !Enum.IsDefined(situacao))
        {
            return Resultado<Convidado>.Erro(Codigos.Validacao, "A situação do convidado não é válida.");
        }

        if (!EnumOpcional(pedido.Genero) || !EnumOpcional(pedido.Faixa) || !EnumOpcional(pedido.Custo))
        {
            return Resultado<Convidado>.Erro(Codigos.Validacao, "Há um valor de convidado que não faz parte da lista.");
        }

        var cpf = Documentos.Cpf(pedido.Cpf);
        if (cpf == "")
        {
            return Resultado<Convidado>.Erro(Codigos.Validacao, "Informe um CPF válido.");
        }

        return Resultado<Convidado>.Sucesso(new Convidado
        {
            Nome = nome,
            Ddi = Domain.Comum.Texto.Limpo(pedido.Ddi),
            Celular = Domain.Comum.Texto.Limpo(pedido.Celular),
            Situacao = pedido.Situacao ?? SituacaoConvidado.Pendente,
            Mesa = Domain.Comum.Texto.Limpo(pedido.Mesa),
            Genero = pedido.Genero,
            Faixa = pedido.Faixa,
            Custo = pedido.Custo,
            Cpf = cpf,
            Observacao = Domain.Comum.Texto.Limpo(pedido.Observacao),
        });
    }

    private static Resultado<Convidado> ConvidadoDaPlanilha(LinhaPlanilha linha, string nome)
    {
        SituacaoConvidado situacao = SituacaoConvidado.Pendente;
        if (!Domain.Comum.Texto.Vazio(linha.Situacao))
        {
            var lida = Rotulos.Situacao(linha.Situacao);
            if (lida is null)
            {
                return Resultado<Convidado>.Erro(Codigos.Validacao, "A planilha tem uma situação que não faz parte da lista.");
            }

            situacao = lida.Value;
        }

        GeneroConvidado? genero = null;
        if (!Domain.Comum.Texto.Vazio(linha.Genero))
        {
            genero = Rotulos.Genero(linha.Genero);
            if (genero is null)
            {
                return Resultado<Convidado>.Erro(Codigos.Validacao, "A planilha tem um gênero que não faz parte da lista.");
            }
        }

        FaixaEtaria? faixa = null;
        if (!Domain.Comum.Texto.Vazio(linha.Faixa))
        {
            faixa = Rotulos.Faixa(linha.Faixa);
            if (faixa is null)
            {
                return Resultado<Convidado>.Erro(Codigos.Validacao, "A planilha tem uma faixa que não faz parte da lista.");
            }
        }

        return Resultado<Convidado>.Sucesso(new Convidado
        {
            Nome = nome,
            Ddi = Domain.Comum.Texto.Limpo(linha.Ddi),
            Celular = Domain.Comum.Texto.Limpo(linha.Telefone),
            Situacao = situacao,
            Genero = genero,
            Faixa = faixa,
        });
    }

    private static Convite? Filtrar(Convite convite, FiltroConvites filtro)
    {
        var convidados = convite.Convidados.Where(item => ConvidadoPassa(convite, item, filtro)).ToList();
        var observacaoConvite = Contem(convite.Observacao, filtro.Observacao) || Contem(convite.Nome, filtro.Nome);
        if (convidados.Count == 0 && !observacaoConvite)
        {
            return null;
        }

        if (TemFiltroDePessoa(filtro) && convidados.Count == 0)
        {
            return null;
        }

        convite.Convidados = convidados;
        return convite;
    }

    private static bool ConvidadoPassa(Convite convite, Convidado convidado, FiltroConvites filtro)
    {
        if (filtro.SomenteConfirmados && convidado.Situacao != SituacaoConvidado.Confirmado)
        {
            return false;
        }

        if (filtro.Situacao is SituacaoConvidado situacao && convidado.Situacao != situacao)
        {
            return false;
        }

        if (!Domain.Comum.Texto.Vazio(filtro.Telefone)
            && !Contem(convidado.Celular, filtro.Telefone)
            && !Contem(convite.Telefone(convidado), filtro.Telefone))
        {
            return false;
        }

        if (!Domain.Comum.Texto.Vazio(filtro.Nome)
            && !Contem(convidado.Nome, filtro.Nome)
            && !Contem(convite.Nome, filtro.Nome))
        {
            return false;
        }

        if (!Domain.Comum.Texto.Vazio(filtro.Observacao)
            && !Contem(convidado.Observacao, filtro.Observacao)
            && !Contem(convite.Observacao, filtro.Observacao))
        {
            return false;
        }

        return true;
    }

    private static bool TemFiltroDePessoa(FiltroConvites filtro) =>
        filtro.SomenteConfirmados || filtro.Situacao is not null
        || !Domain.Comum.Texto.Vazio(filtro.Telefone)
        || !Domain.Comum.Texto.Vazio(filtro.Nome)
        || !Domain.Comum.Texto.Vazio(filtro.Observacao);

    private static bool Contem(string? texto, string? termo)
    {
        if (Domain.Comum.Texto.Vazio(termo))
        {
            return false;
        }

        return texto?.Contains(termo!.Trim(), StringComparison.OrdinalIgnoreCase) == true;
    }

    private static void Copiar(Convidado destino, Convidado origem)
    {
        destino.Nome = origem.Nome;
        destino.Ddi = origem.Ddi;
        destino.Celular = origem.Celular;
        destino.Situacao = origem.Situacao;
        destino.Mesa = origem.Mesa;
        destino.Genero = origem.Genero;
        destino.Faixa = origem.Faixa;
        destino.Custo = origem.Custo;
        destino.Cpf = origem.Cpf;
        destino.Observacao = origem.Observacao;
    }

    private static ConviteLeitura Ler(Convite convite)
    {
        var principal = convite.Convidados.FirstOrDefault(item => item.Id == convite.PrincipalId);
        return new ConviteLeitura(
            convite.Id,
            convite.EventoId,
            convite.Nome,
            convite.Observacao,
            ConviteRegras.TemTelefone(principal?.Celular) ? $"{principal!.Ddi} {principal.Celular}".Trim() : null,
            convite.Token,
            convite.AcessadoEm is not null || convite.RespondidoEm is not null,
            convite.RespondidoEm is not null,
            convite.Convidados.Select(item => LerConvidado(item, convite.PrincipalId)).ToArray(),
            convite.Email,
            convite.ExcecaoPrazoRsvp);
    }

    private static ConvidadoLeitura LerConvidado(Convidado convidado, Guid? principalId) => new(
        convidado.Id,
        convidado.Nome,
        convidado.Ddi,
        convidado.Celular,
        convidado.Situacao,
        Rotulos.SituacaoTela(convidado.Situacao),
        Rotulos.RecusaNoIcone(convidado.Situacao),
        convidado.Mesa,
        convidado.Genero,
        convidado.Faixa,
        convidado.Custo,
        convidado.Cpf,
        convidado.Observacao,
        convidado.Id == principalId);

    private static IReadOnlyList<TotaisLeitura> Contar<T>(IEnumerable<T> itens, Func<T, string> rotulo) =>
        itens.GroupBy(rotulo).Select(grupo => new TotaisLeitura(grupo.Key, grupo.Count())).ToArray();

    private static string RotuloFaixa(FaixaEtaria faixa) => faixa switch
    {
        FaixaEtaria.Adulto => "Adulto",
        FaixaEtaria.Adolescente => "Adolescente",
        FaixaEtaria.Crianca => "Criança",
        FaixaEtaria.CriancaDeColo => "Criança de colo",
        FaixaEtaria.Idoso => "Idoso",
        _ => "Não informado",
    };

    private static string RotuloCusto(CustoConvidado custo) => custo switch
    {
        CustoConvidado.Inteira => "Inteira",
        CustoConvidado.Meia => "Meia",
        CustoConvidado.Gratuita => "Gratuita",
        _ => "Não informado",
    };

    private static string Link(string basePublica, string token) =>
        $"{basePublica.TrimEnd('/')}/rsvp/{token}";

    private static bool EnumOpcional<T>(T? valor)
        where T : struct, Enum => valor is null || Enum.IsDefined(valor.Value);
}

file static class ConviteTelefone
{
    public static string? Telefone(this Convite convite, Convidado convidado) =>
        convite.PrincipalId == convidado.Id ? convidado.Celular : null;
}
