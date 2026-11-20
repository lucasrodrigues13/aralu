# Produto: versão 1.0

**Status: consolidado em 18/11/2026, aguardando revisão do cliente.** Este documento junta, módulo a módulo, o que já está construído no gevents, o que a Assessoria VIP tem, as sugestões do plano "Versão 1.0 em 12 passos" e o que foi visto no Cerimonial Fácil, no Ivola e no WeddingPro. Cada item diz de onde vem e se já existe, se muda ou se é novo.

## 1. Como este documento se relaciona com os outros

| Documento | Papel |
|---|---|
| **produto-v1.md** (este) | Escopo funcional da 1.0. Diz o que entra, o que muda e o que fica fora. |
| [requirements.md](requirements.md) | Catálogo de RF, RNF e DA. Continua sendo a fonte dos IDs. Os RFs novos e os que mudam estão listados na seção 7 e ainda não foram gravados lá. |
| [specs/](specs/) | Comportamento verificável por fluxo. Spec aprovada continua sendo pré-requisito de código. A seção 8 diz quais revisar e quais criar. |
| [mvp-scope.md](mvp-scope.md) | Corte anterior (specs 001–028). Substituído por este documento quando aprovado. |
| [analise-plano-v1.md](analise-plano-v1.md) | Análise do PDF e o registro das decisões de 18/11/2026. |
| [comparativo-assessoriavip.md](comparativo-assessoriavip.md), [inventario-referencia.md](inventario-referencia.md) | O que a Assessoria VIP tem. |
| [inventario-cerimonial-facil.md](inventario-cerimonial-facil.md), [inventario-ivola.md](inventario-ivola.md), [inventario-weddingpro.md](inventario-weddingpro.md) | O que as outras referências têm. |
| `plataforma-v1-passo-a-passo.pdf` (fora do repositório) | Sugestões do cliente. Fonte de ideias, não de regra. |

Legenda de estado: **Pronto** (construído e segue igual) · **Ajustar** (construído, muda) · **Novo** (não existe) · **Pendente** (sem decisão; não codificar).

Fontes: **G** gevents construído · **AV** Assessoria VIP · **PDF** plano de 12 passos · **CF** Cerimonial Fácil · **IV** Ivola · **WP** WeddingPro · **D** decisão do cliente em 18/11/2026.

## 2. Princípios

Valem para todas as telas. Vêm do PDF (seções "Por que assim" e "Não fazer") e foram confirmados nas referências.

1. **Poucos toques.** Criar evento, tarefa ou convidado sem formulário longo. Campo extra fica para depois.
2. **Um nome, uma coisa.** Nenhum par de nomes que pareça o mesmo para a usuária. Roteiro e Cronograma continuam separados (D), então a interface explica a diferença em uma frase.
3. **Resumo em cartões.** A primeira tela do evento é um cartão por área, com um número, uma frase e um link (PDF, CF, WP).
4. **O que pede ação primeiro.** A tela inicial mostra o que precisa ser feito hoje, não um menu de módulos (PDF, IV, CF).
5. **Nada perigoso solto.** Excluir e cancelar ficam dentro de "Mais" ou da tela de dados, sempre com confirmação. Nada de "Excluir todos" ao lado da lista (PDF; contraexemplos AV e WP).
6. **Avisos que somem.** Guia e aviso aparecem, podem ser fechados ou adiados e não voltam sem motivo (PDF, CF).
7. **Sem propaganda nem parceiro no meio do uso** (PDF).
8. **Mensagem pronta para o WhatsApp.** Cobrança, convite, escala e pedido ao fornecedor abrem o WhatsApp com o texto pronto. A plataforma não envia sozinha na 1.0 (PDF, CF).
9. **Celular e computador.** No celular, a barra inferior; no computador, o menu lateral com grupos (D).
10. **Todo cadastro em modal.** Criar e editar qualquer entidade abre modal sobre a tela atual; só Perfil, Ajustes, telas de detalhe e telas públicas são página (D, 18/11/2026). O visual segue [design-system.md](design-system.md), versão 2.

## 3. Quem usa

| Papel | Como entra | O que faz | Estado | Fonte |
|---|---|---|---|---|
| Admin | Login | Tudo, todas as contas | Pronto | G |
| Organizer (cerimonialista) | Login | Opera a própria conta | Pronto | G |
| **Assistente** | Login próprio, por convite | Vê os eventos; financeiro só se liberado; pode ficar só com os eventos dela | Novo | D, CF |
| **Casal / contratante** | **Link sem senha** | Acompanha o que ela liberar; marca as próprias tarefas; aprova; edita com código | Ajustar (substitui o login `Client`) | D, CF, WP |
| Equipe do dia | Sem login | Recebe a escala pelo WhatsApp | Novo | AV, CF |
| Convidado | Link de RSVP | Confirma presença | Pronto | G |
| Lead | Formulário público / página pública | Pede orçamento | Ajustar | G, CF |
| Fornecedor com login | — | — | Fora | AV (RF-060) |

## 4. Navegação

**Computador:** menu lateral com grupos (D). Proposta de grupos, a confirmar na spec da casca:

| Grupo | Itens |
|---|---|
| Hoje | Hoje |
| Eventos | Eventos, Tarefas (todos os eventos), Pagamentos (todos os eventos), Anexos (todos os eventos), Aniversários |
| Comercial | Funil de vendas (oportunidades, oportunidades de RSVP, orçamentos, contratos, tarefas, relatórios) |
| Agenda | Minha agenda |
| Dinheiro | Financeiro da empresa, Relatórios |
| Cadastros | Clientes, Fornecedores, Equipe, Modelos |
| Conta | Perfil, Marca e página pública, Pix, Ajustes |

**Celular:** barra inferior com **Hoje · Eventos · + Novo · Dinheiro · Mais** (PDF). "Mais" abre os outros grupos.

**Dentro do evento:** trilha "Eventos / {evento} / {aba}" e seletor para trocar de evento (PDF, IV). Abas em grupos:

| Grupo | Abas |
|---|---|
| Resumo | Cartões por área |
| Planejar | Tarefas, Fornecedores e serviços, Roteiro, Cronograma, Briefing, Inspirações, Notas e observações |
| Convidados | Convites e convidados, RSVP e mensagens, Mesas, Grupos e transfer |
| Dinheiro | Parcelas do casal, Pagamentos a fornecedores, Despesas, Contrato, Budget |
| Casal | Link do casal, o que ele vê, aprovações |
| Evento | Dados, Equipe do dia, Anexos |

## 5. Módulos

### 5.1. Conta, perfil e marca

| Item | Estado | Fonte |
|---|---|---|
| Cadastro, confirmação, login, senha, lockout, logout | Pronto | G (SPEC-001) |
| Perfil da empresa com foto | Pronto | G (SPEC-005) |
| Marca: logo, nome, WhatsApp e cor, usados no link do casal, RSVP e página pública | Novo | PDF, CF |
| Chave Pix (tipo, chave, CPF/CNPJ) usada na cobrança e no contrato | Novo | PDF, CF |
| Página pública com apresentação, cidade, Instagram, tipos de evento, portfólio, depoimentos e botão de orçamento que cai no funil | Novo | D, CF |
| Feed de calendário (iCal) com link secreto e "gerar link novo", para Google Agenda e iPhone | Novo | D, CF |

### 5.2. Hoje (tela inicial)

Substitui o dashboard atual (SPEC-007, RF-080 a RF-082).

| Item | Estado | Fonte |
|---|---|---|
| Saudação com data e "N coisas pedem você hoje"; sem pendência, "Nada pede você hoje" | Novo | PDF, IV |
| Cartões de ação somando todos os eventos: tarefas da semana e atrasadas, cobranças a fazer (atrasadas e 7 dias), pagamentos a fornecedores da semana, respostas de convidados, retornos do funil; cada cartão leva à tela que resolve | Novo | PDF, IV, CF |
| Próximo evento com contagem de dias | Novo | CF, WP |
| Carteira em tabela: casal, data, % de tarefas, respondidos, coluna **Atenção** (atrasadas + respostas abaixo do esperado) | Novo | PDF, IV |
| Números do funil (quantidade e valor por estágio) | Ajustar (vem do dashboard atual) | G (RF-082) |
| Checklist de configuração inicial (contrato, Pix, marca, página, equipe) com "pular" | Novo | CF |

### 5.3. Eventos

| Item | Estado | Fonte |
|---|---|---|
| Lista com abas em andamento / concluído / cancelado, busca, filtros, tags, cartão | Pronto | G (SPEC-002, 008) |
| Visão em tabela além de cartões; status de atenção automático pela data | Novo | PDF, IV |
| Excluir/cancelar fora do cartão, dentro de Dados ou "Mais" | Pronto no Resumo ("Mais"); na lista, com a SPEC-002 | PDF |
| **Criar em uma tela**: obrigatório tipo e nome do casal; data, horário, convidados e local opcionais; cliente na mesma tela (existente ou novo com nome e WhatsApp); data digitável | Pronto (SPEC-008 v2) | PDF, CF, IV, G (SPEC-008) |
| Pacote (assessoria completa, parcial, final) escolhe o modelo de tarefas e roteiro; o cartão do tipo mostra "N tarefas · N momentos" | Ajustar | PDF, CF |
| Valor da assessoria e parcelas **depois**, no Dinheiro do evento, não no passo de criação | Pronto na criação (SPEC-008 v2); o Dinheiro do evento vem no bloco 6 | PDF, G |
| Resumo do evento em cartões (tarefas, dinheiro, convidados, fornecedores, roteiro, equipe, casal, notas) com alertas acionáveis no topo | Pronto para tarefas, convidados, fornecedores, orçamento e cliente (SPEC-008 v2); os outros cartões entram com seus blocos | PDF, CF, WP, AV |
| Dados do evento: detalhes, cerimônia e recepção com CEP, horários, padrinhos, damas | Pronto | G (SPEC-008) |
| Estatísticas e rankings | Pronto | G (SPEC-011) |
| Salvar evento como modelo (tarefas com "dias antes"; roteiro no bloco 10) | Pronto (tarefas e serviços) | G (SPEC-012 v2), CF, IV |
| Observações gerais do evento com modelos de observação | Novo | AV |
| Notificações por e-mail do evento (assessora, assistentes, casal) | Pendente | AV |

### 5.4. Modelos

| Item | Estado | Fonte |
|---|---|---|
| Modelo de evento com serviços, tarefas e prazos em "dias antes" da data do evento | Pronto | G (SPEC-012 v2) |
| Prazo exibido como "N semanas antes" / "6 meses antes" | Pronto | G (SPEC-012 v2) |
| Importar modelo colando uma lista ou planilha (linha = tarefa, título = grupo) | Pronto | G (SPEC-012 v2) |
| Aplicar modelo num evento existente | Pronto | G (SPEC-012 v2) |
| Bibliotecas de briefing, roteiro, cronograma, inspirações, mensagens | Pronto | G (SPEC-013 a 017) |
| Modelos de briefing compartilhados com o funil (origem gestão de eventos / funil) | Ajustar | AV |

### 5.5. Tarefas

| Item | Estado | Fonte |
|---|---|---|
| Lista e quadro por situação; CRUD | Pronto | G (SPEC-003) |
| Criar pelo botão "Nova tarefa", em modal (título obrigatório; prazo e demais campos opcionais) | Pronto | D (SPEC-003 v3) |
| Lista do evento em uma tabela, com filtro de situação. Grupos de prazo saíram dessa aba | Pronto | D (SPEC-003 v3) |
| Situações (pendente, em andamento, concluída, atrasada) como filtro na aba do evento e como quadro na lista de todos os eventos | Pronto | D, G |
| Responsáveis: ela, assistente, equipe ou casal; **mais de um** | Ajustar (hoje um só) | PDF, AV, D |
| **Visibilidade** por tarefa: só eu / casal / compartilhada | Novo | D, IV |
| **Prioridade** baixa / média / alta | Novo | D, IV |
| Checklist e anexos dentro da tarefa, recolhidos até alguém precisar | Novo | PDF, AV |
| Perguntas e comentários na tarefa | Novo | AV |
| Tarefa ligada a um serviço; contratar o fornecedor fecha "Contratar X" | Novo | PDF, AV |
| Tocar abre leitura, não edição | Ajustar | PDF |
| Tarefas de todos os eventos com filtros (situação, responsável, prazo, evento, serviço, tags) e visões lista / quadro por situação / quadro por dia | Ajustar (hoje sem filtros e sem quadro por dia) | AV |
| Redatar prazos quando a data do evento muda | Pronto (SPEC-012 v2, 6.6) | G, AV |

### 5.6. Fornecedores e serviços

| Item | Estado | Fonte |
|---|---|---|
| Catálogo de fornecedores com abas (dados, redes, endereço, banco/Pix, orçamentos, diferencial, portfólio) | Pronto | G (SPEC-018) |
| Importar lista de fornecedores colando ou planilha | Novo | CF |
| Cadastrar dentro do evento e já entrar no catálogo | Pronto | G |
| Negociação em **duas etapas: Orçamento → Contratado** | Ajustar (hoje quatro) | D, PDF, CF |
| Valor e **horário de chegada** do fornecedor no evento | Ajustar (falta horário) | PDF, CF |
| Mensagens prontas para o WhatsApp do fornecedor: pedir orçamento, pedir dados, enviar escala | Novo | PDF, CF |
| "Dados para contrato (copiar)" | Novo | CF |
| Serviços do evento, budget estimado e contratado, subitens | Pronto | G (SPEC-018) |
| Agrupar, ordenar e ocultar serviços do casal | Novo | AV |
| Comparativo de fornecedores, alinhamentos, observações e chat por fornecedor | Novo | AV |
| Mensagem em massa aos fornecedores contratados | Novo | AV |

### 5.7. Convidados, RSVP e mesas

| Item | Estado | Fonte |
|---|---|---|
| Convite por família com convidados; faixa etária; inteira/meia/gratuito; grupos; transfer; planilha; QR; link de RSVP | Pronto | G (SPEC-004, 010) |
| **Colar lista** do WhatsApp com prévia antes de salvar: entende "+ marido", "(3 pessoas)", "Família X - 4", crianças | Novo | D, PDF |
| Pedir a lista ao casal pelo link | Pendente | CF |
| Lead pelo RSVP ("pretende fazer evento em 2 anos") | Pronto | G (SPEC-021) |
| **Mesas**: nome, lugares, observação, convidados atribuídos, livres e ocupados, filtros "sem mesa" e "só confirmados" | Ajustar (hoje só o campo mesa) | D, AV, WP |
| Foto ou PDF da lista com IA | Fora (1.1) | D |

### 5.8. Roteiro, cronograma, briefing e inspirações do evento

As bibliotecas existem. Falta a **instância no evento**, criada do modelo e editada no evento.

| Item | Estado | Fonte |
|---|---|---|
| **Roteiro do dia** no evento, gerado do modelo com horários ajustados ao horário da cerimônia | Novo | PDF, CF |
| Momentos divididos em cerimônia e recepção; nomes de quem entra (cortejo) por momento | Novo | PDF, CF, WP |
| Enviar pelo WhatsApp para equipe e fornecedores; imprimir uma folha do dia | Novo | PDF, CF, WP |
| **Cronograma** no evento (separado do roteiro): seções, informações aos fornecedores, importar modelo | Novo | D, AV |
| Briefing no evento: formulário para conhecer o casal, preenchido por ela ou pelo casal | Novo | D, AV |
| Inspirações no evento: galerias | Novo | AV |

### 5.9. Dinheiro do evento

Separar o que **ela recebe** do casal do que **ela paga** aos fornecedores (IV, WP).

| Item | Estado | Fonte |
|---|---|---|
| Valor do contrato, entrada e nº de parcelas geram todas as parcelas do casal | Ajustar (hoje é o serviço "Assessoria" no passo de criação) | PDF, CF, G |
| **Cobrar**: abre o WhatsApp com mensagem e Pix; texto muda se é lembrete, se vence hoje ou se atrasou | Novo | PDF, CF |
| **Recebi**: valor, forma e data; aceita parcial; **Desfazer** | Novo | PDF, CF |
| Totais Contrato, Recebido e Saldo (contrato − recebido; decidido em 18/11/2026) | Novo | CF |
| Parcelas a fornecedores com entrada, forma, juros, comprovante, pago por | Pronto | G (SPEC-018) |
| Pagamentos do evento por mês e por fornecedor; pagamentos de todos os eventos | Novo | AV |
| Despesas e entradas do evento por categoria | Novo | CF |
| Comprovantes e documentos do evento | Novo | CF, AV |
| Planejamento de budget com exportação para Excel | Ajustar (sem exportação) | AV, G |
| Cobrança automática sem aprovação | Fora | PDF |

### 5.10. Contrato do evento

| Item | Estado | Fonte |
|---|---|---|
| Tela **Contratos** (Admin e Organizer) com vários contratos e campos de mesclagem: dados do contratante, da contratada, do evento, valor e parcelas (SPEC-030 v2, 18/11/2026) | Novo | PDF, CF, usuário |
| "Ver como fica" com os campos destacados | Novo | PDF, CF |
| Aba Contratos no modelo de evento: vincula contratos ao modelo; o evento criado do modelo já vem com eles | Novo | usuário |
| Aba Contratos no evento: ler e imprimir preenchido; enviar ao casal por e-mail um link de leitura sem login que expira | Novo | usuário |
| **Assinatura eletrônica**: fora até escolher a plataforma (pendência 1). Sem simulação | Pendente | D, usuário |
| Valor e parcelas moram no Dinheiro do evento; o contrato só lê | Novo | PDF |
| Modelos de contrato do funil (SPEC-028) | Pronto | G |

### 5.11. Link do casal

Substitui o login `Client` com flags (RF-056, SPEC-001/009).

| Item | Estado | Fonte |
|---|---|---|
| Link sem senha por evento; trocar link desliga o antigo | Novo | D, CF |
| Marca da cerimonialista e mensagem dela no topo; contagem regressiva | Novo | PDF, WP |
| "O que o casal vê", por marcação: andamento das tarefas (marcos, não %), parcelas com Pix, fornecedores contratados, convidados, roteiro, fotos | Novo | PDF, CF |
| Tarefas do casal para ele marcar; só o que tem visibilidade "casal" ou "compartilhada" | Novo | PDF, IV |
| Valores ocultos como opção | Novo | WP |
| **Aprovações**: ela pede o ok (cardápio, decoração, convite), o casal aprova ou pede ajuste, ela recebe e-mail | Novo | D, CF |
| **Código de edição**: o casal edita o que ela liberar sem login | Novo | D, WP |
| **Depoimento** após o evento, que pode ir para a página pública | Novo | D, CF |
| "Ver como o casal vê" | Novo | CF, IV |
| Nada interno vai junto (observações, comparativos, valores se ocultos) | Novo | PDF |

### 5.12. Minha agenda

| Item | Estado | Fonte |
|---|---|---|
| Mês, semana, dia, lista; anterior, próxima, hoje; CRUD; evento aparece | Pronto | G (SPEC-019) |
| Mês em grade de calendário no estilo da referência; "+" por dia abre novo compromisso; clicar no item abre resumo (evento ou compromisso) | Pronto (18/11/2026) | Pedido do usuário |
| Título e descrição; início e fim; local; lembrete por e-mail; participantes; anexo | Ajustar | AV |
| Arrastar para remarcar | Novo | AV |
| Feed iCal (ver 5.1) | Novo | D, CF |
| Integração bidirecional com Google Agenda | Fora | D |

### 5.13. Funil de vendas

Fica na 1.0 e ganha o que faltou (D).

| Item | Estado | Fonte |
|---|---|---|
| Oportunidades, RSVP, contratos, orçamentos, tarefas comerciais, relatórios, modelos de serviço/orçamento/contrato | Pronto | G (SPEC-020 a 028) |
| Quadro em cartões no molde da Hoje (totais por estágio, lead com valor, evento, contato, origem e dias no estágio) | Pronto (20/11/2026) | Usuário (SPEC-020 v2) |
| Lead vira cliente no fim do funil (cadastro de cliente pré-preenchido; lead vai para Contratado) | Pronto (20/11/2026) | Usuário (SPEC-020 v2) |
| Estágios configuráveis (nome, cor, ordem); contratado e descartado fixos | Pronto (20/11/2026) | AV (SPEC-031 parte A) |
| Arrastar o cartão entre colunas | Pronto (20/11/2026), só no computador; no celular segue "Mover para…" | AV (SPEC-031 parte A) |
| Rótulo do estágio: **"Orçamento enviado"** (decidido em 18/11/2026) | Ajustar | AV, G |
| Horários do evento em campos separados (convite, festa, cerimônia, recepção) e endereço completo | Ajustar | AV |
| Data de retorno no cartão ("retornar sex, 20/11") e card "Retornos do funil" na Hoje | Pronto (20/11/2026) | CF (SPEC-031 parte B) |
| Origem do contato em lista fechada + outro | Pronto (20/11/2026) | CF, AV (SPEC-031 parte B) |
| **Proposta por link** com respostas "aceitar / tenho dúvidas / não vou seguir" e status "ainda não foi aberta" | Pronto (20/11/2026); envio por e-mail e aviso por e-mail à dona esperam o canal de e-mail | D, PDF, CF (SPEC-031 parte C) |
| Aviso de contato repetido | Pronto (20/11/2026) | D, PDF (SPEC-031 parte B) |
| Tarefas comerciais com vários responsáveis e observação formatada | Ajustar | AV |
| Modelos de briefing no funil | Novo | AV |
| Parâmetros do modelo de orçamento alinhados à referência | Ajustar | AV |

### 5.14. Financeiro da empresa

| Item | Estado | Fonte |
|---|---|---|
| Recebido no mês, pago no mês, saldo, a receber; a cobrar (atrasadas e 7 dias) | Novo | D, CF |
| Movimento do mês; lançamento avulso de despesa ou entrada, com categoria, ligado a um evento ou "do cerimonial" | Novo | D, CF |
| Despesas fixas | Novo | D, PDF |
| Comissão de fornecedor (BV) | Novo | D, PDF |

### 5.15. Equipe e assistentes

| Item | Estado | Fonte |
|---|---|---|
| Ficha da equipe: nome, contato, nascimento, endereço, Pix/banco, compromissos | Novo | AV, CF |
| Equipe do dia no evento: pessoa, função, hora de chegada; aviso de conflito de agenda | Novo | D, AV, CF |
| "Mandar a escala no WhatsApp" com horários da equipe e dos fornecedores | Novo | PDF, CF |
| Mural de recados para a equipe do dia | Pendente | AV |
| **Assistente com login**: convite por e-mail; "pode ver o financeiro"; "vê todos os eventos / só os dela"; plano, Pix, contrato e página só com a dona | Novo | D, CF |

### 5.16. Aniversários

| Item | Estado | Fonte |
|---|---|---|
| Lembretes de aniversário de casamento (meses e anos), do cliente, da equipe e da assistente | Novo | D, AV |
| Situações: a enviar, envio em atraso, enviado, ignorado; agrupado por semana | Novo | AV |
| Modelos de mensagem por tipo; envio pelo WhatsApp | Novo | AV |

### 5.17. Relatórios

| Item | Estado | Fonte |
|---|---|---|
| Nove relatórios do funil com período e exportação | Pronto | G (SPEC-024) |
| Eventos no ano, contratado, recebido no ano, ticket médio; eventos por mês e por tipo; recebido por mês; fornecedores mais contratados; fechamento por origem do contato | Novo | D, CF |

### 5.18. Resumo do dia

| Item | Estado | Fonte |
|---|---|---|
| Um e-mail por dia, no horário que ela escolher, só quando há algo: tarefas da semana, cobranças, respostas de convidados, retornos do funil | Novo | D, PDF, CF |
| Botões "Recebi" e "Feito" como links no e-mail | Novo | D, PDF |
| WhatsApp | Fora (1.1) | D |

### 5.19. Anexos

| Item | Estado | Fonte |
|---|---|---|
| Anexos em fornecedor, serviço, tarefa e observação | Ajustar (parcial) | G, AV |
| Caixa global de anexos de todos os eventos com filtros | Pendente (RF-073) | AV |

## 6. Fora da 1.0

| Item | Quando | Fonte |
|---|---|---|
| Assistente de IA (comandos, conversa por evento) | 1.1 | D |
| Leitura de foto ou PDF da lista com IA | 1.1 | D |
| Resumo do dia pelo WhatsApp | 1.1 | D |
| Modo dia do evento e check-in (link da recepção sem login, QR offline) | 1.1 | PDF, WP |
| Planta desenhada do salão e mapa da cerimônia | 1.1 | D, WP |
| Integração bidirecional com Google Agenda | Sem data | D |
| Login de fornecedor | Sem data | RF-060 |
| Convite digital, site do evento, lista de presentes, mural, playlist | Não fazer | PDF, RF-079 |
| VIP Pay, Casar.com, loja, MeLink, indicação | Não fazer | RF-079 |
| "Fechou: criar o evento", recibo, checklist do evento, fardamento, tarefas opcionais no modelo, RSVP "Talvez", família e cortejo como lista própria, formato da mesa | Não agora | D |

## 7. Conflitos com requisitos já definidos

**Aplicado em 18/11/2026.** As linhas abaixo e os RFs novos já estão em [requirements.md](requirements.md) (seção 14, item 22). A assistente ganhou a role `Assistant`. A tabela fica como registro.

| RF / decisão | Hoje | Passa a ser |
|---|---|---|
| RF-024, RF-040, RF-083 a RF-086 (três roles) | `Admin`, `Organizer`, `Client` | Entra a role de assistente; o `Client` com login sai |
| RF-045 Assistentes | Fora do corte | 1.0 (5.15) |
| RF-051 Equipe do dia | Fora do corte | 1.0 (5.15) |
| RF-056 Acesso do cliente | Conta `Client` com flags | Link sem senha (5.11) |
| RF-059 Negociação | Quatro etapas | Duas etapas (5.6) |
| RF-061 Tarefas | Situações; responsável único | Grupos + situações, vários responsáveis, visibilidade, prioridade (5.5) |
| RF-066 Mapa de mesas | Observado | 1.0, lista de mesas (5.7) |
| RF-074 Agenda | Data + descrição | Compromisso completo (5.12) |
| RF-075 Funil | Estágios fixos | Estágios configuráveis, proposta por link (5.13) |
| RF-076 Financeiro da assessoria | Fora do corte | 1.0 (5.14) |
| RF-077 Relatórios | Só funil | Funil + financeiros (5.17) |
| RF-080 a RF-082 Tela inicial | Dashboards | Tela Hoje (5.2) |
| RF-049 / SPEC-008 Cadastro do evento | Modelo obrigatório; valor da assessoria logo após criar | Tipo + nome; valor depois (5.3) |
| mvp-scope §3 | Menu igual à Assessoria VIP | Grupos da seção 4 |

**RFs novos**, criados como RF-087 a RF-109 (requirements.md, seção 2.9): marca, Pix, página pública, feed iCal, tela Hoje, colar lista de convidados, roteiro e cronograma no evento, briefing e inspirações no evento, cobrança e recebimento do casal, despesas do evento, contrato do evento com assinatura, link do casal (aprovações, código, depoimento), aniversários, resumo do dia, salvar como modelo, importar modelo colando.

## 8. Specs

| Ação | Specs |
|---|---|
| Revisar | 001 (roles), 003 (tarefas), 007 (vira Hoje), 008 (criação), 009 (cliente sem login), 010 (mesas), 012 (prazos, importar, salvar como modelo), 018 (2 etapas, horário de chegada, WhatsApp), 019 (agenda), 020 (estágios, proposta, campos), 023 (responsáveis), 024 (relatórios), 027 (parâmetros) |
| Manter | 002, 004, 005, 006, 011, 013 a 017, 021, 022, 025, 026, 028 |
| Criar | Casca e navegação; Hoje; marca, Pix e página pública; feed iCal; colar lista de convidados; mesas; roteiro no evento; cronograma no evento; briefing e inspirações no evento; dinheiro do evento (cobrança, recebimento, despesas, comprovantes); pagamentos de todos os eventos; contrato do evento e assinatura; link do casal; equipe e equipe do dia; assistente; financeiro da empresa; aniversários; relatórios financeiros; resumo do dia; proposta do funil; observações gerais do evento; fornecedor no evento (comparativo, alinhamentos, mensagens) |

## 9. Ordem sugerida de construção

Baseada no PDF (base → uso diário → diferencial), com o que já existe.

1. Casca e navegação (celular e computador).
2. Criação do evento curta e resumo em cartões.
3. ~~Modelos: prazos legíveis, importar colando, salvar como modelo.~~ **Pronto** (SPEC-012 v2).
4. Tarefas: lista do evento com "Nova tarefa" em modal, vários responsáveis, visibilidade, prioridade e checklist. **Em código** (SPEC-003 v3). A seção 17 da spec continua sem decisão. Anexos: JPG, PNG ou PDF até 5 MB, fotos reduzidas.
5. ~~Tela Hoje.~~ **Pronto** (SPEC-007 v2).
6. ~~Dinheiro do evento: parcelas do casal, cobrar, recebi, Pix.~~ **Pronto** (SPEC-029), menos comprovantes.
7. ~~Contratos: cadastro com campos de mesclagem, vínculo ao modelo, leitura por link.~~ **Pronto** (SPEC-030 v2). Assinatura pendente.
8. Convidados: colar lista, mesas.
9. Fornecedores: duas etapas, horário de chegada, mensagens.
10. Roteiro e cronograma no evento.
11. Link do casal (aprovações, código de edição, depoimento).
12. Resumo do dia por e-mail.
13. Equipe, equipe do dia e assistente. Assistente na [SPEC-032](specs/032-assistentes.md), rascunho de 20/11/2026; vem antes da SPEC-031 parte D (decisão de 20/11/2026).
14. Financeiro da empresa e relatórios.
15. Agenda completa e feed iCal.
16. Funil: estágios, arrastar, proposta por link. Quadro em cartões e lead → cliente **prontos** em 20/11/2026 (SPEC-020 v2); o resto do bloco está na SPEC-031, aprovada em 20/11/2026, em quatro partes: A (estágios e arrastar), B (retorno, origem e contato repetido) e C (proposta por link) **prontas** em 20/11/2026; D (ajustes do formulário) pendente.
17. Aniversários, página pública, briefing e inspirações no evento, demais itens da Assessoria VIP.

## 10. Pendências

1. Serviço de assinatura eletrônica (5.10). Até a escolha, não há assinatura (SPEC-030 v2, §17).
2. Pedir a lista de convidados ao casal pelo link (5.7).
3. Mural de recados da equipe (5.15).
4. Caixa global de anexos (5.19).
5. Notificações por e-mail do evento (5.3).
6. ~~Redatar prazos ao mudar a data do evento (5.5).~~ Decidido na SPEC-012 v2, seção 6.6.
7. Grupos exatos do menu lateral (seção 4).
