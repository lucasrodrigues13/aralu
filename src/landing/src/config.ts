// Dados que aparecem em mais de uma página. O valor do plano mora só aqui (SPEC-068 R2).

const app = (import.meta.env.PUBLIC_APP_URL ?? 'https://app.aralu.com.br').replace(/\/$/, '');

export const site = {
  nome: 'Aralu',
  promessa: 'Tudo em dia',
  url: 'https://aralu.com.br',
  cadastro: `${app}/cadastro`,
  entrar: `${app}/entrar`,
  botao: 'Experimentar por 14 dias',
  semCartao: 'Sem cartão de crédito',
};

export const plano = {
  nome: 'Pro',
  valor: 179.9,
  valorTexto: 'R$ 179,90',
  diasDeTeste: 14,
  inclui: [
    'Eventos sem limite',
    'Funil com orçamento e contrato com assinatura eletrônica',
    'Tarefas, roteiro, cronograma e briefing',
    'Convites, RSVP com prazo e portaria com QR',
    'Parcelas do cliente e pagamentos a fornecedores',
    'Link do cliente com o seu nome e o seu logo',
    'Assistentes com permissão por grupo',
  ],
};

// PENDENTE (SPEC-068 D3): preencher antes do lançamento. Enquanto vazio, o campo não aparece.
export const empresa = {
  razaoSocial: '',
  cnpj: '',
  endereco: '',
  contato: 'contato@aralu.com.br',
  foro: '',
  vigencia: '28 de novembro de 2026',
};

// Medição de visitas sem cookie (Umami). Sem as duas variáveis, nenhum script é carregado.
export const medicao = {
  script: import.meta.env.PUBLIC_UMAMI_SCRIPT ?? '',
  site: import.meta.env.PUBLIC_UMAMI_SITE ?? '',
};

// Endereço da lista pública de depoimentos. Vazio até a API existir: a seção não é montada.
export const depoimentosUrl = import.meta.env.PUBLIC_DEPOIMENTOS_URL ?? '';
