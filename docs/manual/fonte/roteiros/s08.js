module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  const M = 'main';
  await H.go(p, '/modelos-evento');
  await H.click(p, 'Casamento completo', M);
  await H.wait(p, 1000);
  await H.click(p, 'Adicionar serviços', M);
  for (const s of ['Buffet', 'Decoração', 'Fotografia', 'Música e DJ', 'Bolo e doces']) await H.click(p, s, D);
  await H.dlg(p, '13a-modelo-evento-servicos');
  await H.click(p, 'Adicionar', D);
  await H.wait(p, 800);
  // estimativas no checklist
  const est = ['600000', '4500000', '2200000', '1000000', '500000'];
  for (let i = 0; i < est.length; i++) await H.fill(p, 'Valor estimado', est[i], M, i);
  await H.shot(p, '13b-modelo-evento-checklist');
  await H.click(p, 'Tarefas', M);
  const tarefas = [
    ['Fechar buffet', 'Fornecedores', '10', 'meses antes'],
    ['Degustação do buffet', 'Fornecedores', '6', 'meses antes'],
    ['Enviar convites', 'Convidados', '3', 'meses antes'],
    ['Prova final do vestido', 'Noiva', '2', 'semanas antes'],
    ['Reunião de alinhamento final', 'Planejamento', '7', 'dias antes'],
  ];
  for (let i = 0; i < tarefas.length; i++) {
    const [t, g, q, u] = tarefas[i];
    await H.click(p, 'Adicionar tarefa', M);
    await H.fill(p, 'Título', t, M, i);
    await H.fill(p, 'Grupo', g, M, i);
    await H.select(p, 'Prazo', u, M, i);
    await H.fill(p, 'Prazo', q, M, i);
  }
  await H.shot(p, '13c-modelo-evento-tarefas', true);
  await H.click(p, 'Salvar', M);
  await H.wait(p, 1200);
  await H.click(p, 'Colar tarefas', M);
  await H.fill(p, 'Lista de tarefas', 'Confirmar horários com fornecedores\nMontar mapa de mesas', D);
  await H.click(p, 'Prévia', D);
  await H.wait(p, 1000);
  await H.dlg(p, '13d-colar-tarefas');
  await H.dump(p, D);
  await H.click(p, 'Importar', D);
  await H.wait(p, 1200);
  for (const [aba, btn, item] of [['Briefings', 'Adicionar briefings', 'Primeira conversa'], ['Roteiros', 'Adicionar roteiros', 'Roteiro da cerimônia'], ['Inspirações', 'Adicionar inspirações', 'Casamento clássico no jardim'], ['RSVP e Mensagens', 'Adicionar mensagens', 'Convite para confirmar presença']]) {
    await H.click(p, aba, M);
    await H.click(p, btn, M);
    await H.click(p, item, D);
    await H.click(p, 'Adicionar', D);
    await H.wait(p, 600);
  }
  await H.click(p, 'Salvar', M);
  await H.wait(p, 1200);
  await H.click(p, 'Tarefas', M);
  await H.dump(p, M);
};
