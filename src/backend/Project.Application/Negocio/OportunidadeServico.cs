using Project.Application.Comum;
using Project.Domain.Eventos;
using Project.Domain.Funil;

namespace Project.Application.Negocio;

public sealed record ContatoOportunidadeLeitura(Guid Id, string Nome, string? Telefone, string? Email);

public sealed record OportunidadeLeitura(
    Guid Id,
    string Nome,
    string Estagio,
    string? Fonte,
    decimal? ValorProposta,
    string Responsavel,
    string? ServicoProduto,
    Guid? ModeloServicoFunilId,
    string? TipoEvento,
    int? QuantidadeConvidados,
    DateOnly? DataPrevista,
    string? Horarios,
    int? QuantidadePadrinhos,
    int? QuantidadeDamas,
    string? LocalCerimonia,
    string? EnderecoCerimonia,
    string? CepCerimonia,
    string? PaisCerimonia,
    string? NumeroCerimonia,
    string? BairroCerimonia,
    string? LocalRecepcao,
    string? EnderecoRecepcao,
    string? CepRecepcao,
    string? PaisRecepcao,
    string? NumeroRecepcao,
    string? BairroRecepcao,
    string? EstadoRecepcao,
    string? CidadeRecepcao,
    string? Uf,
    string? Cidade,
    string? MotivoDescarte,
    DateTimeOffset CriadoEm,
    DateTimeOffset EntradaNoEstagioEm,
    IReadOnlyList<ContatoOportunidadeLeitura> Contatos,
    Guid? ClienteId,
    Guid EstagioId,
    string TipoEstagio,
    string? FonteOutro,
    DateOnly? RetornarEm,
    TimeOnly? RetornarHora,
    bool ContatoRepetido,
    PropostaResumo? Proposta = null,
    TimeOnly? HoraConvite = null,
    TimeOnly? HoraCerimonia = null,
    TimeOnly? HoraRecepcao = null,
    TimeOnly? HoraFesta = null);

public sealed record ContatoOportunidadePedido(string? Nome, string? Telefone, string? Email);

public sealed record SalvarOportunidade(
    string? Nome,
    string? Estagio,
    string? Fonte,
    decimal? ValorProposta,
    string? Responsavel,
    string? ServicoProduto,
    Guid? ModeloServicoFunilId,
    string? TipoEvento,
    int? QuantidadeConvidados,
    DateOnly? DataPrevista,
    string? Horarios,
    int? QuantidadePadrinhos,
    int? QuantidadeDamas,
    string? LocalCerimonia,
    string? EnderecoCerimonia,
    string? CepCerimonia,
    string? PaisCerimonia,
    string? NumeroCerimonia,
    string? BairroCerimonia,
    string? LocalRecepcao,
    string? EnderecoRecepcao,
    string? CepRecepcao,
    string? PaisRecepcao,
    string? NumeroRecepcao,
    string? BairroRecepcao,
    string? EstadoRecepcao,
    string? CidadeRecepcao,
    string? Uf,
    string? Cidade,
    string? MotivoDescarte,
    IReadOnlyList<ContatoOportunidadePedido>? Contatos,
    string? FonteOutro = null,
    DateOnly? RetornarEm = null,
    TimeOnly? RetornarHora = null,
    TimeOnly? HoraConvite = null,
    TimeOnly? HoraCerimonia = null,
    TimeOnly? HoraRecepcao = null,
    TimeOnly? HoraFesta = null);

public sealed record MoverOportunidade(string? Estagio, string? MotivoDescarte);

public sealed record VincularClienteOportunidade(Guid? ClienteId);

/// <summary>Data de retorno do lead; data nula limpa o retorno (SPEC-031 §6.3).</summary>
public sealed record RetornoOportunidade(DateOnly? Data, TimeOnly? Hora);

/// <summary>Outro lead ou cliente da conta com o mesmo telefone ou e-mail.</summary>
public sealed record ContatoRepetidoLeitura(string Tipo, Guid Id, string Nome, string? Estagio);

public sealed record FiltroOportunidades(
    string? Nome,
    string? Responsavel,
    string? TipoEvento,
    DateOnly? DataDe,
    DateOnly? DataAte,
    string? Ordenacao);

public sealed record LeadPublicoPedido(
    string? Nome,
    string? ContatoNome,
    string? Telefone,
    string? Email,
    string? Fonte);

public sealed record ChecagemDataLeitura(bool TemCompromisso);

public sealed class OportunidadeServico(IDados dados)
{
    public async Task<IReadOnlyList<OportunidadeLeitura>> ListarAsync(
        string contaId,
        FiltroOportunidades filtro,
        CancellationToken ct)
    {
        var itens = await dados.ListarOportunidadesAsync(contaId, filtro, ct);
        var propostas = await dados.PropostasDasOportunidadesAsync(contaId, itens.Select(i => i.Id), ct);
        return itens.Select(item => Ler(item, OrcamentoFunilServico.Resumo(propostas.GetValueOrDefault(item.Id)))).ToArray();
    }

    public async Task<Resultado<OportunidadeLeitura>> ObterAsync(string contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterOportunidadeAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var propostas = await dados.PropostasDasOportunidadesAsync(contaId, [item.Id], ct);
        return Resultado<OportunidadeLeitura>.Sucesso(Ler(item, OrcamentoFunilServico.Resumo(propostas.GetValueOrDefault(item.Id))));
    }

    public async Task<Resultado<OportunidadeLeitura>> CriarAsync(string contaId, SalvarOportunidade pedido, CancellationToken ct)
    {
        var montado = await MontarAsync(contaId, Guid.NewGuid(), pedido, null, ct);
        if (!montado.Ok)
        {
            return Resultado<OportunidadeLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        var agora = DateTimeOffset.UtcNow;
        montado.Valor!.CriadoEm = agora;
        montado.Valor.EntradaNoEstagioEm = agora;
        await dados.InserirOportunidadeAsync(montado.Valor, ct);
        return Resultado<OportunidadeLeitura>.Sucesso(Ler(montado.Valor));
    }

    public async Task<Resultado<OportunidadeLeitura>> AtualizarAsync(
        string contaId,
        Guid id,
        SalvarOportunidade pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterOportunidadeAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var montado = await MontarAsync(contaId, item.Id, pedido, item, ct);
        if (!montado.Ok)
        {
            return Resultado<OportunidadeLeitura>.Erro(montado.Falha!.Codigo, montado.Falha.Mensagem);
        }

        var novo = montado.Valor!;
        if (novo.EstagioFunilId != item.EstagioFunilId)
        {
            item.EntradaNoEstagioEm = DateTimeOffset.UtcNow;
        }

        item.Nome = novo.Nome;
        item.EstagioFunilId = novo.EstagioFunilId;
        item.EstagioFunil = novo.EstagioFunil;
        item.Fonte = novo.Fonte;
        item.FonteOutro = novo.FonteOutro;
        item.RetornarEm = novo.RetornarEm;
        item.RetornarHora = novo.RetornarHora;
        item.ValorProposta = novo.ValorProposta;
        item.Responsavel = novo.Responsavel;
        item.ServicoProduto = novo.ServicoProduto;
        item.ModeloServicoFunilId = novo.ModeloServicoFunilId;
        item.TipoEvento = novo.TipoEvento;
        item.QuantidadeConvidados = novo.QuantidadeConvidados;
        item.DataPrevista = novo.DataPrevista;
        item.Horarios = novo.Horarios;
        item.HoraConvite = novo.HoraConvite;
        item.HoraCerimonia = novo.HoraCerimonia;
        item.HoraRecepcao = novo.HoraRecepcao;
        item.HoraFesta = novo.HoraFesta;
        item.QuantidadePadrinhos = novo.QuantidadePadrinhos;
        item.QuantidadeDamas = novo.QuantidadeDamas;
        item.LocalCerimonia = novo.LocalCerimonia;
        item.EnderecoCerimonia = novo.EnderecoCerimonia;
        item.CepCerimonia = novo.CepCerimonia;
        item.PaisCerimonia = novo.PaisCerimonia;
        item.NumeroCerimonia = novo.NumeroCerimonia;
        item.BairroCerimonia = novo.BairroCerimonia;
        item.LocalRecepcao = novo.LocalRecepcao;
        item.EnderecoRecepcao = novo.EnderecoRecepcao;
        item.CepRecepcao = novo.CepRecepcao;
        item.PaisRecepcao = novo.PaisRecepcao;
        item.NumeroRecepcao = novo.NumeroRecepcao;
        item.BairroRecepcao = novo.BairroRecepcao;
        item.EstadoRecepcao = novo.EstadoRecepcao;
        item.CidadeRecepcao = novo.CidadeRecepcao;
        item.Uf = novo.Uf;
        item.Cidade = novo.Cidade;
        item.MotivoDescarte = novo.MotivoDescarte;
        item.Contatos.Clear();
        foreach (var contato in novo.Contatos)
        {
            item.Contatos.Add(contato);
        }

        await dados.SalvarNegocioAsync(ct);
        return Resultado<OportunidadeLeitura>.Sucesso(Ler(item));
    }

    public async Task<Resultado<OportunidadeLeitura>> MoverAsync(
        string contaId,
        Guid id,
        MoverOportunidade pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterOportunidadeAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var estagio = ResolverEstagio(await dados.ListarEstagiosFunilAsync(contaId, ct), pedido.Estagio);
        if (estagio is null)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Validacao, "Informe o estágio.");
        }

        if (estagio.Tipo == TipoEstagioFunil.Descartado)
        {
            var motivo = Domain.Comum.Texto.Limpo(pedido.MotivoDescarte);
            if (motivo is null)
            {
                return Resultado<OportunidadeLeitura>.Erro(Codigos.Validacao, "Informe o motivo do descarte.");
            }

            item.MotivoDescarte = motivo;
        }
        else
        {
            item.MotivoDescarte = null;
        }

        ColocarNoEstagio(item, estagio);

        await dados.SalvarNegocioAsync(ct);
        return Resultado<OportunidadeLeitura>.Sucesso(Ler(item));
    }

    /// <summary>
    /// Fecha o negócio: liga o lead a um cliente da conta e o coloca em Contratado.
    /// </summary>
    public async Task<Resultado<OportunidadeLeitura>> VincularClienteAsync(
        string contaId,
        Guid id,
        VincularClienteOportunidade pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterOportunidadeAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (pedido.ClienteId is not Guid clienteId)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Validacao, "Informe o cliente.");
        }

        if (await dados.ObterClienteAsync(contaId, clienteId, ct) is null)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Validacao, "Cliente inválido.");
        }

        item.ClienteId = clienteId;
        item.MotivoDescarte = null;
        var estagios = await dados.ListarEstagiosFunilAsync(contaId, ct);
        ColocarNoEstagio(item, estagios.Single(e => e.Tipo == TipoEstagioFunil.Contratado));

        await dados.SalvarNegocioAsync(ct);
        return Resultado<OportunidadeLeitura>.Sucesso(Ler(item));
    }

    /// <summary>Marca ou limpa a data de retorno do lead (SPEC-031 §6.3).</summary>
    public async Task<Resultado<OportunidadeLeitura>> MarcarRetornoAsync(
        string contaId,
        Guid id,
        RetornoOportunidade pedido,
        CancellationToken ct)
    {
        var item = await dados.ObterOportunidadeAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (pedido.Hora is not null && pedido.Data is null)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Validacao, "Informe a data do retorno.");
        }

        item.RetornarEm = pedido.Data;
        item.RetornarHora = pedido.Data is null ? null : pedido.Hora;
        await dados.SalvarNegocioAsync(ct);
        return Resultado<OportunidadeLeitura>.Sucesso(Ler(item));
    }

    /// <summary>
    /// Outros leads e clientes da conta com o mesmo telefone (só os dígitos) ou e-mail (SPEC-031 §6.5).
    /// Só avisa: quem decide gravar é a dona.
    /// </summary>
    public async Task<IReadOnlyList<ContatoRepetidoLeitura>> ContatoRepetidoAsync(
        string contaId,
        IEnumerable<string?> telefones,
        IEnumerable<string?> emails,
        Guid? ignorar,
        CancellationToken ct)
    {
        var fones = telefones.Select(ContatoNormalizado.Telefone).OfType<string>().ToHashSet();
        var mails = emails.Select(ContatoNormalizado.Email).OfType<string>().ToHashSet();
        if (fones.Count == 0 && mails.Count == 0)
        {
            return [];
        }

        var contatos = await dados.ListarContatosDaContaAsync(contaId, ct);
        return contatos
            .Where(c => c.Id != ignorar)
            .Where(c =>
                c.Telefones.Select(ContatoNormalizado.Telefone).Any(t => t is not null && fones.Contains(t)) ||
                (ContatoNormalizado.Email(c.Email) is string email && mails.Contains(email)))
            .GroupBy(c => (c.Tipo, c.Id))
            .Select(g => new ContatoRepetidoLeitura(g.Key.Tipo, g.Key.Id, g.First().Nome, g.First().Estagio))
            .OrderBy(c => c.Tipo == "cliente" ? 1 : 0)
            .ThenBy(c => c.Nome)
            .ToArray();
    }

    public async Task<Resultado<bool>> ExcluirAsync(string contaId, Guid id, CancellationToken ct)
    {
        var item = await dados.ObterOportunidadeAsync(contaId, id, ct);
        if (item is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverOportunidadeAsync(item, ct);
        return Resultado<bool>.Sucesso(true);
    }

    public async Task<Resultado<OportunidadeLeitura>> CriarLeadPublicoAsync(
        string contaId,
        LeadPublicoPedido pedido,
        CancellationToken ct)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome) ?? Domain.Comum.Texto.Limpo(pedido.ContatoNome);
        var contatoNome = Domain.Comum.Texto.Limpo(pedido.ContatoNome) ?? nome;
        if (nome is null || contatoNome is null)
        {
            return Resultado<OportunidadeLeitura>.Erro(Codigos.Validacao, "Informe o nome e o contato.");
        }

        var agora = DateTimeOffset.UtcNow;
        var primeiro = PrimeiroAberto(await dados.ListarEstagiosFunilAsync(contaId, ct));
        var item = new Oportunidade
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            Nome = nome,
            EstagioFunilId = primeiro.Id,
            EstagioFunil = primeiro,
            Fonte = OrigensFunil.FormularioSite,
            Responsavel = contaId,
            CriadoEm = agora,
            EntradaNoEstagioEm = agora,
            Contatos =
            [
                new ContatoOportunidade
                {
                    Id = Guid.NewGuid(),
                    Nome = contatoNome,
                    Telefone = Domain.Comum.Texto.Limpo(pedido.Telefone),
                    Email = Domain.Comum.Texto.Limpo(pedido.Email),
                },
            ],
        };
        item.Contatos[0].OportunidadeId = item.Id;
        item.ContatoRepetido = (await ContatoRepetidoAsync(contaId, [item.Contatos[0].Telefone], [item.Contatos[0].Email], null, ct)).Count > 0;
        await dados.InserirOportunidadeAsync(item, ct);
        return Resultado<OportunidadeLeitura>.Sucesso(Ler(item));
    }

    public async Task<ChecagemDataLeitura> ChecarDataAsync(string contaId, DateOnly data, CancellationToken ct) =>
        new(await dados.TemCompromissoNaDataAsync(contaId, data, ct));

    public async Task<IReadOnlyList<FunilEstagio>> ContarPorEstagioAsync(string contaId, CancellationToken ct)
    {
        var estagios = EstagiosFunil.Ordenar(await dados.ListarEstagiosFunilAsync(contaId, ct));
        var contagens = await dados.ContarOportunidadesPorEstagioAsync(contaId, ct);
        return estagios.Select(estagio =>
        {
            var item = contagens.FirstOrDefault(c => c.EstagioFunilId == estagio.Id);
            return new FunilEstagio(
                estagio.Nome,
                item?.Quantidade ?? 0,
                item?.Valor ?? 0,
                estagio.Id,
                estagio.Cor,
                estagio.Tipo.ToString());
        }).ToArray();
    }

    /// <summary>Primeiro estágio aberto: onde nasce o lead público e o do RSVP.</summary>
    internal static EstagioFunil PrimeiroAberto(IEnumerable<EstagioFunil> estagios) =>
        EstagiosFunil.Ordenar(estagios).First(e => e.Tipo == TipoEstagioFunil.Aberto);

    internal static void ColocarNoEstagio(Oportunidade item, EstagioFunil estagio)
    {
        if (item.EstagioFunilId != estagio.Id)
        {
            item.EntradaNoEstagioEm = DateTimeOffset.UtcNow;
        }

        item.EstagioFunilId = estagio.Id;
        item.EstagioFunil = estagio;
    }

    /// <summary>Aceita o id do estágio, o nome dele ou o nome antigo do enum.</summary>
    internal static EstagioFunil? ResolverEstagio(IReadOnlyList<EstagioFunil> estagios, string? valor)
    {
        if (string.IsNullOrWhiteSpace(valor))
        {
            return null;
        }

        var texto = valor.Trim();
        if (Guid.TryParse(texto, out var id))
        {
            return estagios.FirstOrDefault(e => e.Id == id);
        }

        var porNome = estagios.FirstOrDefault(e => string.Equals(e.Nome, texto, StringComparison.OrdinalIgnoreCase));
        if (porNome is not null)
        {
            return porNome;
        }

        return texto.ToLowerInvariant() switch
        {
            "contatoinicial" => estagios.FirstOrDefault(e => e.Nome == EstagiosFunil.NomeContatoInicial),
            "orcamentoenviado" => estagios.FirstOrDefault(e => e.Nome == EstagiosFunil.NomeOrcamentoEnviado),
            "contratado" => estagios.FirstOrDefault(e => e.Tipo == TipoEstagioFunil.Contratado),
            "descartado" => estagios.FirstOrDefault(e => e.Tipo == TipoEstagioFunil.Descartado),
            _ => null,
        };
    }

    private async Task<Resultado<Oportunidade>> MontarAsync(
        string contaId,
        Guid id,
        SalvarOportunidade pedido,
        Oportunidade? existente,
        CancellationToken ct)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<Oportunidade>.Erro(Codigos.Validacao, "Informe o nome da oportunidade.");
        }

        var estagio = ResolverEstagio(await dados.ListarEstagiosFunilAsync(contaId, ct), pedido.Estagio);
        if (estagio is null)
        {
            return Resultado<Oportunidade>.Erro(Codigos.Validacao, "Informe o estágio.");
        }

        var contatos = (pedido.Contatos ?? [])
            .Select(contato => new ContatoOportunidade
            {
                Id = Guid.NewGuid(),
                OportunidadeId = id,
                Nome = Domain.Comum.Texto.Limpo(contato.Nome) ?? "",
                Telefone = Domain.Comum.Texto.Limpo(contato.Telefone),
                Email = Domain.Comum.Texto.Limpo(contato.Email),
            })
            .Where(contato => !string.IsNullOrWhiteSpace(contato.Nome))
            .ToList();
        if (contatos.Count == 0)
        {
            return Resultado<Oportunidade>.Erro(Codigos.Validacao, "Informe ao menos um contato.");
        }

        if (pedido.ValorProposta is < 0)
        {
            return Resultado<Oportunidade>.Erro(Codigos.Validacao, "O valor não pode ser negativo.");
        }

        if (estagio.Tipo == TipoEstagioFunil.Descartado)
        {
            var motivo = Domain.Comum.Texto.Limpo(pedido.MotivoDescarte);
            if (motivo is null)
            {
                return Resultado<Oportunidade>.Erro(Codigos.Validacao, "Informe o motivo do descarte.");
            }
        }

        string? servicoProduto = Domain.Comum.Texto.Limpo(pedido.ServicoProduto);
        Guid? modeloServicoId = pedido.ModeloServicoFunilId;
        if (modeloServicoId is Guid modeloId)
        {
            var modelo = await dados.ObterModeloServicoFunilAsync(contaId, modeloId, ct);
            if (modelo is null)
            {
                return Resultado<Oportunidade>.Erro(Codigos.Validacao, "Serviço/produto inválido.");
            }

            servicoProduto ??= modelo.Nome;
        }

        var fonte = Domain.Comum.Texto.Limpo(pedido.Fonte);
        string? fonteOutro = null;
        if (fonte is not null)
        {
            fonte = OrigensFunil.Item(fonte);
            if (fonte is null)
            {
                return Resultado<Oportunidade>.Erro(Codigos.Validacao, "Escolha a origem na lista.");
            }

            if (fonte == OrigensFunil.Outro)
            {
                fonteOutro = Domain.Comum.Texto.Limpo(pedido.FonteOutro);
                if (fonteOutro is null)
                {
                    return Resultado<Oportunidade>.Erro(Codigos.Validacao, "Conte de onde veio o contato.");
                }
            }
        }

        if (pedido.RetornarHora is not null && pedido.RetornarEm is null)
        {
            return Resultado<Oportunidade>.Erro(Codigos.Validacao, "Informe a data do retorno.");
        }

        TipoEvento? tipo = null;
        if (!string.IsNullOrWhiteSpace(pedido.TipoEvento))
        {
            if (!Enum.TryParse<TipoEvento>(pedido.TipoEvento, true, out var lido) || !Enum.IsDefined(lido))
            {
                return Resultado<Oportunidade>.Erro(Codigos.Validacao, "Tipo de evento inválido.");
            }

            tipo = lido;
        }

        return Resultado<Oportunidade>.Sucesso(new Oportunidade
        {
            Id = id,
            ContaId = contaId,
            Nome = nome,
            EstagioFunilId = estagio.Id,
            EstagioFunil = estagio,
            Fonte = fonte,
            FonteOutro = fonteOutro,
            RetornarEm = pedido.RetornarEm,
            RetornarHora = pedido.RetornarEm is null ? null : pedido.RetornarHora,
            ValorProposta = pedido.ValorProposta,
            Responsavel = Domain.Comum.Texto.Limpo(pedido.Responsavel) ?? contaId,
            ServicoProduto = servicoProduto,
            ModeloServicoFunilId = modeloServicoId,
            TipoEvento = tipo,
            QuantidadeConvidados = pedido.QuantidadeConvidados,
            DataPrevista = pedido.DataPrevista,
            Horarios = Domain.Comum.Texto.Limpo(pedido.Horarios),
            HoraConvite = pedido.HoraConvite,
            HoraCerimonia = pedido.HoraCerimonia,
            HoraRecepcao = pedido.HoraRecepcao,
            HoraFesta = pedido.HoraFesta,
            QuantidadePadrinhos = pedido.QuantidadePadrinhos,
            QuantidadeDamas = pedido.QuantidadeDamas,
            LocalCerimonia = Domain.Comum.Texto.Limpo(pedido.LocalCerimonia),
            EnderecoCerimonia = Domain.Comum.Texto.Limpo(pedido.EnderecoCerimonia),
            CepCerimonia = Domain.Comum.Texto.Limpo(pedido.CepCerimonia),
            PaisCerimonia = Domain.Comum.Texto.Limpo(pedido.PaisCerimonia),
            NumeroCerimonia = Domain.Comum.Texto.Limpo(pedido.NumeroCerimonia),
            BairroCerimonia = Domain.Comum.Texto.Limpo(pedido.BairroCerimonia),
            LocalRecepcao = Domain.Comum.Texto.Limpo(pedido.LocalRecepcao),
            EnderecoRecepcao = Domain.Comum.Texto.Limpo(pedido.EnderecoRecepcao),
            CepRecepcao = Domain.Comum.Texto.Limpo(pedido.CepRecepcao),
            PaisRecepcao = Domain.Comum.Texto.Limpo(pedido.PaisRecepcao),
            NumeroRecepcao = Domain.Comum.Texto.Limpo(pedido.NumeroRecepcao),
            BairroRecepcao = Domain.Comum.Texto.Limpo(pedido.BairroRecepcao),
            EstadoRecepcao = Domain.Comum.Texto.Limpo(pedido.EstadoRecepcao),
            CidadeRecepcao = Domain.Comum.Texto.Limpo(pedido.CidadeRecepcao),
            Uf = Domain.Comum.Texto.Limpo(pedido.Uf),
            Cidade = Domain.Comum.Texto.Limpo(pedido.Cidade),
            MotivoDescarte = estagio.Tipo == TipoEstagioFunil.Descartado
                ? Domain.Comum.Texto.Limpo(pedido.MotivoDescarte)
                : null,
            CriadoEm = existente?.CriadoEm ?? DateTimeOffset.UtcNow,
            EntradaNoEstagioEm = existente?.EntradaNoEstagioEm ?? DateTimeOffset.UtcNow,
            Contatos = contatos,
        });
    }

    internal static OportunidadeLeitura Ler(Oportunidade item) => Ler(item, null);

    internal static OportunidadeLeitura Ler(Oportunidade item, PropostaResumo? proposta)
    {
        // SPEC-031 §6.7: o texto livre antigo é convertido nos quatro campos ao ler; ao salvar, o texto some.
        var antigos = item.HoraConvite is null && item.HoraCerimonia is null && item.HoraRecepcao is null && item.HoraFesta is null
            ? HorariosTexto.Interpretar(item.Horarios)
            : new QuatroHorarios(null, null, null, null);
        var horarios = new QuatroHorarios(
            item.HoraConvite ?? antigos.Convite,
            item.HoraCerimonia ?? antigos.Cerimonia,
            item.HoraRecepcao ?? antigos.Recepcao,
            item.HoraFesta ?? antigos.Festa);
        return new(
            item.Id,
            item.Nome,
            item.EstagioFunil?.Nome ?? "",
            item.Fonte,
            item.ValorProposta,
            item.Responsavel,
            item.ServicoProduto,
            item.ModeloServicoFunilId,
            item.TipoEvento?.ToString(),
            item.QuantidadeConvidados,
            item.DataPrevista,
            item.Horarios,
            item.QuantidadePadrinhos,
            item.QuantidadeDamas,
            item.LocalCerimonia,
            item.EnderecoCerimonia,
            item.CepCerimonia,
            item.PaisCerimonia,
            item.NumeroCerimonia,
            item.BairroCerimonia,
            item.LocalRecepcao,
            item.EnderecoRecepcao,
            item.CepRecepcao,
            item.PaisRecepcao,
            item.NumeroRecepcao,
            item.BairroRecepcao,
            item.EstadoRecepcao,
            item.CidadeRecepcao,
            item.Uf,
            item.Cidade,
            item.MotivoDescarte,
            item.CriadoEm,
            item.EntradaNoEstagioEm,
            item.Contatos.Select(c => new ContatoOportunidadeLeitura(c.Id, c.Nome, c.Telefone, c.Email)).ToArray(),
            item.ClienteId,
            item.EstagioFunilId,
            item.EstagioFunil?.Tipo.ToString() ?? "",
            item.FonteOutro,
            item.RetornarEm,
            item.RetornarHora,
            item.ContatoRepetido,
            proposta,
            horarios.Convite,
            horarios.Cerimonia,
            horarios.Recepcao,
            horarios.Festa);
    }
}
