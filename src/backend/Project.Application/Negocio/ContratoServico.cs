using System.Security.Cryptography;
using System.Text;
using Project.Application.Comum;
using Project.Domain.Clientes;
using Project.Domain.Contratos;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Perfil;

namespace Project.Application.Negocio;

public sealed record SalvarContrato(string? Nome, string? Texto);

public sealed record ContratoLeitura(Guid Id, string Nome, string Texto, DateTimeOffset AtualizadoEm);

public sealed record ContratoResumo(Guid Id, string Nome, DateTimeOffset AtualizadoEm);

public sealed record CamposContratoLeitura(IReadOnlyList<CampoMesclagem> Campos);

public sealed record VincularContratos(IReadOnlyList<Guid>? ContratoIds);

public sealed record ContratoEventoLeitura(Guid Id, string Nome, DateTimeOffset? UltimoEnvio, DateTimeOffset? ExpiraEm, string? EnviadoPara);

public sealed record ContratosEventoLeitura(string? EmailCliente, IReadOnlyList<ContratoEventoLeitura> Contratos);

public sealed record ContratoPreenchido(Guid Id, string Nome, string Texto, string? Empresa);

public sealed record ContratoPublico(string Nome, string Texto, string? Empresa, DateTimeOffset ExpiraEm);

public sealed record EnvioContrato(string Email, DateTimeOffset ExpiraEm);

/// <summary>Envio de e-mail simples (texto puro) para mensagens que não são da conta.</summary>
public interface IEnvioEmail
{
    Task EnviarAsync(string email, string assunto, string texto, CancellationToken ct);
}

/// <summary>Dados que preenchem os campos de mesclagem de um evento.</summary>
public sealed record DadosMesclagemEvento(Evento Evento, Cliente? Cliente, PerfilAssessoria? Perfil, IReadOnlyList<ParcelaCasal> Parcelas);

public interface IDadosContrato
{
    Task<IReadOnlyList<ContratoConta>> ListarAsync(string contaId, CancellationToken ct);

    Task<ContratoConta?> ObterAsync(string contaId, Guid id, CancellationToken ct);

    Task InserirAsync(ContratoConta contrato, CancellationToken ct);

    Task RemoverAsync(ContratoConta contrato, CancellationToken ct);

    Task<bool> ModeloDaContaAsync(string contaId, Guid modeloId, CancellationToken ct);

    Task<IReadOnlyList<Guid>> ContratosDoModeloAsync(Guid modeloId, CancellationToken ct);

    Task SubstituirContratosDoModeloAsync(Guid modeloId, IReadOnlyList<Guid> contratoIds, CancellationToken ct);

    Task<bool> EventoDaContaAsync(string contaId, Guid eventoId, CancellationToken ct);

    Task<IReadOnlyList<Guid>> ContratosDoEventoAsync(Guid eventoId, CancellationToken ct);

    Task AdicionarAoEventoAsync(Guid eventoId, Guid contratoId, CancellationToken ct);

    Task RemoverDoEventoAsync(Guid eventoId, Guid contratoId, CancellationToken ct);

    Task<DadosMesclagemEvento?> DadosMesclagemAsync(string contaId, Guid eventoId, CancellationToken ct);

    Task InserirLinkAsync(LinkLeituraContrato link, CancellationToken ct);

    Task<LinkLeituraContrato?> LinkPorTokenAsync(string token, CancellationToken ct);

    Task<IReadOnlyList<LinkLeituraContrato>> LinksDoEventoAsync(Guid eventoId, CancellationToken ct);

    Task SalvarAsync(CancellationToken ct);
}

/// <summary>Contratos da conta, vínculo com modelo e evento, e leitura sem login (SPEC-030 v2).</summary>
public sealed class ContratoServico(IDadosContrato dados, IEnvioEmail email)
{
    public CamposContratoLeitura Campos() => new(Mesclagem.Campos);

    public async Task<IReadOnlyList<ContratoResumo>> ListarAsync(string contaId, CancellationToken ct) =>
        (await dados.ListarAsync(contaId, ct))
            .OrderBy(item => item.Nome, StringComparer.CurrentCultureIgnoreCase)
            .Select(item => new ContratoResumo(item.Id, item.Nome, item.AtualizadoEm))
            .ToArray();

    public async Task<Resultado<ContratoLeitura>> ObterAsync(string contaId, Guid id, CancellationToken ct)
    {
        var contrato = await dados.ObterAsync(contaId, id, ct);
        return contrato is null
            ? Resultado<ContratoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.")
            : Resultado<ContratoLeitura>.Sucesso(Ler(contrato));
    }

    public async Task<Resultado<ContratoLeitura>> SalvarAsync(string contaId, Guid? id, SalvarContrato pedido, CancellationToken ct)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null || nome.Length > 120)
        {
            return Resultado<ContratoLeitura>.Erro(Codigos.Validacao, "Informe o nome do contrato (até 120 caracteres).");
        }

        var texto = pedido.Texto?.Trim();
        if (string.IsNullOrEmpty(texto))
        {
            return Resultado<ContratoLeitura>.Erro(Codigos.Validacao, "Informe o texto do contrato.");
        }

        var agora = DateTimeOffset.UtcNow;
        ContratoConta? contrato;
        if (id is Guid existente)
        {
            contrato = await dados.ObterAsync(contaId, existente, ct);
            if (contrato is null)
            {
                return Resultado<ContratoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
            }
        }
        else
        {
            contrato = new ContratoConta { Id = Guid.NewGuid(), ContaId = contaId, CriadoEm = agora };
            await dados.InserirAsync(contrato, ct);
        }

        contrato.Nome = nome;
        contrato.Texto = texto;
        contrato.AtualizadoEm = agora;
        await dados.SalvarAsync(ct);
        return Resultado<ContratoLeitura>.Sucesso(Ler(contrato));
    }

    public async Task<Resultado<bool>> ExcluirAsync(string contaId, Guid id, CancellationToken ct)
    {
        var contrato = await dados.ObterAsync(contaId, id, ct);
        if (contrato is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverAsync(contrato, ct);
        await dados.SalvarAsync(ct);
        return Resultado<bool>.Sucesso(true);
    }

    public async Task<Resultado<IReadOnlyList<Guid>>> DoModeloAsync(string contaId, Guid modeloId, CancellationToken ct)
    {
        if (!await dados.ModeloDaContaAsync(contaId, modeloId, ct))
        {
            return Resultado<IReadOnlyList<Guid>>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<IReadOnlyList<Guid>>.Sucesso(await dados.ContratosDoModeloAsync(modeloId, ct));
    }

    public async Task<Resultado<IReadOnlyList<Guid>>> VincularAoModeloAsync(string contaId, Guid modeloId, VincularContratos pedido, CancellationToken ct)
    {
        if (!await dados.ModeloDaContaAsync(contaId, modeloId, ct))
        {
            return Resultado<IReadOnlyList<Guid>>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var daConta = (await dados.ListarAsync(contaId, ct)).Select(item => item.Id).ToHashSet();
        var ids = (pedido.ContratoIds ?? []).Distinct().ToArray();
        if (ids.Any(item => !daConta.Contains(item)))
        {
            return Resultado<IReadOnlyList<Guid>>.Erro(Codigos.Validacao, "Escolha contratos da sua conta.");
        }

        await dados.SubstituirContratosDoModeloAsync(modeloId, ids, ct);
        await dados.SalvarAsync(ct);
        return Resultado<IReadOnlyList<Guid>>.Sucesso(ids);
    }

    /// <summary>Evento criado do modelo recebe os contratos vinculados ao modelo (SPEC-030 §6.3).</summary>
    public async Task CopiarDoModeloAsync(string contaId, Guid eventoId, Guid modeloId, CancellationToken ct)
    {
        if (!await dados.ModeloDaContaAsync(contaId, modeloId, ct) || !await dados.EventoDaContaAsync(contaId, eventoId, ct))
        {
            return;
        }

        var atuais = (await dados.ContratosDoEventoAsync(eventoId, ct)).ToHashSet();
        foreach (var contratoId in await dados.ContratosDoModeloAsync(modeloId, ct))
        {
            if (atuais.Add(contratoId))
            {
                await dados.AdicionarAoEventoAsync(eventoId, contratoId, ct);
            }
        }

        await dados.SalvarAsync(ct);
    }

    public async Task<Resultado<ContratosEventoLeitura>> DoEventoAsync(string contaId, Guid eventoId, CancellationToken ct)
    {
        var mesclagem = await dados.DadosMesclagemAsync(contaId, eventoId, ct);
        if (mesclagem is null)
        {
            return Resultado<ContratosEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var ids = (await dados.ContratosDoEventoAsync(eventoId, ct)).ToHashSet();
        var contratos = (await dados.ListarAsync(contaId, ct)).Where(item => ids.Contains(item.Id));
        var links = await dados.LinksDoEventoAsync(eventoId, ct);
        var lista = contratos
            .OrderBy(item => item.Nome, StringComparer.CurrentCultureIgnoreCase)
            .Select(item =>
            {
                var ultimo = links.Where(link => link.ContratoId == item.Id).MaxBy(link => link.CriadoEm);
                return new ContratoEventoLeitura(item.Id, item.Nome, ultimo?.CriadoEm, ultimo?.ExpiraEm, ultimo?.Email);
            })
            .ToArray();
        var emailCliente = string.IsNullOrWhiteSpace(mesclagem.Cliente?.Email) ? null : mesclagem.Cliente!.Email;
        return Resultado<ContratosEventoLeitura>.Sucesso(new ContratosEventoLeitura(emailCliente, lista));
    }

    public async Task<Resultado<ContratosEventoLeitura>> AdicionarAoEventoAsync(string contaId, Guid eventoId, Guid contratoId, CancellationToken ct)
    {
        if (!await dados.EventoDaContaAsync(contaId, eventoId, ct) || await dados.ObterAsync(contaId, contratoId, ct) is null)
        {
            return Resultado<ContratosEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        if (!(await dados.ContratosDoEventoAsync(eventoId, ct)).Contains(contratoId))
        {
            await dados.AdicionarAoEventoAsync(eventoId, contratoId, ct);
            await dados.SalvarAsync(ct);
        }

        return await DoEventoAsync(contaId, eventoId, ct);
    }

    public async Task<Resultado<ContratosEventoLeitura>> RemoverDoEventoAsync(string contaId, Guid eventoId, Guid contratoId, CancellationToken ct)
    {
        if (!await dados.EventoDaContaAsync(contaId, eventoId, ct))
        {
            return Resultado<ContratosEventoLeitura>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        await dados.RemoverDoEventoAsync(eventoId, contratoId, ct);
        await dados.SalvarAsync(ct);
        return await DoEventoAsync(contaId, eventoId, ct);
    }

    public async Task<Resultado<ContratoPreenchido>> PreenchidoAsync(string contaId, Guid eventoId, Guid contratoId, DateOnly hoje, CancellationToken ct)
    {
        var mesclagem = await dados.DadosMesclagemAsync(contaId, eventoId, ct);
        var contrato = await dados.ObterAsync(contaId, contratoId, ct);
        if (mesclagem is null || contrato is null || !(await dados.ContratosDoEventoAsync(eventoId, ct)).Contains(contratoId))
        {
            return Resultado<ContratoPreenchido>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        return Resultado<ContratoPreenchido>.Sucesso(new ContratoPreenchido(
            contrato.Id,
            contrato.Nome,
            Mesclagem.Preencher(contrato.Texto, Valores(mesclagem, hoje)),
            mesclagem.Perfil?.NomeEmpresa));
    }

    public async Task<Resultado<EnvioContrato>> EnviarAsync(
        string contaId,
        Guid eventoId,
        Guid contratoId,
        string urlPublica,
        CancellationToken ct)
    {
        var mesclagem = await dados.DadosMesclagemAsync(contaId, eventoId, ct);
        var contrato = await dados.ObterAsync(contaId, contratoId, ct);
        if (mesclagem is null || contrato is null || !(await dados.ContratosDoEventoAsync(eventoId, ct)).Contains(contratoId))
        {
            return Resultado<EnvioContrato>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var destino = mesclagem.Cliente?.Email?.Trim();
        if (string.IsNullOrEmpty(destino))
        {
            return Resultado<EnvioContrato>.Erro(Codigos.Validacao, "O cliente do evento não tem e-mail. Vincule um cliente com e-mail para enviar.");
        }

        var agora = DateTimeOffset.UtcNow;
        var link = new LinkLeituraContrato
        {
            Id = Guid.NewGuid(),
            Token = NovoToken(),
            ContaId = contaId,
            EventoId = eventoId,
            ContratoId = contratoId,
            Email = destino,
            CriadoEm = agora,
            ExpiraEm = agora.Add(Mesclagem.ValidadeLink),
        };
        var endereco = $"{urlPublica.TrimEnd('/')}/contrato/{link.Token}";
        var empresa = mesclagem.Perfil?.NomeEmpresa ?? "sua assessoria";
        var texto = new StringBuilder()
            .AppendLine($"Olá, {mesclagem.Cliente!.Nome}!")
            .AppendLine()
            .AppendLine($"{empresa} enviou o contrato \"{contrato.Nome}\" do evento {mesclagem.Evento.Nome} para sua leitura.")
            .AppendLine()
            .AppendLine($"Acesse: {endereco}")
            .AppendLine()
            .AppendLine($"O link vale até {link.ExpiraEm.ToLocalTime():dd/MM/yyyy HH:mm}.")
            .ToString();

        try
        {
            await email.EnviarAsync(destino, $"Contrato: {contrato.Nome}", texto, ct);
        }
        catch (Exception)
        {
            return Resultado<EnvioContrato>.Erro(Codigos.Validacao, "Não foi possível enviar o e-mail. Tente de novo mais tarde.");
        }

        await dados.InserirLinkAsync(link, ct);
        await dados.SalvarAsync(ct);
        return Resultado<EnvioContrato>.Sucesso(new EnvioContrato(destino, link.ExpiraEm));
    }

    public async Task<Resultado<ContratoPublico>> PublicoAsync(string token, DateOnly hoje, CancellationToken ct)
    {
        var expirado = Resultado<ContratoPublico>.Erro(Codigos.Indisponivel, "Este link expirou. Peça um novo à sua assessoria.");
        if (string.IsNullOrWhiteSpace(token) || token.Length > 100)
        {
            return expirado;
        }

        var link = await dados.LinkPorTokenAsync(token, ct);
        if (link is null || !link.Valido(DateTimeOffset.UtcNow))
        {
            return expirado;
        }

        var mesclagem = await dados.DadosMesclagemAsync(link.ContaId, link.EventoId, ct);
        var contrato = await dados.ObterAsync(link.ContaId, link.ContratoId, ct);
        if (mesclagem is null || contrato is null)
        {
            return expirado;
        }

        return Resultado<ContratoPublico>.Sucesso(new ContratoPublico(
            contrato.Nome,
            Mesclagem.Preencher(contrato.Texto, Valores(mesclagem, hoje)),
            mesclagem.Perfil?.NomeEmpresa,
            link.ExpiraEm));
    }

    public static IReadOnlyDictionary<string, string?> Valores(DadosMesclagemEvento dados, DateOnly hoje)
    {
        var evento = dados.Evento;
        var cliente = dados.Cliente;
        var perfil = dados.Perfil;
        var local = evento.Cerimonia?.Nome ?? evento.Recepcao?.Nome;
        var parcelas = dados.Parcelas.OrderBy(item => item.Numero).ToArray();
        return new Dictionary<string, string?>
        {
            ["contratante_nome"] = cliente?.Nome,
            ["contratante_documento"] = cliente is null ? null : (cliente.Cpf ?? cliente.Cnpj),
            ["contratante_endereco"] = cliente is null ? null : Endereco(cliente),
            ["contratante_email"] = cliente?.Email,
            ["contratante_telefone"] = cliente is null || string.IsNullOrWhiteSpace(cliente.Celular) ? null : $"{cliente.Ddi} {cliente.Celular}".Trim(),
            ["contratada_nome"] = perfil?.NomeEmpresa,
            ["contratada_documento"] = perfil?.Documento,
            ["contratada_endereco"] = perfil?.Endereco,
            ["contratada_responsavel"] = perfil?.Responsavel,
            ["contratada_pix"] = perfil?.ChavePix,
            ["evento_nome"] = evento.Nome,
            ["evento_tipo"] = RotuloTipo(evento.Tipo),
            ["evento_data"] = evento.Data?.ToString("dd/MM/yyyy"),
            ["evento_local"] = local,
            ["evento_convidados"] = evento.ConvidadosEstimados?.ToString(),
            ["contrato_valor"] = evento.ValorContrato is decimal valor ? Mesclagem.Real(valor) : null,
            ["contrato_parcelas"] = parcelas.Length == 0
                ? null
                : string.Join("\n", parcelas.Select(item =>
                    $"{(item.Entrada ? "Entrada" : $"Parcela {item.Numero}")}: {item.Vencimento:dd/MM/yyyy} - {Mesclagem.Real(item.Valor)}")),
            ["data_hoje"] = Mesclagem.DataExtenso(hoje),
        };
    }

    private static string? Endereco(Cliente cliente)
    {
        var rua = string.Join(", ", new[] { cliente.Endereco, cliente.Numero, cliente.Complemento }.Where(item => !string.IsNullOrWhiteSpace(item)));
        var cidade = string.Join("/", new[] { cliente.Cidade, cliente.Estado }.Where(item => !string.IsNullOrWhiteSpace(item)));
        var partes = new[] { rua, cliente.Bairro, cidade, cliente.Cep }.Where(item => !string.IsNullOrWhiteSpace(item)).ToArray();
        return partes.Length == 0 ? null : string.Join(" - ", partes);
    }

    private static string RotuloTipo(TipoEvento tipo) => tipo switch
    {
        TipoEvento.Casamento => "Casamento",
        TipoEvento.QuinzeAnos => "15 anos",
        TipoEvento.Aniversario => "Aniversário",
        TipoEvento.Corporativo => "Corporativo",
        TipoEvento.Formatura => "Formatura",
        _ => tipo.ToString(),
    };

    private static string NovoToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static ContratoLeitura Ler(ContratoConta contrato) => new(contrato.Id, contrato.Nome, contrato.Texto, contrato.AtualizadoEm);
}
