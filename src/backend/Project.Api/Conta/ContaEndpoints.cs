using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Project.Application.Conta;
using Microsoft.EntityFrameworkCore;
using Project.Domain.Equipe;
using Project.Infrastructure.Conta;
using Project.Infrastructure.Persistencia;

namespace Project.Api.Conta;

public static class ContaEndpoints
{
    public static void Mapear(WebApplication app)
    {
        var conta = app.MapGroup("/api/v1/conta");
        conta.MapPost("/cadastro", Cadastrar).RequireRateLimiting("cadastro");
        conta.MapPost("/entrar", Entrar).RequireRateLimiting("login");
        conta.MapPost("/confirmar-email", Confirmar);
        conta.MapPost("/reenviar-confirmacao", Reenviar).RequireRateLimiting("reenvio");
        conta.MapPost("/esqueci-senha", EsqueciSenha).RequireRateLimiting("recuperacao");
        conta.MapPost("/redefinir-senha", RedefinirSenha);
        conta.MapPost("/sair", Sair).RequireAuthorization();
        conta.MapGet("/area", Area).RequireAuthorization(policy => policy.RequireRole(Papeis.ComAcesso));

        app.MapGet("/api/v1/admin/area", Area)
            .RequireAuthorization(policy => policy.RequireRole(Papeis.Admin));
    }

    private static async Task<IResult> Cadastrar(
        CadastroPedido pedido,
        UserManager<ApplicationUser> usuarios,
        CadastroDeConta cadastro,
        IEmailSender<ApplicationUser> email,
        IConfiguration configuracao,
        IHostEnvironment ambiente,
        ILoggerFactory logs,
        CancellationToken ct)
    {
        var endereco = EmailNormalizado(pedido.Email);
        if (endereco is null)
        {
            return Erro(StatusCodes.Status400BadRequest, "validacao", "Informe um e-mail válido.");
        }

        if (string.IsNullOrWhiteSpace(pedido.Senha))
        {
            return Erro(StatusCodes.Status400BadRequest, "validacao", "Informe uma senha.");
        }

        // §6 A1: o visitante aceita os termos de uso para começar o teste.
        if (pedido.AceiteTermos != true)
        {
            return Erro(StatusCodes.Status400BadRequest, "validacao", "Aceite os termos de uso e a política de privacidade para continuar.");
        }

        var senha = pedido.Senha!;
        if (pedido.Confirmacao is not null && pedido.Confirmacao != senha)
        {
            return Erro(StatusCodes.Status400BadRequest, "validacao", "A confirmação da senha não confere.");
        }

        var usuario = new ApplicationUser
        {
            UserName = endereco,
            Email = endereco,
        };
        var resultado = await cadastro.CriarDonoAsync(usuario, senha, ct);
        switch (resultado)
        {
            case ResultadoCadastro.Duplicado:
                return Erro(StatusCodes.Status409Conflict, "duplicado", "Já existe conta para este e-mail.");
            case ResultadoCadastro.SenhaInvalida:
                return Erro(StatusCodes.Status400BadRequest, "validacao", "A senha não atende às regras.");
            case ResultadoCadastro.Falhou:
                return Erro(StatusCodes.Status500InternalServerError, "erro", "Não foi possível concluir a ação.");
        }

        var enviado = await EnviarConfirmacaoAsync(usuarios, email, usuario, configuracao, ambiente, logs, ct);
        if (!enviado)
        {
            return Results.Json(
                new { mensagem = "A conta foi criada, mas o e-mail de confirmação não foi enviado.", confirmacaoEnviada = false },
                statusCode: StatusCodes.Status201Created);
        }

        return Results.Json(
            new { mensagem = "Conta criada. Enviamos um link para confirmar o e-mail.", confirmacaoEnviada = true },
            statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> Entrar(
        LoginPedido pedido,
        UserManager<ApplicationUser> usuarios,
        SignInManager<ApplicationUser> acesso,
        IEmissorJwt emissor,
        AppDbContext banco,
        CancellationToken ct)
    {
        var email = EmailNormalizado(pedido.Email);
        if (email is null || string.IsNullOrWhiteSpace(pedido.Senha))
        {
            return CredencialInvalida();
        }

        var usuario = await usuarios.FindByEmailAsync(email);
        if (usuario is null)
        {
            return CredencialInvalida();
        }

        var resultado = await acesso.CheckPasswordSignInAsync(usuario, pedido.Senha!, lockoutOnFailure: true);
        if (resultado.IsLockedOut)
        {
            return Erro(StatusCodes.Status423Locked, "bloqueio", "A ação não pode ser repetida agora.");
        }

        if (!resultado.Succeeded)
        {
            return CredencialInvalida();
        }

        // Conta e tipo vêm de MembrosConta (SPEC-062): um login, uma conta. Só o Admin entra sem ser membro;
        // o cliente usa apenas o link público com token.
        var papeis = (await usuarios.GetRolesAsync(usuario)).Where(papel => papel == Papeis.Admin).ToList();
        var membro = await banco.Membros.AsNoTracking().IgnoreQueryFilters()
            .FirstOrDefaultAsync(item => item.UsuarioId == usuario.Id, ct);
        if (membro is { Situacao: SituacaoMembro.Ativa })
        {
            papeis.Add(EquipeServico.PapelDo(membro.Tipo));
        }

        if (papeis.Count == 0)
        {
            return CredencialInvalida();
        }

        var emailConfirmado = usuario.Email ?? email;
        var stamp = SessaoServico.HashDoStamp(await usuarios.GetSecurityStampAsync(usuario));
        var token = emissor.Emitir(usuario.Id, emailConfirmado, papeis, membro?.ContaId.ToString(), stamp);
        return Results.Ok(new { token, email = emailConfirmado, papeis });
    }

    private static async Task<IResult> Confirmar(TokenPedido pedido, UserManager<ApplicationUser> usuarios)
    {
        var usuario = string.IsNullOrWhiteSpace(pedido.UsuarioId) ? null : await usuarios.FindByIdAsync(pedido.UsuarioId);
        if (usuario is null || string.IsNullOrWhiteSpace(pedido.Token))
        {
            return TokenInvalido();
        }

        var resultado = await usuarios.ConfirmEmailAsync(usuario, pedido.Token);
        if (!resultado.Succeeded)
        {
            return TokenInvalido();
        }

        return Results.Ok(new { mensagem = "E-mail confirmado." });
    }

    private static async Task<IResult> Reenviar(
        EmailPedido pedido,
        UserManager<ApplicationUser> usuarios,
        IEmailSender<ApplicationUser> email,
        IConfiguration configuracao,
        IHostEnvironment ambiente,
        ILoggerFactory logs,
        CancellationToken ct)
    {
        var emailNormalizado = EmailNormalizado(pedido.Email);
        if (emailNormalizado is not null)
        {
            var usuario = await usuarios.FindByEmailAsync(emailNormalizado);
            if (usuario is not null && !usuario.EmailConfirmed)
            {
                await EnviarConfirmacaoAsync(usuarios, email, usuario, configuracao, ambiente, logs, ct);
            }
        }

        return Results.Ok(new { mensagem = "Se a conta existir e ainda não estiver confirmada, enviaremos outro link." });
    }

    private static async Task<IResult> EsqueciSenha(
        EmailPedido pedido,
        UserManager<ApplicationUser> usuarios,
        IEmailSender<ApplicationUser> email,
        IConfiguration configuracao,
        IHostEnvironment ambiente,
        ILoggerFactory logs,
        CancellationToken ct)
    {
        var emailNormalizado = EmailNormalizado(pedido.Email);
        if (emailNormalizado is not null)
        {
            var usuario = await usuarios.FindByEmailAsync(emailNormalizado);
            if (usuario is not null)
            {
                string? token = null;
                try
                {
                    token = await usuarios.GeneratePasswordResetTokenAsync(usuario);
                    var url = Link(configuracao, "redefinir-senha", usuario.Id, token);
                    await email.SendPasswordResetLinkAsync(usuario, usuario.Email ?? emailNormalizado, url);
                }
                catch (Exception ex)
                {
                    RegistrarFalhaDeEmail(logs, ambiente, configuracao, ex, token, "Falha ao enviar o e-mail de redefinição.");
                }
            }
        }

        return Results.Ok(new { mensagem = "Se a conta existir, enviaremos um link para redefinir a senha." });
    }

    private static async Task<IResult> RedefinirSenha(RedefinicaoPedido pedido, UserManager<ApplicationUser> usuarios, SessaoServico sessoes)
    {
        if (string.IsNullOrWhiteSpace(pedido.Senha))
        {
            return Erro(StatusCodes.Status400BadRequest, "validacao", "Informe uma senha.");
        }

        var senha = pedido.Senha!;
        if (pedido.Confirmacao is not null && pedido.Confirmacao != senha)
        {
            return Erro(StatusCodes.Status400BadRequest, "validacao", "A confirmação da senha não confere.");
        }

        var usuario = string.IsNullOrWhiteSpace(pedido.UsuarioId) ? null : await usuarios.FindByIdAsync(pedido.UsuarioId);
        if (usuario is null || string.IsNullOrWhiteSpace(pedido.Token))
        {
            return TokenInvalido();
        }

        var resultado = await usuarios.ResetPasswordAsync(usuario, pedido.Token!, senha);
        if (!resultado.Succeeded)
        {
            if (resultado.Errors.Any(erro => erro.Code.Contains("Password", StringComparison.Ordinal)))
            {
                return Erro(StatusCodes.Status400BadRequest, "validacao", "A senha não atende às regras.");
            }

            return TokenInvalido();
        }

        await sessoes.EncerrarAsync(usuario, MotivoEncerramento.SenhaRedefinida);
        return Results.Ok(new { mensagem = "Senha redefinida." });
    }

    /// <summary>Encerra a sessão em todos os dispositivos: troca o security stamp (A07-001).</summary>
    private static async Task<IResult> Sair(ClaimsPrincipal principal, UserManager<ApplicationUser> usuarios, SessaoServico sessoes)
    {
        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var usuario = string.IsNullOrWhiteSpace(id) ? null : await usuarios.FindByIdAsync(id);
        if (usuario is not null)
        {
            await sessoes.EncerrarAsync(usuario, MotivoEncerramento.Sair);
        }

        return Results.NoContent();
    }

    private static IResult Area(ClaimsPrincipal usuario)
    {
        var email = usuario.FindFirstValue(ClaimTypes.Email)
            ?? usuario.FindFirstValue("email");
        var papeis = usuario.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray();
        var assistente = usuario.IsInRole(Papeis.Assistant);
        return Results.Ok(new
        {
            email,
            usuarioId = usuario.FindFirstValue(ClaimTypes.NameIdentifier),
            papeis,
            podeVerFinanceiro = EquipeEndpoints.PodeVerFinanceiro(usuario),
            somenteDela = EscopoAssistente.Restrito(usuario),
            tipo = usuario.IsInRole(Papeis.Organizer) ? "Dono" : assistente ? "Membro" : null,
            permissoes = usuario.FindAll(EquipeEndpoints.ClaimPermissao).Select(claim => claim.Value).ToArray(),
        });
    }

    private static async Task<bool> EnviarConfirmacaoAsync(
        UserManager<ApplicationUser> usuarios,
        IEmailSender<ApplicationUser> email,
        ApplicationUser usuario,
        IConfiguration configuracao,
        IHostEnvironment ambiente,
        ILoggerFactory logs,
        CancellationToken ct)
    {
        string? token = null;
        try
        {
            token = await usuarios.GenerateEmailConfirmationTokenAsync(usuario);
            var endereco = usuario.Email ?? usuario.UserName ?? "";
            var url = Link(configuracao, "confirmar-email", usuario.Id, token);
            await email.SendConfirmationLinkAsync(usuario, endereco, url);
            return true;
        }
        catch (Exception ex)
        {
            RegistrarFalhaDeEmail(logs, ambiente, configuracao, ex, token, "Falha ao enviar o e-mail de confirmação.");
            return false;
        }
    }

    private static void RegistrarFalhaDeEmail(
        ILoggerFactory logs,
        IHostEnvironment ambiente,
        IConfiguration configuracao,
        Exception ex,
        string? token,
        string aviso)
    {
        var logger = logs.CreateLogger("aralu.email");
        if (!ambiente.IsDevelopment())
        {
            logger.LogWarning(aviso);
            return;
        }

        logger.LogWarning("{Aviso} {Tipo}: {Detalhe}", aviso, ex.GetType().Name, DetalheLocal(configuracao, ex, token));
    }

    private static string DetalheLocal(IConfiguration configuracao, Exception ex, string? token)
    {
        var texto = new StringBuilder();
        for (Exception? atual = ex; atual is not null; atual = atual.InnerException)
        {
            if (texto.Length > 0)
            {
                texto.Append(" | ");
            }

            texto.Append(atual.GetType().Name);
            texto.Append(": ");
            texto.Append(atual.Message);
        }

        var detalhe = texto.ToString();
        foreach (var segredo in new[]
        {
            configuracao["Email:Password"],
            configuracao["Bootstrap:AdminPassword"],
            configuracao["Jwt:Secret"],
            configuracao["ConnectionStrings:Default"],
            token,
        })
        {
            if (!string.IsNullOrEmpty(segredo))
            {
                detalhe = detalhe.Replace(segredo, "[omitido]", StringComparison.Ordinal);
            }
        }

        return detalhe;
    }

    private static string Link(IConfiguration configuracao, string pagina, string usuarioId, string token)
    {
        var publico = (configuracao["PublicUrl"] ?? "").TrimEnd('/');
        return $"{publico}/{pagina}?usuarioId={Uri.EscapeDataString(usuarioId)}&token={Uri.EscapeDataString(token)}";
    }

    private static string? EmailNormalizado(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var endereco = email.Trim();
        var arroba = endereco.IndexOf('@');
        if (arroba <= 0 || arroba >= endereco.Length - 1 || endereco.Contains(' '))
        {
            return null;
        }

        return endereco;
    }

    private static IResult CredencialInvalida()
        => Erro(StatusCodes.Status401Unauthorized, "credencial", "E-mail ou senha inválidos.");

    private static IResult TokenInvalido()
        => Erro(StatusCodes.Status400BadRequest, "token", "O link é inválido ou expirou.");

    private static IResult Erro(int status, string code, string message)
        => Results.Json(new ErroResposta(code, message), statusCode: status);
}

public sealed record CadastroPedido(string? Email, string? Senha, string? Confirmacao, bool? AceiteTermos = null);
public sealed record LoginPedido(string? Email, string? Senha);
public sealed record EmailPedido(string? Email);
public sealed record TokenPedido(string? UsuarioId, string? Token);
public sealed record RedefinicaoPedido(string? UsuarioId, string? Token, string? Senha, string? Confirmacao);
