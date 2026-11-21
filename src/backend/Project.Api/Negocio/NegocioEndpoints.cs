using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Project.Api.Conta;
using Project.Application.Arquivos;
using Project.Application.Cep;
using Project.Application.Comum;
using Project.Application.Conta;
using Project.Application.Negocio;
using Project.Domain.Clientes;
using Project.Domain.Convidados;
using Project.Domain.Eventos;
using Project.Domain.Funil;
using Microsoft.EntityFrameworkCore;
using Project.Domain.Tarefas;
using Project.Infrastructure.Conta;
using Project.Infrastructure.Persistencia;

namespace Project.Api.Negocio;

public static class NegocioEndpoints
{
    private static readonly string[] SoOrganizer = [Papeis.Organizer];

    public static void Mapear(WebApplication app)
    {
        var api = app.MapGroup("/api/v1").RequireAuthorization();
        api.AddEndpointFilter(EscopoAssistente.Filtro);
        api.MapGet("/perfil", Perfil).RequireAuthorization(policy => policy.RequireRole(SoOrganizer));
        api.MapPut("/perfil", GravarPerfil).RequireAuthorization(policy => policy.RequireRole(SoOrganizer));
        api.MapPost("/perfil/foto", FotoPerfil).RequireAuthorization(policy => policy.RequireRole(SoOrganizer)).DisableAntiforgery();
        api.MapDelete("/perfil/foto", RemoverFotoPerfil).RequireAuthorization(policy => policy.RequireRole(SoOrganizer));
        api.MapGet("/painel", Painel).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/modelos", Modelos).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/modelos", CriarModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/modelos/{id:guid}", Modelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/modelos/{id:guid}", AtualizarModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/modelos/{id:guid}", ExcluirModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/modelos/{id:guid}/clonar", ClonarModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/modelos/tarefas/planilha", PlanilhaTarefasModeloPadrao).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/modelos/importar/previa", PreviaImportarModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe)).DisableAntiforgery();
        api.MapPost("/modelos/importar", ImportarModeloNovo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe)).DisableAntiforgery();
        api.MapPost("/modelos/{id:guid}/tarefas/importar/previa", PreviaImportarTarefasModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe)).DisableAntiforgery();
        api.MapPost("/modelos/{id:guid}/tarefas/importar", ImportarTarefasModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe)).DisableAntiforgery();
        api.MapPost("/eventos/{id:guid}/aplicar-modelo/previa", PreviaAplicarModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/aplicar-modelo", AplicarModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/salvar-como-modelo/previa", PreviaSalvarComoModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/salvar-como-modelo", SalvarComoModelo).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/eventos/estatisticas", Estatisticas).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        MapearBiblioteca(api, "/modelos-briefing", Briefings, CriarBriefing, Briefing, AtualizarBriefing, ExcluirBriefing, ClonarBriefing);
        MapearBiblioteca(api, "/modelos-roteiro", Roteiros, CriarRoteiro, Roteiro, AtualizarRoteiro, ExcluirRoteiro, ClonarRoteiro);
        MapearBiblioteca(api, "/modelos-cronograma", Cronogramas, CriarCronograma, Cronograma, AtualizarCronograma, ExcluirCronograma, ClonarCronograma);
        MapearBiblioteca(api, "/modelos-inspiracoes", Inspiracoes, CriarInspiracao, Inspiracao, AtualizarInspiracao, ExcluirInspiracao, ClonarInspiracao);
        MapearBiblioteca(api, "/modelos-mensagens", Mensagens, CriarMensagem, Mensagem, AtualizarMensagem, ExcluirMensagem, ClonarMensagem);
        api.MapGet("/servicos-conta", ServicosConta).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/servicos-conta", CriarServicoConta).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/servicos-conta/{id:guid}", ExcluirServicoConta).RequireAuthorization(policy => policy.RequireRole(SoOrganizer));
        api.MapGet("/fornecedores", Fornecedores).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/fornecedores", CriarFornecedor).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/fornecedores/{id:guid}", Fornecedor).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/fornecedores/{id:guid}", AtualizarFornecedor).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/fornecedores/{id:guid}", ExcluirFornecedor).RequireAuthorization(policy => policy.RequireRole(SoOrganizer));
        api.MapPost("/eventos/{id:guid}/servicos", AdicionarServicoEvento).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/eventos/{id:guid}/servicos/{servicoId:guid}/estimado", AtualizarEstimado).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/servicos/{servicoId:guid}/fornecedores", AdicionarFornecedorServico).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/servicos/{servicoId:guid}/fornecedores/{vinculoId:guid}/avancar", AvancarEtapa).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/servicos/{servicoId:guid}/fornecedores/{vinculoId:guid}/voltar", VoltarEtapa).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/servicos/{servicoId:guid}/fornecedores/{vinculoId:guid}/contratar", ContratarFornecedor).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/eventos/{id:guid}/budget", Budget).RequireAuthorization(AssistenteEndpoints.PoliticaFinanceiro);
        api.MapGet("/eventos/{id:guid}/resumo", ResumoEvento).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/eventos/{id:guid}/assistentes", AssistentesDoEvento).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/eventos/{id:guid}/assistentes", DefinirAssistentesDoEvento).RequireAuthorization(policy => policy.RequireRole(SoOrganizer));
        api.MapGet("/eventos", Eventos);
        api.MapGet("/eventos/{id:guid}", Evento);
        api.MapPost("/eventos", CriarEvento).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/eventos/{id:guid}", AtualizarEvento).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/concluir", Concluir).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/cancelar", Cancelar).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/assessoria", Assessoria).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/eventos/{id:guid}/transfer", Transfer).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/imagem", ImagemEvento).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe)).DisableAntiforgery();
        api.MapDelete("/eventos/{id:guid}/imagem", RemoverImagemEvento).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/eventos/{id:guid}/tarefas", TarefasDoEvento);
        api.MapPost("/eventos/{id:guid}/tarefas", CriarTarefa);
        api.MapGet("/tarefas", Tarefas);
        api.MapPut("/tarefas/{id:guid}", AtualizarTarefa);
        api.MapPost("/tarefas/{id:guid}/comentarios", ComentarTarefa);
        api.MapPut("/tarefas/{id:guid}/checklist/{itemId:guid}", MarcarItemChecklist);
        api.MapPost("/tarefas/{id:guid}/anexos", AnexarTarefa).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe)).DisableAntiforgery();
        api.MapDelete("/tarefas/{id:guid}/anexos/{anexoId:guid}", RemoverAnexoTarefa).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/clientes", Clientes).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/clientes", CriarCliente).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/clientes/{id:guid}", AtualizarCliente).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/clientes/{id:guid}/foto", FotoCliente).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe)).DisableAntiforgery();
        api.MapGet("/eventos/{id:guid}/clientes", ClientesDoEvento).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/eventos/{id:guid}/clientes", Vincular).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/eventos/{id:guid}/clientes/{clienteId:guid}", Desvincular).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/grupos", Grupos);
        api.MapPost("/grupos", CriarGrupo);
        api.MapGet("/eventos/{id:guid}/convites", Convites);
        api.MapPost("/eventos/{id:guid}/convites", CriarConvite);
        api.MapPut("/convites/{id:guid}", AtualizarConvite);
        api.MapPost("/convites/{id:guid}/convidados", CriarConvidado);
        api.MapPut("/convites/{id:guid}/convidados/{convidadoId:guid}", AtualizarConvidado);
        api.MapDelete("/convidados/{id:guid}", RemoverConvidado);
        api.MapPost("/convites/{id:guid}/principal", Principal);
        api.MapGet("/eventos/{id:guid}/convites/planilha", Planilha);
        api.MapPost("/eventos/{id:guid}/convites/importar", Importar).DisableAntiforgery();
        api.MapGet("/convites/{id:guid}/qr", Qr);
        api.MapGet("/convites/{id:guid}/whatsapp", WhatsApp);
        api.MapGet("/arquivos/{id:guid}", Arquivo);
        api.MapGet("/cep/{cep}", Cep);

        api.MapGet("/agenda", Agenda).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/agenda", CriarCompromisso).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/agenda/{id:guid}", AtualizarCompromisso).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/agenda/{id:guid}", ExcluirCompromisso).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        api.MapGet("/oportunidades", Oportunidades).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/oportunidades", CriarOportunidade).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/oportunidades/exportar", ExportarOportunidades).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/oportunidades/checar-data", ChecarDataOportunidade).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/oportunidades/contato-repetido", ContatoRepetidoOportunidade).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/oportunidades/{id:guid}", Oportunidade).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/oportunidades/{id:guid}", AtualizarOportunidade).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/oportunidades/{id:guid}/mover", MoverOportunidade).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/oportunidades/{id:guid}/cliente", VincularClienteOportunidade).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/oportunidades/{id:guid}/retorno", RetornoOportunidade).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/oportunidades/{id:guid}", ExcluirOportunidade).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/oportunidades/{id:guid}/briefing", BriefingDoLead).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/oportunidades/{id:guid}/briefing", AplicarBriefingAoLead).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/oportunidades/{id:guid}/briefing", SalvarBriefingDoLead).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/oportunidades/{id:guid}/briefing", RemoverBriefingDoLead).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/estagios-funil", EstagiosFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/estagios-funil", SalvarEstagiosFunil).RequireAuthorization(policy => policy.RequireRole(SoOrganizer));

        api.MapGet("/leads-rsvp", LeadsRsvp).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/leads-rsvp/{id:guid}/gerar-oportunidade", GerarOportunidadeLead).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/leads-rsvp/{id:guid}/descartar", DescartarLead).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/leads-rsvp/{id:guid}/contatar", ContatarLead).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        api.MapGet("/contratos-funil", ContratosFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/contratos-funil", CriarContratoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/contratos-funil/{id:guid}", ContratoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/contratos-funil/{id:guid}", AtualizarContratoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/contratos-funil/{id:guid}/enviar", EnviarContratoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/contratos-funil/{id:guid}/assinar", AssinarContratoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/contratos-funil/{id:guid}/cancelar", CancelarContratoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/contratos-funil/{id:guid}", ExcluirContratoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        api.MapGet("/orcamentos-funil/parametros", () => Results.Ok(ParametrosOrcamento.Lista)).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/orcamentos-funil/modelo-aplicado", TextoDoModeloOrcamento).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/orcamentos-funil", OrcamentosFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/orcamentos-funil", CriarOrcamentoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/orcamentos-funil/{id:guid}", OrcamentoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/orcamentos-funil/{id:guid}", AtualizarOrcamentoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/orcamentos-funil/{id:guid}/enviar", EnviarOrcamentoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/orcamentos-funil/{id:guid}/responder", ResponderOrcamentoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/orcamentos-funil/{id:guid}/cancelar", CancelarOrcamentoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/orcamentos-funil/{id:guid}", ExcluirOrcamentoFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        api.MapGet("/tarefas-funil", TarefasFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/tarefas-funil", CriarTarefaFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut("/tarefas-funil/{id:guid}", AtualizarTarefaFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/tarefas-funil/{id:guid}/concluir", ConcluirTarefaFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost("/tarefas-funil/{id:guid}/reabrir", ReabrirTarefaFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete("/tarefas-funil/{id:guid}", ExcluirTarefaFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        api.MapGet("/relatorios-funil", RelatoriosFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet("/relatorios-funil/exportar", ExportarRelatoriosFunil).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));

        MapearBibliotecaSimples(api, "/modelos-servicos-funil", ModelosServicoFunil, CriarModeloServicoFunil, ModeloServicoFunil, AtualizarModeloServicoFunil, ExcluirModeloServicoFunil);
        MapearBibliotecaSimples(api, "/modelos-orcamento-funil", ModelosOrcamentoFunil, CriarModeloOrcamentoFunil, ModeloOrcamentoFunil, AtualizarModeloOrcamentoFunil, ExcluirModeloOrcamentoFunil);
        MapearBibliotecaSimples(api, "/modelos-contrato-funil", ModelosContratoFunil, CriarModeloContratoFunil, ModeloContratoFunil, AtualizarModeloContratoFunil, ExcluirModeloContratoFunil);

        app.MapGet("/api/v1/rsvp/{token}", AbrirRsvp);
        app.MapPost("/api/v1/rsvp/{token}", ResponderRsvp);
        app.MapPost("/api/v1/public/leads/{contaId}", LeadPublico);
        app.MapGet("/api/v1/publico/propostas/{token}", PropostaPublica);
        app.MapPost("/api/v1/publico/propostas/{token}/resposta", ResponderPropostaPublica);
    }

    private static Task<IResult> Perfil(ClaimsPrincipal usuario, PerfilServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ObterAsync(conta, Email(usuario), ct)));

    private static Task<IResult> GravarPerfil(SalvarPerfil pedido, ClaimsPrincipal usuario, PerfilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarAsync(conta, Email(usuario), pedido, Hoje(), ct)));

    private static Task<IResult> FotoPerfil(
        IFormFile? arquivo,
        ClaimsPrincipal usuario,
        PerfilServico servico,
        IArmazenamentoArquivo armazenamento,
        CancellationToken ct) =>
        ComConta(usuario, conta => Imagem(conta, arquivo, armazenamento, async (imagem, token) =>
        {
            var anterior = await servico.GuardarFotoAsync(conta, imagem, token);
            return (anterior.Ok, anterior.Falha, anterior.Valor);
        }, ct));

    private static Task<IResult> RemoverFotoPerfil(
        ClaimsPrincipal usuario,
        PerfilServico servico,
        IArmazenamentoArquivo armazenamento,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var removida = await servico.RemoverFotoAsync(conta, ct);
            if (!removida.Ok)
            {
                return Falha(removida.Falha!);
            }

            if (removida.Valor is Guid anterior)
            {
                await armazenamento.DescartarAsync(anterior, ct);
            }

            return Results.Ok(new { mensagem = "Foto removida." });
        });

    private static Task<IResult> Painel(ClaimsPrincipal usuario, PainelServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ObterAsync(conta, ct)));

    private static Task<IResult> Modelos(ClaimsPrincipal usuario, ModeloServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarModelo(NovoModelo pedido, ClaimsPrincipal usuario, ModeloServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> Modelo(Guid id, ClaimsPrincipal usuario, ModeloServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarModelo(Guid id, AtualizarModelo pedido, ClaimsPrincipal usuario, ModeloServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirModelo(Guid id, ClaimsPrincipal usuario, ModeloServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> ClonarModelo(Guid id, ClaimsPrincipal usuario, ModeloServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ClonarAsync(conta, id, ct)));

    private static IResult PlanilhaTarefasModeloPadrao(ModeloImportacaoServico servico) =>
        Results.File(
            servico.PlanilhaPadrao(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "tarefas-modelo.xlsx");

    private static Task<IResult> PreviaImportarModelo(
        HttpRequest request, ClaimsPrincipal usuario, ModeloImportacaoServico servico, CancellationToken ct) =>
        ComConta(usuario, async _ => await PreviaImportacaoAsync(request, servico, ct));

    private static Task<IResult> ImportarModeloNovo(
        HttpRequest request, ClaimsPrincipal usuario, ModeloImportacaoServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var form = await request.ReadFormAsync(ct);
            var nome = form["nome"].ToString();
            if (!Enum.TryParse<TipoEvento>(form["tipo"].ToString(), ignoreCase: true, out var tipo))
            {
                return Validacao("Informe o tipo do modelo.");
            }

            var texto = form["texto"].ToString();
            var arquivo = form.Files.GetFile("arquivo");
            if (arquivo is not null)
            {
                await using var fluxo = arquivo.OpenReadStream();
                return await De(servico.ImportarNovoAsync(conta, nome, tipo, texto, fluxo, arquivo.FileName, ct));
            }

            return await De(servico.ImportarNovoAsync(conta, nome, tipo, texto, null, null, ct));
        });

    private static Task<IResult> PreviaImportarTarefasModelo(
        Guid id, HttpRequest request, ClaimsPrincipal usuario, ModeloImportacaoServico servico, CancellationToken ct) =>
        ComConta(usuario, async _ => await PreviaImportacaoAsync(request, servico, ct));

    private static Task<IResult> ImportarTarefasModelo(
        Guid id, HttpRequest request, ClaimsPrincipal usuario, ModeloImportacaoServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            if (request.HasFormContentType)
            {
                var form = await request.ReadFormAsync(ct);
                var texto = form["texto"].ToString();
                var arquivo = form.Files.GetFile("arquivo");
                if (arquivo is not null)
                {
                    await using var fluxo = arquivo.OpenReadStream();
                    return await De(servico.ImportarNoModeloAsync(conta, id, texto, fluxo, arquivo.FileName, ct));
                }

                return await De(servico.ImportarNoModeloAsync(conta, id, texto, null, null, ct));
            }

            var pedido = await request.ReadFromJsonAsync<ImportarTextoPedido>(cancellationToken: ct);
            return await De(servico.ImportarNoModeloAsync(conta, id, pedido?.Texto, null, null, ct));
        });

    private static Task<IResult> PreviaAplicarModelo(
        Guid id, AplicarModeloPedido pedido, ClaimsPrincipal usuario, ModeloImportacaoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.PreviaAplicarAsync(conta, id, pedido.ModeloId, ct)));

    private static Task<IResult> AplicarModelo(
        Guid id, AplicarModeloPedido pedido, ClaimsPrincipal usuario, ModeloImportacaoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AplicarAsync(conta, id, pedido.ModeloId, ct)));

    private static Task<IResult> PreviaSalvarComoModelo(
        Guid id, SalvarComoModeloPedido? pedido, ClaimsPrincipal usuario, ModeloImportacaoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.PreviaSalvarComoModeloAsync(conta, id, pedido?.Nome, ct)));

    private static Task<IResult> SalvarComoModelo(
        Guid id, SalvarComoModeloPedido pedido, ClaimsPrincipal usuario, ModeloImportacaoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarComoModeloAsync(conta, id, pedido.Nome, ct)));

    private static async Task<IResult> PreviaImportacaoAsync(
        HttpRequest request, ModeloImportacaoServico servico, CancellationToken ct)
    {
        if (request.HasFormContentType)
        {
            var form = await request.ReadFormAsync(ct);
            var arquivo = form.Files.GetFile("arquivo");
            if (arquivo is not null)
            {
                await using var fluxo = arquivo.OpenReadStream();
                return await De(Task.FromResult(servico.PreviaArquivo(fluxo, arquivo.FileName)));
            }

            return Results.Ok(servico.PreviaTexto(form["texto"].ToString()));
        }

        var pedido = await request.ReadFromJsonAsync<ImportarTextoPedido>(cancellationToken: ct);
        return Results.Ok(servico.PreviaTexto(pedido?.Texto));
    }

    private static Task<IResult> Estatisticas(ClaimsPrincipal usuario, EstatisticasServico servico, Project.Infrastructure.Persistencia.AppDbContext banco, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ObterAsync(conta, DateTimeOffset.UtcNow, ct, await EscopoAssistente.LiberadosAsync(usuario, banco, ct))));

    private static Task<IResult> Briefings(ClaimsPrincipal usuario, BriefingServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarBriefing(SalvarBriefing pedido, ClaimsPrincipal usuario, BriefingServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> Briefing(Guid id, ClaimsPrincipal usuario, BriefingServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarBriefing(Guid id, SalvarBriefing pedido, ClaimsPrincipal usuario, BriefingServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirBriefing(Guid id, ClaimsPrincipal usuario, BriefingServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> ClonarBriefing(Guid id, ClaimsPrincipal usuario, BriefingServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ClonarAsync(conta, id, ct)));

    private static Task<IResult> Roteiros(ClaimsPrincipal usuario, RoteiroServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarRoteiro(SalvarRoteiro pedido, ClaimsPrincipal usuario, RoteiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> Roteiro(Guid id, ClaimsPrincipal usuario, RoteiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarRoteiro(Guid id, SalvarRoteiro pedido, ClaimsPrincipal usuario, RoteiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirRoteiro(Guid id, ClaimsPrincipal usuario, RoteiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> ClonarRoteiro(Guid id, ClaimsPrincipal usuario, RoteiroServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ClonarAsync(conta, id, ct)));

    private static Task<IResult> Cronogramas(ClaimsPrincipal usuario, CronogramaServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarCronograma(SalvarCronograma pedido, ClaimsPrincipal usuario, CronogramaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> Cronograma(Guid id, ClaimsPrincipal usuario, CronogramaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarCronograma(Guid id, SalvarCronograma pedido, ClaimsPrincipal usuario, CronogramaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirCronograma(Guid id, ClaimsPrincipal usuario, CronogramaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> ClonarCronograma(Guid id, ClaimsPrincipal usuario, CronogramaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ClonarAsync(conta, id, ct)));

    private static Task<IResult> Inspiracoes(ClaimsPrincipal usuario, InspiracaoServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarInspiracao(SalvarInspiracao pedido, ClaimsPrincipal usuario, InspiracaoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> Inspiracao(Guid id, ClaimsPrincipal usuario, InspiracaoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarInspiracao(Guid id, SalvarInspiracao pedido, ClaimsPrincipal usuario, InspiracaoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirInspiracao(Guid id, ClaimsPrincipal usuario, InspiracaoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> ClonarInspiracao(Guid id, ClaimsPrincipal usuario, InspiracaoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ClonarAsync(conta, id, ct)));

    private static Task<IResult> Mensagens(ClaimsPrincipal usuario, MensagemServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarMensagem(SalvarMensagem pedido, ClaimsPrincipal usuario, MensagemServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> Mensagem(Guid id, ClaimsPrincipal usuario, MensagemServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarMensagem(Guid id, SalvarMensagem pedido, ClaimsPrincipal usuario, MensagemServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirMensagem(Guid id, ClaimsPrincipal usuario, MensagemServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> ClonarMensagem(Guid id, ClaimsPrincipal usuario, MensagemServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ClonarAsync(conta, id, ct)));

    private static Task<IResult> ServicosConta(ClaimsPrincipal usuario, FornecedorServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarServicosAsync(conta, nome, ct)));

    private static Task<IResult> CriarServicoConta(NovoServicoConta pedido, ClaimsPrincipal usuario, FornecedorServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarServicoAsync(conta, pedido, ct)));

    private static Task<IResult> ExcluirServicoConta(Guid id, ClaimsPrincipal usuario, FornecedorServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirServicoAsync(conta, id, ct)));

    private static Task<IResult> Fornecedores(ClaimsPrincipal usuario, FornecedorServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarFornecedor(SalvarFornecedor pedido, ClaimsPrincipal usuario, FornecedorServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> Fornecedor(Guid id, ClaimsPrincipal usuario, FornecedorServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var fornecedor = await servico.ObterAsync(conta, id, ct);
            if (!fornecedor.Ok)
            {
                return Falha(fornecedor.Falha!);
            }

            return Results.Ok(AssistenteEndpoints.PodeVerFinanceiro(usuario)
                ? fornecedor.Valor
                : fornecedor.Valor! with { PrecoDe = null, PrecoAte = null });
        });

    private static Task<IResult> AtualizarFornecedor(Guid id, SalvarFornecedor pedido, ClaimsPrincipal usuario, FornecedorServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirFornecedor(Guid id, ClaimsPrincipal usuario, FornecedorServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> AdicionarServicoEvento(
        Guid id,
        AdicionarServicoEvento pedido,
        ClaimsPrincipal usuario,
        FornecedorServico servico,
        CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AdicionarServicoNoEventoAsync(conta, id, pedido, Hoje(), ct)));

    private static Task<IResult> AtualizarEstimado(
        Guid id,
        Guid servicoId,
        AtualizarEstimadoServico pedido,
        ClaimsPrincipal usuario,
        FornecedorServico servico,
        CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarEstimadoAsync(conta, id, servicoId, pedido, Hoje(), ct)));

    private static Task<IResult> AdicionarFornecedorServico(
        Guid id,
        Guid servicoId,
        AdicionarFornecedorServico pedido,
        ClaimsPrincipal usuario,
        FornecedorServico servico,
        CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AdicionarFornecedorNoServicoAsync(conta, id, servicoId, pedido, Hoje(), ct)));

    private static Task<IResult> AvancarEtapa(
        Guid id,
        Guid servicoId,
        Guid vinculoId,
        ClaimsPrincipal usuario,
        FornecedorServico servico,
        CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AvancarEtapaAsync(conta, id, servicoId, vinculoId, Hoje(), ct)));

    private static Task<IResult> VoltarEtapa(
        Guid id,
        Guid servicoId,
        Guid vinculoId,
        ClaimsPrincipal usuario,
        FornecedorServico servico,
        CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.VoltarEtapaAsync(conta, id, servicoId, vinculoId, Hoje(), ct)));

    private static Task<IResult> ContratarFornecedor(
        Guid id,
        Guid servicoId,
        Guid vinculoId,
        ContratarFornecedorPedido pedido,
        ClaimsPrincipal usuario,
        FornecedorServico servico,
        CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ContratarAsync(conta, id, servicoId, vinculoId, pedido, Hoje(), ct)));

    private static Task<IResult> Budget(Guid id, ClaimsPrincipal usuario, FornecedorServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.BudgetAsync(conta, id, ct)));

    private static void MapearBiblioteca(
        RouteGroupBuilder api,
        string caminho,
        Delegate listar,
        Delegate criar,
        Delegate obter,
        Delegate atualizar,
        Delegate excluir,
        Delegate clonar)
    {
        api.MapGet(caminho, listar).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost(caminho, criar).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet($"{caminho}/{{id:guid}}", obter).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut($"{caminho}/{{id:guid}}", atualizar).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete($"{caminho}/{{id:guid}}", excluir).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost($"{caminho}/{{id:guid}}/clonar", clonar).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
    }

    private static Task<IResult> Eventos(
        ClaimsPrincipal usuario,
        EventoServico servico,
        IDados dados,
        string? situacao,
        string? nome,
        string? tipo,
        DateOnly? de,
        DateOnly? ate,
        string? tag,
        AppDbContext banco,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var lista = await servico.ListarAsync(
                conta,
                new FiltroEventos(EnumOuNulo<SituacaoEvento>(situacao), nome, EnumOuNulo<TipoEvento>(tipo), de, ate, tag),
                Hoje(),
                ct);
            if (await EscopoAssistente.LiberadosAsync(usuario, banco, ct) is { } liberados)
            {
                lista = lista.Where(evento => liberados.Contains(evento.Id)).ToArray();
            }

            if (!EhClient(usuario))
            {
                return Results.Ok(lista);
            }

            var permitidos = await dados.EventosDoUsuarioClienteAsync(conta, UsuarioId(usuario)!, ct);
            return Results.Ok(lista.Where(evento => permitidos.Contains(evento.Id)).ToArray());
        });

    private static Task<IResult> Evento(Guid id, ClaimsPrincipal usuario, EventoServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirEventoDoClientAsync(usuario, conta, id, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            var detalhe = await servico.ObterAsync(conta, id, Hoje(), ct);
            if (detalhe.Ok && !AssistenteEndpoints.PodeVerFinanceiro(usuario))
            {
                return Results.Ok(detalhe.Valor! with { OrcamentoEstimado = null });
            }

            return detalhe.Ok ? Results.Ok(detalhe.Valor) : Falha(detalhe.Falha!);
        });

    private static Task<IResult> CriarEvento(
        SalvarEvento pedido,
        ClaimsPrincipal usuario,
        EventoServico servico,
        ContratoServico contratos,
        AppDbContext banco,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var resultado = await servico.CriarAsync(conta, pedido, Hoje(), ct);
            if (resultado.Ok && pedido.ModeloId is Guid modeloId)
            {
                // SPEC-030 §6.3: o evento criado do modelo já vem com os contratos do modelo.
                await contratos.CopiarDoModeloAsync(conta, resultado.Valor!.Id, modeloId, ct);
            }

            // SPEC-032 §17, ponto 1: o evento criado por uma assistente "só os dela" já nasce com ela marcada.
            if (resultado.Ok && EscopoAssistente.AssistenteId(usuario) is Guid criadora)
            {
                banco.EventosAssistentes.Add(new Project.Domain.Equipe.EventoAssistente { EventoId = resultado.Valor!.Id, AssistenteId = criadora });
                await banco.SaveChangesAsync(ct);
            }

            return resultado.Ok ? Results.Ok(resultado.Valor) : Falha(resultado.Falha!);
        });

    private static Task<IResult> AtualizarEvento(Guid id, SalvarEvento pedido, ClaimsPrincipal usuario, EventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, Hoje(), ct)));

    private static Task<IResult> Concluir(Guid id, ClaimsPrincipal usuario, EventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.EncerrarAsync(conta, id, SituacaoEvento.Concluido, Hoje(), ct)));

    private static Task<IResult> Cancelar(Guid id, ClaimsPrincipal usuario, EventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.EncerrarAsync(conta, id, SituacaoEvento.Cancelado, Hoje(), ct)));

    private static Task<IResult> ResumoEvento(Guid id, ClaimsPrincipal usuario, EventoServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var resumo = await servico.ResumoAsync(conta, id, Hoje(), ct);
            if (!resumo.Ok)
            {
                return Falha(resumo.Falha!);
            }

            return Results.Ok(AssistenteEndpoints.PodeVerFinanceiro(usuario)
                ? resumo.Valor
                : resumo.Valor! with { OrcamentoEstimado = null, ValorContratado = 0, ValorPago = 0 });
        });

    private static Task<IResult> Assessoria(Guid id, AssessoriaPedido pedido, ClaimsPrincipal usuario, EventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DefinirAssessoriaAsync(conta, id, pedido, Hoje(), ct)));

    private static Task<IResult> Transfer(Guid id, TransferPedido pedido, ClaimsPrincipal usuario, EventoServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DefinirTransferAsync(conta, id, pedido.Ativo, pedido.Locais, Hoje(), ct)));

    private static Task<IResult> ImagemEvento(
        Guid id,
        IFormFile? arquivo,
        ClaimsPrincipal usuario,
        EventoServico servico,
        IArmazenamentoArquivo armazenamento,
        CancellationToken ct) =>
        ComConta(usuario, conta => Imagem(conta, arquivo, armazenamento, async (imagem, token) =>
        {
            var anterior = await servico.GuardarImagemAsync(conta, id, imagem, token);
            return (anterior.Ok, anterior.Falha, anterior.Valor);
        }, ct));

    private static Task<IResult> RemoverImagemEvento(
        Guid id,
        ClaimsPrincipal usuario,
        EventoServico servico,
        IArmazenamentoArquivo armazenamento,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var removida = await servico.RemoverImagemAsync(conta, id, ct);
            if (!removida.Ok)
            {
                return Falha(removida.Falha!);
            }

            if (removida.Valor is Guid anterior)
            {
                await armazenamento.DescartarAsync(anterior, ct);
            }

            return Results.Ok(new { mensagem = "Foto removida." });
        });

    private static Task<IResult> TarefasDoEvento(Guid id, ClaimsPrincipal usuario, TarefaServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloEEventoAsync(usuario, conta, id, ModuloCliente.Tarefas, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.DoEventoAsync(conta, id, Hoje(), ct));
        });

    private static Task<IResult> CriarTarefa(Guid id, SalvarTarefa pedido, ClaimsPrincipal usuario, TarefaServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloEEventoAsync(usuario, conta, id, ModuloCliente.Tarefas, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.CriarAsync(conta, id, pedido, Hoje(), ct));
        });

    private static Task<IResult> TextoDoModeloOrcamento(Guid modeloId, Guid oportunidadeId, decimal? valor, ClaimsPrincipal usuario, OrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var texto = await servico.TextoDoModeloAsync(conta, modeloId, oportunidadeId, valor, ct);
            return texto.Ok ? Results.Ok(new { texto = texto.Valor }) : Falha(texto.Falha!);
        });

    private static Task<IResult> BriefingDoLead(Guid id, ClaimsPrincipal usuario, BriefingLeadServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => await ComoBriefing(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AplicarBriefingAoLead(Guid id, AplicarBriefingLead pedido, ClaimsPrincipal usuario, BriefingLeadServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => await ComoBriefing(servico.AplicarAsync(conta, id, pedido, ct)));

    private static Task<IResult> SalvarBriefingDoLead(Guid id, SalvarRespostasBriefingLead pedido, ClaimsPrincipal usuario, BriefingLeadServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => await ComoBriefing(servico.SalvarRespostasAsync(conta, id, pedido, ct)));

    private static Task<IResult> RemoverBriefingDoLead(Guid id, ClaimsPrincipal usuario, BriefingLeadServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var resultado = await servico.RemoverAsync(conta, id, ct);
            return resultado.Ok ? Results.NoContent() : Falha(resultado.Falha!);
        });

    private static async Task<IResult> ComoBriefing(Task<Resultado<BriefingLeadLeitura?>> tarefa)
    {
        var resultado = await tarefa;
        return resultado.Ok ? Results.Ok(new { briefing = resultado.Valor }) : Falha(resultado.Falha!);
    }

    private static Task<IResult> AssistentesDoEvento(Guid id, ClaimsPrincipal usuario, AppDbContext banco, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var ids = await banco.EventosAssistentes.AsNoTracking()
                .Where(item => item.EventoId == id)
                .Join(banco.Assistentes, item => item.AssistenteId, assistente => assistente.Id, (item, assistente) => assistente)
                .Where(assistente => assistente.ContaId == conta)
                .Select(assistente => assistente.Id)
                .ToListAsync(ct);
            return Results.Ok(new { assistentes = ids });
        });

    private static Task<IResult> DefinirAssistentesDoEvento(Guid id, AssistentesDoEventoPedido pedido, ClaimsPrincipal usuario, AppDbContext banco, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            if (!await banco.Eventos.AnyAsync(evento => evento.Id == id && evento.ContaId == conta, ct))
            {
                return Indisponivel();
            }

            var pedidos = (pedido.Assistentes ?? []).Distinct().ToList();
            var validas = await banco.Assistentes
                .Where(assistente => assistente.ContaId == conta && assistente.Situacao == Project.Domain.Equipe.SituacaoAssistente.Ativa && pedidos.Contains(assistente.Id))
                .Select(assistente => assistente.Id)
                .ToListAsync(ct);
            if (validas.Count != pedidos.Count)
            {
                return Validacao("Escolha só assistentes ativas da conta.");
            }

            await banco.EventosAssistentes.Where(item => item.EventoId == id).ExecuteDeleteAsync(ct);
            banco.EventosAssistentes.AddRange(validas.Select(assistente => new Project.Domain.Equipe.EventoAssistente { EventoId = id, AssistenteId = assistente }));
            await banco.SaveChangesAsync(ct);
            return Results.Ok(new { assistentes = validas });
        });

    private static Task<IResult> Tarefas(ClaimsPrincipal usuario, TarefaServico servico, IDados dados, AppDbContext banco, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloAsync(usuario, conta, ModuloCliente.Tarefas, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            var lista = await servico.DaContaAsync(conta, Hoje(), ct);
            if (await EscopoAssistente.LiberadosAsync(usuario, banco, ct) is { } liberados)
            {
                lista = lista.Where(tarefa => liberados.Contains(tarefa.EventoId)).ToArray();
            }

            if (!EhClient(usuario))
            {
                return Results.Ok(lista);
            }

            var permitidos = await dados.EventosDoUsuarioClienteAsync(conta, UsuarioId(usuario)!, ct);
            return Results.Ok(lista.Where(tarefa => permitidos.Contains(tarefa.EventoId)).ToArray());
        });

    private static Task<IResult> AtualizarTarefa(Guid id, SalvarTarefa pedido, ClaimsPrincipal usuario, TarefaServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloAsync(usuario, conta, ModuloCliente.Tarefas, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            if (EhClient(usuario))
            {
                var tarefa = await dados.ObterTarefaAsync(conta, id, ct);
                if (tarefa is null)
                {
                    return Indisponivel();
                }

                var eventoOk = await ExigirEventoDoClientAsync(usuario, conta, tarefa.EventoId, dados, ct);
                if (eventoOk is not null)
                {
                    return eventoOk;
                }
            }

            return await De(servico.AtualizarAsync(conta, id, pedido, Hoje(), ct));
        });

    private static Task<IResult> ComentarTarefa(Guid id, ComentarioPedido pedido, ClaimsPrincipal usuario, TarefaServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloAsync(usuario, conta, ModuloCliente.Tarefas, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            if (EhClient(usuario))
            {
                var tarefa = await dados.ObterTarefaAsync(conta, id, ct);
                if (tarefa is null)
                {
                    return Indisponivel();
                }

                var eventoOk = await ExigirEventoDoClientAsync(usuario, conta, tarefa.EventoId, dados, ct);
                if (eventoOk is not null)
                {
                    return eventoOk;
                }
            }

            return await De(servico.ComentarAsync(conta, id, pedido, Hoje(), ct));
        });

    private static Task<IResult> AnexarTarefa(Guid id, HttpRequest request, ClaimsPrincipal usuario, TarefaServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            const string invalido = "O arquivo não foi aceito. Use JPG, JPEG, PNG ou PDF de até 5 MB.";
            if (!request.HasFormContentType)
            {
                return Validacao(invalido);
            }

            var formulario = await request.ReadFormAsync(ct);
            var arquivo = formulario.Files.GetFile("arquivo");
            if (arquivo is null || arquivo.Length == 0 || arquivo.Length > 5 * 1024 * 1024)
            {
                return Validacao(invalido);
            }

            await using var fluxo = arquivo.OpenReadStream();
            return await De(servico.AnexarAsync(conta, id, fluxo, arquivo.FileName, Hoje(), ct));
        });

    private static Task<IResult> RemoverAnexoTarefa(Guid id, Guid anexoId, ClaimsPrincipal usuario, TarefaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.RemoverAnexoAsync(conta, id, anexoId, Hoje(), ct)));

    private static Task<IResult> MarcarItemChecklist(
        Guid id,
        Guid itemId,
        MarcarItemChecklist pedido,
        ClaimsPrincipal usuario,
        TarefaServico servico,
        IDados dados,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloAsync(usuario, conta, ModuloCliente.Tarefas, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            if (EhClient(usuario))
            {
                var tarefa = await dados.ObterTarefaAsync(conta, id, ct);
                if (tarefa is null)
                {
                    return Indisponivel();
                }

                var eventoOk = await ExigirEventoDoClientAsync(usuario, conta, tarefa.EventoId, dados, ct);
                if (eventoOk is not null)
                {
                    return eventoOk;
                }
            }

            return await De(servico.MarcarItemChecklistAsync(conta, id, itemId, pedido, Hoje(), ct));
        });

    private static Task<IResult> Clientes(ClaimsPrincipal usuario, ClienteServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarCliente(NovoCliente pedido, ClaimsPrincipal usuario, ClienteServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, Hoje(), ct)));

    private static Task<IResult> AtualizarCliente(Guid id, NovoCliente pedido, ClaimsPrincipal usuario, ClienteServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, Hoje(), ct)));

    private static Task<IResult> FotoCliente(
        Guid id,
        IFormFile? arquivo,
        ClaimsPrincipal usuario,
        ClienteServico servico,
        IArmazenamentoArquivo armazenamento,
        CancellationToken ct) =>
        ComConta(usuario, conta => Imagem(conta, arquivo, armazenamento, async (imagem, token) =>
        {
            var anterior = await servico.GuardarFotoAsync(conta, id, imagem, token);
            return (anterior.Ok, anterior.Falha, anterior.Valor);
        }, ct));

    private static Task<IResult> ClientesDoEvento(Guid id, ClaimsPrincipal usuario, ClienteServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.DoEventoAsync(conta, id, ct)));

    private static Task<IResult> Vincular(Guid id, VinculoPedido pedido, ClaimsPrincipal usuario, ClienteServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.VincularAsync(conta, id, pedido.ClienteId, ct)));

    private static Task<IResult> Desvincular(Guid id, Guid clienteId, ClaimsPrincipal usuario, ClienteServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DesvincularAsync(conta, id, clienteId, ct)));

    private static Task<IResult> Grupos(ClaimsPrincipal usuario, ConviteServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloAsync(usuario, conta, ModuloCliente.Convidados, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return Results.Ok(await servico.ListarGruposAsync(conta, ct));
        });

    private static Task<IResult> CriarGrupo(GrupoPedido pedido, ClaimsPrincipal usuario, ConviteServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloAsync(usuario, conta, ModuloCliente.Convidados, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.CriarGrupoAsync(conta, pedido.Nome, ct));
        });

    private static Task<IResult> Convites(
        Guid id,
        ClaimsPrincipal usuario,
        ConviteServico servico,
        IDados dados,
        string? nome,
        string? situacao,
        string? telefone,
        bool? transfer,
        Guid? grupoId,
        string? observacao,
        bool? somenteConfirmados,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloEEventoAsync(usuario, conta, id, ModuloCliente.Convidados, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.ListarAsync(
                conta,
                id,
                new FiltroConvites(nome, EnumOuNulo<SituacaoConvidado>(situacao), telefone, transfer, grupoId, observacao, somenteConfirmados == true),
                ct));
        });

    private static Task<IResult> CriarConvite(Guid id, NovoConvite pedido, ClaimsPrincipal usuario, ConviteServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloEEventoAsync(usuario, conta, id, ModuloCliente.Convidados, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.CriarAsync(conta, id, pedido, ct));
        });

    private static Task<IResult> AtualizarConvite(Guid id, NovoConvite pedido, ClaimsPrincipal usuario, ConviteServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloViaConviteAsync(usuario, conta, id, ModuloCliente.Convidados, dados, servico, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.AtualizarAsync(conta, id, pedido, ct));
        });

    private static Task<IResult> CriarConvidado(Guid id, ConvidadoPedido pedido, ClaimsPrincipal usuario, ConviteServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloViaConviteAsync(usuario, conta, id, ModuloCliente.Convidados, dados, servico, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.SalvarConvidadoAsync(conta, id, null, pedido, ct));
        });

    private static Task<IResult> AtualizarConvidado(
        Guid id,
        Guid convidadoId,
        ConvidadoPedido pedido,
        ClaimsPrincipal usuario,
        ConviteServico servico,
        IDados dados,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloViaConviteAsync(usuario, conta, id, ModuloCliente.Convidados, dados, servico, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.SalvarConvidadoAsync(conta, id, convidadoId, pedido, ct));
        });

    private static Task<IResult> RemoverConvidado(Guid id, ClaimsPrincipal usuario, ConviteServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloAsync(usuario, conta, ModuloCliente.Convidados, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.RemoverConvidadoAsync(conta, id, ct));
        });

    private static Task<IResult> Principal(Guid id, PrincipalPedido pedido, ClaimsPrincipal usuario, ConviteServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloViaConviteAsync(usuario, conta, id, ModuloCliente.Convidados, dados, servico, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.DefinirPrincipalAsync(conta, id, pedido.ConvidadoId, ct));
        });

    private static Task<IResult> Planilha(Guid id, ClaimsPrincipal usuario, ConviteServico servico, IDados dados, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloEEventoAsync(usuario, conta, id, ModuloCliente.Convidados, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            if (!await EventoDaConta(conta, id, ct, servico))
            {
                return Indisponivel();
            }

            return Results.File(
                servico.ModeloPlanilha(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "convidados.xlsx");
        });

    private static Task<IResult> Importar(
        Guid id,
        IFormFile? arquivo,
        ClaimsPrincipal usuario,
        ConviteServico servico,
        IDados dados,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloEEventoAsync(usuario, conta, id, ModuloCliente.Convidados, dados, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            if (arquivo is null)
            {
                return Validacao("Envie uma planilha .xlsx ou .xls.");
            }

            await using var fluxo = arquivo.OpenReadStream();
            return await De(servico.ImportarAsync(conta, id, fluxo, arquivo.FileName, ct));
        });

    private static Task<IResult> Qr(Guid id, ClaimsPrincipal usuario, ConviteServico servico, IDados dados, IConfiguration configuracao, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloViaConviteAsync(usuario, conta, id, ModuloCliente.Convidados, dados, servico, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            var png = await servico.QrAsync(conta, id, configuracao["PublicUrl"] ?? "http://localhost:4200", ct);
            if (!png.Ok)
            {
                return Falha(png.Falha!);
            }

            return Results.File(png.Valor!, "image/png", "convite.png");
        });

    private static Task<IResult> WhatsApp(Guid id, ClaimsPrincipal usuario, ConviteServico servico, IDados dados, IConfiguration configuracao, CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var bloqueio = await ExigirModuloViaConviteAsync(usuario, conta, id, ModuloCliente.Convidados, dados, servico, ct);
            if (bloqueio is not null)
            {
                return bloqueio;
            }

            return await De(servico.WhatsAppAsync(conta, id, configuracao["PublicUrl"] ?? "http://localhost:4200", ct));
        });

    private static async Task<IResult> Arquivo(
        Guid id,
        ClaimsPrincipal usuario,
        HttpContext http,
        IArmazenamentoArquivo armazenamento,
        IDados dados,
        CancellationToken ct)
    {
        var conta = Conta(usuario);
        if (conta is null)
        {
            return NaoAutenticado();
        }

        var bloqueio = await ExigirModuloAsync(usuario, conta, ModuloCliente.Anexos, dados, ct);
        if (bloqueio is not null)
        {
            return bloqueio;
        }

        var aberto = await armazenamento.AbrirAsync(id, conta, ct);
        if (aberto is null)
        {
            return Indisponivel();
        }

        http.Response.Headers.XContentTypeOptions = "nosniff";
        return Results.File(aberto.Conteudo, aberto.TipoConteudo, LimparNome(aberto.NomeOriginal));
    }

    private static async Task<IResult> Cep(string cep, ClaimsPrincipal usuario, IConsultaCep consulta, CancellationToken ct)
    {
        if (Conta(usuario) is null)
        {
            return NaoAutenticado();
        }

        var digitos = Mascaras.SoDigitos(cep);
        var endereco = digitos is null ? null : await consulta.ConsultarAsync(digitos, ct);
        return endereco is null
            ? Results.Json(new ErroResposta(Codigos.Validacao, "CEP não encontrado."), statusCode: StatusCodes.Status404NotFound)
            : Results.Ok(endereco);
    }

    private static void MapearBibliotecaSimples(
        RouteGroupBuilder api,
        string caminho,
        Delegate listar,
        Delegate criar,
        Delegate obter,
        Delegate atualizar,
        Delegate excluir)
    {
        api.MapGet(caminho, listar).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPost(caminho, criar).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapGet($"{caminho}/{{id:guid}}", obter).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapPut($"{caminho}/{{id:guid}}", atualizar).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
        api.MapDelete($"{caminho}/{{id:guid}}", excluir).RequireAuthorization(policy => policy.RequireRole(Papeis.Equipe));
    }

    private static Task<IResult> Agenda(
        ClaimsPrincipal usuario,
        AgendaServico servico,
        DateOnly? de,
        DateOnly? ate,
        AppDbContext banco,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var itens = await servico.ListarAsync(conta, de, ate, ct);
            if (await EscopoAssistente.LiberadosAsync(usuario, banco, ct) is { } liberados)
            {
                itens = itens.Where(item => item.EventoId is not Guid evento || liberados.Contains(evento)).ToArray();
            }

            return Results.Ok(itens);
        });

    private static Task<IResult> CriarCompromisso(SalvarCompromisso pedido, ClaimsPrincipal usuario, AgendaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> AtualizarCompromisso(Guid id, SalvarCompromisso pedido, ClaimsPrincipal usuario, AgendaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirCompromisso(Guid id, ClaimsPrincipal usuario, AgendaServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> Oportunidades(
        ClaimsPrincipal usuario,
        OportunidadeServico servico,
        string? nome,
        string? responsavel,
        string? tipoEvento,
        DateOnly? dataDe,
        DateOnly? dataAte,
        string? ordenacao,
        CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(
            conta,
            new FiltroOportunidades(nome, responsavel, tipoEvento, dataDe, dataAte, ordenacao),
            ct)));

    private static Task<IResult> CriarOportunidade(SalvarOportunidade pedido, ClaimsPrincipal usuario, OportunidadeServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct, UsuarioId(usuario))));

    private static Task<IResult> Oportunidade(Guid id, ClaimsPrincipal usuario, OportunidadeServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarOportunidade(Guid id, SalvarOportunidade pedido, ClaimsPrincipal usuario, OportunidadeServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> MoverOportunidade(Guid id, MoverOportunidade pedido, ClaimsPrincipal usuario, OportunidadeServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.MoverAsync(conta, id, pedido, ct)));

    private static Task<IResult> VincularClienteOportunidade(Guid id, VincularClienteOportunidade pedido, ClaimsPrincipal usuario, OportunidadeServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.VincularClienteAsync(conta, id, pedido, ct)));

    private static Task<IResult> EstagiosFunil(ClaimsPrincipal usuario, EstagioFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, ct)));

    private static Task<IResult> SalvarEstagiosFunil(SalvarEstagiosFunil pedido, ClaimsPrincipal usuario, EstagioFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.SalvarAsync(conta, pedido, ct)));

    private static Task<IResult> RetornoOportunidade(Guid id, RetornoOportunidade pedido, ClaimsPrincipal usuario, OportunidadeServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.MarcarRetornoAsync(conta, id, pedido, ct)));

    private static Task<IResult> ContatoRepetidoOportunidade(
        ClaimsPrincipal usuario,
        OportunidadeServico servico,
        [FromQuery] string[]? telefone,
        [FromQuery] string[]? email,
        Guid? ignorar,
        CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ContatoRepetidoAsync(conta, telefone ?? [], email ?? [], ignorar, ct)));

    private static Task<IResult> ExcluirOportunidade(Guid id, ClaimsPrincipal usuario, OportunidadeServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct, SoDoUsuario(usuario))));

    private static Task<IResult> ChecarDataOportunidade(DateOnly data, ClaimsPrincipal usuario, OportunidadeServico servico, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ChecarDataAsync(conta, data, ct)));

    private static Task<IResult> ExportarOportunidades(
        ClaimsPrincipal usuario,
        OportunidadeServico servico,
        string? nome,
        string? responsavel,
        string? tipoEvento,
        DateOnly? dataDe,
        DateOnly? dataAte,
        string? ordenacao,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var lista = await servico.ListarAsync(
                conta,
                new FiltroOportunidades(nome, responsavel, tipoEvento, dataDe, dataAte, ordenacao),
                ct);
            var nomes = await servico.NomesResponsaveisAsync(conta, ct);
            var csv = "Nome;Estagio;Valor;Responsavel;Fonte;Servico\n" + string.Join(
                "\n",
                lista.Select(item =>
                    $"{EscaparCsv(item.Nome)};{EscaparCsv(item.Estagio)};{item.ValorProposta};{EscaparCsv(OportunidadeServico.NomeResponsavel(nomes, item.Responsavel))};{EscaparCsv(OrigensFunil.Texto(item.Fonte, item.FonteOutro))};{EscaparCsv(item.ServicoProduto)}"));
            return Results.Text(csv, "text/csv");
        });

    private static Task<IResult> LeadPublico(string contaId, LeadPublicoPedido pedido, OportunidadeServico servico, CancellationToken ct) =>
        De(servico.CriarLeadPublicoAsync(contaId, pedido, ct));

    private static Task<IResult> LeadsRsvp(ClaimsPrincipal usuario, LeadRsvpServico servico, string? busca, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, busca, ct)));

    private static Task<IResult> GerarOportunidadeLead(Guid id, ClaimsPrincipal usuario, LeadRsvpServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.GerarOportunidadeAsync(conta, id, ct)));

    private static Task<IResult> DescartarLead(Guid id, ClaimsPrincipal usuario, LeadRsvpServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.DescartarAsync(conta, id, ct)));

    private static Task<IResult> ContatarLead(Guid id, ClaimsPrincipal usuario, LeadRsvpServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.MarcarContatadoAsync(conta, id, ct)));

    private static Task<IResult> ContratosFunil(
        ClaimsPrincipal usuario,
        ContratoFunilServico servico,
        string? situacao,
        string? busca,
        DateOnly? criadoDe,
        DateOnly? criadoAte,
        CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, situacao, busca, criadoDe, criadoAte, ct)));

    private static Task<IResult> CriarContratoFunil(SalvarContratoFunil pedido, ClaimsPrincipal usuario, ContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct, UsuarioId(usuario))));

    private static Task<IResult> ContratoFunil(Guid id, ClaimsPrincipal usuario, ContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarContratoFunil(Guid id, SalvarContratoFunil pedido, ClaimsPrincipal usuario, ContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> EnviarContratoFunil(Guid id, ClaimsPrincipal usuario, ContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.EnviarAsync(conta, id, ct)));

    private static Task<IResult> AssinarContratoFunil(Guid id, ClaimsPrincipal usuario, ContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AssinarAsync(conta, id, ct)));

    private static Task<IResult> CancelarContratoFunil(Guid id, ClaimsPrincipal usuario, ContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CancelarAsync(conta, id, ct)));

    private static Task<IResult> ExcluirContratoFunil(Guid id, ClaimsPrincipal usuario, ContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct, SoDoUsuario(usuario))));

    private static Task<IResult> OrcamentosFunil(
        ClaimsPrincipal usuario,
        OrcamentoFunilServico servico,
        string? situacao,
        string? busca,
        DateOnly? criadoDe,
        DateOnly? criadoAte,
        CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, situacao, busca, criadoDe, criadoAte, ct)));

    private static Task<IResult> CriarOrcamentoFunil(SalvarOrcamentoFunil pedido, ClaimsPrincipal usuario, OrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct, UsuarioId(usuario))));

    private static Task<IResult> OrcamentoFunil(Guid id, ClaimsPrincipal usuario, OrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarOrcamentoFunil(Guid id, SalvarOrcamentoFunil pedido, ClaimsPrincipal usuario, OrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> EnviarOrcamentoFunil(Guid id, ClaimsPrincipal usuario, OrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.EnviarAsync(conta, id, ct)));

    /// <summary>
    /// Sem login. Se a própria dona estiver logada, a abertura não conta (SPEC-031 §8). A página manda também a
    /// marca "X-Aralu-Visitante" (conta logada neste navegador), porque o login não passa para outra aba.
    /// A marca só tira poder (não conta abertura, bloqueia resposta), então não precisa de prova.
    /// </summary>
    private static Task<IResult> PropostaPublica(
        string token,
        ClaimsPrincipal usuario,
        [FromHeader(Name = "X-Aralu-Visitante")] string? visitante,
        OrcamentoFunilServico servico,
        CancellationToken ct) =>
        De(servico.PublicaAsync(token, Conta(usuario) ?? visitante, ct));

    private static Task<IResult> ResponderPropostaPublica(
        string token,
        ResponderProposta pedido,
        ClaimsPrincipal usuario,
        [FromHeader(Name = "X-Aralu-Visitante")] string? visitante,
        OrcamentoFunilServico servico,
        CancellationToken ct) =>
        De(servico.ResponderPublicaAsync(token, Conta(usuario) ?? visitante, pedido, DateOnly.FromDateTime(DateTime.UtcNow), ct));

    private static Task<IResult> ResponderOrcamentoFunil(Guid id, ClaimsPrincipal usuario, OrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ResponderAsync(conta, id, ct)));

    private static Task<IResult> CancelarOrcamentoFunil(Guid id, ClaimsPrincipal usuario, OrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CancelarAsync(conta, id, ct)));

    private static Task<IResult> ExcluirOrcamentoFunil(Guid id, ClaimsPrincipal usuario, OrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct, SoDoUsuario(usuario))));

    private static Task<IResult> TarefasFunil(
        ClaimsPrincipal usuario,
        TarefaFunilServico servico,
        DateOnly? prazoDe,
        DateOnly? prazoAte,
        string? tipo,
        string? responsavel,
        bool? completa,
        CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(
            conta,
            new FiltroTarefaFunil(prazoDe, prazoAte, tipo, responsavel, completa),
            ct)));

    private static Task<IResult> CriarTarefaFunil(SalvarTarefaFunil pedido, ClaimsPrincipal usuario, TarefaFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct, UsuarioId(usuario))));

    private static Task<IResult> AtualizarTarefaFunil(Guid id, SalvarTarefaFunil pedido, ClaimsPrincipal usuario, TarefaFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ConcluirTarefaFunil(Guid id, ClaimsPrincipal usuario, TarefaFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ConcluirAsync(conta, id, ct)));

    private static Task<IResult> ReabrirTarefaFunil(Guid id, ClaimsPrincipal usuario, TarefaFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ReabrirAsync(conta, id, ct)));

    private static Task<IResult> ExcluirTarefaFunil(Guid id, ClaimsPrincipal usuario, TarefaFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct, SoDoUsuario(usuario))));

    private static Task<IResult> RelatoriosFunil(
        ClaimsPrincipal usuario,
        RelatorioFunilServico servico,
        DateOnly? inicio,
        DateOnly? fim,
        CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, inicio, fim, ct)));

    private static Task<IResult> ExportarRelatoriosFunil(
        ClaimsPrincipal usuario,
        RelatorioFunilServico servico,
        DateOnly? inicio,
        DateOnly? fim,
        CancellationToken ct) =>
        ComConta(usuario, async conta =>
        {
            var resultado = await servico.ObterAsync(conta, inicio, fim, ct);
            if (!resultado.Ok || resultado.Valor is null)
            {
                return Falha(resultado.Falha!);
            }

            var catalogo = resultado.Valor;
            var linhas = new List<string> { "Relatorio;Chave;Quantidade;Valor" };
            void Add(string nome, IEnumerable<LinhaRelatorioFunil> itens)
            {
                foreach (var item in itens)
                {
                    linhas.Add($"{EscaparCsv(nome)};{EscaparCsv(item.Chave)};{item.Quantidade};{item.Valor}");
                }
            }

            Add("Fechados x perdidos", catalogo.FechadosPerdidos);
            Add("Por fonte", catalogo.PorFonte);
            Add("Por serviço", catalogo.PorServicoProduto);
            Add("Por estágio", catalogo.PorEstagio);
            foreach (var item in catalogo.PorRegiao)
            {
                linhas.Add($"Por região;{EscaparCsv(item.Uf + "/" + item.Cidade)};{item.Quantidade};{item.Valor}");
            }

            Add("Por responsável", catalogo.PorResponsavel);
            Add("Por data prevista", catalogo.PorDataPrevista);
            Add("Por motivos", catalogo.PorMotivosDescarte);
            var rsvp = catalogo.OportunidadesRsvp;
            linhas.Add($"RSVP;Visualizações;{rsvp.Visualizacoes};0");
            linhas.Add($"RSVP;Cliques;{rsvp.CliquesBotao};0");
            linhas.Add($"RSVP;Contatados;{rsvp.Contatados};0");
            linhas.Add($"RSVP;Descartados;{rsvp.Descartados};0");
            linhas.Add($"RSVP;Geradas;{rsvp.Geradas};0");
            linhas.Add($"RSVP;Conversão;{rsvp.Conversao};0");
            linhas.Add($"RSVP;Conversões anteriores;{rsvp.ConversoesAnteriores};0");
            return Results.Text(string.Join("\n", linhas), "text/csv");
        });

    private static Task<IResult> ModelosServicoFunil(ClaimsPrincipal usuario, ModeloServicoFunilServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarModeloServicoFunil(SalvarModeloServicoFunil pedido, ClaimsPrincipal usuario, ModeloServicoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> ModeloServicoFunil(Guid id, ClaimsPrincipal usuario, ModeloServicoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarModeloServicoFunil(Guid id, SalvarModeloServicoFunil pedido, ClaimsPrincipal usuario, ModeloServicoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirModeloServicoFunil(Guid id, ClaimsPrincipal usuario, ModeloServicoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> ModelosOrcamentoFunil(ClaimsPrincipal usuario, ModeloOrcamentoFunilServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarModeloOrcamentoFunil(SalvarModeloOrcamentoFunil pedido, ClaimsPrincipal usuario, ModeloOrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> ModeloOrcamentoFunil(Guid id, ClaimsPrincipal usuario, ModeloOrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarModeloOrcamentoFunil(Guid id, SalvarModeloOrcamentoFunil pedido, ClaimsPrincipal usuario, ModeloOrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirModeloOrcamentoFunil(Guid id, ClaimsPrincipal usuario, ModeloOrcamentoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> ModelosContratoFunil(ClaimsPrincipal usuario, ModeloContratoFunilServico servico, string? nome, CancellationToken ct) =>
        ComConta(usuario, async conta => Results.Ok(await servico.ListarAsync(conta, nome, ct)));

    private static Task<IResult> CriarModeloContratoFunil(SalvarModeloContratoFunil pedido, ClaimsPrincipal usuario, ModeloContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.CriarAsync(conta, pedido, ct)));

    private static Task<IResult> ModeloContratoFunil(Guid id, ClaimsPrincipal usuario, ModeloContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ObterAsync(conta, id, ct)));

    private static Task<IResult> AtualizarModeloContratoFunil(Guid id, SalvarModeloContratoFunil pedido, ClaimsPrincipal usuario, ModeloContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.AtualizarAsync(conta, id, pedido, ct)));

    private static Task<IResult> ExcluirModeloContratoFunil(Guid id, ClaimsPrincipal usuario, ModeloContratoFunilServico servico, CancellationToken ct) =>
        ComConta(usuario, conta => De(servico.ExcluirAsync(conta, id, ct)));

    private static Task<IResult> AbrirRsvp(string token, ConviteServico servico, CancellationToken ct) =>
        De(servico.AbrirRsvpAsync(token, ct));

    private static Task<IResult> ResponderRsvp(string token, RespostasPedido pedido, ConviteServico servico, CancellationToken ct) =>
        De(servico.ResponderAsync(token, pedido.Respostas, pedido.PretendeRealizarEvento, ct));

    private static string EscaparCsv(string? valor) =>
        "\"" + (valor ?? "").Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";

    private static async Task<IResult> Imagem(
        string conta,
        IFormFile? arquivo,
        IArmazenamentoArquivo armazenamento,
        Func<Guid, CancellationToken, Task<(bool Ok, Falha? Falha, Guid? Anterior)>> ligar,
        CancellationToken ct)
    {
        if (arquivo is null || arquivo.Length == 0)
        {
            return Validacao("A imagem não foi aceita. Use JPG, PNG ou WebP de até 5 MB.");
        }

        await using var fluxo = arquivo.OpenReadStream();
        var guardado = await armazenamento.GuardarImagemAsync(fluxo, arquivo.FileName, conta, ct);
        if (!guardado.Ok || guardado.Valor is null)
        {
            return Falha(guardado.Falha!);
        }

        var imagemId = guardado.Valor.Id;
        try
        {
            var ligado = await ligar(imagemId, ct);
            if (!ligado.Ok)
            {
                await armazenamento.DescartarAsync(imagemId, ct);
                return Falha(ligado.Falha!);
            }

            if (ligado.Anterior is Guid anterior && anterior != imagemId)
            {
                await armazenamento.DescartarAsync(anterior, ct);
            }

            return Results.Ok(new { imagemId, mensagem = "Imagem gravada." });
        }
        catch
        {
            await armazenamento.DescartarAsync(imagemId, ct);
            throw;
        }
    }

    private static async Task<bool> EventoDaConta(string conta, Guid id, CancellationToken ct, ConviteServico servico)
    {
        var lista = await servico.ListarAsync(conta, id, new FiltroConvites(null, null, null, null, null, null, false), ct);
        return lista.Ok;
    }

    private static Task<IResult> ComConta(ClaimsPrincipal usuario, Func<string, Task<IResult>> acao)
    {
        var conta = Conta(usuario);
        return conta is null ? Task.FromResult(NaoAutenticado()) : acao(conta);
    }

    private static async Task<IResult> De<T>(Task<Resultado<T>> tarefa)
    {
        var resultado = await tarefa;
        return resultado.Ok ? Results.Ok(resultado.Valor) : Falha(resultado.Falha!);
    }

    private static IResult Falha(Falha falha) =>
        Results.Json(
            new ErroResposta(falha.Codigo, falha.Mensagem),
            statusCode: falha.Codigo switch
            {
                Codigos.Indisponivel => StatusCodes.Status404NotFound,
                Codigos.Proibido => StatusCodes.Status403Forbidden,
                _ => StatusCodes.Status400BadRequest,
            });

    private static IResult Validacao(string mensagem) => Falha(new Falha(Codigos.Validacao, mensagem));

    private static IResult Indisponivel() => Falha(new Falha(Codigos.Indisponivel, "Indisponível."));

    private static IResult Proibido() => Falha(new Falha(Codigos.Proibido, "Sem permissão para este recurso."));

    private static IResult NaoAutenticado() =>
        Results.Json(new ErroResposta("autenticacao", "É preciso entrar para continuar."), statusCode: StatusCodes.Status401Unauthorized);

    private static bool EhClient(ClaimsPrincipal usuario) => usuario.IsInRole(Papeis.Client);

    private static string? UsuarioId(ClaimsPrincipal usuario) => usuario.FindFirstValue(ClaimTypes.NameIdentifier);

    /// <summary>A assistente só exclui o que criou (SPEC-032 §18, passo 1); a dona exclui tudo (nulo).</summary>
    private static string? SoDoUsuario(ClaimsPrincipal usuario) =>
        usuario.IsInRole(Papeis.Assistant) ? UsuarioId(usuario) ?? "-" : null;

    private static async Task<IResult?> ExigirModuloAsync(
        ClaimsPrincipal usuario,
        string conta,
        ModuloCliente modulo,
        IDados dados,
        CancellationToken ct)
    {
        if (!EhClient(usuario))
        {
            return null;
        }

        var usuarioId = UsuarioId(usuario);
        if (usuarioId is null)
        {
            return NaoAutenticado();
        }

        var cliente = await dados.ObterClientePorUsuarioAsync(conta, usuarioId, ct);
        if (cliente is null)
        {
            return Proibido();
        }

        return cliente.TemPermissao(modulo) ? null : Proibido();
    }

    private static async Task<IResult?> ExigirEventoDoClientAsync(
        ClaimsPrincipal usuario,
        string conta,
        Guid eventoId,
        IDados dados,
        CancellationToken ct)
    {
        if (!EhClient(usuario))
        {
            return null;
        }

        var usuarioId = UsuarioId(usuario);
        if (usuarioId is null)
        {
            return NaoAutenticado();
        }

        var cliente = await dados.ObterClientePorUsuarioAsync(conta, usuarioId, ct);
        if (cliente is null)
        {
            return Proibido();
        }

        return await dados.ClienteVinculadoAoEventoAsync(conta, usuarioId, eventoId, ct)
            ? null
            : Indisponivel();
    }

    private static async Task<IResult?> ExigirModuloEEventoAsync(
        ClaimsPrincipal usuario,
        string conta,
        Guid eventoId,
        ModuloCliente modulo,
        IDados dados,
        CancellationToken ct)
    {
        var moduloOk = await ExigirModuloAsync(usuario, conta, modulo, dados, ct);
        if (moduloOk is not null)
        {
            return moduloOk;
        }

        return await ExigirEventoDoClientAsync(usuario, conta, eventoId, dados, ct);
    }

    private static async Task<IResult?> ExigirModuloViaConviteAsync(
        ClaimsPrincipal usuario,
        string conta,
        Guid conviteId,
        ModuloCliente modulo,
        IDados dados,
        ConviteServico servico,
        CancellationToken ct)
    {
        var moduloOk = await ExigirModuloAsync(usuario, conta, modulo, dados, ct);
        if (moduloOk is not null)
        {
            return moduloOk;
        }

        if (!EhClient(usuario))
        {
            return null;
        }

        var convite = await dados.ObterConviteAsync(conta, conviteId, ct);
        if (convite is null)
        {
            return Indisponivel();
        }

        return await ExigirEventoDoClientAsync(usuario, conta, convite.EventoId, dados, ct);
    }

    private static string? Conta(ClaimsPrincipal usuario)
    {
        var organizerId = usuario.FindFirstValue(ContaClaims.OrganizerId);
        if (!string.IsNullOrWhiteSpace(organizerId))
        {
            return organizerId;
        }

        return usuario.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    private static string Email(ClaimsPrincipal usuario) =>
        usuario.FindFirstValue(ClaimTypes.Email) ?? usuario.FindFirstValue("email") ?? "";

    private static DateOnly Hoje() => DateOnly.FromDateTime(DateTime.UtcNow);

    private static T? EnumOuNulo<T>(string? valor)
        where T : struct, Enum =>
        Enum.TryParse<T>(valor, true, out var lido) && Enum.IsDefined(lido) ? lido : null;

    private static string LimparNome(string nome)
    {
        var limpo = Path.GetFileName(nome).Replace("\"", "", StringComparison.Ordinal);
        return string.IsNullOrWhiteSpace(limpo) ? "arquivo" : limpo;
    }
}

public sealed record AssistentesDoEventoPedido(IReadOnlyList<Guid>? Assistentes);

public sealed record TransferPedido(bool Ativo, IReadOnlyList<string>? Locais);

public sealed record VinculoPedido(Guid ClienteId);

public sealed record GrupoPedido(string? Nome);

public sealed record PrincipalPedido(Guid ConvidadoId);

public sealed record RespostasPedido(IReadOnlyList<RespostaRsvp>? Respostas, bool? PretendeRealizarEvento);

public sealed record ImportarTextoPedido(string? Texto);

public sealed record AplicarModeloPedido(Guid ModeloId);

public sealed record SalvarComoModeloPedido(string? Nome);
