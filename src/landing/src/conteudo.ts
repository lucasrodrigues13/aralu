// Texto das funções e das perguntas. Só entra o que o produto já faz (SPEC-068 §5.2).

export type TipoTela = 'painel' | 'funil' | 'evento' | 'convidados' | 'dinheiro' | 'cliente' | 'equipe';

export interface Bloco {
  id: string;
  grupo: 'funil' | 'evento';
  area: string;
  icone: string;
  titulo: string;
  texto: string;
  itens: string[];
  tela: TipoTela;
}

export const blocos: Bloco[] = [
  {
    id: 'funil',
    grupo: 'funil',
    area: 'Funil',
    icone: 'funnel',
    titulo: 'Do primeiro contato ao contrato assinado',
    texto: 'Cada oportunidade fica em um estágio, com valor e data prevista. O orçamento sai do seu modelo e o contrato é assinado pela internet.',
    itens: [
      'Quadro com Contato inicial, Orçamento enviado, Contratado e Descartado',
      'Orçamento com parcelas e validade da proposta',
      'Contrato com os dados do contratante e assinatura eletrônica',
      'Relatórios por fonte, serviço, estágio e motivo de descarte',
    ],
    tela: 'funil',
  },
  {
    id: 'evento',
    grupo: 'evento',
    area: 'Eventos',
    icone: 'calendar-blank',
    titulo: 'Cada evento com tarefas, roteiro e cronograma',
    texto: 'Você cria o evento a partir de um modelo e já começa com as tarefas no prazo certo. O briefing vai por link e o cliente preenche.',
    itens: [
      'Tarefas com prazo e responsável, em lista ou quadro',
      'Roteiro e cronograma do dia a partir dos seus modelos',
      'Briefing preenchido pelo cliente, sem login',
      'Agenda com os compromissos de todos os eventos',
    ],
    tela: 'evento',
  },
  {
    id: 'convidados',
    grupo: 'evento',
    area: 'Convidados',
    icone: 'envelope-simple',
    titulo: 'Convites, confirmação com prazo e portaria com QR',
    texto: 'O convidado confirma pelo link até a data que você definir. No dia, a portaria lê o QR e marca quem chegou.',
    itens: [
      'Importação da lista de convidados por planilha',
      'RSVP com prazo e total de confirmados em tempo real',
      'Portaria no celular, com leitura de QR',
      'Cadastro de convites pelo próprio cliente',
    ],
    tela: 'convidados',
  },
  {
    id: 'dinheiro',
    grupo: 'evento',
    area: 'Pagamentos',
    icone: 'wallet',
    titulo: 'Parcelas do cliente e pagamentos a fornecedores',
    texto: 'Você vê o que vence no mês e o que está atrasado, por evento e na soma de todos.',
    itens: [
      'Parcelas geradas a partir do orçamento e do contrato',
      'Pagamentos a fornecedores com vencimento e situação',
      'Parcelas do mês e atrasadas em uma só lista',
      'Gráficos de orçamento por evento',
    ],
    tela: 'dinheiro',
  },
  {
    id: 'cliente',
    grupo: 'evento',
    area: 'Clientes',
    icone: 'users',
    titulo: 'O cliente acompanha tudo com o seu nome e o seu logo',
    texto: 'Um link por evento, sem senha para decorar: o cliente recebe um código por e-mail e vê só o que você liberou.',
    itens: [
      'Briefing, convites e pagamentos no mesmo link',
      'Proposta e contrato com o visual da sua assessoria',
      'Acesso por código enviado ao e-mail do cliente',
      'A Aralu aparece só como "com tecnologia Aralu"',
    ],
    tela: 'cliente',
  },
  {
    id: 'equipe',
    grupo: 'evento',
    area: 'Equipe',
    icone: 'users-three',
    titulo: 'Sua equipe com acesso na medida',
    texto: 'Assistentes entram com permissão por grupo. Quem trabalha só no dia recebe um link com portaria, cronograma ou roteiro.',
    itens: [
      'Grupos de permissão por área do sistema',
      'Equipe de apoio do evento sem conta e sem custo',
      'Link individual, que vence no dia seguinte ao evento',
      'Você encerra o acesso quando quiser',
    ],
    tela: 'equipe',
  },
];

export const diferenciais = [
  {
    icone: 'storefront',
    titulo: 'A marca que o cliente vê é a sua',
    texto: 'Link do cliente, proposta, briefing e convites levam o nome e o logo da sua assessoria. A Aralu fica no rodapé.',
  },
  {
    icone: 'list-checks',
    titulo: 'Feita só para cerimonial',
    texto: 'Evento, fornecedor, roteiro, cronograma, portaria: as palavras e as etapas do seu trabalho, sem adaptação.',
  },
  {
    icone: 'handshake',
    titulo: 'Você é a cliente',
    texto: 'Um plano e um preço. A Aralu não vende nada para o seu cliente nem mostra anúncio no seu evento.',
  },
];

export const perguntas = [
  {
    p: 'Preciso de cartão de crédito para experimentar?',
    r: 'Não. Você se cadastra com nome, e-mail e senha e usa todas as funções por 14 dias. O cartão só é pedido se você decidir assinar.',
  },
  {
    p: 'O que acontece no 15º dia?',
    r: 'O acesso fica bloqueado até você assinar. Seus eventos, clientes e modelos continuam guardados, e nenhuma cobrança é feita sem a sua assinatura.',
  },
  {
    p: 'Posso cancelar quando quiser?',
    r: 'Sim. Você cancela na própria conta, sem multa. O acesso continua até o fim do período já pago.',
  },
  {
    p: 'Como é o pagamento?',
    r: 'A assinatura é mensal, por cartão de crédito ou Pix. Se você assinar durante os 14 dias, a primeira cobrança vence só no último dia do teste.',
  },
  {
    p: 'Minha equipe entra no mesmo plano?',
    r: 'Sim. Você convida assistentes e define o que cada grupo pode ver. A equipe de apoio do dia do evento recebe um link e não precisa de conta.',
  },
  {
    p: 'Consigo trazer minha lista de convidados da planilha?',
    r: 'Sim. A lista de convidados e a lista de serviços podem ser importadas de um arquivo.',
  },
  {
    p: 'Os dados dos meus clientes ficam protegidos?',
    r: 'Os dados de cada assessoria ficam separados das outras contas e trafegam com criptografia. A Política de privacidade explica o que é guardado e por quê.',
  },
  {
    p: 'Funciona no celular?',
    r: 'Sim. A Aralu abre no navegador do celular, do tablet e do computador, sem instalar nada.',
  },
];
