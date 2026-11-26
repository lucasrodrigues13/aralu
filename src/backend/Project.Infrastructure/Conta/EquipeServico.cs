using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Negocio;
using Project.Domain.Equipe;
using Project.Infrastructure.Persistencia;

namespace Project.Infrastructure.Conta;

public sealed record MembroPedido(
    string? Nome,
    string? Email,
    string? Celular,
    DateOnly? Nascimento,
    string? Tipo,
    Guid? GrupoId);

public sealed record MembroLeitura(
    Guid Id,
    string Nome,
    string Email,
    string? Celular,
    DateOnly? Nascimento,
    string Tipo,
    Guid? GrupoId,
    string? Grupo,
    string Situacao,
    DateTimeOffset ConvidadaEm,
    DateTimeOffset? PrimeiroAcessoEm,
    bool? ConviteEnviado);

public sealed record ContaComMembros(Guid ContaId, string EmailDaConta, IReadOnlyList<MembroLeitura> Membros);

public sealed record NomeMembro(Guid Id, string Nome, bool Removida);

public sealed record MinhaConta(string Nome, string Email, string? Celular, DateOnly? Nascimento, string Empresa);

public sealed record AtualizarMinhaConta(string? Nome, string? Celular, DateOnly? Nascimento);

/// <summary>Equipe da conta (SPEC-062 parte C): convite como Dono ou Membro de um grupo, troca de tipo e grupo, remoção.</summary>
public sealed class EquipeServico(
    AppDbContext banco,
    UserManager<ApplicationUser> usuarios,
    IEnvioEmail email,
    IConfiguration configuracao)
{
    public const string ErroUltimoDono = "ultimo_dono";
    public const string ErroJaMembro = "ja_membro";
    private const string Finalidade = "convite-assistente";

    public async Task<IReadOnlyList<MembroLeitura>> ListarAsync(Guid contaId, CancellationToken ct)
    {
        var itens = await banco.Membros.AsNoTracking()
            .Where(item => item.ContaId == contaId && item.Situacao != SituacaoMembro.Removida)
            .OrderBy(item => item.Tipo).ThenBy(item => item.Nome)
            .ToListAsync(ct);
        var grupos = await NomesDosGruposAsync(contaId, ct);
        return itens.Select(item => Ler(item, grupos, null)).ToList();
    }

    /// <summary>Consulta do Admin: membros de todas as contas, inclusive removidos, agrupados por conta.</summary>
    public async Task<IReadOnlyList<ContaComMembros>> ListarParaAdminAsync(CancellationToken ct)
    {
        var itens = await banco.Membros.AsNoTracking().IgnoreQueryFilters()
            .Where(item => item.Tipo == TipoMembro.Membro)
            .OrderBy(item => item.Nome)
            .ToListAsync(ct);
        var contas = itens.Select(item => item.ContaId).Distinct().ToList();
        var donos = await banco.Contas.AsNoTracking()
            .Where(conta => contas.Contains(conta.Id))
            .Join(banco.Users, conta => conta.DonoUsuarioId, usuario => usuario.Id, (conta, usuario) => new { conta.Id, usuario.Email })
            .ToDictionaryAsync(item => item.Id, item => item.Email ?? "", ct);
        var grupos = await banco.Grupos.AsNoTracking().IgnoreQueryFilters()
            .Where(grupo => contas.Contains(grupo.ContaId))
            .ToDictionaryAsync(grupo => grupo.Id, grupo => grupo.Nome, ct);
        return itens
            .GroupBy(item => item.ContaId)
            .Select(grupo => new ContaComMembros(
                grupo.Key,
                donos.GetValueOrDefault(grupo.Key, ""),
                grupo.Select(item => Ler(item, grupos, null)).ToList()))
            .OrderBy(conta => conta.EmailDaConta)
            .ToList();
    }

    /// <summary>Membros ativos da conta: base dos seletores de responsável (antes "assistentes ativas").</summary>
    public async Task<IReadOnlyList<MembroLeitura>> AtivosAsync(Guid contaId, CancellationToken ct)
    {
        var itens = await banco.Membros.AsNoTracking()
            .Where(item => item.ContaId == contaId && item.Tipo == TipoMembro.Membro && item.Situacao == SituacaoMembro.Ativa)
            .OrderBy(item => item.Nome)
            .ToListAsync(ct);
        var grupos = await NomesDosGruposAsync(contaId, ct);
        return itens.Select(item => Ler(item, grupos, null)).ToList();
    }

    /// <summary>Nome de todos os membros da conta, inclusive removidos: rotula responsáveis de tarefas antigas.</summary>
    public async Task<IReadOnlyList<NomeMembro>> NomesAsync(Guid contaId, CancellationToken ct) =>
        await banco.Membros.AsNoTracking()
            .Where(item => item.ContaId == contaId && item.Tipo == TipoMembro.Membro)
            .OrderBy(item => item.Nome)
            .Select(item => new NomeMembro(item.Id, item.Nome, item.Situacao == SituacaoMembro.Removida || item.Situacao == SituacaoMembro.Inativa))
            .ToListAsync(ct);

    /// <summary>Membro do login, com o grupo e as permissões. Lido a cada pedido (RF-117).</summary>
    public async Task<(MembroConta Membro, GrupoAcesso? Grupo)?> AcessoAsync(string usuarioId, CancellationToken ct)
    {
        var membro = await banco.Membros.AsNoTracking().IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.UsuarioId == usuarioId, ct);
        if (membro is null)
        {
            return null;
        }

        var grupo = membro.GrupoId is Guid grupoId
            ? await banco.Grupos.AsNoTracking().IgnoreQueryFilters().Include(item => item.Permissoes)
                .FirstOrDefaultAsync(item => item.Id == grupoId, ct)
            : null;
        return (membro, grupo);
    }

    public async Task<Resultado<MembroLeitura>> ConvidarAsync(Guid contaId, MembroPedido pedido, CancellationToken ct)
    {
        var validacao = Validar(pedido.Nome, pedido.Email, pedido.Celular, pedido.Nascimento, exigirEmail: true);
        if (validacao.Falha is not null)
        {
            return Resultado<MembroLeitura>.Erro(validacao.Falha.Codigo, validacao.Falha.Mensagem);
        }

        var acesso = await ValidarAcessoAsync(contaId, pedido.Tipo, pedido.GrupoId, ct);
        if (acesso.Falha is not null)
        {
            return Resultado<MembroLeitura>.Erro(acesso.Falha.Codigo, acesso.Falha.Mensagem);
        }

        var (nome, endereco, celular) = validacao.Valor;
        var existente = await usuarios.FindByEmailAsync(endereco!);
        if (existente is not null)
        {
            var daConta = await banco.Membros.AnyAsync(
                item => item.UsuarioId == existente.Id && item.ContaId == contaId && item.Situacao != SituacaoMembro.Removida, ct);
            return Resultado<MembroLeitura>.Erro(
                daConta ? ErroJaMembro : Codigos.Validacao,
                daConta ? "Este e-mail já é de alguém desta conta. Se o acesso está desativado, reative na lista." : "Este e-mail já pertence a outra conta.");
        }

        var usuario = new ApplicationUser { UserName = endereco, Email = endereco, EmailConfirmed = true };
        var criado = await usuarios.CreateAsync(usuario);
        if (!criado.Succeeded)
        {
            return Resultado<MembroLeitura>.Erro(Codigos.Validacao, "Este e-mail já pertence a outra conta.");
        }

        var papel = await usuarios.AddToRoleAsync(usuario, PapelDo(acesso.Valor.Tipo));
        if (!papel.Succeeded)
        {
            await usuarios.DeleteAsync(usuario);
            return Resultado<MembroLeitura>.Erro(Codigos.Validacao, "Não foi possível criar o acesso.");
        }

        var membro = new MembroConta
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            UsuarioId = usuario.Id,
            Tipo = acesso.Valor.Tipo,
            GrupoId = acesso.Valor.GrupoId,
            Nome = nome,
            Email = endereco!,
            Celular = celular,
            Nascimento = pedido.Nascimento,
            Situacao = SituacaoMembro.Convidada,
            ConvidadaEm = DateTimeOffset.UtcNow,
        };
        banco.Membros.Add(membro);
        await banco.SaveChangesAsync(ct);

        var enviado = await EnviarConviteAsync(usuario, membro, ct);
        return Resultado<MembroLeitura>.Sucesso(Ler(membro, await NomesDosGruposAsync(contaId, ct), enviado));
    }

    public async Task<Resultado<MembroLeitura>> AtualizarAsync(Guid contaId, Guid id, MembroPedido pedido, CancellationToken ct)
    {
        var membro = await DaContaAsync(contaId, id, ct);
        if (membro is null)
        {
            return Resultado<MembroLeitura>.Erro(Codigos.Indisponivel, "Pessoa não encontrada.");
        }

        var validacao = Validar(pedido.Nome, pedido.Email, pedido.Celular, pedido.Nascimento, exigirEmail: true);
        if (validacao.Falha is not null)
        {
            return Resultado<MembroLeitura>.Erro(validacao.Falha.Codigo, validacao.Falha.Mensagem);
        }

        // Sem tipo no pedido, mantém o atual (telas antigas mandam só os dados pessoais).
        var acesso = await ValidarAcessoAsync(
            contaId,
            pedido.Tipo ?? membro.Tipo.ToString(),
            pedido.Tipo is null && pedido.GrupoId is null ? membro.GrupoId : pedido.GrupoId,
            ct);
        if (acesso.Falha is not null)
        {
            return Resultado<MembroLeitura>.Erro(acesso.Falha.Codigo, acesso.Falha.Mensagem);
        }

        if (membro.Tipo == TipoMembro.Dono && acesso.Valor.Tipo != TipoMembro.Dono && await UltimoDonoAsync(contaId, membro.Id, ct))
        {
            return UltimoDono<MembroLeitura>();
        }

        var (nome, endereco, celular) = validacao.Valor;
        var usuario = await usuarios.FindByIdAsync(membro.UsuarioId);
        if (usuario is null)
        {
            return Resultado<MembroLeitura>.Erro(Codigos.Indisponivel, "Pessoa não encontrada.");
        }

        var emailMudou = !string.Equals(endereco, membro.Email, StringComparison.OrdinalIgnoreCase);
        if (emailMudou)
        {
            var outro = await usuarios.FindByEmailAsync(endereco!);
            if (outro is not null && outro.Id != usuario.Id)
            {
                return Resultado<MembroLeitura>.Erro(Codigos.Validacao, "Este e-mail já pertence a outra conta.");
            }

            usuario.Email = endereco;
            usuario.UserName = endereco;
            var troca = await usuarios.UpdateAsync(usuario);
            if (!troca.Succeeded)
            {
                return Resultado<MembroLeitura>.Erro(Codigos.Validacao, "Este e-mail já pertence a outra conta.");
            }
        }

        if (membro.Tipo != acesso.Valor.Tipo)
        {
            await usuarios.RemoveFromRoleAsync(usuario, PapelDo(membro.Tipo));
            await usuarios.AddToRoleAsync(usuario, PapelDo(acesso.Valor.Tipo));
        }

        membro.Nome = nome;
        membro.Email = endereco!;
        membro.Celular = celular;
        membro.Nascimento = pedido.Nascimento;
        membro.Tipo = acesso.Valor.Tipo;
        membro.GrupoId = acesso.Valor.GrupoId;
        await banco.SaveChangesAsync(ct);

        bool? enviado = null;
        if (emailMudou && membro.Situacao == SituacaoMembro.Convidada)
        {
            await usuarios.UpdateSecurityStampAsync(usuario);
            enviado = await EnviarConviteAsync(usuario, membro, ct);
        }

        return Resultado<MembroLeitura>.Sucesso(Ler(membro, await NomesDosGruposAsync(contaId, ct), enviado));
    }

    public async Task<Resultado<MembroLeitura>> ReenviarAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var membro = await DaContaAsync(contaId, id, ct);
        if (membro is null)
        {
            return Resultado<MembroLeitura>.Erro(Codigos.Indisponivel, "Pessoa não encontrada.");
        }

        if (membro.Situacao != SituacaoMembro.Convidada)
        {
            return Resultado<MembroLeitura>.Erro(Codigos.Validacao, "Esta pessoa já criou a senha.");
        }

        var usuario = await usuarios.FindByIdAsync(membro.UsuarioId);
        if (usuario is null)
        {
            return Resultado<MembroLeitura>.Erro(Codigos.Indisponivel, "Pessoa não encontrada.");
        }

        // Novo carimbo de segurança invalida o link anterior.
        await usuarios.UpdateSecurityStampAsync(usuario);
        membro.ConvidadaEm = DateTimeOffset.UtcNow;
        await banco.SaveChangesAsync(ct);
        var enviado = await EnviarConviteAsync(usuario, membro, ct);
        return Resultado<MembroLeitura>.Sucesso(Ler(membro, await NomesDosGruposAsync(contaId, ct), enviado));
    }

    /// <summary>
    /// Remove o acesso sem apagar cadastro nem login: cai no próximo pedido (RF-117)
    /// e o Dono pode reativar depois. O último Dono não pode ser removido (R4).
    /// </summary>
    public async Task<Resultado<bool>> DesativarAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var membro = await DaContaAsync(contaId, id, ct);
        if (membro is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Pessoa não encontrada.");
        }

        if (membro.Situacao == SituacaoMembro.Inativa)
        {
            return Resultado<bool>.Sucesso(true);
        }

        if (membro.Tipo == TipoMembro.Dono && await UltimoDonoAsync(contaId, membro.Id, ct))
        {
            return UltimoDono<bool>();
        }

        membro.Situacao = SituacaoMembro.Inativa;
        membro.RemovidaEm = DateTimeOffset.UtcNow;
        await banco.SaveChangesAsync(ct);

        var usuario = await usuarios.FindByIdAsync(membro.UsuarioId);
        if (usuario is not null)
        {
            await usuarios.UpdateSecurityStampAsync(usuario);
        }

        return Resultado<bool>.Sucesso(true);
    }

    /// <summary>Devolve o acesso: quem já criou a senha volta ativo; quem não criou recebe convite novo.</summary>
    public async Task<Resultado<MembroLeitura>> ReativarAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var membro = await DaContaAsync(contaId, id, ct);
        if (membro is null)
        {
            return Resultado<MembroLeitura>.Erro(Codigos.Indisponivel, "Pessoa não encontrada.");
        }

        if (membro.Situacao != SituacaoMembro.Inativa)
        {
            return Resultado<MembroLeitura>.Erro(Codigos.Validacao, "O acesso desta pessoa já está liberado.");
        }

        var usuario = await usuarios.FindByIdAsync(membro.UsuarioId);
        if (usuario is null)
        {
            return Resultado<MembroLeitura>.Erro(Codigos.Indisponivel, "Pessoa não encontrada.");
        }

        membro.RemovidaEm = null;
        bool? enviado = null;
        if (await usuarios.HasPasswordAsync(usuario))
        {
            membro.Situacao = SituacaoMembro.Ativa;
            await banco.SaveChangesAsync(ct);
        }
        else
        {
            membro.Situacao = SituacaoMembro.Convidada;
            membro.ConvidadaEm = DateTimeOffset.UtcNow;
            await banco.SaveChangesAsync(ct);
            await usuarios.UpdateSecurityStampAsync(usuario);
            enviado = await EnviarConviteAsync(usuario, membro, ct);
        }

        return Resultado<MembroLeitura>.Sucesso(Ler(membro, await NomesDosGruposAsync(contaId, ct), enviado));
    }

    public async Task<Resultado<bool>> AceitarConviteAsync(string? usuarioId, string? token, string? senha, string? confirmacao, CancellationToken ct)
    {
        var invalido = Resultado<bool>.Erro("token", "Este convite expirou. Peça um novo ao responsável pela conta.");
        if (string.IsNullOrWhiteSpace(senha))
        {
            return Resultado<bool>.Erro(Codigos.Validacao, "Informe uma senha.");
        }

        if (confirmacao is not null && confirmacao != senha)
        {
            return Resultado<bool>.Erro(Codigos.Validacao, "A confirmação da senha não confere.");
        }

        var usuario = string.IsNullOrWhiteSpace(usuarioId) ? null : await usuarios.FindByIdAsync(usuarioId);
        if (usuario is null || string.IsNullOrWhiteSpace(token))
        {
            return invalido;
        }

        var membro = await banco.Membros.IgnoreQueryFilters().FirstOrDefaultAsync(item => item.UsuarioId == usuario.Id, ct);
        if (membro is null || membro.Situacao != SituacaoMembro.Convidada)
        {
            return invalido;
        }

        var valido = await usuarios.VerifyUserTokenAsync(usuario, ConviteAssistenteTokenProvider.Nome, Finalidade, token);
        if (!valido)
        {
            return invalido;
        }

        var senhaCriada = await usuarios.AddPasswordAsync(usuario, senha);
        if (!senhaCriada.Succeeded)
        {
            return Resultado<bool>.Erro(Codigos.Validacao, "A senha não atende às regras.");
        }

        await usuarios.UpdateSecurityStampAsync(usuario);
        membro.Situacao = SituacaoMembro.Ativa;
        membro.PrimeiroAcessoEm = DateTimeOffset.UtcNow;
        await banco.SaveChangesAsync(ct);
        return Resultado<bool>.Sucesso(true);
    }

    public async Task<Resultado<MinhaConta>> MinhaContaAsync(string usuarioId, CancellationToken ct)
    {
        var membro = await banco.Membros.AsNoTracking().IgnoreQueryFilters().FirstOrDefaultAsync(item => item.UsuarioId == usuarioId, ct);
        if (membro is null || membro.Situacao != SituacaoMembro.Ativa)
        {
            return Resultado<MinhaConta>.Erro(Codigos.Indisponivel, "Seu acesso foi removido.");
        }

        var empresa = await banco.Perfis.AsNoTracking().IgnoreQueryFilters()
            .Where(perfil => perfil.ContaId == membro.ContaId)
            .Select(perfil => perfil.NomeEmpresa)
            .FirstOrDefaultAsync(ct);
        return Resultado<MinhaConta>.Sucesso(new MinhaConta(
            membro.Nome, membro.Email, membro.Celular, membro.Nascimento, empresa ?? ""));
    }

    public async Task<Resultado<MinhaConta>> AtualizarMinhaContaAsync(string usuarioId, AtualizarMinhaConta pedido, CancellationToken ct)
    {
        var membro = await banco.Membros.IgnoreQueryFilters().FirstOrDefaultAsync(item => item.UsuarioId == usuarioId, ct);
        if (membro is null || membro.Situacao != SituacaoMembro.Ativa)
        {
            return Resultado<MinhaConta>.Erro(Codigos.Indisponivel, "Seu acesso foi removido.");
        }

        var validacao = Validar(pedido.Nome, membro.Email, pedido.Celular, pedido.Nascimento, exigirEmail: false);
        if (validacao.Falha is not null)
        {
            return Resultado<MinhaConta>.Erro(validacao.Falha.Codigo, validacao.Falha.Mensagem);
        }

        membro.Nome = validacao.Valor.Nome;
        membro.Celular = validacao.Valor.Celular;
        membro.Nascimento = pedido.Nascimento;
        await banco.SaveChangesAsync(ct);
        return await MinhaContaAsync(usuarioId, ct);
    }

    public async Task<Resultado<bool>> TrocarSenhaAsync(string usuarioId, string? atual, string? nova, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(atual) || string.IsNullOrWhiteSpace(nova))
        {
            return Resultado<bool>.Erro(Codigos.Validacao, "Informe a senha atual e a nova.");
        }

        var usuario = await usuarios.FindByIdAsync(usuarioId);
        if (usuario is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Seu acesso foi removido.");
        }

        var troca = await usuarios.ChangePasswordAsync(usuario, atual, nova);
        return troca.Succeeded
            ? Resultado<bool>.Sucesso(true)
            : Resultado<bool>.Erro(Codigos.Validacao, "A senha atual não confere ou a nova não atende às regras.");
    }

    public static string PapelDo(TipoMembro tipo) => tipo == TipoMembro.Dono ? Papeis.Organizer : Papeis.Assistant;

    private static Resultado<T> UltimoDono<T>() => Resultado<T>.Erro(ErroUltimoDono, "A conta precisa ter pelo menos um dono.");

    /// <summary>Verdadeiro quando, sem esta pessoa, a conta ficaria sem Dono ativo (R4).</summary>
    private Task<bool> UltimoDonoAsync(Guid contaId, Guid membroId, CancellationToken ct) =>
        banco.Membros.AllAsync(
            item => item.ContaId != contaId || item.Id == membroId || item.Tipo != TipoMembro.Dono || item.Situacao != SituacaoMembro.Ativa,
            ct);

    private async Task<(Falha? Falha, (TipoMembro Tipo, Guid? GrupoId) Valor)> ValidarAcessoAsync(Guid contaId, string? tipoTexto, Guid? grupoId, CancellationToken ct)
    {
        if (!Enum.TryParse<TipoMembro>(tipoTexto ?? nameof(TipoMembro.Membro), ignoreCase: true, out var tipo) || !Enum.IsDefined(tipo))
        {
            return (new Falha(Codigos.Validacao, "Escolha o tipo: Dono ou Membro."), default);
        }

        if (tipo == TipoMembro.Dono)
        {
            return (null, (tipo, null));
        }

        // Sem grupo informado, o Membro entra no grupo padrão "Assistentes" (quem vinha da tela antiga de assistentes).
        var grupo = grupoId is Guid id
            ? await banco.Grupos.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id && item.ContaId == contaId, ct)
            : await banco.Grupos.AsNoTracking().FirstOrDefaultAsync(item => item.ContaId == contaId && item.Nome == GruposPadrao.Assistentes, ct);
        return grupo is null
            ? (new Falha(Codigos.Validacao, "Escolha o grupo do membro."), default)
            : (null, (tipo, grupo.Id));
    }

    private Task<Dictionary<Guid, string>> NomesDosGruposAsync(Guid contaId, CancellationToken ct) =>
        banco.Grupos.AsNoTracking()
            .Where(grupo => grupo.ContaId == contaId)
            .ToDictionaryAsync(grupo => grupo.Id, grupo => grupo.Nome, ct);

    private Task<MembroConta?> DaContaAsync(Guid contaId, Guid id, CancellationToken ct) =>
        banco.Membros.FirstOrDefaultAsync(
            item => item.Id == id && item.ContaId == contaId && item.Situacao != SituacaoMembro.Removida, ct);

    private async Task<bool> EnviarConviteAsync(ApplicationUser usuario, MembroConta membro, CancellationToken ct)
    {
        try
        {
            var token = await usuarios.GenerateUserTokenAsync(usuario, ConviteAssistenteTokenProvider.Nome, Finalidade);
            var empresa = await banco.Perfis.AsNoTracking()
                .Where(perfil => perfil.ContaId == membro.ContaId)
                .Select(perfil => perfil.NomeEmpresa)
                .FirstOrDefaultAsync(ct);
            var publico = (configuracao["PublicUrl"] ?? "").TrimEnd('/');
            var link = $"{publico}/convite?usuarioId={Uri.EscapeDataString(usuario.Id)}&token={Uri.EscapeDataString(token)}";
            var quem = string.IsNullOrWhiteSpace(empresa) ? "uma assessoria" : empresa;
            await email.EnviarAsync(membro.Email, EmailMensagens.ConviteParaEquipe(membro.Nome, quem, link), ct);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static MembroLeitura Ler(MembroConta item, IReadOnlyDictionary<Guid, string> grupos, bool? conviteEnviado) => new(
        item.Id,
        item.Nome,
        item.Email,
        item.Celular,
        item.Nascimento,
        item.Tipo.ToString(),
        item.GrupoId,
        item.GrupoId is Guid grupo ? grupos.GetValueOrDefault(grupo) : null,
        item.Situacao.ToString(),
        item.ConvidadaEm,
        item.PrimeiroAcessoEm,
        conviteEnviado);

    private static (Falha? Falha, (string Nome, string? Email, string? Celular) Valor) Validar(
        string? nome, string? emailTexto, string? celular, DateOnly? nascimento, bool exigirEmail)
    {
        static (Falha?, (string, string?, string?)) Erro(string mensagem) =>
            (new Falha(Codigos.Validacao, mensagem), ("", null, null));

        var nomeLimpo = Domain.Comum.Texto.Limpo(nome);
        if (nomeLimpo is null || nomeLimpo.Length > 100)
        {
            return Erro("Informe o nome (até 100 caracteres).");
        }

        string? endereco = null;
        if (exigirEmail)
        {
            endereco = Domain.Comum.Texto.Limpo(emailTexto);
            var arroba = endereco?.IndexOf('@') ?? -1;
            if (endereco is null || arroba <= 0 || arroba >= endereco.Length - 1 || endereco.Contains(' '))
            {
                return Erro("Informe um e-mail válido.");
            }
        }

        string? celularLimpo = null;
        if (!Domain.Comum.Texto.Vazio(celular))
        {
            celularLimpo = Mascaras.Celular(celular);
            if (string.IsNullOrEmpty(celularLimpo))
            {
                return Erro("Informe o celular com DDD.");
            }
        }

        if (nascimento is DateOnly data && data > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return Erro("A data de nascimento não pode ser futura.");
        }

        return (null, (nomeLimpo, endereco, celularLimpo));
    }
}
