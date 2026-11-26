using Project.Domain.Clientes;
using Project.Domain.Convidados;
using Project.Domain.Dinheiro;
using Project.Domain.Eventos;
using Project.Domain.Fornecedores;
using Project.Domain.Funil;
using Project.Domain.Modelos;
using Project.Domain.Perfil;
using Project.Domain.Tarefas;

namespace Project.Application.Negocio;

public sealed record FiltroEventos(
    SituacaoEvento? Situacao,
    string? Nome,
    TipoEvento? Tipo,
    DateOnly? De,
    DateOnly? Ate,
    string? Tag);

public sealed record FiltroConvites(
    string? Nome,
    SituacaoConvidado? Situacao,
    string? Telefone,
    string? Observacao,
    bool SomenteConfirmados);

public sealed record EventoLinha(
    Guid Id,
    string Nome,
    SituacaoEvento Situacao,
    TipoEvento Tipo,
    DateOnly? Data,
    IReadOnlyList<string> Tags,
    int TarefasConcluidas,
    int Tarefas,
    int ConvidadosConfirmados,
    int Convidados);

public sealed record ContagemSituacao(SituacaoEvento Situacao, int Quantidade);

public sealed record EventoAndamento(Guid Id, string Nome, DateOnly? Data);

public sealed record ContagemMes(int Mes, int Quantidade);

public sealed record ContagemNome(string Nome, int Quantidade);

public sealed record ParticipacaoNome(string Nome, decimal Valor);

public sealed record ContagemOportunidadeEstagio(Guid EstagioFunilId, int Quantidade, decimal Valor);

/// <summary>Contato de um lead (Tipo "oportunidade") ou de um cliente (Tipo "cliente") da conta.</summary>
public sealed record ContatoNaConta(string Tipo, Guid Id, string Nome, string? Estagio, IReadOnlyList<string?> Telefones, string? Email);

public interface IDados
{
    Task<PerfilAssessoria?> ObterPerfilAsync(Guid contaId, CancellationToken ct);

    Task SalvarPerfilAsync(PerfilAssessoria perfil, CancellationToken ct);

    Task<IReadOnlyList<ModeloEvento>> ListarModelosAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<ModeloEvento?> ObterModeloAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirModeloAsync(ModeloEvento modelo, CancellationToken ct);

    Task AtualizarModeloAsync(CancellationToken ct);

    Task AcrescentarTarefasModeloAsync(IReadOnlyList<TarefaModelo> tarefas, CancellationToken ct);

    Task RemoverModeloAsync(ModeloEvento modelo, CancellationToken ct);

    Task<IReadOnlyList<EventoLinha>> ListarEventosAsync(Guid contaId, FiltroEventos filtro, CancellationToken ct);

    Task<Evento?> ObterEventoAsync(Guid contaId, Guid id, CancellationToken ct);

    Task<bool> EventoDaContaAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirEventoAsync(
        Evento evento,
        IReadOnlyList<Tarefa> tarefas,
        CompromissoAgenda? agenda,
        Cliente? clienteNovo,
        CancellationToken ct);

    Task SalvarEventoAsync(CancellationToken ct);

    Task SubstituirTagsAsync(Evento evento, IReadOnlyList<string> nomes, CancellationToken ct);

    Task SincronizarAgendaAsync(Evento evento, CancellationToken ct);

    Task AdicionarServicoAsync(ServicoEvento servico, CancellationToken ct);

    Task<ServicoEvento?> ObterServicoEventoAsync(Guid contaId, Guid eventoId, Guid servicoId, CancellationToken ct);

    Task RemoverConteudoModeloAsync(ModeloEvento modelo, CancellationToken ct);

    Task GravarModeloAtualizadoAsync(ModeloEvento modelo, CancellationToken ct);

    Task InserirFornecedorNoServicoAsync(FornecedorNoServico vinculo, CancellationToken ct);

    Task SubstituirSubitensAsync(Guid servicoId, IReadOnlyList<SubitemServico> subitens, decimal? valorEstimado, CancellationToken ct);

    /// <summary>Cria o contrato do fornecedor (vínculo), sem parcelas, se ainda não existe. Nunca troca um existente (SPEC-045 §6.3).</summary>
    Task GarantirContratoFornecedorAsync(Guid servicoId, Guid vinculoId, CancellationToken ct);

    /// <summary>Guarda (ou limpa, com arquivo nulo) o contrato assinado do contrato do fornecedor (vínculo).</summary>
    Task GravarContratoAssinadoAsync(Guid vinculoId, Guid? arquivoId, string? nome, string? tipoConteudo, string? enviadoPor, DateOnly? enviadoEm, CancellationToken ct);

    Task AtualizarEtapaNegociacaoAsync(Guid vinculoId, EtapaNegociacao etapa, decimal? valorOrcamento, CancellationToken ct);

    /// <summary>Refaz "contratado" e o valor contratado do serviço a partir dos fornecedores contratados (soma dos valores).</summary>
    Task RecalcularContratadoAsync(Guid servicoId, CancellationToken ct);

    /// <summary>Tira o fornecedor do serviço; o contrato dele (e parcelas) vai junto.</summary>
    Task RemoverFornecedorDoServicoAsync(Guid vinculoId, CancellationToken ct);

    /// <summary>Tira o serviço do evento com fornecedores, contratos e subitens; tarefas ligadas ficam sem serviço.</summary>
    Task RemoverServicoAsync(Guid servicoId, CancellationToken ct);

    Task<IReadOnlyList<Tarefa>> ListarTarefasAsync(Guid contaId, Guid? eventoId, CancellationToken ct);

    Task<Tarefa?> ObterTarefaAsync(Guid contaId, Guid id, CancellationToken ct);

    Task<IReadOnlyDictionary<Guid, ContextoEvento>> ContextosEventoAsync(Guid contaId, IReadOnlyCollection<Guid> eventoIds, CancellationToken ct);

    Task<IReadOnlyDictionary<Guid, string>> NomesDeServicosAsync(Guid contaId, IReadOnlyCollection<Guid> servicoIds, CancellationToken ct);

    Task ConcluirTarefasLigadasAsync(Guid contaId, Guid servicoId, CancellationToken ct);

    /// <summary>Assistentes ativas da conta (SPEC-032): podem ser responsáveis de tarefas.</summary>
    Task<IReadOnlyList<Guid>> IdsAssistentesAtivasAsync(Guid contaId, CancellationToken ct);

    Task SubstituirResponsaveisTarefaFunilAsync(Guid tarefaId, IReadOnlyList<ResponsavelTarefaFunil> responsaveis, CancellationToken ct);

    Task SubstituirResponsaveisAsync(Guid tarefaId, IReadOnlyList<ResponsavelTarefa> responsaveis, CancellationToken ct);

    Task SubstituirChecklistAsync(Guid tarefaId, IReadOnlyList<ItemChecklistTarefa> itens, CancellationToken ct);

    Task<bool> MarcarItemChecklistAsync(Guid tarefaId, Guid itemId, bool feito, bool cancelado, CancellationToken ct);

    /// <summary>Referências (assistentes) já gravadas nos itens da checklist da tarefa.</summary>
    Task<IReadOnlyList<string>> ReferenciasDosItensAsync(Guid tarefaId, CancellationToken ct);

    /// <summary>Move o prazo dos itens abertos das tarefas não concluídas do evento (SPEC-012 §6.6).</summary>
    Task MoverPrazosDosItensAsync(Guid contaId, Guid eventoId, int dias, CancellationToken ct);

    /// <summary>Recalcula o prazo efetivo das tarefas e itens com prazo relativo depois que a data do evento mudou.</summary>
    Task RecalcularPrazosRelativosAsync(Guid contaId, Guid eventoId, DateOnly? dataEvento, CancellationToken ct);

    Task InserirAnexoTarefaAsync(AnexoTarefa anexo, CancellationToken ct);

    /// <summary>Remove o anexo da tarefa e devolve o arquivo dele, ou null se não existir.</summary>
    Task<Guid?> RemoverAnexoTarefaAsync(Guid tarefaId, Guid anexoId, CancellationToken ct);

    Task InserirComentarioAsync(ComentarioTarefa comentario, CancellationToken ct);

    Task InserirTarefaAsync(Tarefa tarefa, CancellationToken ct);

    Task SalvarTarefaAsync(CancellationToken ct);

    /// <summary>Acrescenta tarefas e serviços do evento num único SaveChanges (SPEC-012).</summary>
    Task AcrescentarTarefasEServicosAsync(
        IReadOnlyList<Tarefa> tarefas,
        IReadOnlyList<ServicoEvento> servicos,
        CancellationToken ct);

    Task<string?> NomeDoEventoAsync(Guid contaId, Guid eventoId, CancellationToken ct);

    Task<IReadOnlyList<Cliente>> ListarClientesAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<Cliente?> ObterClienteAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirClienteAsync(Cliente cliente, CancellationToken ct);

    Task SalvarClienteAsync(CancellationToken ct);

    /// <summary>Apaga o cliente e solta dele as oportunidades que viraram cliente (elas continuam existindo).</summary>
    Task RemoverClienteAsync(Guid contaId, Cliente cliente, CancellationToken ct);

    Task<IReadOnlyList<(Guid Id, string Nome)>> EventosDoClienteAsync(Guid contaId, Guid clienteId, CancellationToken ct);

    Task<IReadOnlyList<Cliente>> ClientesDoEventoAsync(Guid contaId, Guid eventoId, CancellationToken ct);

    Task<bool> VincularAsync(Guid contaId, Guid clienteId, Guid eventoId, CancellationToken ct);

    Task<bool> DesvincularAsync(Guid contaId, Guid clienteId, Guid eventoId, CancellationToken ct);

    Task<IReadOnlyList<Convite>> ListarConvitesAsync(Guid contaId, Guid eventoId, CancellationToken ct);

    Task<Convite?> ObterConviteAsync(Guid contaId, Guid id, CancellationToken ct);

    Task<Convite?> ObterConvitePorTokenAsync(string token, CancellationToken ct);

    Task<bool> EventoEmAndamentoAsync(Guid eventoId, CancellationToken ct);

    Task<DateOnly?> PrazoRsvpDoEventoAsync(Guid eventoId, CancellationToken ct);

    Task<IReadOnlyList<PresencaLeitura>> ListarPresencasAsync(Guid contaId, Guid eventoId, CancellationToken ct);

    Task InserirConvitesAsync(IReadOnlyList<Convite> convites, CancellationToken ct);

    Task SalvarConvitesAsync(CancellationToken ct);

    Task RemoverConvidadoAsync(Convidado convidado, CancellationToken ct);

    /// <summary>Marca um convidado novo de um convite já existente para inclusão (SPEC-059).</summary>
    Task IncluirConvidadoAsync(Convidado convidado, CancellationToken ct);

    Task<Convidado?> ObterConvidadoAsync(Guid contaId, Guid id, CancellationToken ct);

    Task<IReadOnlyList<ContagemSituacao>> ContarEventosAsync(Guid contaId, CancellationToken ct, IReadOnlySet<Guid>? liberados = null);

    Task<IReadOnlyList<EventoAndamento>> ListarEmAndamentoAsync(Guid contaId, CancellationToken ct);

    Task<SituacaoEvento?> SituacaoDoEventoAsync(Guid contaId, Guid eventoId, CancellationToken ct);

    Task<DateOnly?> DataDoEventoAsync(Guid contaId, Guid eventoId, CancellationToken ct);

    Task<IReadOnlyList<ContagemMes>> ContarEventosPorMesAsync(Guid contaId, int ano, CancellationToken ct, IReadOnlySet<Guid>? liberados = null);

    Task<IReadOnlyList<ParticipacaoNome>> ParticipacaoOrcamentoConcluidosAsync(Guid contaId, CancellationToken ct, IReadOnlySet<Guid>? liberados = null);

    Task<IReadOnlyList<ContagemNome>> ContarFornecedoresContratadosAsync(Guid contaId, CancellationToken ct, IReadOnlySet<Guid>? liberados = null);

    Task<IReadOnlyList<ContagemNome>> ContarServicosUtilizadosAsync(Guid contaId, CancellationToken ct, IReadOnlySet<Guid>? liberados = null);

    Task<int> ContarTarefasNaSemanaAsync(Guid contaId, DateOnly inicio, DateOnly fim, CancellationToken ct, IReadOnlySet<Guid>? liberados = null);

    Task<IReadOnlyList<ModeloBriefing>> ListarBriefingsAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<ModeloBriefing?> ObterBriefingAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirBriefingAsync(ModeloBriefing modelo, CancellationToken ct);

    Task SalvarBriefingAsync(CancellationToken ct);

    Task RemoverBriefingAsync(ModeloBriefing modelo, CancellationToken ct);

    Task<IReadOnlyList<ModeloRoteiro>> ListarRoteirosAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<ModeloRoteiro?> ObterRoteiroAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirRoteiroAsync(ModeloRoteiro modelo, CancellationToken ct);

    Task SalvarRoteiroAsync(CancellationToken ct);

    Task RemoverRoteiroAsync(ModeloRoteiro modelo, CancellationToken ct);

    Task<IReadOnlyList<ModeloCronograma>> ListarCronogramasAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<ModeloCronograma?> ObterCronogramaAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirCronogramaAsync(ModeloCronograma modelo, CancellationToken ct);

    Task SalvarCronogramaAsync(CancellationToken ct);

    Task RemoverCronogramaAsync(ModeloCronograma modelo, CancellationToken ct);

    Task<IReadOnlyList<ModeloInspiracao>> ListarInspiracoesAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<ModeloInspiracao?> ObterInspiracaoAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirInspiracaoAsync(ModeloInspiracao modelo, CancellationToken ct);

    Task SalvarInspiracaoAsync(CancellationToken ct);

    Task RemoverInspiracaoAsync(ModeloInspiracao modelo, CancellationToken ct);

    Task<IReadOnlyList<ModeloMensagem>> ListarMensagensAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<ModeloMensagem?> ObterMensagemAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirMensagemAsync(ModeloMensagem modelo, CancellationToken ct);

    Task SalvarMensagemAsync(CancellationToken ct);

    Task RemoverMensagemAsync(ModeloMensagem modelo, CancellationToken ct);

    Task<IReadOnlyList<ServicoConta>> ListarServicosContaAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<ServicoConta?> ObterServicoContaAsync(Guid contaId, Guid id, CancellationToken ct);

    Task<ServicoConta?> ObterServicoContaPorNomeAsync(Guid contaId, string nome, CancellationToken ct);

    Task InserirServicoContaAsync(ServicoConta servico, CancellationToken ct);

    Task RemoverServicoContaAsync(ServicoConta servico, CancellationToken ct);

    Task<IReadOnlyList<Fornecedor>> ListarFornecedoresAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<Fornecedor?> ObterFornecedorAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirFornecedorAsync(Fornecedor fornecedor, CancellationToken ct);

    Task SalvarFornecedorAsync(CancellationToken ct);

    Task RemoverFornecedorAsync(Fornecedor fornecedor, CancellationToken ct);

    Task<IReadOnlyDictionary<Guid, string>> NomesServicosContaAsync(Guid contaId, IEnumerable<Guid> ids, CancellationToken ct);

    Task<IReadOnlyDictionary<Guid, string>> NomesFornecedoresAsync(Guid contaId, IEnumerable<Guid> ids, CancellationToken ct);

    Task SalvarNegocioAsync(CancellationToken ct);

    Task<IReadOnlyList<CompromissoAgenda>> ListarCompromissosAsync(
        Guid contaId,
        DateOnly? de,
        DateOnly? ate,
        CancellationToken ct);

    Task<CompromissoAgenda?> ObterCompromissoAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirCompromissoAsync(CompromissoAgenda compromisso, CancellationToken ct);

    Task RemoverCompromissoAsync(CompromissoAgenda compromisso, CancellationToken ct);

    Task<bool> TemCompromissoNaDataAsync(Guid contaId, DateOnly data, CancellationToken ct);

    /// <summary>Tarefas de evento e do funil com prazo no período, para o calendário.</summary>
    Task<IReadOnlyList<TarefaNaAgenda>> ListarTarefasDaAgendaAsync(Guid contaId, DateOnly? de, DateOnly? ate, CancellationToken ct);

    Task<IReadOnlyList<Oportunidade>> ListarOportunidadesAsync(
        Guid contaId,
        FiltroOportunidades filtro,
        CancellationToken ct);

    Task<Oportunidade?> ObterOportunidadeAsync(Guid contaId, Guid id, CancellationToken ct);

    /// <summary>Estágios da conta (rastreados), já com os padrões criados se a conta não tinha nenhum.</summary>
    Task<List<EstagioFunil>> ListarEstagiosFunilAsync(Guid contaId, CancellationToken ct);

    /// <summary>Telefones e e-mails dos leads e clientes da conta, para o aviso de contato repetido.</summary>
    Task<IReadOnlyList<ContatoNaConta>> ListarContatosDaContaAsync(Guid contaId, CancellationToken ct);

    /// <summary>
    /// Nome de quem pode ser responsável, por id: a dona (id da conta) e todas as assistentes da conta,
    /// inclusive removidas. Usado nos relatórios e no CSV, que guardam o id e mostram o nome.
    /// </summary>
    Task<IReadOnlyDictionary<string, string>> NomesResponsaveisAsync(Guid contaId, CancellationToken ct);

    /// <summary>
    /// Marca o contato como novo. Sem isso o EF, ao ver um Id já preenchido numa coleção rastreada,
    /// tenta um UPDATE e falha com DbUpdateConcurrencyException.
    /// </summary>
    void AdicionarContatoOportunidade(ContatoOportunidade contato);

    void AdicionarEstagioFunil(EstagioFunil estagio);

    void RemoverEstagioFunil(EstagioFunil estagio);

    /// <summary>Oportunidades (rastreadas) de um estágio, para mover antes de excluí-lo.</summary>
    Task<List<Oportunidade>> ListarOportunidadesDoEstagioAsync(Guid contaId, Guid estagioId, CancellationToken ct);

    Task InserirOportunidadeAsync(Oportunidade oportunidade, CancellationToken ct);

    Task RemoverOportunidadeAsync(Oportunidade oportunidade, CancellationToken ct);

    Task<IReadOnlyList<ContagemOportunidadeEstagio>> ContarOportunidadesPorEstagioAsync(
        Guid contaId,
        CancellationToken ct);

    Task<IReadOnlyDictionary<Guid, string>> NomesOportunidadesAsync(
        Guid contaId,
        IEnumerable<Guid> ids,
        CancellationToken ct);

    Task<IReadOnlyList<Oportunidade>> ListarOportunidadesPorCriacaoAsync(
        Guid contaId,
        DateTimeOffset inicio,
        DateTimeOffset fim,
        CancellationToken ct);

    Task<IReadOnlyList<Oportunidade>> ListarOportunidadesPorEntradaEstagioAsync(
        Guid contaId,
        DateTimeOffset inicio,
        DateTimeOffset fim,
        CancellationToken ct);

    Task<IReadOnlyList<LeadRsvp>> ListarLeadsRsvpAtivosAsync(Guid contaId, string? busca, CancellationToken ct);

    Task<LeadRsvp?> ObterLeadRsvpAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirLeadRsvpAsync(LeadRsvp lead, CancellationToken ct);

    Task<IReadOnlyList<LeadRsvp>> ListarLeadsRsvpPeriodoAsync(
        Guid contaId,
        DateTimeOffset inicio,
        DateTimeOffset fim,
        CancellationToken ct);

    Task<int> ContarLeadsRsvpConvertidosAntesAsync(Guid contaId, DateTimeOffset limite, CancellationToken ct);

    Task<MetricasRsvpFunil?> ObterMetricasRsvpFunilAsync(Guid contaId, CancellationToken ct);

    Task IncrementarVisualizacaoRsvpAsync(Guid contaId, CancellationToken ct);

    Task IncrementarCliqueRsvpAsync(Guid contaId, CancellationToken ct);

    Task<IReadOnlyList<ContratoFunil>> ListarContratosFunilAsync(
        Guid contaId,
        SituacaoContratoFunil? situacao,
        string? busca,
        DateOnly? criadoDe,
        DateOnly? criadoAte,
        CancellationToken ct);

    Task<ContratoFunil?> ObterContratoFunilAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirContratoFunilAsync(ContratoFunil contrato, CancellationToken ct);

    Task RemoverContratoFunilAsync(ContratoFunil contrato, CancellationToken ct);

    Task<IReadOnlyList<OrcamentoFunil>> ListarOrcamentosFunilAsync(
        Guid contaId,
        SituacaoOrcamentoFunil? situacao,
        string? busca,
        DateOnly? criadoDe,
        DateOnly? criadoAte,
        CancellationToken ct);

    Task<OrcamentoFunil?> ObterOrcamentoFunilAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirOrcamentoFunilAsync(OrcamentoFunil orcamento, CancellationToken ct);

    Task RemoverOrcamentoFunilAsync(OrcamentoFunil orcamento, CancellationToken ct);

    /// <summary>Orçamento aceito pelo lead (resposta Aceitar), o mais recente, com as parcelas; base do contrato (SPEC-040).</summary>
    Task<OrcamentoFunil?> OrcamentoAprovadoDaOportunidadeAsync(Guid contaId, Guid oportunidadeId, CancellationToken ct);

    /// <summary>Troca as parcelas do contrato com o cliente (só sem recebimentos; SPEC-041).</summary>
    Task SubstituirParcelasContratoAsync(Guid contratoId, IReadOnlyList<ParcelaContrato> parcelas, CancellationToken ct);

    Task SubstituirParcelasOrcamentoAsync(Guid orcamentoId, IReadOnlyList<ParcelaOrcamento> parcelas, CancellationToken ct);

    /// <summary>Só adiciona ao contexto; grava no próximo <c>SalvarNegocioAsync</c>.</summary>
    void AdicionarRecebimentoParcela(RecebimentoParcela recebimento);

    void RemoverRecebimentoParcela(RecebimentoParcela recebimento);

    /// <summary>Proposta por link, sem conta: busca pelo token (SPEC-031 §6.6).</summary>
    Task<OrcamentoFunil?> OrcamentoFunilPorTokenAsync(string token, CancellationToken ct);

    /// <summary>Só adiciona; grava junto com o próximo <c>SalvarNegocioAsync</c>.</summary>
    void AdicionarRespostaProposta(RespostaPropostaFunil resposta);

    Task<IReadOnlyList<RespostaPropostaFunil>> RespostasPropostaAsync(Guid contaId, Guid orcamentoId, CancellationToken ct);

    /// <summary>Proposta mais recente enviada por link de cada oportunidade, sem as canceladas.</summary>
    Task<IReadOnlyDictionary<Guid, OrcamentoFunil>> PropostasDasOportunidadesAsync(
        Guid contaId,
        IEnumerable<Guid> oportunidadeIds,
        CancellationToken ct);

    Task<IReadOnlyList<TarefaFunil>> ListarTarefasFunilAsync(
        Guid contaId,
        DateOnly? prazoDe,
        DateOnly? prazoAte,
        TipoTarefaFunil? tipo,
        string? responsavel,
        bool? completa,
        CancellationToken ct);

    Task<TarefaFunil?> ObterTarefaFunilAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirTarefaFunilAsync(TarefaFunil tarefa, CancellationToken ct);

    Task RemoverTarefaFunilAsync(TarefaFunil tarefa, CancellationToken ct);

    Task<IReadOnlyList<ModeloServicoFunil>> ListarModelosServicoFunilAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<ModeloServicoFunil?> ObterModeloServicoFunilAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirModeloServicoFunilAsync(ModeloServicoFunil modelo, CancellationToken ct);

    Task RemoverModeloServicoFunilAsync(ModeloServicoFunil modelo, CancellationToken ct);

    Task<IReadOnlyList<ModeloOrcamentoFunil>> ListarModelosOrcamentoFunilAsync(Guid contaId, string? nome, CancellationToken ct);

    Task<ModeloOrcamentoFunil?> ObterModeloOrcamentoFunilAsync(Guid contaId, Guid id, CancellationToken ct);

    Task InserirModeloOrcamentoFunilAsync(ModeloOrcamentoFunil modelo, CancellationToken ct);

    Task RemoverModeloOrcamentoFunilAsync(ModeloOrcamentoFunil modelo, CancellationToken ct);

    Task<(Guid ContaId, string Nome)?> ResumoEventoPorIdAsync(Guid eventoId, CancellationToken ct);
}
