import { Routes } from '@angular/router';
import { adminGuard, authGuard, donaGuard, financeiroGuard, moduloGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'rsvp/:token', loadComponent: () => import('./pages/rsvp/rsvp.page').then((m) => m.RsvpPage) },
  { path: 'proposta/:token', loadComponent: () => import('./pages/proposta-publica/proposta-publica.page').then((m) => m.PropostaPublicaPage) },
  { path: 'cliente/:token', loadComponent: () => import('./pages/link-cliente/link-cliente.page').then((m) => m.LinkClientePage) },
  { path: 'portaria/:token', loadComponent: () => import('./pages/portaria/portaria.page').then((m) => m.PortariaPage) },
  {
    path: 'lead/:contaId',
    loadComponent: () => import('./pages/lead-publico/lead-publico.page').then((m) => m.LeadPublicoPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'entrar' },
  { path: 'entrar', loadComponent: () => import('./pages/entrar/entrar.page').then((m) => m.EntrarPage) },
  { path: 'cadastro', loadComponent: () => import('./pages/cadastro/cadastro.page').then((m) => m.CadastroPage) },
  {
    path: 'confirmar-email',
    loadComponent: () => import('./pages/confirmar-email/confirmar-email.page').then((m) => m.ConfirmarEmailPage),
  },
  {
    path: 'reenviar-confirmacao',
    loadComponent: () => import('./pages/reenviar/reenviar.page').then((m) => m.ReenviarPage),
  },
  {
    path: 'esqueci-senha',
    loadComponent: () => import('./pages/esqueci-senha/esqueci-senha.page').then((m) => m.EsqueciSenhaPage),
  },
  {
    path: 'convite',
    loadComponent: () => import('./pages/assistentes/convite-assistente.page').then((m) => m.ConviteAssistentePage),
  },
  {
    // Links de convite enviados antes da SPEC-062.
    path: 'convite-assistente',
    loadComponent: () => import('./pages/assistentes/convite-assistente.page').then((m) => m.ConviteAssistentePage),
  },
  {
    path: 'redefinir-senha',
    loadComponent: () => import('./pages/redefinir-senha/redefinir-senha.page').then((m) => m.RedefinirSenhaPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/casca.component').then((m) => m.CascaComponent),
    children: [
      { path: 'hoje', loadComponent: () => import('./pages/hoje/hoje.page').then((m) => m.HojePage) },
      { path: 'painel', redirectTo: 'hoje', pathMatch: 'full' },
      { path: 'perfil', canActivate: [donaGuard], loadComponent: () => import('./pages/perfil/perfil.page').then((m) => m.PerfilPage) },
      { path: 'eventos', canActivate: [moduloGuard('Eventos')], loadComponent: () => import('./pages/eventos/eventos.page').then((m) => m.EventosPage) },
      // Novo e Editar evento abrem em modal (docs/design-system.md, 1). As rotas antigas voltam para a lista ou para o evento.
      { path: 'eventos/novo', redirectTo: 'eventos', pathMatch: 'full' },
      { path: 'eventos/:id', canActivate: [moduloGuard('Eventos')], loadComponent: () => import('./pages/eventos/evento-home.page').then((m) => m.EventoHomePage) },
      { path: 'eventos/:id/editar', redirectTo: 'eventos/:id', pathMatch: 'full' },
      // A aba Tarefas foi para o Resumo (SPEC-051); o endereço antigo continua valendo.
      { path: 'eventos/:id/tarefas', redirectTo: 'eventos/:id', pathMatch: 'full' },
      { path: 'eventos/:id/fornecedores', canActivate: [moduloGuard('Fornecedores')], loadComponent: () => import('./pages/eventos/evento-fornecedores.page').then((m) => m.EventoFornecedoresPage) },
      { path: 'eventos/:id/contratos', loadComponent: () => import('./pages/eventos/evento-contratos.page').then((m) => m.EventoContratosPage) },
      { path: 'contratos', canActivate: [donaGuard], loadComponent: () => import('./pages/contratos/contratos.page').then((m) => m.ContratosPage) },
      { path: 'eventos/:id/dinheiro', canActivate: [financeiroGuard], loadComponent: () => import('./pages/dinheiro/evento-dinheiro.page').then((m) => m.EventoDinheiroPage) },
      { path: 'eventos/:id/convidados', canActivate: [moduloGuard('Convidados')], loadComponent: () => import('./pages/convidados/convidados.page').then((m) => m.ConvidadosPage) },
      { path: 'tarefas', canActivate: [moduloGuard('Tarefas')], loadComponent: () => import('./pages/tarefas/tarefas.page').then((m) => m.TarefasPage) },
      { path: 'clientes', canActivate: [moduloGuard('Clientes')], loadComponent: () => import('./pages/clientes/clientes.page').then((m) => m.ClientesPage) },
      { path: 'convidados', redirectTo: 'eventos', pathMatch: 'full' },
      { path: 'gestao-financeira', canActivate: [financeiroGuard], loadComponent: () => import('./pages/gestao-financeira/gestao-financeira.page').then((m) => m.GestaoFinanceiraPage) },
      // Configurações (SPEC-062 §13): só o Dono.
      { path: 'configuracoes/equipe', canActivate: [donaGuard], loadComponent: () => import('./pages/assistentes/assistentes.page').then((m) => m.AssistentesPage) },
      { path: 'configuracoes/grupos', canActivate: [donaGuard], loadComponent: () => import('./pages/grupos/grupos.page').then((m) => m.GruposPage) },
      { path: 'assistentes', redirectTo: 'configuracoes/equipe', pathMatch: 'full' },
      { path: 'ajuda', loadComponent: () => import('./pages/ajuda/manual.page').then((m) => m.ManualPage) },
      { path: 'sem-acesso', loadComponent: () => import('./pages/atalhos/sem-acesso.page').then((m) => m.SemAcessoPage) },
      { path: 'conta-bloqueada', loadComponent: () => import('./pages/conta-bloqueada/conta-bloqueada.page').then((m) => m.ContaBloqueadaPage) },
      { path: 'configuracoes/assinatura', canActivate: [donaGuard], loadComponent: () => import('./pages/assinatura/assinatura.page').then((m) => m.AssinaturaPage) },
      { path: 'anexos', loadComponent: () => import('./pages/atalhos/em-breve.page').then((m) => m.EmBrevePage) },
      { path: 'equipe', loadComponent: () => import('./pages/atalhos/em-breve.page').then((m) => m.EmBrevePage) },
      { path: 'aniversarios', loadComponent: () => import('./pages/atalhos/em-breve.page').then((m) => m.EmBrevePage) },
      {
        path: 'modelos-evento', canActivate: [moduloGuard('Modelos')],
        loadComponent: () => import('./pages/modelos-evento/modelos-evento.page').then((m) => m.ModelosEventoPage),
      },
      {
        path: 'modelos-evento/:id', canActivate: [moduloGuard('Modelos')],
        loadComponent: () => import('./pages/modelos-evento/modelo-evento-editor.page').then((m) => m.ModeloEventoEditorPage),
      },
      {
        path: 'modelos-briefing', canActivate: [moduloGuard('Modelos')],
        loadComponent: () => import('./pages/modelos-briefing/modelos-briefing.page').then((m) => m.ModelosBriefingPage),
      },
      {
        path: 'modelos-roteiro', canActivate: [moduloGuard('Modelos')],
        loadComponent: () => import('./pages/modelos-roteiro/modelos-roteiro.page').then((m) => m.ModelosRoteiroPage),
      },
      {
        path: 'modelos-cronograma', canActivate: [moduloGuard('Modelos')],
        loadComponent: () => import('./pages/modelos-cronograma/modelos-cronograma.page').then((m) => m.ModelosCronogramaPage),
      },
      {
        path: 'modelos-inspiracoes', canActivate: [moduloGuard('Modelos')],
        loadComponent: () => import('./pages/modelos-inspiracoes/modelos-inspiracoes.page').then((m) => m.ModelosInspiracoesPage),
      },
      {
        path: 'modelos-mensagens', canActivate: [moduloGuard('Modelos')],
        loadComponent: () => import('./pages/modelos-mensagens/modelos-mensagens.page').then((m) => m.ModelosMensagensPage),
      },
      {
        path: 'fornecedores', canActivate: [moduloGuard('Fornecedores')],
        loadComponent: () => import('./pages/fornecedores/fornecedores.page').then((m) => m.FornecedoresPage),
      },
      { path: 'agenda', canActivate: [moduloGuard('Agenda')], loadComponent: () => import('./pages/agenda/agenda.page').then((m) => m.AgendaPage) },
      {
        path: 'oportunidades', canActivate: [moduloGuard('Funil')],
        loadComponent: () => import('./pages/oportunidades/oportunidades.page').then((m) => m.OportunidadesPage),
      },
      {
        path: 'leads-rsvp', canActivate: [moduloGuard('Funil')],
        loadComponent: () => import('./pages/leads-rsvp/leads-rsvp.page').then((m) => m.LeadsRsvpPage),
      },
      {
        path: 'contratos-funil', canActivate: [moduloGuard('OrcamentosContratos')],
        loadComponent: () => import('./pages/contratos-funil/contratos-funil.page').then((m) => m.ContratosFunilPage),
      },
      {
        path: 'orcamentos-funil', canActivate: [moduloGuard('OrcamentosContratos')],
        loadComponent: () => import('./pages/orcamentos-funil/orcamentos-funil.page').then((m) => m.OrcamentosFunilPage),
      },
      {
        path: 'tarefas-funil', canActivate: [moduloGuard('Funil')],
        loadComponent: () => import('./pages/tarefas-funil/tarefas-funil.page').then((m) => m.TarefasFunilPage),
      },
      {
        path: 'relatorios-funil', canActivate: [moduloGuard('Funil')],
        loadComponent: () => import('./pages/relatorios-funil/relatorios-funil.page').then((m) => m.RelatoriosFunilPage),
      },
      {
        path: 'modelos-servicos-funil', canActivate: [moduloGuard('Funil')],
        loadComponent: () => import('./pages/modelos-funil/modelos-funil.page').then((m) => m.ModelosServicosFunilPage),
      },
      {
        path: 'modelos-orcamento-funil', canActivate: [moduloGuard('OrcamentosContratos')],
        loadComponent: () => import('./pages/modelos-funil/modelos-funil.page').then((m) => m.ModelosOrcamentoFunilPage),
      },
      { path: 'conta', loadComponent: () => import('./pages/conta/area-usuario.page').then((m) => m.AreaUsuarioPage) },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/area-admin.page').then((m) => m.AreaAdminPage),
      },
      { path: 'admin/planos', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/planos-admin.page').then((m) => m.PlanosAdminPage) },
      { path: 'admin/contas/:contaId', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/conta-admin.page').then((m) => m.ContaAdminPage) },
    ],
  },
];
