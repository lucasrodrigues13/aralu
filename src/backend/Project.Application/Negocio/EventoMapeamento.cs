using Project.Domain.Eventos;
using Project.Domain.Tarefas;

namespace Project.Application.Negocio;

public static class EventoMapeamento
{
    public static async Task<EventoDetalhe> DetalheAsync(
        IDados dados,
        Guid contaId,
        Evento evento,
        DateOnly hoje,
        CancellationToken ct)
    {
        var tarefas = await dados.ListarTarefasAsync(contaId, evento.Id, ct);
        var convites = await dados.ListarConvitesAsync(contaId, evento.Id, ct);
        var convidados = convites.SelectMany(convite => convite.Convidados).ToArray();
        var nomesFornecedores = await dados.NomesFornecedoresAsync(
            contaId,
            evento.Servicos.SelectMany(servico => servico.Fornecedores.Select(item => item.FornecedorId)),
            ct);

        return new EventoDetalhe(
            evento.Id,
            evento.Nome,
            evento.PrimeiroNome,
            evento.SegundoNome,
            evento.Tipo,
            evento.Situacao,
            evento.Data,
            evento.Hora,
            Dias(evento.Data, hoje),
            evento.OrcamentoEstimado,
            evento.ConvidadosEstimados,
            evento.TempoFesta,
            evento.InicioCerimonia,
            evento.InicioRecepcao,
            evento.QuantidadePadrinhos,
            evento.QuantidadeDamas,
            null,
            evento.NotificarAssessor,
            evento.NotificarAssistentes,
            evento.NotificarClientes,
            evento.SalvarNaAgenda,
            null,
            evento.ImagemId,
            LerLocal(evento.Cerimonia ?? new LocalEvento()),
            LerLocal(evento.Recepcao ?? new LocalEvento()),
            evento.Tags.Select(tag => tag.Nome).ToArray(),
            evento.Servicos
                .OrderBy(servico => servico.Ordem)
                .Select(servico => new ServicoLeitura(
                    servico.Id,
                    servico.Nome,
                    servico.Contratado,
                    servico.ValorEstimado,
                    servico.ValorContratado,
                    servico.OcultoParaClient,
                    servico.Ordem,
                    servico.ServicoContaId,
                    servico.ContratosAtivos.SelectMany(contrato => contrato.Parcelas)
                        .OrderBy(parcela => parcela.Vencimento).ThenBy(parcela => parcela.Numero)
                        .Select(parcela => new ParcelaLeitura(
                            parcela.Numero,
                            parcela.Vencimento,
                            parcela.Valor,
                            parcela.Entrada,
                            parcela.Situacao))
                        .ToArray(),
                    servico.Subitens.Select(item => new SubitemLeitura(
                        item.Id,
                        item.Descricao,
                        item.Quantidade,
                        item.ValorUnitario,
                        item.Quantidade * item.ValorUnitario)).ToArray(),
                    servico.Fornecedores.Select(item =>
                    {
                        var contrato = servico.Contratos.FirstOrDefault(c => c.VinculoId == item.Id);
                        return new FornecedorNoServicoLeitura(
                            item.Id,
                            item.FornecedorId,
                            nomesFornecedores.GetValueOrDefault(item.FornecedorId, ""),
                            item.Etapa,
                            item.ValorOrcamento,
                            item.Observacoes,
                            contrato is { ContratoAssinadoArquivoId: Guid arquivoId }
                                ? new ComprovantePagamentoLeitura(
                                    arquivoId,
                                    contrato.ContratoAssinadoNome ?? "contrato",
                                    contrato.ContratoAssinadoTipoConteudo ?? "application/octet-stream")
                                : null,
                            contrato?.ContratoAssinadoEnviadoPor,
                            contrato?.ContratoAssinadoEnviadoEm,
                            contrato?.TemPagamento ?? false);
                    }).ToArray()))
                .ToArray(),
            tarefas.Count(tarefa => tarefa.Situacao == SituacaoTarefa.Concluida),
            tarefas.Count,
            convidados.Count(item => item.Situacao == Domain.Convidados.SituacaoConvidado.Confirmado),
            convidados.Count(item => item.Situacao == Domain.Convidados.SituacaoConvidado.Pendente),
            convidados.Count(item => item.Situacao == Domain.Convidados.SituacaoConvidado.NaoComparecera),
            convidados.Length);
    }

    public static LocalLeitura LerLocal(LocalEvento local) => new(
        local.Nome, local.Pais, local.Cep, local.Endereco, local.Numero, local.Estado, local.Cidade, local.Bairro);

    public static int? Dias(DateOnly? data, DateOnly hoje) =>
        data is null ? null : data.Value.DayNumber - hoje.DayNumber;
}
