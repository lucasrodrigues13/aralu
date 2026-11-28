module.exports = async (p, H) => {
  const D = 'mat-dialog-container';
  const forn = [
    { nome: 'Buffet Sabor & Arte', svc: 'Buffet', razao: 'Sabor e Arte Gastronomia Ltda', resp: 'Carlos Menezes', de: '3500000', ate: '6000000', tel: '11933334444', email: 'eventos@saborearte.test', insta: '@saborearte.buffet' },
    { nome: 'Foto Luz Fotografia', svc: 'Fotografia', razao: '', resp: 'Marcos Tavares', de: '800000', ate: '1500000', tel: '11944445555', email: 'marcos@fotoluz.test', insta: '@fotoluz' },
    { nome: 'Jardim Secreto Decorações', svc: 'Decoração', razao: 'Jardim Secreto Decor Ltda', resp: 'Patrícia Lima', de: '1500000', ate: '3000000', tel: '11955556666', email: 'contato@jardimsecreto.test', insta: '@jardimsecretodecor' },
    { nome: 'DJ Leo Batista', svc: 'Música e DJ', razao: '', resp: 'Leonardo Batista', de: '400000', ate: '700000', tel: '11966667777', email: 'leo@djleo.test', insta: '@djleobatista' },
  ];
  for (const f of forn) {
    await H.go(p, '/fornecedores');
    await H.click(p, 'Novo fornecedor', 'main');
    await H.fill(p, 'Nome', f.nome, D);
    await H.fill(p, 'Serviços', f.svc, D);
    await H.wait(p, 700);
    console.log('OVERLAY:', (await H.txt(p, '.cdk-overlay-container')).replace(/\n+/g, ' | ').slice(0, 300));
    await H.click(p, f.svc, '.cdk-overlay-container .mat-mdc-autocomplete-panel');
    if (f.razao) await H.fill(p, 'Razão social', f.razao, D);
    await H.fill(p, 'Responsável', f.resp, D);
    await H.fill(p, 'Preço de', f.de, D);
    await H.fill(p, 'Preço até', f.ate, D);
    await H.click(p, 'Adicionar telefone', D);
    await H.dump(p, D);
    if (f.nome.startsWith('Buffet')) await H.dlg(p, '12a-fornecedor-form');
    await H.click(p, 'Redes sociais', D);
    await H.fill(p, 'Instagram', f.insta, D);
    await H.click(p, 'Dados', D);
    await H.click(p, 'Salvar', D);
    await H.wait(p, 1200);
    console.log((await H.txt(p, 'main')).slice(-400));
  }
  await H.shot(p, '12b-fornecedores-lista');
};
