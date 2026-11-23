using Project.Application.Arquivos;
using Project.Application.Comum;
using Project.Domain.Contratos;

namespace Project.Application.Negocio;

/// <param name="Formato">"texto" (padrão) ou "word". No Word, <paramref name="WordArquivoId"/> é o .docx já enviado.</param>
public sealed record SalvarContrato(string? Nome, string? Texto, string? Formato = null, Guid? WordArquivoId = null);

public sealed record ContratoLeitura(
    Guid Id,
    string Nome,
    string Texto,
    DateTimeOffset AtualizadoEm,
    Guid? LogoArquivoId = null,
    Guid? FundoArquivoId = null,
    string Formato = FormatoModelo.Texto,
    Guid? WordArquivoId = null,
    string? WordNome = null);

public sealed record ContratoResumo(Guid Id, string Nome, DateTimeOffset AtualizadoEm, string Formato = FormatoModelo.Texto);

/// <summary>Live Preview do modelo Word: o .docx com exemplos (base64), as tags achadas e as que não existem.</summary>
public sealed record PreviaWord(string Documento, IReadOnlyList<string> Tags, IReadOnlyList<string> Desconhecidas);

public sealed record CamposContratoLeitura(IReadOnlyList<CampoMesclagem> Campos);

public interface IDadosContrato
{
    Task<IReadOnlyList<ContratoConta>> ListarAsync(string contaId, CancellationToken ct);

    Task<ContratoConta?> ObterAsync(string contaId, Guid id, CancellationToken ct);

    Task InserirAsync(ContratoConta contrato, CancellationToken ct);

    Task RemoverAsync(ContratoConta contrato, CancellationToken ct);

    Task SalvarAsync(CancellationToken ct);
}

/// <summary>Cadastro de contratos da conta, sem vínculo com modelo de evento nem com evento (SPEC-030 v3).</summary>
public sealed class ContratoServico(IDadosContrato dados, IArmazenamentoArquivo? arquivos = null)
{
    public CamposContratoLeitura Campos() => new(Mesclagem.Campos);

    public async Task<IReadOnlyList<ContratoResumo>> ListarAsync(string contaId, CancellationToken ct) =>
        (await dados.ListarAsync(contaId, ct))
            .OrderBy(item => item.Nome, StringComparer.CurrentCultureIgnoreCase)
            .Select(item => new ContratoResumo(item.Id, item.Nome, item.AtualizadoEm, item.Formato))
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

        var formato = string.IsNullOrWhiteSpace(pedido.Formato) ? FormatoModelo.Texto : pedido.Formato.Trim().ToLowerInvariant();
        if (formato is not (FormatoModelo.Texto or FormatoModelo.Word))
        {
            return Resultado<ContratoLeitura>.Erro(Codigos.Validacao, "Escolha como o modelo é feito: escrito na plataforma ou documento Word.");
        }

        string? texto;
        string? wordNome = null;
        if (formato == FormatoModelo.Word)
        {
            if (pedido.WordArquivoId is not Guid wordId)
            {
                return Resultado<ContratoLeitura>.Erro(Codigos.Validacao, "Envie o documento Word (.docx) do modelo.");
            }

            var lido = await LerWordAsync(contaId, wordId, ct);
            if (lido is null)
            {
                return Resultado<ContratoLeitura>.Erro(Codigos.Validacao, "O documento Word não foi encontrado. Envie o arquivo .docx de novo.");
            }

            texto = MesclagemWord.Texto(lido.Value.Bytes);
            wordNome = lido.Value.Nome;
        }
        else
        {
            texto = pedido.Texto?.Trim();
            if (string.IsNullOrEmpty(texto))
            {
                return Resultado<ContratoLeitura>.Erro(Codigos.Validacao, "Informe o texto do contrato.");
            }
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
        contrato.Formato = formato;
        contrato.WordArquivoId = formato == FormatoModelo.Word ? pedido.WordArquivoId : null;
        contrato.WordNome = wordNome;
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

    /// <summary>Liga (ou, com arquivo nulo, desliga) a logo ou o fundo (SPEC-056). Devolve o arquivo ligado antes.</summary>
    public async Task<Resultado<Guid?>> DefinirImagemAsync(string contaId, Guid id, bool logo, Guid? arquivoId, CancellationToken ct)
    {
        var contrato = await dados.ObterAsync(contaId, id, ct);
        if (contrato is null)
        {
            return Resultado<Guid?>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var anterior = logo ? contrato.LogoArquivoId : contrato.FundoArquivoId;
        if (logo)
        {
            contrato.LogoArquivoId = arquivoId;
        }
        else
        {
            contrato.FundoArquivoId = arquivoId;
        }

        contrato.AtualizadoEm = DateTimeOffset.UtcNow;
        await dados.SalvarAsync(ct);
        return Resultado<Guid?>.Sucesso(anterior);
    }

    /// <summary>Live Preview do Word: o documento com os exemplos destacados no lugar das tags.</summary>
    public async Task<Resultado<PreviaWord>> PreviaWordAsync(string contaId, Guid arquivoId, CancellationToken ct)
    {
        var lido = await LerWordAsync(contaId, arquivoId, ct);
        if (lido is null)
        {
            return Resultado<PreviaWord>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        var bytes = lido.Value.Bytes;
        var tags = MesclagemWord.Tags(bytes);
        var conhecidas = Mesclagem.Campos.Select(campo => campo.Marca).ToHashSet();
        var preenchido = MesclagemWord.Preencher(bytes, Mesclagem.Exemplos(), destacar: true);
        return Resultado<PreviaWord>.Sucesso(new PreviaWord(
            Convert.ToBase64String(preenchido),
            tags,
            tags.Where(tag => !conhecidas.Contains(tag)).ToArray()));
    }

    private async Task<(byte[] Bytes, string Nome)?> LerWordAsync(string contaId, Guid arquivoId, CancellationToken ct)
    {
        if (arquivos is null)
        {
            return null;
        }

        using var aberto = await arquivos.AbrirAsync(arquivoId, contaId, ct);
        if (aberto is null)
        {
            return null;
        }

        using var memoria = new MemoryStream();
        await aberto.Conteudo.CopyToAsync(memoria, ct);
        var bytes = memoria.ToArray();
        return MesclagemWord.EhDocx(bytes) ? (bytes, aberto.NomeOriginal) : null;
    }

    private static ContratoLeitura Ler(ContratoConta contrato) =>
        new(contrato.Id, contrato.Nome, contrato.Texto, contrato.AtualizadoEm, contrato.LogoArquivoId, contrato.FundoArquivoId,
            contrato.Formato, contrato.WordArquivoId, contrato.WordNome);
}
