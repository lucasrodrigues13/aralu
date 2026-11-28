module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  await H.go(p, '/perfil');
  await H.upload(p, 0, 'logo-flordelis.png', 'main');
  await H.wait(p, 1500);
  await H.shot(p, '04c-perfil-logo');
  const svc = [
    ['Assessoria completa', 'Planejamento do casamento do início ao fim: fornecedores, cronograma, convidados e coordenação no dia.', '1800000'],
    ['Assessoria do dia', 'Coordenação do casamento no dia, com reuniões de alinhamento nos 60 dias anteriores.', '650000'],
  ];
  for (const [n, d, v] of svc) {
    await H.go(p, '/modelos-servicos-funil');
    await H.click(p, 'Novo Modelo de Serviço/Produto', 'main');
    await H.fill(p, 'Nome', n, D);
    await H.fill(p, 'Descrição', d, D);
    await H.fill(p, 'Valor', v, D);
    if (n === 'Assessoria completa') await H.dlg(p, '05-servico-form');
    await H.click(p, 'Salvar', D);
    await H.wait(p, 1000);
  }
  await H.shot(p, '05b-servicos-lista');
  await H.go(p, '/modelos-orcamento-funil');
  await H.click(p, 'Novo Modelo de Orçamento', 'main');
  await H.fill(p, 'Nome', 'Proposta de casamento', D);
  await H.quill(p, 0, 'Olá, {{nome_oportunidade}}! Foi um prazer conhecer vocês. Segue a nossa proposta de assessoria para o {{tipo_evento}} em {{data_evento}}, com {{convidados}} convidados, cerimônia em {{local_cerimonia}} e recepção em {{local_recepcao}}. Investimento: {{valor}}. Proposta válida até {{validade}}. Com carinho, {{nome_assessoria}}.');
  await H.quill(p, 1, 'Por que a Flor de Lis? Há 10 anos cuidamos de cada detalhe para que o casal só se preocupe em viver o grande dia. "A Helena tirou todo o peso das nossas costas." (Ana e Pedro, 2025)');
  await H.dlg(p, '06-orcamento-modelo');
  await H.click(p, 'Salvar', D);
  await H.wait(p, 1000);
  await H.shot(p, '06b-orcamento-lista');
  console.log(await H.txt(p, 'main'));
};
