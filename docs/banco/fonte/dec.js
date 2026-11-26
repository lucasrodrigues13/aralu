// Decisões de FK aplicadas à proposta. Carregado por build.js.
module.exports = function aplicar(P, col) {
  const FK = (ref, on, why) => ({ a: 'fk', ref, on, why });
  const DEC = {
    'Clientes.FotoId': FK('Arquivos', 'SET NULL', 'Foto opcional: some a foto, fica o cliente.'),
    'Fornecedores.FotoId': FK('Arquivos', 'SET NULL', 'Foto opcional.'),
    'Perfis.FotoId': FK('Arquivos', 'SET NULL', 'Foto opcional.'),
    'Eventos.ImagemId': FK('Arquivos', 'SET NULL', 'Imagem opcional.'),
    'ItemInspiracao.ArquivoId': FK('Arquivos', 'SET NULL', 'Item pode ser só URL.'),
    'ContratosFunil.DocumentoArquivoId': FK('Arquivos', 'RESTRICT', 'Documento de contrato não pode sumir.'),
    'ContratosFunil.LogoArquivoId': FK('Arquivos', 'RESTRICT', 'Arquivo compartilhado com o modelo (SPEC-056).'),
    'ContratosFunil.FundoArquivoId': FK('Arquivos', 'RESTRICT', 'Arquivo compartilhado com o modelo (SPEC-056).'),
    'ContratosConta.LogoArquivoId': FK('Arquivos', 'RESTRICT', 'Usado também pelos contratos gerados.'),
    'ContratosConta.FundoArquivoId': FK('Arquivos', 'RESTRICT', 'Usado também pelos contratos gerados.'),
    'ContratosConta.WordArquivoId': FK('Arquivos', 'RESTRICT', 'Modelo Word não pode sumir.'),
    'ContratosFornecedor.ComprovanteArquivoId': FK('Arquivos', 'RESTRICT', 'Comprovante financeiro.'),
    'ContratosFornecedor.ContratoAssinadoArquivoId': FK('Arquivos', 'RESTRICT', 'Contrato assinado.'),
    'ParcelasContratoFornecedor.ComprovanteArquivoId': FK('Arquivos', 'RESTRICT', 'Comprovante financeiro.'),
    'AnexosTarefa.ArquivoId': FK('Arquivos', 'RESTRICT', 'Anexo obrigatório da linha.'),
    'TarefasFunil.AnexoArquivoId': FK('Arquivos', 'RESTRICT', 'Anexo da tarefa.'),
    'OrcamentoFornecedor.AnexoId': FK('Arquivos', 'RESTRICT', 'Orçamento recebido.'),
    'ContratosFunil.OportunidadeId': FK('Oportunidades', 'CASCADE', 'Sai com a oportunidade (SPEC-032: a dona exclui tudo). Bloquear/arquivar é decisão pendente.'),
    'OrcamentosFunil.OportunidadeId': FK('Oportunidades', 'CASCADE', 'Sai com a oportunidade (SPEC-032: a dona exclui tudo). Bloquear/arquivar é decisão pendente.'),
    'TarefasFunil.OportunidadeId': FK('Oportunidades', 'CASCADE', 'Tarefa sem oportunidade não tem uso.'),
    'LeadsRsvp.OportunidadeId': FK('Oportunidades', 'SET NULL', 'Lead fica como histórico.'),
    'LeadsRsvp.EventoId': FK('Eventos', 'SET NULL', 'Lead fica como histórico.'),
    'LeadsRsvp.ConviteId': FK('Convites', 'SET NULL', 'Lead fica como histórico.'),
    'Oportunidades.ClienteId': FK('Clientes', 'SET NULL', 'Oportunidade continua sem o cliente.'),
    'Oportunidades.ModeloServicoFunilId': FK('ModelosServicoFunil', 'SET NULL', 'Modelo é só a origem.'),
    'OrcamentosFunil.ModeloId': FK('ModelosOrcamentoFunil', 'SET NULL', 'Proposta guarda cópia do modelo.'),
    'ContratosFunil.ModeloId': FK('ContratosConta', 'SET NULL', 'Contrato guarda cópia do modelo.'),
    'BriefingsOportunidade.ModeloBriefingId': FK('ModelosBriefing', 'SET NULL', 'Briefing guarda cópia do modelo.'),
    'ServicoEvento.ServicoContaId': FK('ServicosConta', 'SET NULL', 'Serviço do evento continua.'),
    'ServicoModelo.ServicoContaId': FK('ServicosConta', 'SET NULL', 'Serviço do modelo continua.'),
    'FornecedorNoServico.FornecedorId': FK('Fornecedores', 'RESTRICT', 'Fornecedor com contrato não pode ser apagado.'),
    'Convites.PrincipalId': { a: 'manter', why: 'Aponta para um convidado do próprio convite, que aponta de volta: FK nos dois sentidos impede gravar convite e convidados juntos. Convidados saem em cascata com o convite.' },
    'PresencasEvento.EventoId': FK('Eventos', 'CASCADE', 'Cópia para busca; a FK mantém coerente.'),
    'PresencasEvento.ConviteId': FK('Convites', 'CASCADE', 'Cópia para busca; a FK mantém coerente.'),
    'Tarefas.ResponsavelContaId': { a: 'trocar', novo: 'ResponsavelMembroId', ref: 'MembrosConta', on: 'SET NULL', why: 'Responsável é membro da conta, não um login.' },
    'ComentariosTarefa.AutorContaId': { a: 'trocar', novo: 'AutorMembroId', ref: 'MembrosConta', on: 'SET NULL', why: 'Autor é membro da conta; o comentário fica se ele sair.' },
    'Clientes.UsuarioId': { a: 'remover', why: 'Login de cliente saiu na SPEC-060; nenhum código usa.' },
    'ServicoEvento.FornecedorContaId': { a: 'remover', why: 'Só existe na entidade; nenhum serviço ou tela usa.' },
    'ResponsaveisTarefa.ReferenciaId': { a: 'dividir', why: 'Um campo para três tipos vira três colunas com FK e uma regra CHECK de exatamente uma preenchida.' },
    'ResponsaveisTarefaFunil.ReferenciaId': { a: 'dividir', why: 'Três colunas com FK e CHECK.' },
    'ItensChecklistTarefa.ResponsavelReferenciaId': { a: 'dividir', why: 'Três colunas com FK e CHECK.' },
    'VinculoModeloEvento.BibliotecaId': { a: 'manter', why: 'Aponta para 5 tipos de modelo. Fica sem FK de propósito; o código apaga os vínculos ao apagar um modelo.' },
  };
  const decCol = {}, removidas = {};
  for (const [k, d] of Object.entries(DEC)) {
    const [tn, cn] = k.split('.'); const t = P[tn]; if (!t) continue;
    const i = t.cols.findIndex(c => c.n === cn); if (i < 0) continue;
    const on = d.on ? ' (on delete ' + d.on.toLowerCase() + ')' : '';
    if (d.a === 'fk') { t.fks.push({ col: cn, ref: d.ref, on: d.on }); decCol[k] = 'FK nova → ' + d.ref + on + '. ' + d.why; }
    else if (d.a === 'trocar') { t.cols.splice(i, 1, col(d.novo, 'uuid', false)); t.fks.push({ col: d.novo, ref: d.ref, on: d.on }); decCol[tn + '.' + d.novo] = 'Substitui ' + cn + ' (text sem FK). FK → ' + d.ref + on + '. ' + d.why; }
    else if (d.a === 'remover') { t.cols.splice(i, 1); removidas[k] = d.why; }
    else if (d.a === 'dividir') {
      const pre = cn === 'ReferenciaId' ? '' : 'Responsavel';
      const nc = [pre + 'MembroId', pre + 'FornecedorId', pre + 'ClienteId'];
      t.cols.splice(i, 1, ...nc.map(n => col(n, 'uuid', false)));
      t.fks.push({ col: nc[0], ref: 'MembrosConta', on: 'CASCADE' }, { col: nc[1], ref: 'Fornecedores', on: 'CASCADE' }, { col: nc[2], ref: 'Clientes', on: 'CASCADE' });
      nc.forEach(n => { decCol[tn + '.' + n] = 'Substitui ' + cn + ' (polimórfica). ' + d.why; });
    }
    else if (d.a === 'manter') decCol[k] = 'Mantida sem FK. ' + d.why;
  }
  return { decCol, removidas };
};
