module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/fornecedores');
  await H.click(p, 'Serviços da conta', 'main');
  await H.click(p, 'Adicionar serviço', 'main');
  await (await p.$(D + ' input[type=checkbox]')).click();
  await H.wait(p, 400);
  await H.fill(p, 'Nomes', 'Buffet, Fotografia, Decoração, Música e DJ, Bolo e doces, Vestido da noiva', D);
  await H.dlg(p, '08a-servicos-conta-form');
  await H.click(p, 'Criar', D);
  await H.wait(p, 1200);
  await H.shot(p, '08b-servicos-conta-lista');
  // Roteiro
  await H.go(p, '/modelos-roteiro');
  await H.click(p, 'Novo Modelo de Roteiro', 'main');
  await H.fill(p, 'Nome', 'Roteiro da cerimônia', D);
  await H.click(p, 'Adicionar seção', D);
  await H.fill(p, 'Título', 'Entrada do cortejo', D);
  await H.fill(p, 'Horário', '1630', D);
  await H.fill(p, 'Música', 'Canon em Ré - Pachelbel', D);
  await H.click(p, 'Adicionar seção', D);
  await H.fill(p, 'Título', 'Entrada da noiva', D, 1);
  await H.fill(p, 'Horário', '1640', D, 1);
  await H.fill(p, 'Música', 'A Thousand Years - versão instrumental', D, 1);
  await H.dump(p, D);
  await H.dlg(p, '10a-roteiro-modelo');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 900);
  // Cronograma
  await H.go(p, '/modelos-cronograma');
  await H.click(p, 'Novo Modelo de Cronograma', 'main');
  await H.fill(p, 'Título', 'Cronograma do grande dia', D);
  await H.fill(p, 'Descrição', 'Horários de montagem e do evento para equipe e fornecedores.', D);
  const itens = [['Chegada da decoração', '0900', 'Equipe Flor de Lis', 'Montagem liberada a partir das 9h'], ['Making of da noiva', '1300', 'Foto Luz', 'Hotel Jardins, suíte 1203'], ['Cerimônia', '1630', 'Helena', 'Celebrante chega às 16h']];
  for (let i = 0; i < itens.length; i++) {
    await H.click(p, 'Adicionar item', D);
    await H.fill(p, 'Rótulo', itens[i][0], D, i);
    await H.fill(p, 'Hora', itens[i][1], D, i);
    await H.fill(p, 'Responsável', itens[i][2], D, i);
    await H.fill(p, 'Recado fornecedores', itens[i][3], D, i);
  }
  await H.dlg(p, '10b-cronograma-modelo');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 900);
  // Inspirações
  await H.go(p, '/modelos-inspiracoes');
  await H.click(p, 'Novo Modelo de Inspirações', 'main');
  await H.fill(p, 'Nome', 'Casamento clássico no jardim', D);
  await H.click(p, 'Adicionar URL', D);
  await H.fill(p, 'URL', 'https://br.pinterest.com/atelieflordelis/casamento-jardim', D, 0);
  await H.click(p, 'Adicionar URL', D);
  await H.fill(p, 'URL', 'https://www.instagram.com/atelieflordelis', D, 1);
  await H.dlg(p, '10c-inspiracoes-modelo');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 900);
  // Mensagens
  await H.go(p, '/modelos-mensagens');
  await H.click(p, 'Novo Modelo de Mensagem', 'main');
  await H.fill(p, 'Nome', 'Convite para confirmar presença', D);
  await H.fill(p, 'Texto', 'Olá, {{nome_convidados}}! Com muita alegria convidamos você para o {{nome_evento}}, em {{data_evento}} às {{hora_evento}}, no {{local_cerimonia}}. Confirme sua presença até {{prazo_rsvp}} pelo link: {{link_convite}}', D);
  await H.dlg(p, '10d-mensagem-modelo');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 900);
  await H.shot(p, '10e-mensagens-lista');
  console.log(await H.txt(p, 'main'));
};
