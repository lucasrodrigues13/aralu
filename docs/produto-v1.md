# Produto: versão 1.0

**Status: consolidado em 18/11/2026, aguardando revisão do cliente.** Este documento junta, módulo a módulo, o que já está construído no aralu, o que a Assessoria VIP tem, as sugestões do plano "Versão 1.0 em 12 passos" e o que foi visto no Cerimonial Fácil, no Ivola e no WeddingPro. Cada item diz de onde vem e se já existe, se muda ou se é novo.

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

Fontes: **G** aralu construído · **AV** Assessoria VIP · **PDF** plano de 12 passos · **CF** Cerimonial Fácil · **IV** Ivola · **WP** WeddingPro · **D** decisão do cliente em 18/11/2026.

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
| Eventos | Eventos, Tarefas (todos os eventos), Anexos (todos os eventos), Aniversários |
| Comercial | Funil de vendas (oportunidades, oportunidades de RSVP, orçamentos, contratos, tarefas, relatórios) |
| Agenda | Minha agenda |
| Dinheiro | Financeiro da empresa, Relatórios. **Gestão Financeira** (contratos por cliente, SPEC-041) já está no grupo Principal do menu |
| Cadastros | Clientes, Fornecedores, Equipe |
| Conta | Perfil, Marca e página pública, Pix, Ajustes |
| **Modelos** (último grupo; decidido em 21/11/2026; pronto no card #37, SPEC-035, que traz a ordem real do menu) | Todos os modelos num só grupo: evento, briefing, roteiro, cronograma, inspirações, mensagens, serviços do funil, orçamento do funil e **Modelos de Contrato** (feitos; o de contrato é a tela única do card #38, SPEC-039). O que se configura uma vez e muda pouco fica por último |

**Celular:** barra inferior com **Hoje · Eventos · + Novo · Dinheiro · Mais** (PDF). "Mais" abre os outros grupos.

**Dentro do evento:** trilha "Eventos / {evento} / {aba}" e seletor para trocar de evento (PDF, IV). Abas em grupos:

| Grupo | Abas |
|---|---|
| Resumo | Cartões por área e a lista de tarefas do evento |
| Planejar | Tarefas (dentro do Resumo, SPEC-051), Fornecedores e serviços, Roteiro, Cronograma, Briefing, Inspirações, Notas e observações |
| Convidados | Convites e convidados, RSVP e mensagens, Mesas |
| Dinheiro | Pagamentos a fornecedores, Despesas, Comprovantes, Budget (as parcelas do cliente estão no contrato, SPEC-040) |
| Casal | Link do casal, o que ele vê, aprovações |
| Evento | Dados, Equipe do dia, Anexos |

## 5. Módulos

### 5.1. Conta, perfil e marca

| Item | Estado | Fonte |
|---|---|---|
| Cadastro, confirmação, login, senha, lockout, logout | Pronto | G (SPEC-001) |
| Perfil da empresa com foto | Pronto | G (SPEC-005) |
| **Endereço do perfil estruturado** (CEP preenche os demais campos, salvo em campos separados e não como texto livre), usado na contratada dos contratos (decidido em 21/11/2026). **Feito** em 21/11/2026 ([SPEC-038](specs/038-endereco-estruturado-do-perfil.md)): CEP, endereço, número, complemento, bairro, cidade, estado e país; o texto antigo foi descartado na migration | Pronto | usuário |
| **CPF e CNPJ guardados sem máscara**, como texto no banco, em todo o sistema; o **CNPJ aceita letras** (formato alfanumérico que começa a valer no Brasil). A máscara é só de exibição (decidido em 21/11/2026). **Feito** em 21/11/2026 ([SPEC-034](specs/034-cpf-cnpj-sem-mascara.md)): validação dos dígitos verificadores (CNPJ pela regra do SERPRO), migration que normaliza o que já estava gravado | Pronto | usuário |
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
| **Criar em uma tela**: obrigatório tipo e nome (um campo só, "Nome do evento"; casamento com dois nomes vira "A & B"); data, horário, convidados e local opcionais; cliente na mesma tela (existente ou novo com nome e WhatsApp); data digitável | Pronto (SPEC-008 v4, card #19, branch `claude/card-19-cadastro-evento-d18601`) | PDF, CF, IV, G (SPEC-008) |
| O pacote não é escolhido na criação; o modelo de tarefas e roteiro se aplica depois, pelo menu do evento ("Aplicar modelo") | Pronto (SPEC-008 v4, card #19) | PDF, CF |
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
| Responsáveis: ela, assistente, equipe ou casal; **mais de um** | Pronto (20/11/2026) para dona, assistente e casal; equipe fica para a spec de equipe | PDF, AV, D |
| **Visibilidade** por tarefa: só eu / casal / compartilhada | Novo | D, IV |
| **Prioridade** baixa / média / alta | Novo | D, IV |
| Checklist e anexos dentro da tarefa, recolhidos até alguém precisar | Novo | PDF, AV |
| Cada item da checklist tem prazo e um responsável (dona, casal ou assistente); mudar a data do evento move os prazos dos itens abertos de tarefas não concluídas | Pronto (SPEC-003 v4, card #21, branch `claude/card-21-tarefas-item-ce4d93`) | Trello #21 |
| Perguntas e comentários na tarefa | Novo | AV |
| Tarefa ligada a um serviço; contratar o fornecedor fecha "Contratar X" | Novo | PDF, AV |
| Tocar abre leitura, não edição | Ajustar | PDF |
| **A lista de tarefas do evento fica dentro do Resumo** (a aba Tarefas saiu); cartão e alerta de atrasadas levam à lista na mesma tela | Pronto (SPEC-051, card #20); vínculo direto com contrato, documento e pagamento ficou de fora: pede migration (SPEC-051 §17) | Trello #20, WP |
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
| **Gráficos de orçamento no topo da aba Fornecedores (card #29, [SPEC-047](specs/047-graficos-de-orcamento-no-evento.md)):** o botão "Orçamento" e o modal saem; no topo aparecem os indicadores (Orçamento, Estimado, Contratado, Prova real, Por convidado), um gráfico de barra "contratado e estimado frente ao orçamento" (com aviso de excesso) e um gráfico por serviço. Sem biblioteca de gráficos, sem migration, backend inalterado (o `GET /budget` segue em uso); só quem tem a permissão do financeiro vê | Feito (SPEC-047) | Trello #29 |
| **Adicionar fornecedor ao evento (card #28, [SPEC-045](specs/045-contratar-fornecedor-e-contrato-assinado.md)):** escolhe-se o fornecedor e, na sequência, os serviços dele (marcação múltipla, os que ele presta já marcados; os que não existem no evento nascem junto). **Contratar** pede só o valor (sem parcelas, que se definem depois na aba Dinheiro) e aceita o **contrato assinado** pelo fornecedor e pelo casal (JPG, JPEG, PNG ou PDF até 5 MB; anexar, substituir, abrir e excluir pelo menu da linha). A plataforma só guarda o arquivo: não há modelo, leitura nem envio ao casal. Contratar de novo mantém parcelas, pagos, comprovantes e o arquivo assinado. O contrato do fornecedor nasce ao contratar (não mais no primeiro uso do Dinheiro). Migration `ContratoAssinadoDoFornecedor` | Feito (SPEC-045) | Trello #28 |
| Agrupar, ordenar e ocultar serviços do casal | Novo | AV |
| Comparativo de fornecedores, alinhamentos, observações e chat por fornecedor | Novo | AV |
| Mensagem em massa aos fornecedores contratados | Novo | AV |

### 5.7. Convidados, RSVP e mesas

| Item | Estado | Fonte |
|---|---|---|
| Convite por família com convidados; faixa etária; inteira/meia/gratuito; planilha; QR; link de RSVP | Pronto | G (SPEC-004, 010) |
| Aba limpa (card #22): saem os cards Totais, Transfer do evento e Grupos e o campo "Usa transfer" do convite; ficam três cards por situação (Pendentes, Confirmados, Não confirmados) que filtram a lista ao clicar. Grupos de convite e transfer saíram também do banco e da API (SPEC-036, 21/11/2026) | Pronto (SPEC-010/004/036) | Trello #22 |
| **Colar lista** do WhatsApp com prévia antes de salvar: entende "+ marido", "(3 pessoas)", "Família X - 4", crianças | Novo | D, PDF |
| **Link sem login para o casal cadastrar os convites** (nome do convite, telefone, e-mail e convidados; a cerimonialista define a data de envio) | Novo (decidido em 21/11/2026, card do Trello) | CF, D |
| **Confirmação de presença com prazo**: data limite, link expirado, exceção manual da cerimonialista e lista de presença com id único | Novo (decidido em 21/11/2026, card do Trello) | D |
| **Check-in na portaria**: QR code por convite confirmado, link sem login para a equipe da portaria (ler QR e conferir a lista) e marcação de quem compareceu em cada convite. Entra na 1.0 (decidido em 21/11/2026) | Novo | D, PDF, WP |
| Lead pelo RSVP ("pretende fazer evento em 2 anos") | Pronto; fica como está (confirmado em 21/11/2026) | G (SPEC-021) |
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

Separar o que **ela recebe** do casal do que o **casal paga** aos fornecedores (IV, WP).

**Dinâmica (decidida em 21/11/2026):** o dinheiro do orçamento do casamento é do casal. A organizadora não paga nem movimenta esse dinheiro; ela acompanha, informa o casal sobre a saúde financeira e os vencimentos e marca como pago o que o casal informa (depois, o casal marca pelo link, ver 5.11). Os pagamentos a fornecedores existem só dentro de cada evento, sem tela com todos os eventos. A **Gestão Financeira** da organizadora (tela hoje chamada Pagamentos, que vai para o grupo Principal) é só o faturamento pelo serviço prestado: contratos fechados com clientes e parcelas a receber. A organizadora pagar fornecedor parceiro (responsabilidade de pagamento) não entra: o cliente piloto disse que ninguém adota essa prática.

| Item | Estado | Fonte |
|---|---|---|
| **Parcelas por documento (decidido em 21/11/2026):** não existe mais `ParcelaCasal` (nem `ParcelaServico`); os dados antigos podem ser perdidos. As parcelas nascem no **orçamento** do funil (entrada, número de parcelas e vencimentos, mostradas na proposta por link), são copiadas para o **contrato** com o cliente quando ele é gerado, e o **contrato de fornecedor** tem as suas. As três têm a mesma estrutura (valor, vencimento, entrada, recebido ou pago, comprovante). **Implementado (card #41, [SPEC-040](specs/040-parcelas-por-documento.md)):** `ParcelaOrcamento`, `ParcelaContrato` (copiada do orçamento aprovado ao criar o contrato) e `ContratoFornecedor` com `ParcelaContratoFornecedor`; `ParcelaCasal`, `ParcelaServico`, `Evento.ValorContrato`, o serviço Assessoria e Organização e `POST /eventos/{id}/assessoria` saíram do banco e da API, com perda dos dados. O comprovante por parcela entrou com o card #31 (SPEC-043) e o arquivo assinado do fornecedor com o card #28 (SPEC-045, que também tirou as parcelas do botão Contratar: o contrato de fornecedor nasce sem parcelas e elas se definem na aba Dinheiro) | Feito | PDF, CF, G, usuário |
| **Cobrar**: abre o WhatsApp com mensagem e Pix; texto muda se é lembrete, se vence hoje ou se atrasou. Agora na parcela do **contrato com o cliente** (diálogo Parcelas do contrato, aberto da Gestão Financeira, SPEC-041; antes ficava na tela Contratos do funil) | Pronto (SPEC-040) | PDF, CF |
| **Recebi**: valor, forma e data; aceita parcial; **Desfazer**. Na parcela do contrato com o cliente (SPEC-040) | Pronto (SPEC-040) | PDF, CF |
| **Parcelas do mês e atrasadas na Gestão Financeira (card #33, [SPEC-044](specs/044-parcelas-do-mes-e-atrasadas.md))**: no topo, cartões A receber no mês e Atrasadas; havendo atrasadas, lista abaixo com cliente, parcela, Cobrar (WhatsApp) e Recebi. Fica de fora o comprovante do recebimento (exige migration; sem campo hoje) | Pronto (SPEC-044) | CF |
| Totais Contrato, Recebido e Saldo (contrato − recebido; decidido em 18/11/2026). Saíram da aba Dinheiro do evento; estão no diálogo Parcelas do contrato (SPEC-040) e a Gestão Financeira (SPEC-041) os mostra por cliente, com o parcelamento do contrato (1 parcela = à vista) | Pronto (SPEC-040) | CF |
| Pagamentos a fornecedores (card #31, [SPEC-043](specs/043-pagamentos-a-fornecedores.md)): um por serviço contratado do evento; pode ser parcelado (modal com número de parcelas, 1ª data e entrada), expandido para marcar cada parcela como paga (todas pagas = pagamento pago) ou marcado direto como pago (marca todas as parcelas); comprovante (pdf, jpg, jpeg, png) por parcela ou, sem parcelas, por pagamento. Forma de pagamento, juros e "pago por" não existem | Feito | G (SPEC-018) |
| Pagamentos do evento por mês e por fornecedor. **Pagamentos de todos os eventos: fora** (decidido em 21/11/2026; a tela Pagamentos saiu e deu lugar à Gestão Financeira da organizadora, SPEC-041) | Pronto (SPEC-041) | AV |
| ~~Despesas e entradas do evento por categoria~~ Removido em 21/11/2026 (card #31): caixa, API e tabela `LancamentosEvento` apagadas, com os dados; não há alternativa | Removido | CF |
| ~~Comprovantes e documentos do evento~~ Trocado em 21/11/2026 (card #31): a caixa e a tabela `ComprovantesEvento` saíram, com os dados; o comprovante agora é um por pagamento ou parcela (SPEC-043) | Feito | CF, AV |
| Planejamento de budget com exportação para Excel | Ajustar (sem exportação) | AV, G |
| Cobrança automática sem aprovação | Fora | PDF |

### 5.10. Contrato do evento

**Separação (decidida em 21/11/2026):** há dois tipos de contrato, sem relação entre si.

- **Contratos da organizadora com os clientes** (casal): são os únicos que usam **modelos**, campos de mesclagem, "Ver como fica" e, no futuro, assinatura eletrônica. Existe **uma única tela de modelos**, "Modelos de Contrato" (grupo Modelos), usada só para orçamentos aprovados; o modelo de contrato do funil foi unificado nela (21/11/2026). Gerar contrato a partir do funil exige o cliente cadastrado com todos os dados legais. O contrato **não tem vínculo com o evento**.
- **Contratos com fornecedores**: são **arquivos enviados** (o contrato assinado, anexado pela organizadora ao contratar o fornecedor ou subido pelo casal pelo link). Não usam modelo nem mesclagem. A aba Contratos do evento lista só estes, com o fornecedor de cada um (card #30 do Trello).

| Item | Estado | Fonte |
|---|---|---|
| Tela **Modelos de Contrato** (grupo Modelos; Admin e Organizer): única para todo tipo de contrato que a organizadora oferece aos clientes, usada só em orçamentos aprovados. Os campos de mesclagem ficam num seletor com busca e um botão de ajuda (?) que explica como usar e mostra cada campo e de onde o sistema puxa o valor (decidido em 21/11/2026; base na SPEC-030 v2, 18/11/2026) | Ajustar | PDF, CF, usuário |
| "Ver como fica" com os campos destacados | Novo | PDF, CF |
| ~~Aba Contratos no modelo de evento: vincula contratos ao modelo; o evento criado do modelo já vem com eles~~ Removido em 21/11/2026: o contrato não tem vínculo com o evento. **Implementado (card #36, SPEC-030 v3):** saíram a aba do modelo, a aba Contratos do evento, o link de leitura por e-mail com sua página pública, os endpoints de vínculo e os campos de mesclagem `evento_*`, `contrato_valor` e `contrato_parcelas` (voltam, o valor e as parcelas, no contrato do funil, card #39). As tabelas `ContratosDoModelo`, `ContratosDoEvento` e `LinksLeituraContrato` foram apagadas do banco (SPEC-036) | Feito | usuário |
| Aba Contratos no evento: **só contratos com fornecedores, enviados como arquivo** (pela organizadora ou pelo casal), com o fornecedor de cada um (decidido em 21/11/2026, card #30). A plataforma só **recebe** o documento: a negociação, a leitura e a assinatura são entre o cliente e o fornecedor, fora do sistema. A organizadora sobe o arquivo (recebido por fora do fornecedor ou do cliente) ou o próprio casal sobe pelo link dele. Não há ler preenchido, imprimir nem enviar link de leitura para contrato de fornecedor. Esses recursos valem só para o contrato da organizadora com o cliente (modelo); ele não tem vínculo com o evento **Implementado (card #30, [SPEC-048](specs/048-contratos-de-fornecedor-do-evento.md)):** aba Contratos (entre Fornecedores e Dinheiro) só de leitura, com fornecedor, serviço e arquivo (Abrir e Baixar); inclui o que o casal subir pelo link. Sem migration. **Não mostra "quem enviou" nem a data do envio**: o banco não guarda os dois e exigiria migration (SPEC-048 §17) | Feito, com pendência | usuário, Trello #30 |
| **Assinatura eletrônica**: fora até escolher a plataforma (pendência 1). Sem simulação | Pendente | D, usuário |
| O valor e as parcelas vêm do orçamento aprovado e são copiados para o contrato ao gerá-lo; o contrato só lê. Gerar contrato do funil exige os dados do contratante completos, na oportunidade ou no cliente (que não precisa existir antes do fechamento). Todos os dados do cliente ficam disponíveis como tags; o organizador usa os que quiser (decidido em 21/11/2026) | Ajustar | PDF, usuário |
| Modelos de contrato do funil (SPEC-028): unificados na tela Modelos de Contrato (21/11/2026). **Implementado (card #38, SPEC-039):** o item e a rota do funil saíram; o contrato do funil escolhe o modelo da tela única; os modelos antigos foram migrados (`#nome_oportunidade` virou `{{contratante_nome}}`, mesmo Id) e a tabela `ModelosContratoFunil` foi apagada | Feito | G |

### 5.11. Link do casal

Substitui o login `Client` com flags (RF-056, SPEC-001/009).

| Item | Estado | Fonte |
|---|---|---|
| Link sem senha por evento; trocar link desliga o antigo. **Implementado (card #34, [SPEC-046](specs/046-link-do-casal-financeiro.md)):** tabela `LinksCasal`; a dona (menu Mais do evento > Link do casal) gera, copia, troca e desativa; a página pública é `/casal/{código}`. É a base que o card de convites (#23) também usa | Feito | D, CF |
| Marca da cerimonialista e mensagem dela no topo; contagem regressiva | Novo | PDF, WP |
| "O que o casal vê", por marcação: andamento das tarefas (marcos, não %), parcelas com Pix, fornecedores contratados, convidados, roteiro, fotos | Novo | PDF, CF |
| Tarefas do casal para ele marcar; só o que tem visibilidade "casal" ou "compartilhada" | Novo | PDF, IV |
| Valores ocultos como opção | Novo | WP |
| **Acesso ao financeiro do evento pelo link**, quando a organizadora liberar: o casal marca como paga cada parcela ou pagamento de fornecedor, sobe o contrato assinado do fornecedor e os comprovantes e gerencia as parcelas de fornecedor. Fica de fora a Gestão Financeira da organizadora (decidido em 21/11/2026; card do Trello). **Implementado (card #34, SPEC-046):** uma marcação só na janela do link, "O casal acessa o financeiro do evento" (nasce fechada); liberada, a página do casal mostra os pagamentos a fornecedores e deixa marcar parcela ou pagamento como pago (sem confirmação da organizadora, que pode desfazer), parcelar, subir e excluir comprovante e contrato assinado | Feito | D |
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
| Tarefas comerciais com vários responsáveis e observação formatada | Pronto (20/11/2026) | AV (SPEC-031 parte D) |
| Modelos de briefing no funil | Pronto (20/11/2026), como roteiro interno | AV (SPEC-031 parte D) |
| Parâmetros do modelo de orçamento alinhados à referência | Pronto (20/11/2026) | AV (SPEC-031 parte D) |
| **Parcelas no orçamento**: entrada, número de parcelas e vencimentos, exibidos na proposta por link antes do aceite (decidido em 21/11/2026). Modelo e API do card #41 (SPEC-040); tela de parcelar e parcelas na proposta por link no card #44 ([SPEC-042](specs/041-parcelas-no-orcamento-do-funil.md)). Mudar as parcelas depois do envio zera o aceite | Pronto (SPEC-041) | usuário |
| **Dados do contratante na oportunidade**: nome, CPF/CNPJ (campo único com máscara dupla), estado civil, nacionalidade, nascimento, profissão, e-mail, celular e endereço completo, sem RG. Pedidos quando o lead está disposto a fechar ("Para fechar, preencha mais dados para gerar o contrato"); o contrato só é gerado com eles completos. Quem preenche: o cliente, pela tela de aceite da proposta; num lead manual, a organizadora coleta e preenche, ou copia o link da tela de aceite e envia ao cliente. Estado civil e nacionalidade entram também no cadastro de cliente. Assim o lead só vira cliente ao fechar, com o cadastro pré-preenchido (sobram redes sociais e dados menos relevantes). Dados sensíveis são excluídos se o lead for descartado (decidido em 21/11/2026). **Feito** em 21/11/2026 ([SPEC-049](specs/049-dados-do-contratante-na-oportunidade.md), migration `DadosDoContratante`, nada apagado do banco): o aceite da proposta por link exige nome, CPF/CNPJ, estado civil, nacionalidade, e-mail, celular e endereço completo; botão "Copiar link da tela de aceite" no cadastro; descartar apaga CPF/CNPJ, nascimento e endereço | Pronto (SPEC-049) | usuário |
| Cadastro de oportunidade reorganizado: informações relacionadas em sequência (contato, evento, locais, comercial, dados para contrato) | Pronto (SPEC-049) | usuário |
| **RG removido** do cadastro de cliente e de convidado: não é mais exigido no Brasil; vale o CPF (21/11/2026). Cadastro de cliente com **CPF/CNPJ em campo único** com máscara dupla ([SPEC-037](specs/037-rg-fora-e-documento-unico-do-cliente.md)) | Pronto | usuário |

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
| **Assistente com login**: convite por e-mail; "pode ver o financeiro"; "vê todos os eventos / só os dela"; plano, Pix, contrato e página só com a dona | Pronto (20/11/2026), exceto excluir o que ela criou, pendências da Hoje e Admin (SPEC-032 §18) | D, CF |

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
| Modo dia do evento completo e QR offline (o check-in na portaria com link sem login entrou na 1.0, ver 5.7) | 1.1 | PDF, WP |
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
6. ~~Dinheiro do evento: parcelas do casal, cobrar, recebi, Pix.~~ **Pronto** (SPEC-029), menos comprovantes. As parcelas do casal viraram parcelas do contrato (card #41, SPEC-040).
7. ~~Contratos: cadastro com campos de mesclagem, vínculo ao modelo, leitura por link.~~ **Pronto** (SPEC-030 v2). Assinatura pendente.
8. Convidados: colar lista, mesas.
9. Fornecedores: duas etapas, horário de chegada, mensagens.
10. Roteiro e cronograma no evento.
11. Link do casal (aprovações, código de edição, depoimento).
12. Resumo do dia por e-mail.
13. Equipe, equipe do dia e assistente. Assistente na [SPEC-032](specs/032-assistentes.md), aprovada e implementada em 20/11/2026 (faltam os itens da §18). Equipe e equipe do dia seguem sem spec.
14. Financeiro da empresa e relatórios.
15. Agenda completa e feed iCal.
16. Funil: estágios, arrastar, proposta por link. Quadro em cartões e lead → cliente **prontos** em 20/11/2026 (SPEC-020 v2); o resto do bloco está na SPEC-031, aprovada em 20/11/2026, em quatro partes: A (estágios e arrastar), B (retorno, origem e contato repetido) e C (proposta por link) **prontas** em 20/11/2026; D (ajustes do formulário) **pronta** em 20/11/2026.
17. Aniversários, página pública, briefing e inspirações no evento, demais itens da Assessoria VIP.

## 10. Pendências

1. Serviço de assinatura eletrônica (5.10). Até a escolha, não há assinatura (SPEC-030 v2, §17).
2. ~~Pedir a lista de convidados ao casal pelo link (5.7).~~ Decidido em 21/11/2026: entra na 1.0 (card do Trello).
3. Mural de recados da equipe (5.15).
4. Caixa global de anexos (5.19).
5. Notificações por e-mail do evento (5.3).
6. ~~Redatar prazos ao mudar a data do evento (5.5).~~ Decidido na SPEC-012 v2, seção 6.6.
7. Grupos exatos do menu lateral (seção 4).
