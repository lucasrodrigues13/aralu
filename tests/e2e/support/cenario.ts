import { expect } from '@playwright/test';
import { Api, SENHA_PADRAO } from './api';
import { mailpit } from './mailpit';
import { cpf, email, unico } from './dados';

/** Permissões de um grupo: { Funil: 'Editar' } → Ver+Editar; 'Excluir' → tudo; 'Ver' → só ver. */
export function permissoes(mapa: Record<string, 'Ver' | 'Editar' | 'Excluir'>) {
  return Object.entries(mapa).map(([modulo, nivel]) => ({
    modulo,
    ver: true,
    editar: nivel !== 'Ver',
    excluir: nivel === 'Excluir',
  }));
}

export async function criarGrupo(dono: Api, nome: string, mapa: Record<string, 'Ver' | 'Editar' | 'Excluir'>, veTodosEventos = true) {
  return dono.ok<{ id: string }>('POST', '/api/v1/grupos-acesso', { nome: unico(nome), veTodosEventos, permissoes: permissoes(mapa) });
}

/** Dono convida; a assistente abre o e-mail, define a senha e entra. Devolve a assistente logada. */
export async function convidarAssistente(dono: Api, grupoId: string, nome: string) {
  const conta = email(nome);
  const membro = await dono.ok<{ id: string }>('POST', '/api/v1/equipe', { nome, email: conta, celular: '11988887777', tipo: 'Membro', grupoId });
  const mensagem = await mailpit.esperar(conta, /convite|equipe|acesso/i);
  const link = new URL(mailpit.link(mensagem, '/convite'));
  await new Api().ok('POST', '/api/v1/conta/aceitar-convite', {
    usuarioId: link.searchParams.get('usuarioId'),
    token: link.searchParams.get('token'),
    senha: SENHA_PADRAO,
    confirmacao: SENHA_PADRAO,
  });
  const api = await Api.entrar(conta, SENHA_PADRAO);
  return { api, email: conta, membroId: membro.id, convite: link.toString() };
}

export const contratante = (nome: string, mail: string) => ({
  nome,
  documento: cpf(),
  nascimento: '1992-05-10',
  profissao: 'Analista',
  estadoCivil: 'Solteiro(a)',
  nacionalidade: 'Brasileira',
  email: mail,
  celular: '11977776666',
  cep: '01310100',
  endereco: 'Avenida Paulista',
  numero: '1000',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
  estado: 'SP',
  complemento: '',
  pais: 'Brasil',
});

const daqui = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);

export async function criarOportunidade(dono: Api, tipoEvento: string, nome = unico(`Lead ${tipoEvento}`)) {
  const mail = email('lead');
  const op = await dono.ok<{ id: string }>('POST', '/api/v1/oportunidades', {
    nome,
    estagio: 'Contato inicial',
    fonte: 'Instagram',
    tipoEvento,
    quantidadeConvidados: 120,
    dataPrevista: daqui(240),
    valorProposta: 8000,
    contatos: [{ nome: `Contato ${nome}`, telefone: '11977776666', email: mail, contratante: true }],
  });
  return { id: op.id, nome, email: mail };
}

/**
 * Funil completo até virar cliente e gerar evento: orçamento → envio → aceite pelo link público
 * com dados do contratante → contrato → envio → assinatura → cliente → Contratado → evento.
 */
export async function fecharLead(dono: Api, tipoEvento: string) {
  const lead = await criarOportunidade(dono, tipoEvento);

  const orcamento = await dono.ok<{ id: string }>('POST', '/api/v1/orcamentos-funil', {
    oportunidadeId: lead.id,
    conteudo: `<p>Proposta para ${lead.nome}</p>`,
    valor: 8000,
  });
  await dono.ok('PUT', `/api/v1/orcamentos-funil/${orcamento.id}/parcelas`, {
    quantidadeParcelas: 5,
    primeiraParcela: daqui(30),
    comEntrada: true,
    baseEntrada: 'Porcentagem',
    valorEntrada: 30,
    dataEntrada: daqui(1),
  });
  const enviado = await dono.ok<{ tokenLink: string }>('POST', `/api/v1/orcamentos-funil/${orcamento.id}/enviar`, {});
  expect(enviado.tokenLink, 'link público da proposta').toBeTruthy();

  const visitante = new Api();
  await visitante.ok('GET', `/api/v1/publico/propostas/${enviado.tokenLink}`);
  const dados = contratante(`Contratante ${lead.nome}`, lead.email);
  await visitante.ok('POST', `/api/v1/publico/propostas/${enviado.tokenLink}/resposta`, { tipo: 'Aceitar', mensagem: 'Fechado!', contratante: dados });

  const contrato = await dono.ok<{ id: string }>('POST', '/api/v1/contratos-funil', {
    oportunidadeId: lead.id,
    conteudo: '<p>Contrato entre {{nome_assessoria}} e {{nome_contratante}}</p>',
  });
  await dono.ok('POST', `/api/v1/contratos-funil/${contrato.id}/enviar`, {});
  await dono.ok('POST', `/api/v1/contratos-funil/${contrato.id}/assinar`, {});

  const cliente = await dono.ok<{ id: string }>('POST', '/api/v1/clientes', {
    nome: dados.nome,
    papel: 'Noiva',
    email: dados.email,
    ddi: '55',
    celular: dados.celular,
    documento: dados.documento,
  });
  await dono.ok('POST', `/api/v1/oportunidades/${lead.id}/cliente`, { clienteId: cliente.id });
  await dono.ok('POST', `/api/v1/oportunidades/${lead.id}/mover`, { estagio: 'Contratado' });

  const evento = await dono.ok<{ id: string }>('POST', '/api/v1/eventos', {
    primeiroNome: dados.nome.split(' ')[1] ?? 'Cliente',
    data: daqui(240),
    convidadosEstimados: 120,
    tipo: tipoEvento,
    clienteId: cliente.id,
    oportunidadeId: lead.id,
  });
  return { lead, orcamentoId: orcamento.id, tokenProposta: enviado.tokenLink, contratoId: contrato.id, clienteId: cliente.id, clienteEmail: dados.email, eventoId: evento.id };
}
