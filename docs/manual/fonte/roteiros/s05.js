module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  // Serviços da conta
  await H.go(p, '/fornecedores');
  await H.click(p, 'Serviços da conta', 'main');
  await H.click(p, 'Adicionar serviço', 'main');
  await H.click(p, 'Adicionar vários', D);
  await H.dump(p, D);
  const ta = await p.$(D + ' textarea');
  if (ta) {
    await ta.click();
    await p.keyboard.type('Buffet\nFotografia\nDecoração\nMúsica e DJ\nBolo e doces\nVestido da noiva');
  }
  await H.dlg(p, '08a-servicos-conta-form');
  await H.click(p, 'Criar', D);
  await H.wait(p, 1200);
  await H.shot(p, '08b-servicos-conta-lista');
  console.log(await H.txt(p, 'main'));
  // Briefing
  await H.go(p, '/modelos-briefing');
  await H.click(p, 'Novo Modelo de Briefing', 'main');
  await H.fill(p, 'Nome', 'Primeira conversa', D);
  await H.fill(p, 'Origem', 'Reunião inicial com o casal', D);
  await H.click(p, 'Adicionar seção', D);
  await H.fill(p, 'Seção', 'Sobre o casamento', D);
  await H.fill(p, 'Descrição', 'Perguntas para conhecer o casal e o sonho deles.', D);
  const perg = ['Qual a data desejada?', 'Quantos convidados vocês imaginam?', 'Qual o estilo da festa?', 'Qual o orçamento total previsto?', 'O que não pode faltar de jeito nenhum?'];
  for (let i = 0; i < perg.length; i++) {
    await H.click(p, 'Adicionar pergunta', D);
    await H.fill(p, 'Pergunta', perg[i], D, i);
  }
  await H.dlg(p, '09-briefing-modelo');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1000);
  await H.shot(p, '09b-briefing-lista');
  await H.dump(p, 'main');
};
