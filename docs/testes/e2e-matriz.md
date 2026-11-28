# Matriz de cobertura E2E

Fonte da verdade do que "100% testado" significa. Cada linha precisa de pelo menos um spec Playwright passando. Rota ou endpoint novo entra aqui no mesmo PR da feature.

Ambiente: `compose.e2e.yaml` (banco zerado em tmpfs, Mailpit, relógio controlável). Nunca roda em staging nem produção.

Legenda de status: `—` sem teste · `P` parcial · `OK` coberto.

## 1. Perfis

| Perfil | Como entra | Origem no teste |
|---|---|---|
| Admin | `/entrar` | seed do ambiente E2E |
| Dono | `/cadastro` → e-mail (Mailpit) → `/confirmar-email` | criado no spec |
| Assistente (Membro) | convite por e-mail → `/convite` | criado pelo Dono, 2 grupos × 2 assistentes |
| Equipe do evento (organizador) | `/equipe/:token` + código por e-mail | 2 pessoas em eventos diferentes |
| Cliente | `/cliente/:token` + código por e-mail | gerado no evento |
| Público anônimo | `/lead/:contaId`, `/proposta/:token`, `/briefing/:token`, `/rsvp/:token` | links gerados no fluxo |

## 2. Telas × perfil

Guarda: `D` = donaGuard, `F` = financeiroGuard, `M:x` = moduloGuard(x), `A` = adminGuard.

### Públicas e autenticação
| Rota | Casos obrigatórios | Status |
|---|---|---|
| `/entrar` | login ok, senha errada, e-mail não confirmado, limite de tentativas, conta bloqueada, assistente inativa | — |
| `/cadastro` | ok, e-mail duplicado (maiúsc./minúsc.), senha fraca, campos vazios, duplo clique | — |
| `/confirmar-email`, `/reenviar-confirmacao` | token válido, expirado (relógio), reuso | — |
| `/esqueci-senha`, `/redefinir-senha` | e-mail inexistente (resposta neutra), token expirado, reuso, sessão antiga invalidada | — |
| `/convite`, `/convite-assistente` | aceitar, token expirado, convite reenviado invalida o antigo | — |
| `/lead/:contaId` | envio ok, conta inexistente, contato repetido, payload grande/HTML | — |
| `/proposta/:token` | abrir, aceitar com dados, dúvidas, recusar, cancelada, vencida (relógio), vista pela assessoria não conta | — |
| `/briefing/:token` | código por e-mail, código errado/expirado, salvar respostas, liberação revogada | — |
| `/cliente/:token` | código por e-mail, convites, importação, prazo RSVP, presenças, link revogado | — |
| `/equipe/:token`, `/equipe/:token/portaria` | código, roteiro, cronograma, QR, comparecimento, liberação revogada | — |
| `/rsvp/:token` | confirmar, recusar, prazo vencido (relógio), exceção de prazo, QR de entrada | — |

### Área logada (casca)
| Rota | Guarda | Dono | Assistente c/ acesso | Assistente s/ acesso | Status |
|---|---|---|---|---|---|
| `/hoje` | auth | ✓ | ✓ | ✓ | — |
| `/perfil` | D | ✓ | ✗ | ✗ | — |
| `/eventos`, `/eventos/:id` | M:Eventos | ✓ | ✓ | ✗ `/sem-acesso` | — |
| `/eventos/:id/fornecedores` | M:Fornecedores | ✓ | ✓ | ✗ | — |
| `/eventos/:id/contratos` | auth | ✓ | ✓ | ✓ | — |
| `/eventos/:id/dinheiro` | F | ✓ | ✓ | ✗ | — |
| `/eventos/:id/convidados` | M:Convidados | ✓ | ✓ | ✗ | — |
| `/contratos` | D | ✓ | ✗ | ✗ | — |
| `/tarefas` | M:Tarefas | ✓ | ✓ | ✗ | — |
| `/clientes` | M:Clientes | ✓ | ✓ | ✗ | — |
| `/gestao-financeira` | F | ✓ | ✓ | ✗ | — |
| `/configuracoes/equipe`, `/configuracoes/grupos` | D | ✓ | ✗ | ✗ | — |
| `/configuracoes/assinatura`, `/configuracoes/propostas` | D | ✓ | ✗ | ✗ | — |
| `/modelos-*` (evento, briefing, roteiro, cronograma, inspirações, mensagens) | M:Modelos | ✓ | ✓ | ✗ | — |
| `/fornecedores` | M:Fornecedores | ✓ | ✓ | ✗ | — |
| `/agenda` | M:Agenda | ✓ | ✓ | ✗ | — |
| `/oportunidades`, `/leads-rsvp`, `/tarefas-funil`, `/relatorios-funil`, `/modelos-servicos-funil` | M:Funil | ✓ | ✓ | ✗ | — |
| `/orcamentos-funil`, `/contratos-funil`, `/modelos-orcamento-funil` | M:OrcamentosContratos | ✓ | ✓ | ✗ | — |
| `/conta`, `/ajuda`, `/sem-acesso`, `/conta-bloqueada` | auth | ✓ | ✓ | ✓ | — |
| `/admin`, `/admin/planos`, `/admin/contas/:id` | A | ✗ | ✗ | ✗ | — |

Para cada módulo, testar também Ver × Editar × Excluir (`AcaoModulo`): assistente só com Ver não vê botões e a API devolve 403.

## 3. Jornadas (ordem do spec serial)

1. **Admin** — cadastra 3 planos (com recursos LigacoesIa, MensagensIa e Integracoes combinados), edita, consulta usuários/assistentes, força situação de assinatura de uma conta.
2. **Assinaturas** — 3 donos, um por plano: Trial → assinar (Cartão e Pix) → cancelar → reativar → cancelar → reativar; trocar plano (upgrade pró-rata, downgrade, desistir da troca); webhook pago/atrasado/duplicado/fora de ordem; relógio: trial expira, EmAtraso → Bloqueada, faturas do ciclo.
3. **Dono configura** — perfil, propostas, estágios do funil, modelos (todos), fornecedores, serviços; 2 grupos de acesso × 2 assistentes; desativar/reativar/excluir assistente; reenviar convite.
4. **Assistentes** — cada uma loga e faz o que o grupo permite; tenta o que não permite (UI e API).
5. **Funil por tipo de evento** — para cada `TipoEvento` (Casamento, QuinzeAnos, Aniversario, Corporativo, Formatura): lead → briefing → orçamento → aceite → contrato → assinar → virar cliente → evento. E um lead desistente por tipo (descartado com motivo, dados sensíveis apagados).
6. **Evento** — tarefas, fornecedores (avançar/voltar/contratar/contrato assinado), dinheiro, link do cliente, convidados (manual e planilha), RSVP, 2 organizadores em eventos diferentes, portaria com QR, concluir/cancelar.
7. **Financeiro** — parcelas, recebimento parcial/total, desfazer, refazer parcelamento, atrasadas (relógio).
8. **Relatórios** — números batem com o que as jornadas criaram.

## 4. Transversais (erros clássicos de SaaS)

| Tema | Caso | Status |
|---|---|---|
| Isolamento | dono B acessa IDs do dono A em cada endpoint `{id}` → 404/403 | — |
| Isolamento | token público de uma conta não abre dado de outra | — |
| Sessão | assistente desativada perde acesso imediatamente; troca de senha derruba sessões | — |
| Idempotência | duplo clique em salvar/assinar/aceitar não duplica | — |
| Webhook | evento Asaas repetido e fora de ordem não muda estado errado | — |
| Datas | evento à meia-noite (UTC × America/Sao_Paulo), virada de mês | — |
| Limites | uploads > 5 MB / tipo errado, textos longos, HTML/script em campos | — |
| E-mail | cada fluxo envia exatamente 1 e-mail, ao destinatário certo | — |
| Tokens | expirados, reusados, inventados → mensagem neutra | — |
| Plano | recurso fora do plano bloqueado; conta bloqueada só vê `/conta-bloqueada` e assinatura | — |

## 5. Jobs (relógio controlável)

| Job | Disparo no teste | Casos |
|---|---|---|
| `ControleDiarioAssinaturas` | `POST /_test/jobs/controle-diario-assinaturas` | trial vence, atraso, bloqueio, reativação |
| `ProcessadorImportacoes` | `POST /_test/jobs/processar-importacoes` | planilha ok, com erros, vazia |

## 6. Endpoints

A lista completa (~280) é gerada pelo script `tests/e2e/scripts/listar-endpoints.mjs` e comparada com as chamadas cobertas. Endpoint sem cobertura falha o CI.
