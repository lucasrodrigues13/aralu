using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Negocio;
using Project.Domain.Equipe;
using Project.Infrastructure.Persistencia;

namespace Project.Infrastructure.Conta;

public sealed record ConvidarAssistentePedido(
    string? Nome,
    string? Email,
    string? Celular,
    DateOnly? Nascimento,
    bool? PodeVerFinanceiro,
    bool? SomenteDela);

public sealed record AssistenteLeitura(
    Guid Id,
    string Nome,
    string Email,
    string? Celular,
    DateOnly? Nascimento,
    bool PodeVerFinanceiro,
    bool SomenteDela,
    string Situacao,
    DateTimeOffset ConvidadaEm,
    DateTimeOffset? PrimeiroAcessoEm,
    bool? ConviteEnviado);

public sealed record NomeAssistente(Guid Id, string Nome, bool Removida);

public sealed record MinhaConta(string Nome, string Email, string? Celular, DateOnly? Nascimento, string Empresa);

public sealed record AtualizarMinhaConta(string? Nome, string? Celular, DateOnly? Nascimento);

/// <summary>Convite, primeiro acesso, permissões e remoção das assistentes (SPEC-032).</summary>
public sealed class AssistenteServico(
    AppDbContext banco,
    UserManager<ApplicationUser> usuarios,
    IEnvioEmail email,
    IConfiguration configuracao)
{
    private const string Finalidade = "convite-assistente";

    public async Task<IReadOnlyList<AssistenteLeitura>> ListarAsync(string contaId, CancellationToken ct)
    {
        var itens = await banco.Assistentes.AsNoTracking()
            .Where(item => item.ContaId == contaId && item.Situacao != SituacaoAssistente.Removida)
            .OrderBy(item => item.Nome)
            .ToListAsync(ct);
        return itens.Select(item => Ler(item, null)).ToList();
    }

    /// <summary>Assistentes ativas da conta: base dos seletores de responsável (§6.6).</summary>
    public async Task<IReadOnlyList<AssistenteLeitura>> AtivasAsync(string contaId, CancellationToken ct)
    {
        var itens = await banco.Assistentes.AsNoTracking()
            .Where(item => item.ContaId == contaId && item.Situacao == SituacaoAssistente.Ativa)
            .OrderBy(item => item.Nome)
            .ToListAsync(ct);
        return itens.Select(item => Ler(item, null)).ToList();
    }

    /// <summary>Nome de todas as assistentes da conta, inclusive removidas: rotula responsáveis de tarefas antigas.</summary>
    public async Task<IReadOnlyList<NomeAssistente>> NomesAsync(string contaId, CancellationToken ct) =>
        await banco.Assistentes.AsNoTracking()
            .Where(item => item.ContaId == contaId)
            .OrderBy(item => item.Nome)
            .Select(item => new NomeAssistente(item.Id, item.Nome, item.Situacao == SituacaoAssistente.Removida))
            .ToListAsync(ct);

    public Task<Assistente?> PorUsuarioAsync(string usuarioId, CancellationToken ct) =>
        banco.Assistentes.AsNoTracking().FirstOrDefaultAsync(item => item.UsuarioId == usuarioId, ct);

    public async Task<Resultado<AssistenteLeitura>> ConvidarAsync(string contaId, ConvidarAssistentePedido pedido, CancellationToken ct)
    {
        var validacao = Validar(pedido.Nome, pedido.Email, pedido.Celular, pedido.Nascimento, exigirEmail: true);
        if (validacao.Falha is not null)
        {
            return Resultado<AssistenteLeitura>.Erro(validacao.Falha.Codigo, validacao.Falha.Mensagem);
        }

        var (nome, endereco, celular) = validacao.Valor;
        var existente = await usuarios.FindByEmailAsync(endereco!);
        if (existente is not null)
        {
            var daConta = await banco.Assistentes.AnyAsync(
                item => item.UsuarioId == existente.Id && item.ContaId == contaId && item.Situacao != SituacaoAssistente.Removida, ct);
            return Resultado<AssistenteLeitura>.Erro(
                daConta ? "ja_assistente" : Codigos.Validacao,
                daConta ? "Este e-mail já é de uma assistente desta conta." : "Este e-mail já pertence a outra conta.");
        }

        var usuario = new ApplicationUser { UserName = endereco, Email = endereco, EmailConfirmed = true };
        usuario.VincularAoOrganizer(contaId);
        var criado = await usuarios.CreateAsync(usuario);
        if (!criado.Succeeded)
        {
            return Resultado<AssistenteLeitura>.Erro(Codigos.Validacao, "Este e-mail já pertence a outra conta.");
        }

        var papel = await usuarios.AddToRoleAsync(usuario, Papeis.Assistant);
        if (!papel.Succeeded)
        {
            await usuarios.DeleteAsync(usuario);
            return Resultado<AssistenteLeitura>.Erro(Codigos.Validacao, "Não foi possível criar o acesso da assistente.");
        }

        var assistente = new Assistente
        {
            Id = Guid.NewGuid(),
            ContaId = contaId,
            UsuarioId = usuario.Id,
            Nome = nome,
            Email = endereco!,
            Celular = celular,
            Nascimento = pedido.Nascimento,
            PodeVerFinanceiro = pedido.PodeVerFinanceiro ?? false,
            SomenteDela = pedido.SomenteDela ?? false,
            Situacao = SituacaoAssistente.Convidada,
            ConvidadaEm = DateTimeOffset.UtcNow,
        };
        banco.Assistentes.Add(assistente);
        await banco.SaveChangesAsync(ct);

        var enviado = await EnviarConviteAsync(usuario, assistente, ct);
        return Resultado<AssistenteLeitura>.Sucesso(Ler(assistente, enviado));
    }

    public async Task<Resultado<AssistenteLeitura>> AtualizarAsync(string contaId, Guid id, ConvidarAssistentePedido pedido, CancellationToken ct)
    {
        var assistente = await DaContaAsync(contaId, id, ct);
        if (assistente is null)
        {
            return Resultado<AssistenteLeitura>.Erro(Codigos.Indisponivel, "Assistente não encontrada.");
        }

        var validacao = Validar(pedido.Nome, pedido.Email, pedido.Celular, pedido.Nascimento, exigirEmail: true);
        if (validacao.Falha is not null)
        {
            return Resultado<AssistenteLeitura>.Erro(validacao.Falha.Codigo, validacao.Falha.Mensagem);
        }

        var (nome, endereco, celular) = validacao.Valor;
        var usuario = await usuarios.FindByIdAsync(assistente.UsuarioId);
        if (usuario is null)
        {
            return Resultado<AssistenteLeitura>.Erro(Codigos.Indisponivel, "Assistente não encontrada.");
        }

        var emailMudou = !string.Equals(endereco, assistente.Email, StringComparison.OrdinalIgnoreCase);
        if (emailMudou)
        {
            var outro = await usuarios.FindByEmailAsync(endereco!);
            if (outro is not null && outro.Id != usuario.Id)
            {
                return Resultado<AssistenteLeitura>.Erro(Codigos.Validacao, "Este e-mail já pertence a outra conta.");
            }

            usuario.Email = endereco;
            usuario.UserName = endereco;
            var troca = await usuarios.UpdateAsync(usuario);
            if (!troca.Succeeded)
            {
                return Resultado<AssistenteLeitura>.Erro(Codigos.Validacao, "Este e-mail já pertence a outra conta.");
            }
        }

        assistente.Nome = nome;
        assistente.Email = endereco!;
        assistente.Celular = celular;
        assistente.Nascimento = pedido.Nascimento;
        assistente.PodeVerFinanceiro = pedido.PodeVerFinanceiro ?? assistente.PodeVerFinanceiro;
        assistente.SomenteDela = pedido.SomenteDela ?? assistente.SomenteDela;
        await banco.SaveChangesAsync(ct);

        bool? enviado = null;
        if (emailMudou && assistente.Situacao == SituacaoAssistente.Convidada)
        {
            await usuarios.UpdateSecurityStampAsync(usuario);
            enviado = await EnviarConviteAsync(usuario, assistente, ct);
        }

        return Resultado<AssistenteLeitura>.Sucesso(Ler(assistente, enviado));
    }

    public async Task<Resultado<AssistenteLeitura>> ReenviarAsync(string contaId, Guid id, CancellationToken ct)
    {
        var assistente = await DaContaAsync(contaId, id, ct);
        if (assistente is null)
        {
            return Resultado<AssistenteLeitura>.Erro(Codigos.Indisponivel, "Assistente não encontrada.");
        }

        if (assistente.Situacao != SituacaoAssistente.Convidada)
        {
            return Resultado<AssistenteLeitura>.Erro(Codigos.Validacao, "Esta assistente já criou a senha.");
        }

        var usuario = await usuarios.FindByIdAsync(assistente.UsuarioId);
        if (usuario is null)
        {
            return Resultado<AssistenteLeitura>.Erro(Codigos.Indisponivel, "Assistente não encontrada.");
        }

        // Novo carimbo de segurança invalida o link anterior (§6.1, ponto 4).
        await usuarios.UpdateSecurityStampAsync(usuario);
        assistente.ConvidadaEm = DateTimeOffset.UtcNow;
        await banco.SaveChangesAsync(ct);
        var enviado = await EnviarConviteAsync(usuario, assistente, ct);
        return Resultado<AssistenteLeitura>.Sucesso(Ler(assistente, enviado));
    }

    public async Task<Resultado<bool>> RemoverAsync(string contaId, Guid id, CancellationToken ct)
    {
        var assistente = await DaContaAsync(contaId, id, ct);
        if (assistente is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Assistente não encontrada.");
        }

        assistente.Situacao = SituacaoAssistente.Removida;
        assistente.RemovidaEm = DateTimeOffset.UtcNow;
        await banco.EventosAssistentes.Where(item => item.AssistenteId == assistente.Id).ExecuteDeleteAsync(ct);
        await banco.SaveChangesAsync(ct);

        // Apaga o login: o e-mail fica livre e o acesso cai no próximo pedido (§6.5).
        var usuario = await usuarios.FindByIdAsync(assistente.UsuarioId);
        if (usuario is not null)
        {
            await usuarios.DeleteAsync(usuario);
        }

        return Resultado<bool>.Sucesso(true);
    }

    public async Task<Resultado<bool>> AceitarConviteAsync(string? usuarioId, string? token, string? senha, string? confirmacao, CancellationToken ct)
    {
        var invalido = Resultado<bool>.Erro("token", "Este convite venceu. Peça um novo à dona da conta.");
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

        var assistente = await banco.Assistentes.FirstOrDefaultAsync(item => item.UsuarioId == usuario.Id, ct);
        if (assistente is null || assistente.Situacao != SituacaoAssistente.Convidada)
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
        assistente.Situacao = SituacaoAssistente.Ativa;
        assistente.PrimeiroAcessoEm = DateTimeOffset.UtcNow;
        await banco.SaveChangesAsync(ct);
        return Resultado<bool>.Sucesso(true);
    }

    public async Task<Resultado<MinhaConta>> MinhaContaAsync(string usuarioId, CancellationToken ct)
    {
        var assistente = await PorUsuarioAsync(usuarioId, ct);
        if (assistente is null || assistente.Situacao != SituacaoAssistente.Ativa)
        {
            return Resultado<MinhaConta>.Erro(Codigos.Indisponivel, "Seu acesso foi removido.");
        }

        var empresa = await banco.Perfis.AsNoTracking()
            .Where(perfil => perfil.ContaId == assistente.ContaId)
            .Select(perfil => perfil.NomeEmpresa)
            .FirstOrDefaultAsync(ct);
        return Resultado<MinhaConta>.Sucesso(new MinhaConta(
            assistente.Nome, assistente.Email, assistente.Celular, assistente.Nascimento, empresa ?? ""));
    }

    public async Task<Resultado<MinhaConta>> AtualizarMinhaContaAsync(string usuarioId, AtualizarMinhaConta pedido, CancellationToken ct)
    {
        var assistente = await banco.Assistentes.FirstOrDefaultAsync(item => item.UsuarioId == usuarioId, ct);
        if (assistente is null || assistente.Situacao != SituacaoAssistente.Ativa)
        {
            return Resultado<MinhaConta>.Erro(Codigos.Indisponivel, "Seu acesso foi removido.");
        }

        var validacao = Validar(pedido.Nome, assistente.Email, pedido.Celular, pedido.Nascimento, exigirEmail: false);
        if (validacao.Falha is not null)
        {
            return Resultado<MinhaConta>.Erro(validacao.Falha.Codigo, validacao.Falha.Mensagem);
        }

        assistente.Nome = validacao.Valor.Nome;
        assistente.Celular = validacao.Valor.Celular;
        assistente.Nascimento = pedido.Nascimento;
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

    private Task<Assistente?> DaContaAsync(string contaId, Guid id, CancellationToken ct) =>
        banco.Assistentes.FirstOrDefaultAsync(
            item => item.Id == id && item.ContaId == contaId && item.Situacao != SituacaoAssistente.Removida, ct);

    private async Task<bool> EnviarConviteAsync(ApplicationUser usuario, Assistente assistente, CancellationToken ct)
    {
        try
        {
            var token = await usuarios.GenerateUserTokenAsync(usuario, ConviteAssistenteTokenProvider.Nome, Finalidade);
            var empresa = await banco.Perfis.AsNoTracking()
                .Where(perfil => perfil.ContaId == assistente.ContaId)
                .Select(perfil => perfil.NomeEmpresa)
                .FirstOrDefaultAsync(ct);
            var publico = (configuracao["PublicUrl"] ?? "").TrimEnd('/');
            var link = $"{publico}/convite-assistente?usuarioId={Uri.EscapeDataString(usuario.Id)}&token={Uri.EscapeDataString(token)}";
            var quem = string.IsNullOrWhiteSpace(empresa) ? "uma assessoria" : empresa;
            await email.EnviarAsync(
                assistente.Email,
                "Convite para ser assistente",
                $"Olá, {assistente.Nome}! Você foi convidada para ser assistente de {quem}. Crie sua senha neste link (vale por 7 dias): {link}",
                ct);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static AssistenteLeitura Ler(Assistente item, bool? conviteEnviado) => new(
        item.Id,
        item.Nome,
        item.Email,
        item.Celular,
        item.Nascimento,
        item.PodeVerFinanceiro,
        item.SomenteDela,
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
