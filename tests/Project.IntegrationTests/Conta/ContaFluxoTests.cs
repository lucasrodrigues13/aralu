using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Project.Application.Conta;
using Project.Infrastructure.Conta;
using Project.IntegrationTests.Suporte;

namespace Project.IntegrationTests.Conta;

[Collection(ColecaoApi.Nome)]
public class ContaFluxoTests
{
    private const string Senha = "abcdefgh";
    private readonly BancoFixture _banco;

    public ContaFluxoTests(BancoFixture banco)
    {
        _banco = banco;
    }

    [Fact]
    public async Task Cadastro_cria_usuario_nao_confirmado_e_dispara_o_email()
    {
        var email = Unico();
        var cliente = _banco.Fabrica.CreateClient();

        var resposta = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true });
        var corpo = await resposta.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        Assert.Contains("Enviamos um link", corpo, StringComparison.Ordinal);
        Assert.DoesNotContain(Senha, corpo, StringComparison.Ordinal);
        var mensagem = _banco.Fabrica.Email.Mensagens.Single(item => item.Email == email && item.Tipo == "confirmacao");
        Assert.Contains("confirmar-email", mensagem.Corpo, StringComparison.Ordinal);

        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        Assert.Equal(HttpStatusCode.Unauthorized, entrada.StatusCode);
        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        var usuarios = escopo.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var usuario = await usuarios.FindByEmailAsync(email);
        Assert.NotNull(usuario);
        Assert.False(usuario.EmailConfirmed);
        Assert.True(await usuarios.IsInRoleAsync(usuario, Papeis.Organizer));
        Assert.False(await usuarios.IsInRoleAsync(usuario, Papeis.Admin));
    }

    [Fact]
    public async Task Email_normalizado_nao_cria_segunda_conta()
    {
        var email = Unico();
        var cliente = _banco.Fabrica.CreateClient();
        await Cadastrar(cliente, email);

        var resposta = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email = email.ToUpperInvariant(), senha = Senha, confirmacao = Senha, aceiteTermos = true });
        var corpo = await resposta.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Conflict, resposta.StatusCode);
        Assert.Contains("Já existe conta", corpo, StringComparison.Ordinal);
        Assert.DoesNotContain(Senha, corpo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Senha_sem_minuscula_e_confirmacao_divergente_sao_recusadas()
    {
        var cliente = _banco.Fabrica.CreateClient();

        var fraca = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email = Unico(), senha = "12345678", confirmacao = "12345678", aceiteTermos = true });
        var divergente = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email = Unico(), senha = Senha, confirmacao = "outra-senha", aceiteTermos = true });

        Assert.Equal(HttpStatusCode.BadRequest, fraca.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, divergente.StatusCode);
        Assert.Contains("não atende", await fraca.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        Assert.Contains("não confere", await divergente.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Link_valido_confirma_e_permite_login_de_organizer()
    {
        var email = Unico();
        var cliente = _banco.Fabrica.CreateClient();
        await Cadastrar(cliente, email);
        await Confirmar(cliente, email);

        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        var sessao = await entrada.Content.ReadFromJsonAsync<Sessao>();

        Assert.Equal(HttpStatusCode.OK, entrada.StatusCode);
        Assert.NotNull(sessao);
        Assert.Contains(Papeis.Organizer, sessao.Papeis);
        Assert.DoesNotContain(Senha, await entrada.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.Token);
        var area = await cliente.GetAsync("/api/v1/conta/area");
        var admin = await cliente.GetAsync("/api/v1/admin/area");
        var saida = await cliente.PostAsync("/api/v1/conta/sair", null);
        var areaDepois = await cliente.GetAsync("/api/v1/conta/area");

        Assert.Equal(HttpStatusCode.OK, area.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, admin.StatusCode);
        Assert.Contains("não tem acesso", await admin.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        Assert.Equal(HttpStatusCode.NoContent, saida.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, areaDepois.StatusCode);
        Assert.Contains("sessao_encerrada", await areaDepois.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Sair_encerra_a_sessao_em_todos_os_dispositivos()
    {
        var email = Unico();
        var anonimo = _banco.Fabrica.CreateClient();
        await CadastrarEConfirmar(anonimo, email);
        var celular = await Entrar(email, Senha);
        var computador = await Entrar(email, Senha);
        Assert.Equal(HttpStatusCode.OK, (await computador.GetAsync("/api/v1/conta/area")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await celular.PostAsync("/api/v1/conta/sair", null)).StatusCode);

        var depois = await computador.GetAsync("/api/v1/conta/area");
        Assert.Equal(HttpStatusCode.Unauthorized, depois.StatusCode);
        Assert.Contains("sessao_encerrada", await depois.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        var novo = await Entrar(email, Senha);
        Assert.Equal(HttpStatusCode.OK, (await novo.GetAsync("/api/v1/conta/area")).StatusCode);
    }

    [Fact]
    public async Task Redefinir_a_senha_invalida_o_token_antigo()
    {
        var email = Unico();
        var anonimo = _banco.Fabrica.CreateClient();
        await CadastrarEConfirmar(anonimo, email);
        var antigo = await Entrar(email, Senha);
        Assert.Equal(HttpStatusCode.OK, (await antigo.GetAsync("/api/v1/conta/area")).StatusCode);

        await anonimo.PostAsJsonAsync("/api/v1/conta/esqueci-senha", new { email });
        var link = Link(_banco.Fabrica.Email, email, "redefinicao");
        Assert.Equal(HttpStatusCode.OK, (await anonimo.PostAsJsonAsync("/api/v1/conta/redefinir-senha", new { usuarioId = link.UsuarioId, token = link.Token, senha = "novasenha", confirmacao = "novasenha" })).StatusCode);

        var depois = await antigo.GetAsync("/api/v1/conta/area");
        Assert.Equal(HttpStatusCode.Unauthorized, depois.StatusCode);
        Assert.Contains("sessao_encerrada", await depois.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Sair_tambem_invalida_o_token_do_admin()
    {
        var adminEmail = Unico();
        const string senhaAdmin = "administrador";
        await using var fabrica = new FabricaApi(_banco.Conexao, bootstrap: true, adminEmail: adminEmail, adminSenha: senhaAdmin);
        await using (var escopo = fabrica.Services.CreateAsyncScope())
        {
            await escopo.ServiceProvider.GetRequiredService<BootstrapAdministrador>().ExecutarAsync();
        }

        var admin = await Entrar(adminEmail, senhaAdmin, fabrica.CreateClient());
        var outraAba = await Entrar(adminEmail, senhaAdmin, fabrica.CreateClient());
        Assert.Equal(HttpStatusCode.OK, (await outraAba.GetAsync("/api/v1/admin/area")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync("/api/v1/conta/sair", null)).StatusCode);

        var depois = await outraAba.GetAsync("/api/v1/admin/area");
        Assert.Equal(HttpStatusCode.Unauthorized, depois.StatusCode);
        Assert.Contains("sessao_encerrada", await depois.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Link_alterado_vencido_ou_de_outro_usuario_nao_confirma()
    {
        var email = Unico();
        var outro = Unico();
        var cliente = _banco.Fabrica.CreateClient();
        await Cadastrar(cliente, email);
        await Cadastrar(cliente, outro);
        var link = Link(_banco.Fabrica.Email, email, "confirmacao");
        var alterado = link.Token[..^1] + (link.Token[^1] == 'a' ? "b" : "a");

        var respostaAlterada = await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId = link.UsuarioId, token = alterado });
        var respostaTrocada = await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId = Link(_banco.Fabrica.Email, outro, "confirmacao").UsuarioId, token = link.Token });
        var respostaVencida = await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId = link.UsuarioId, token = await TokenVencido(link.UsuarioId) });

        Assert.Equal(HttpStatusCode.BadRequest, respostaAlterada.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, respostaTrocada.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, respostaVencida.StatusCode);
        Assert.Contains("inválido ou expirou", await respostaVencida.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Credencial_errada_e_email_desconhecido_usam_a_mesma_mensagem()
    {
        var email = Unico();
        var cliente = _banco.Fabrica.CreateClient();
        await CadastrarEConfirmar(cliente, email);

        var errada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = "senha-errada" });
        var inexistente = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email = Unico(), senha = Senha });
        var textoErrada = await errada.Content.ReadAsStringAsync();
        var textoInexistente = await inexistente.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Unauthorized, errada.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, inexistente.StatusCode);
        Assert.Equal(textoErrada, textoInexistente);
        Assert.DoesNotContain(Senha, textoErrada, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Cinco_senhas_erradas_bloqueiam_por_15_minutos()
    {
        var email = Unico();
        var cliente = _banco.Fabrica.CreateClient();
        await CadastrarEConfirmar(cliente, email);

        for (var tentativa = 0; tentativa < 4; tentativa++)
        {
            var falha = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = "senha-errada" });
            Assert.Equal(HttpStatusCode.Unauthorized, falha.StatusCode);
        }

        var quinta = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = "senha-errada" });
        Assert.Equal(HttpStatusCode.Locked, quinta.StatusCode);

        var bloqueio = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        var corpo = await bloqueio.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.Locked, bloqueio.StatusCode);
        Assert.Contains("não pode ser repetida agora", corpo, StringComparison.Ordinal);
        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        var usuarios = escopo.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var usuario = await usuarios.FindByEmailAsync(email);
        Assert.NotNull(usuario?.LockoutEnd);
        Assert.InRange((usuario.LockoutEnd.Value - DateTimeOffset.UtcNow).TotalMinutes, 14, 16);
    }

    [Fact]
    public async Task Redefinicao_troca_a_senha_sem_revelar_se_o_email_existe()
    {
        var email = Unico();
        var cliente = _banco.Fabrica.CreateClient();
        await CadastrarEConfirmar(cliente, email);

        var conhecida = await cliente.PostAsJsonAsync("/api/v1/conta/esqueci-senha", new { email });
        var desconhecida = await cliente.PostAsJsonAsync("/api/v1/conta/esqueci-senha", new { email = Unico() });
        var textoConhecida = await conhecida.Content.ReadAsStringAsync();
        var textoDesconhecida = await desconhecida.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, conhecida.StatusCode);
        Assert.Equal(textoConhecida, textoDesconhecida);
        Assert.DoesNotContain("token", textoConhecida, StringComparison.OrdinalIgnoreCase);

        var link = Link(_banco.Fabrica.Email, email, "redefinicao");
        var invalida = await cliente.PostAsJsonAsync("/api/v1/conta/redefinir-senha", new { usuarioId = link.UsuarioId, token = "token-alterado", senha = "novasenha", confirmacao = "novasenha" });
        var nova = await cliente.PostAsJsonAsync("/api/v1/conta/redefinir-senha", new { usuarioId = link.UsuarioId, token = link.Token, senha = "novasenha", confirmacao = "novasenha" });
        var antiga = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        var atual = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = "novasenha" });

        Assert.Equal(HttpStatusCode.BadRequest, invalida.StatusCode);
        Assert.Equal(HttpStatusCode.OK, nova.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, antiga.StatusCode);
        Assert.Equal(HttpStatusCode.OK, atual.StatusCode);
        Assert.DoesNotContain("novasenha", await nova.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Falha_de_email_no_cadastro_avisa_e_nao_confirma()
    {
        var email = Unico();
        var cliente = _banco.Fabrica.CreateClient();
        _banco.Fabrica.Email.Falhar = true;
        try
        {
            var resposta = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true });
            var corpo = await resposta.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
            Assert.Contains("não foi enviado", corpo, StringComparison.Ordinal);
            Assert.DoesNotContain("falha simulada", corpo, StringComparison.Ordinal);
            var logs = string.Join('\n', _banco.Fabrica.Logs.Linhas);
            Assert.Contains("falha simulada de envio", logs, StringComparison.Ordinal);
            Assert.DoesNotContain("smtp-segredo-nao-logar", logs, StringComparison.Ordinal);
        }
        finally
        {
            _banco.Fabrica.Email.Falhar = false;
        }

        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        Assert.Equal(HttpStatusCode.Unauthorized, entrada.StatusCode);

        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        var usuarios = escopo.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var usuario = await usuarios.FindByEmailAsync(email);
        Assert.NotNull(usuario);
        Assert.False(usuario.EmailConfirmed);
    }

    [Fact]
    public async Task Falha_de_email_na_redefinicao_nao_revela_a_conta()
    {
        var email = Unico();
        var cliente = _banco.Fabrica.CreateClient();
        await CadastrarEConfirmar(cliente, email);
        _banco.Fabrica.Email.Falhar = true;
        try
        {
            var conhecida = await cliente.PostAsJsonAsync("/api/v1/conta/esqueci-senha", new { email });
            var desconhecida = await cliente.PostAsJsonAsync("/api/v1/conta/esqueci-senha", new { email = Unico() });

            Assert.Equal(await conhecida.Content.ReadAsStringAsync(), await desconhecida.Content.ReadAsStringAsync());
        }
        finally
        {
            _banco.Fabrica.Email.Falhar = false;
        }
    }

    [Fact]
    public async Task Reenvio_e_limites_por_ip_respondem_429()
    {
        await using var fabrica = new FabricaApi(
            _banco.Conexao,
            cadastroPorHora: 5,
            loginPorMinuto: 10,
            recuperacaoPorHora: 3,
            reenvioPorHora: 3);
        var cliente = fabrica.CreateClient();

        for (var vez = 0; vez < 3; vez++)
        {
            var reenvio = await cliente.PostAsJsonAsync("/api/v1/conta/reenviar-confirmacao", new { email = Unico() });
            Assert.Equal(HttpStatusCode.OK, reenvio.StatusCode);
        }

        var quarto = await cliente.PostAsJsonAsync("/api/v1/conta/reenviar-confirmacao", new { email = Unico() });
        Assert.Equal(HttpStatusCode.TooManyRequests, quarto.StatusCode);
        Assert.True(quarto.Headers.Contains("Retry-After"));
        Assert.Contains("não pode ser repetida agora", await quarto.Content.ReadAsStringAsync(), StringComparison.Ordinal);

        for (var vez = 0; vez < 5; vez++)
        {
            var cadastro = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email = Unico(), senha = Senha, confirmacao = Senha, aceiteTermos = true });
            Assert.Equal(HttpStatusCode.Created, cadastro.StatusCode);
        }

        var sexto = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email = Unico(), senha = Senha, confirmacao = Senha, aceiteTermos = true });
        Assert.Equal(HttpStatusCode.TooManyRequests, sexto.StatusCode);
        Assert.True(sexto.Headers.Contains("Retry-After"));

        for (var vez = 0; vez < 10; vez++)
        {
            var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email = Unico(), senha = Senha });
            Assert.Equal(HttpStatusCode.Unauthorized, entrada.StatusCode);
        }

        var decimaPrimeira = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email = Unico(), senha = Senha });
        Assert.Equal(HttpStatusCode.TooManyRequests, decimaPrimeira.StatusCode);

        for (var vez = 0; vez < 3; vez++)
        {
            var recuperacao = await cliente.PostAsJsonAsync("/api/v1/conta/esqueci-senha", new { email = Unico() });
            Assert.Equal(HttpStatusCode.OK, recuperacao.StatusCode);
        }

        var quartaRecuperacao = await cliente.PostAsJsonAsync("/api/v1/conta/esqueci-senha", new { email = Unico() });
        Assert.Equal(HttpStatusCode.TooManyRequests, quartaRecuperacao.StatusCode);
        Assert.True(quartaRecuperacao.Headers.Contains("Retry-After"));
    }

    [Fact]
    public async Task Bootstrap_desligado_nao_cria_usuario_e_ligado_cria_admin_sem_trocar_senha()
    {
        var email = Unico();
        await using (var desligado = new FabricaApi(_banco.Conexao, bootstrap: false, adminEmail: email, adminSenha: Senha))
        {
            using var _ = desligado.CreateClient();
            await using var escopo = desligado.Services.CreateAsyncScope();
            var usuarios = escopo.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            Assert.Null(await usuarios.FindByEmailAsync(email));
        }

        var adminEmail = Unico();
        const string senhaAdmin = "administrador";
        await using var ligado = new FabricaApi(_banco.Conexao, bootstrap: true, adminEmail: adminEmail, adminSenha: senhaAdmin);
        var cliente = ligado.CreateClient();
        await using (var escopo = ligado.Services.CreateAsyncScope())
        {
            await escopo.ServiceProvider.GetRequiredService<BootstrapAdministrador>().ExecutarAsync();
        }

        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email = adminEmail, senha = senhaAdmin });
        var sessao = await entrada.Content.ReadFromJsonAsync<Sessao>();
        Assert.Equal(HttpStatusCode.OK, entrada.StatusCode);
        Assert.NotNull(sessao);
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.Token);
        Assert.Equal(HttpStatusCode.OK, (await cliente.GetAsync("/api/v1/admin/area")).StatusCode);
    }

    [Fact]
    public async Task Bootstrap_nao_promove_email_que_ja_e_organizer()
    {
        var email = Unico();
        var cliente = _banco.Fabrica.CreateClient();
        await CadastrarEConfirmar(cliente, email);

        var erro = await Assert.ThrowsAnyAsync<Exception>(async () =>
        {
            await using var fabrica = new FabricaApi(_banco.Conexao, bootstrap: true, adminEmail: email, adminSenha: "outra-senha-admin");
            using var _ = fabrica.CreateClient();
        });

        Assert.Contains("usuário comum", erro.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain(Senha, erro.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("outra-senha-admin", erro.ToString(), StringComparison.Ordinal);

        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = Senha });
        var sessao = await entrada.Content.ReadFromJsonAsync<Sessao>();
        Assert.NotNull(sessao);
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao.Token);
        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync("/api/v1/admin/area")).StatusCode);
    }

    [Fact]
    public async Task Bootstrap_garante_os_papeis_da_plataforma()
    {
        var adminEmail = Unico();
        await using var fabrica = new FabricaApi(_banco.Conexao, bootstrap: true, adminEmail: adminEmail, adminSenha: Senha);
        using var _ = fabrica.CreateClient();

        await using var escopo = fabrica.Services.CreateAsyncScope();
        var roles = escopo.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        Assert.True(await roles.RoleExistsAsync(Papeis.Admin));
        Assert.True(await roles.RoleExistsAsync(Papeis.Organizer));
        Assert.True(await roles.RoleExistsAsync(Papeis.Assistant));
    }

    [Fact]
    public async Task Conta_sem_papel_da_plataforma_nao_completa_login()
    {
        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        var usuarios = escopo.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var solta = new ApplicationUser
        {
            UserName = Unico(),
            Email = Unico(),
            EmailConfirmed = true,
        };
        Assert.True((await usuarios.CreateAsync(solta, Senha)).Succeeded);

        var http = _banco.Fabrica.CreateClient();
        var entrada = await http.PostAsJsonAsync("/api/v1/conta/entrar", new { email = solta.Email, senha = Senha });
        Assert.Equal(HttpStatusCode.Unauthorized, entrada.StatusCode);
    }

    [Fact]
    public async Task Segredos_nao_aparecem_em_log_nem_em_resposta()
    {
        var email = Unico();
        const string senha = "segredo-da-conta";
        var cliente = _banco.Fabrica.CreateClient();
        var cadastro = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha, confirmacao = senha, aceiteTermos = true });
        var corpoCadastro = await cadastro.Content.ReadAsStringAsync();
        await Confirmar(cliente, email);
        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha });
        var corpoEntrada = await entrada.Content.ReadAsStringAsync();
        var logs = string.Join('\n', _banco.Fabrica.Logs.Linhas);
        var senhaDoBanco = SenhaDaConexao(_banco.Conexao);

        Assert.DoesNotContain(senha, corpoCadastro, StringComparison.Ordinal);
        Assert.DoesNotContain(senha, corpoEntrada, StringComparison.Ordinal);
        Assert.DoesNotContain("smtp-segredo-nao-logar", corpoCadastro + corpoEntrada, StringComparison.Ordinal);
        Assert.DoesNotContain(senha, logs, StringComparison.Ordinal);
        Assert.DoesNotContain("smtp-segredo-nao-logar", logs, StringComparison.Ordinal);
        Assert.DoesNotContain(senhaDoBanco, logs, StringComparison.Ordinal);
        Assert.DoesNotContain(senhaDoBanco, corpoCadastro + corpoEntrada, StringComparison.Ordinal);
        var token = Link(_banco.Fabrica.Email, email, "confirmacao").Token;
        Assert.DoesNotContain(token, corpoCadastro, StringComparison.Ordinal);
        Assert.DoesNotContain(token, logs, StringComparison.Ordinal);
    }

    private async Task<HttpClient> Entrar(string email, string senha, HttpClient? cliente = null)
    {
        cliente ??= _banco.Fabrica.CreateClient();
        var entrada = await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha });
        Assert.Equal(HttpStatusCode.OK, entrada.StatusCode);
        var sessao = await entrada.Content.ReadFromJsonAsync<Sessao>();
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", sessao!.Token);
        return cliente;
    }

    [Fact]
    public async Task Login_senha_e_sessao_geram_eventos_de_seguranca_sem_dados_sensiveis()
    {
        const string senhaErrada = "senha-errada-nao-logar";
        await using var fabrica = new FabricaApi(_banco.Conexao, _banco.Fabrica.Email);
        var cliente = fabrica.CreateClient();
        var email = Unico();
        await CadastrarEConfirmar(cliente, email);

        await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email = Unico(), senha = Senha });
        await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email = "forjado\r\nlogin_ok@x.com", senha = Senha });
        await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = senhaErrada });
        var logado = await Entrar(email, Senha, fabrica.CreateClient());
        Assert.Equal(HttpStatusCode.NoContent, (await logado.PostAsync("/api/v1/conta/sair", null)).StatusCode);
        await cliente.PostAsJsonAsync("/api/v1/conta/esqueci-senha", new { email });
        var link = Link(_banco.Fabrica.Email, email, "redefinicao");
        var redefinida = await cliente.PostAsJsonAsync("/api/v1/conta/redefinir-senha", new { usuarioId = link.UsuarioId, token = link.Token, senha = "novasenha", confirmacao = "novasenha" });
        Assert.Equal(HttpStatusCode.OK, redefinida.StatusCode);
        for (var tentativa = 0; tentativa < 5; tentativa++)
        {
            await cliente.PostAsJsonAsync("/api/v1/conta/entrar", new { email, senha = senhaErrada });
        }

        var seguranca = fabrica.Logs.Entradas.Where(item => item.Categoria == Project.Application.Comum.LogSeguranca.Categoria).ToList();
        var falhas = seguranca.Where(item => item.Evento.Name == "login_falhou").ToList();
        Assert.Equal("inexistente", falhas[0].Campos["Motivo"]);
        Assert.Equal("inexistente", falhas[1].Campos["Motivo"]);
        Assert.Equal("senha", falhas[2].Campos["Motivo"]);
        Assert.All(falhas, item => Assert.Equal(9001, item.Evento.Id));
        Assert.All(falhas, item => Assert.False(string.IsNullOrWhiteSpace(item.Campos["Ip"])));
        Assert.Equal("pe***@aralu.test", falhas[2].Campos["Email"]);
        Assert.Contains(seguranca, item => item.Evento.Name == "login_ok" && item.Campos["UsuarioId"] == link.UsuarioId);
        Assert.Contains(seguranca, item => item.Evento.Name == "sessao_encerrada" && item.Campos["Motivo"] == "sair");
        Assert.Contains(seguranca, item => item.Evento.Name == "senha_redefinida" && item.Campos["UsuarioId"] == link.UsuarioId);
        Assert.Contains(seguranca, item => item.Evento.Name == "sessao_encerrada" && item.Campos["Motivo"] == "senha_redefinida");
        Assert.Contains(seguranca, item => item.Evento.Name == "login_bloqueado" && item.Campos["UsuarioId"] == link.UsuarioId);

        var texto = string.Join('\n', seguranca.SelectMany(item => item.Campos.Values.Append(item.Mensagem)));
        Assert.DoesNotContain(email, texto, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(Senha, texto, StringComparison.Ordinal);
        Assert.DoesNotContain(senhaErrada, texto, StringComparison.Ordinal);
        Assert.DoesNotContain("novasenha", texto, StringComparison.Ordinal);
        Assert.DoesNotContain(link.Token, texto, StringComparison.Ordinal);
        Assert.All(seguranca, item => Assert.DoesNotContain('\n', item.Mensagem));
    }

    [Fact]
    public async Task Rate_limit_e_admin_operando_conta_geram_eventos_de_seguranca()
    {
        var adminEmail = Unico();
        const string senhaAdmin = "administrador";
        await using var fabrica = new FabricaApi(
            _banco.Conexao, _banco.Fabrica.Email, bootstrap: true, adminEmail: adminEmail, adminSenha: senhaAdmin, loginPorMinuto: 3);
        await using (var escopo = fabrica.Services.CreateAsyncScope())
        {
            await escopo.ServiceProvider.GetRequiredService<BootstrapAdministrador>().ExecutarAsync();
        }

        var donaEmail = Unico();
        await CadastrarEConfirmar(fabrica.CreateClient(), donaEmail);
        var admin = await Entrar(adminEmail, senhaAdmin, fabrica.CreateClient());
        var donaId = Link(_banco.Fabrica.Email, donaEmail, "confirmacao").UsuarioId;
        using var pedido = new HttpRequestMessage(HttpMethod.Get, "/api/v1/conta/area");
        pedido.Headers.Add("X-Aralu-Conta", donaId);
        Assert.Equal(HttpStatusCode.OK, (await admin.SendAsync(pedido)).StatusCode);

        var anonimo = fabrica.CreateClient();
        HttpResponseMessage? ultima = null;
        for (var vez = 0; vez < 4; vez++)
        {
            ultima = await anonimo.PostAsJsonAsync("/api/v1/conta/entrar", new { email = Unico(), senha = Senha });
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, ultima!.StatusCode);
        var seguranca = fabrica.Logs.Entradas.Where(item => item.Categoria == Project.Application.Comum.LogSeguranca.Categoria).ToList();
        var operou = seguranca.Single(item => item.Evento.Name == "admin_operou_conta");
        Assert.Equal(9007, operou.Evento.Id);
        Assert.Equal(donaId, operou.Campos["ContaId"]);
        Assert.Equal("GET", operou.Campos["Metodo"]);
        Assert.Equal("/api/v1/conta/area", operou.Campos["Rota"]);
        Assert.False(string.IsNullOrWhiteSpace(operou.Campos["AdminId"]));
        var limite = seguranca.Last(item => item.Evento.Name == "rate_limit");
        Assert.Equal(9008, limite.Evento.Id);
        Assert.Equal("login", limite.Campos["Politica"]);
        Assert.Equal("/api/v1/conta/entrar", limite.Campos["Rota"]);
    }

    private async Task Cadastrar(HttpClient cliente, string email)
    {
        var resposta = await cliente.PostAsJsonAsync("/api/v1/conta/cadastro", new { email, senha = Senha, confirmacao = Senha, aceiteTermos = true });
        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
    }

    private async Task CadastrarEConfirmar(HttpClient cliente, string email)
    {
        await Cadastrar(cliente, email);
        await Confirmar(cliente, email);
    }

    private async Task Confirmar(HttpClient cliente, string email)
    {
        var link = Link(_banco.Fabrica.Email, email, "confirmacao");
        var resposta = await cliente.PostAsJsonAsync("/api/v1/conta/confirmar-email", new { usuarioId = link.UsuarioId, token = link.Token });
        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
    }

    private static (string UsuarioId, string Token) Link(EmailCapturado email, string endereco, string tipo)
    {
        var mensagem = email.Mensagens.Last(item => item.Email == endereco && item.Tipo == tipo);
        var uri = new Uri(mensagem.Corpo);
        var query = QueryHelpers.ParseQuery(uri.Query);
        return (query["usuarioId"].ToString(), query["token"].ToString());
    }

    private async Task<string> TokenVencido(string usuarioId)
    {
        await using var escopo = _banco.Fabrica.Services.CreateAsyncScope();
        var usuarios = escopo.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var protecao = escopo.ServiceProvider.GetRequiredService<IDataProtectionProvider>();
        var usuario = await usuarios.FindByIdAsync(usuarioId);
        Assert.NotNull(usuario);
        var carimbo = await usuarios.GetSecurityStampAsync(usuario);
        var protetor = protecao.CreateProtector(ConfirmacaoEmailTokenProvider.Nome);
        var memoria = new MemoryStream();
        using (var escritor = new BinaryWriter(memoria, Encoding.UTF8, leaveOpen: true))
        {
            escritor.Write(DateTimeOffset.UtcNow.AddHours(-48).UtcTicks);
            escritor.Write(usuarioId);
            escritor.Write("EmailConfirmation");
            escritor.Write(carimbo);
        }

        return Convert.ToBase64String(protetor.Protect(memoria.ToArray()));
    }

    private static string Unico() => $"pessoa-{Guid.NewGuid():N}@aralu.test";

    private static string SenhaDaConexao(string conexao)
    {
        const string marca = "Password=";
        var inicio = conexao.IndexOf(marca, StringComparison.OrdinalIgnoreCase);
        var trecho = conexao[(inicio + marca.Length)..];
        var fim = trecho.IndexOf(';');
        return fim < 0 ? trecho : trecho[..fim];
    }

    private sealed record Sessao(string Token, string Email, string[] Papeis);
}
