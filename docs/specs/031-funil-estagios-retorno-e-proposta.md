# 031. Funil: estágios, retorno e proposta por link

**Status: rascunho (20/11/2026).** Não é para programar até o usuário aprovar. Fonte: [produto-v1.md](../produto-v1.md) §5.13 (o que ainda não está pronto) e RF-075. Completa a SPEC-020 v2 (quadro em cartões e lead que vira cliente). Os pontos que pedem decisão do usuário estão numerados na §17, cada um com uma sugestão.

## 1. Identificador e nome

SPEC-031. Funil: estágios configuráveis, arrastar, retorno, origem, contato repetido e proposta por link.

## 2. Objetivo

Fazer o quadro do funil refletir o jeito de vender de cada assessoria e reduzir lead esquecido:

- a dona escolhe os estágios do funil;
- move os leads arrastando;
- marca quando precisa retornar cada um;
- registra de onde o lead veio numa lista fechada;
- é avisada quando o contato já existe;
- manda a proposta por um link que mostra se o lead abriu e o que ele respondeu.

## 3. Requisitos relacionados

- **RF-075:** estágios configuráveis, arrastar, data de retorno, origem em lista fechada, aviso de contato repetido e proposta por link.
- **RF-082 / SPEC-007:** a tela Hoje passa a usar os estágios da conta. O card "Retornos do funil" (SPEC-007 §17, item 7) é liberado por esta spec.
- **RF-104:** os retornos do funil entram no resumo do dia por e-mail, quando o resumo for construído.
- **RF-089:** o botão de orçamento da página pública cria lead no primeiro estágio.
- **RF-077 / SPEC-024:** o fechamento por origem do contato usa a lista fechada desta spec.
- **RF-045:** tarefas com vários responsáveis dependem das assistentes.
- **Specs alteradas:** SPEC-020 (estágios fixos → configuráveis), SPEC-025 (orçamento ganha link e resposta), SPEC-023 (vários responsáveis), SPEC-013 (briefing no funil) e SPEC-027 (parâmetros).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer (dona) | Tudo desta spec na própria conta, inclusive gerenciar estágios. |
| Assistant | Usar o quadro, arrastar, marcar retorno e enviar proposta, quando a role existir (RF-045). Gerenciar estágios: só a dona (§17, ponto 2). |
| Lead (sem login) | Abrir o link da proposta e responder. |
| Admin | Acessa qualquer conta. |

## 5. Pré-condições

Conta autenticada (SPEC-001). O quadro da SPEC-020 v2 já está no ar.

## 6. Fluxo principal

### 6.1. Gerenciar estágios

1. No quadro, a dona toca em "Gerenciar estágios" e abre um modal.
2. O modal lista os estágios na ordem do quadro, cada um com nome, cor e quantidade de leads.
3. Ela pode renomear, trocar a cor (paleta fechada do tema), mudar a ordem arrastando, criar e excluir estágios.
4. **Contratado** e **Descartado** são fixos: sempre existem, ficam no fim, nessa ordem, e não podem ser excluídos nem movidos. Podem mudar de cor; o nome fica fixo (§17, ponto 3).
5. Uma conta nova nasce com Contato inicial e Orçamento enviado, mais os dois fixos.
6. Para excluir um estágio que tem leads, o modal pede para onde mover esses leads.
7. Ao salvar, o quadro, os cartões de totais e a tela Hoje passam a mostrar os estágios novos.

### 6.2. Arrastar o cartão

1. No computador, a dona arrasta o cartão de uma coluna para outra.
2. Soltar em Descartado abre o modal de motivo (SPEC-020 v2). Cancelar devolve o cartão.
3. Soltar em Contratado só muda o estágio. "Virar cliente" continua sendo uma ação à parte.
4. No celular, o menu "Mover para…" continua sendo o caminho.
5. Se a gravação falhar, o cartão volta para a coluna anterior e aparece um aviso.

### 6.3. Data de retorno

1. O formulário da oportunidade e o menu do cartão ganham "Retornar em" (data, e opcionalmente hora).
2. O cartão mostra "retornar sex, 20/11": em vermelho quando a data já passou, em amarelo quando é hoje.
3. Leads em Contratado ou Descartado não mostram o retorno.
4. A tela Hoje ganha o card "Retornos do funil", com os retornos de hoje e os atrasados. Tocar abre o lead.
5. Marcar "Retornei" no cartão limpa a data, ou pergunta a próxima (§17, ponto 5).

### 6.4. Origem do contato

1. O campo Fonte vira "Origem", com uma lista fechada (§17, ponto 6) mais "Outro", que abre um texto livre.
2. O formulário público de lead e o botão da página pública preenchem a origem automaticamente ("Formulário do site" / "Página pública").
3. Os textos livres já gravados são convertidos: o que bate com um item da lista vira esse item; o resto vira "Outro" com o texto original.

### 6.5. Aviso de contato repetido

1. Ao criar uma oportunidade, ou ao chegar lead pelo formulário público, o sistema procura na conta outro lead ou cliente com o mesmo telefone (só os dígitos) ou o mesmo e-mail (sem diferenciar maiúsculas).
2. Se achar, o formulário mostra um aviso: "Esse contato já está no funil: {nome}, em {estágio}", com um link.
3. O aviso não bloqueia: a dona decide se grava mesmo assim (§17, ponto 7).
4. Lead que chegou pelo formulário público e repete um contato ganha o selo "Contato repetido" no cartão.

### 6.6. Proposta por link

1. No orçamento da oportunidade (SPEC-025), a dona toca em "Enviar proposta".
2. O sistema gera um link próprio do orçamento e oferece "Copiar link" e "Enviar pelo WhatsApp" (wa.me com texto pronto). E-mail entra quando o canal de e-mail existir (§17, ponto 8).
3. A oportunidade vai para Orçamento enviado, se ainda estiver antes dele.
4. O lead abre o link, sem login, e vê a proposta com a marca da conta, o texto do modelo e o valor.
5. O lead escolhe uma de três respostas: **Aceitar**, **Tenho dúvidas** (com campo de mensagem) ou **Não vou seguir** (com motivo opcional).
6. O cartão mostra a situação da proposta:
   - "Proposta ainda não foi aberta";
   - "Aberta em 20/11";
   - "Aceita", "Com dúvidas" ou "Recusada".
7. Para cada resposta:
   - **Aceitar:** a dona é avisada e o lead ganha o selo "Aceitou". Mover para Contratado continua sendo decisão dela (§17, ponto 9).
   - **Tenho dúvidas:** a mensagem aparece no lead e o retorno é marcado para hoje.
   - **Não vou seguir:** o sistema sugere descartar, já com o motivo informado; a dona confirma.
8. O link vence em uma validade a definir (§17, ponto 10). Um link vencido mostra uma mensagem com o contato da assessoria.

### 6.7. Ajustes do formulário da oportunidade

1. **Horários:** em vez do texto livre, quatro campos de hora separados: convite, cerimônia, recepção e festa.
2. **Endereços:** cerimônia e recepção com endereço completo (CEP, rua, número, bairro, cidade e UF), com busca pelo CEP como no cliente.
3. **Tarefas comerciais (SPEC-023):** vários responsáveis por tarefa, escolhidos entre a dona e as assistentes, e observação com formatação simples (negrito, lista, link).
4. **Briefing no funil:** a dona aplica um modelo de briefing (SPEC-013) ao lead e manda o link para o lead responder antes de fechar (§17, ponto 11).
5. **Modelo de orçamento (SPEC-027):** ganha a lista fechada de parâmetros (§17, ponto 12).

## 7. Fluxos alternativos

- **Conta sem estágios próprios:** usa os quatro de hoje. A migração cria esses quatro como registros da conta, sem mudar nenhum lead de lugar.
- **Lead em estágio excluído:** não acontece, porque a exclusão obriga a escolher o destino.
- **Arrastar para a mesma coluna:** não muda nada.
- **Proposta reenviada:** o mesmo link continua valendo e a situação volta para "ainda não foi aberta" só se o conteúdo mudar (§17, ponto 10).
- **Lead responde duas vezes:** vale a última resposta, e o histórico guarda as duas.
- **Orçamento cancelado:** o link mostra "Esta proposta não está mais disponível".

## 8. Regras de negócio

- Estágios pertencem à conta e têm nome, cor, ordem e um tipo: **aberto**, **contratado** ou **descartado**. Há exatamente um contratado e um descartado, e eles ficam por último.
- **"Em negociação"** (no título do quadro e na Hoje) passa a ser a soma de todos os estágios abertos.
- **O lead público** nasce no primeiro estágio aberto.
- **Limites:** no máximo oito estágios abertos (§17, ponto 4). O nome é obrigatório e não pode repetir na conta.
- **Leitura dos estágios:** relatórios (SPEC-024) e dashboard (SPEC-007) leem os estágios da conta. O relatório de motivos continua olhando o estágio do tipo descartado.
- **Abertura da proposta:** só a primeira abertura pelo lead conta como "aberta". Aberturas pela própria dona, logada, não contam.
- **Resposta da proposta:** fica gravada com data e hora e não pode ser editada pela dona.
- **Contato repetido:** a busca é sempre dentro da conta, nunca entre contas.
- **Origem:** a lista é fechada no produto, igual para todas as contas, com "Outro" para o resto.

## 9. Validações

- **Estágio:** nome de 1 a 40 caracteres, sem repetir na conta, e cor da paleta.
- **Exclusão de estágio com leads:** exige o estágio de destino.
- **Retorno:** a data pode estar no passado, porque serve para registrar algo atrasado.
- **Origem "Outro":** exige o texto livre.
- **Horários:** em formato HH:mm.
- **Resposta "Tenho dúvidas":** exige a mensagem, até 1.000 caracteres.
- **Link da proposta:** um token aleatório que não revela o id; vencido ou cancelado, não aceita resposta.

## 10. Estados

- **Estágio:** aberto, contratado ou descartado.
- **Proposta:** não enviada → enviada (não aberta) → aberta → aceita, com dúvidas ou recusada. O orçamento cancelado sai desse fluxo.
- **Retorno:** sem retorno, futuro, hoje ou atrasado.

## 11. Dados necessários

- **`EstagioFunil`:** id, conta, nome, cor, ordem e tipo. A oportunidade passa a apontar para `EstagioFunilId` no lugar do enum.
- **Oportunidade:**
  - `RetornarEm` (data e hora);
  - `Origem` (item da lista) e `OrigemOutro`;
  - `HoraConvite`, `HoraCerimonia`, `HoraRecepcao`, `HoraFesta`;
  - endereço completo da cerimônia e da recepção;
  - `ContatoRepetido` (bool).
- **Orçamento:**
  - `TokenLink`, `ValidoAte`, `AbertoEm`;
  - resposta (tipo, mensagem, data) e o histórico das respostas.
- **Tarefa comercial:** uma lista de responsáveis.
- **Briefing do lead:** o vínculo com o modelo e as respostas.

## 12. Interface

- **Quadro:** botão "Gerenciar estágios" (só para a dona). As colunas e os cartões de totais usam a cor de cada estágio. No computador, a coluna em que o cartão vai cair fica destacada durante o arrasto.
- **Cartão:**
  - linha de retorno ("retornar sex, 20/11");
  - selo da proposta ("não aberta", "aberta", "aceitou", "com dúvidas", "recusou");
  - selo "Contato repetido".
- **Página pública da proposta:** marca da conta, texto, valor e os três botões. Funciona no celular, que é onde o lead abre.
- **Tela Hoje:** card "Retornos do funil".
- **Geral:** todo cadastro e edição abre em modal, com Angular Material e os tokens do tema.

## 13. Erros

- **Falha ao mover:** o cartão volta e aparece um aviso.
- **Falha ao salvar estágios:** nada muda.
- **Link inválido ou vencido:** a página mostra uma mensagem neutra, sem revelar dados.
- **Item de outra conta:** fica indisponível.

## 14. Critérios de aceite

1. A dona cria, renomeia, recolore, reordena e exclui estágios abertos. Contratado e Descartado não podem ser excluídos nem saem do fim.
2. Excluir um estágio com leads exige o destino, e os leads vão para ele.
3. O quadro, os cartões de totais e a tela Hoje mostram os estágios da conta com quantidade e valor iguais.
4. Arrastar muda o estágio. Soltar em Descartado pede o motivo, e cancelar devolve o cartão.
5. O cartão com retorno vencido aparece em vermelho, e o card da Hoje lista os retornos de hoje e os atrasados.
6. A origem só aceita itens da lista, ou "Outro" com texto.
7. Criar um lead com o telefone ou o e-mail de outro lead ou cliente da mesma conta mostra o aviso, sem bloquear.
8. O link da proposta abre sem login, registra a primeira abertura e aceita uma das três respostas, que aparece no cartão.
9. "Não vou seguir" sugere o descarte, que só acontece se a dona confirmar.
10. Outra conta não vê estágios, leads, propostas nem avisos desta conta.
11. Os leads existentes continuam nos mesmos estágios depois da migração.

## 15. Cenários de teste

- **Estágios:** migração de uma conta com leads nos quatro estágios; criar um quinto estágio entre os dois primeiros; excluir um estágio com leads.
- **Arrastar:** arrastar com falha simulada de rede.
- **Retorno:** retorno de ontem, de hoje e de amanhã.
- **Contato repetido:** telefone com e sem máscara; e-mail com maiúsculas.
- **Proposta:**
  - link aberto pela dona logada, que não conta, e pelo lead, que conta;
  - as três respostas;
  - link vencido;
  - orçamento cancelado.
- **Isolamento:** duas contas.

## 16. Dependências

- SPEC-020 v2, SPEC-007, SPEC-023, SPEC-024, SPEC-025, SPEC-013 e SPEC-027.
- RF-045 (assistentes), para os vários responsáveis.
- O canal de e-mail (produto-v1 §8.5), para enviar a proposta por e-mail e avisar a dona da resposta.

## 17. Premissas e pontos não definidos

Cada ponto traz uma sugestão entre parênteses.

1. **Dividir a spec?** (Sugestão: entregar em três partes, nesta ordem: A = estágios e arrastar; B = retorno, origem e contato repetido; C = proposta por link. Ajustes do formulário, tarefas e briefing ficam para uma parte D.)
2. **Quem gerencia estágios?** (Só a dona.)
3. **Nome dos estágios fixos:** Contratado e Descartado podem ser renomeados? (Não; só a cor muda.)
4. **Limite de estágios abertos.** (Oito.)
5. **"Retornei":** só limpa a data ou já pede a próxima? (Pede a próxima, com "sem próximo retorno" como opção.)
6. **Itens da lista de origem.** (Instagram, Indicação, Google, Página pública, Formulário do site, WhatsApp, Feira ou evento, Fornecedor parceiro, Cliente antigo, Outro.)
7. **Contato repetido:** só avisar ou também oferecer "juntar com o existente"? (Só avisar nesta versão.)
8. **Canal da proposta:** copiar link e WhatsApp agora, e e-mail quando o canal existir? (Sim.)
9. **"Aceitar":** move sozinho para Contratado ou só avisa a dona? (Só avisa; a dona move ou toca em "Virar cliente".)
10. **Proposta:** validade do link e o que acontece quando ela é editada depois de enviada. (30 dias; editar mantém o link e volta a situação para "ainda não foi aberta".)
11. **Briefing no funil:** o lead responde por link antes de fechar, ou o modelo é só um roteiro de perguntas para a dona usar na conversa? (Roteiro interno primeiro; o link para o lead fica para depois.)
12. **Parâmetros do modelo de orçamento.** (`#nome_oportunidade`, `#tipo_evento`, `#data_evento`, `#convidados`, `#local_cerimonia`, `#local_recepcao`, `#valor`, `#validade`, `#nome_assessoria`.)
13. **Vindos da SPEC-020 v2:**
    - "Virar cliente" também cria o evento com tipo, data, convidados e locais? (Sim, com a opção de desmarcar no modal.)
    - Um lead pode virar dois clientes (noiva e noivo)? (Não nesta versão.)
14. **Lista fechada de motivos de descarte** (vinda da SPEC-020). (Preço, Data indisponível, Fechou com outra assessoria, Desistiu do evento, Sem resposta, Outro.)
