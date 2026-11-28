# Changelog

Todas as mudanças relevantes da Aralu, por versão. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versionamento semântico (MAJOR.MINOR.PATCH). O passo a passo está na skill `.claude/skills/versao-release`.

## [1.0.1] - 2026-11-28

### Corrigido
- aralu.com.br passa a abrir a landing page em vez de redirecionar para o app; se a landing estiver fora do ar, o endereço leva ao app (SPEC-068, 069).

## [1.0.0] - 2026-11-28

Primeira versão em produção.

### Adicionado
- Conta da assessoria com cadastro, login, trial de 14 dias, assinatura pelo Asaas (cartão e Pix), upgrade de plano pro rata e equipe com grupos e permissões por módulo (SPEC-001, 005, 062, 065).
- Clientes com cadastro completo, documento único e link do cliente com código de acesso, sem login (SPEC-006, 009, 037, 060, 063).
- Eventos com cadastro completo, tarefas, equipe, resumo com estatísticas e gráficos de orçamento (SPEC-002, 003, 008, 011, 047, 051, 067).
- Convites, convidados e RSVP com prazo, formulário único, cadastro de convites pelo cliente e importação por planilha (SPEC-004, 010, 021, 052, 054, 059).
- Portaria do evento com check-in na lista de convites (SPEC-058).
- Funil comercial: oportunidades, estágios, tarefas, relatórios, orçamentos com parcelas, propostas com validade configurável e página de aceite (SPEC-020, 023, 024, 025, 031, 042, 049, 057, 061, 064).
- Contratos com modelos por tags, prévia ao vivo, logo e fundo, e assinatura eletrônica (SPEC-022, 028, 030, 033, 039, 050, 053, 055, 056).
- Financeiro: dinheiro do evento, parcelas por documento, parcelas do mês e atrasadas, pagamentos a fornecedores e link financeiro do cliente (SPEC-029, 040, 041, 043, 044, 046).
- Serviços e fornecedores, contratação e contratos de fornecedor no evento (SPEC-018, 026, 045, 048).
- Modelos de evento, briefing (preenchido pelo cliente), roteiro, cronograma, inspirações e mensagens (SPEC-012 a 017, 027, 066).
- Minha agenda, dashboards, assistentes e menu lateral (SPEC-007, 019, 032, 035).
- Landing page em aralu.com.br e app em app.aralu.com.br (SPEC-068, 069).

### Segurança
- Correções da auditoria OWASP Top 10: revogação de sessão, política de senha, limite de login e de formulários públicos, cabeçalhos de segurança, cadeia de build fixada, limpeza de HTML do contrato e eventos de segurança no log.
