# 010. Convites e convidados completo

**Status: aprovada.** O código segue esta spec, inclusive a revisão do card #22 (seção 18). **Grupos de convite, transfer e a coluna "Grupo do convite" da planilha foram removidos de vez, inclusive do banco e da API (SPEC-036, 21/11/2026); o modelo de planilha tem 10 colunas.** As menções a grupo e transfer abaixo são histórico e não valem. Incremento sobre a SPEC-004. Fonte observada: [inventario-referencia.md](../inventario-referencia.md) §2. O telefone do convite é escolha deste produto: aponta para o convidado principal. **Revisada pela [SPEC-059](059-formulario-unico-de-convite.md) (22/11/2026): o modal de convite virou o formulário único (organizadora e link do cliente), com vários convidados, telefone por convidado (obrigatório no primeiro, que nasce principal) e sem data de envio por convite. A importação por planilha exige o telefone do primeiro convidado de cada convite, que vira o principal, e o botão Planilha padrão abre um modal de instruções com o download (SPEC-059 §6.3). A lista de convites fica recolhida, com os convidados ao expandir (SPEC-059 §6.4).**

## 1. Identificador e nome

SPEC-010. Convites e convidados completo.

## 2. Objetivo

Convite e convidado passam a ter todos os campos vistos na referência, inclusive importação, grupos da conta, QR Code e mesa no cadastro da pessoa. A aba Convidados do evento fica enxuta: três cards por situação e a lista, sem Totais, Transfer nem Grupos.

## 3. Requisitos relacionados

RF-063, RF-064. Fora deste arquivo: RSVP automático (RF-065), mapa operacional além do campo mesa (RF-066), checklist de portaria (RF-067) e o formulário público, que ainda não foi respondido.

## 4. Atores e permissões

O Organizer mantém grupos, convites e convidados do próprio evento. Quem tem o link de RSVP continua no recorte da SPEC-004, sem os campos novos. Admin fica fora do miolo desta spec. Client não gerencia a lista neste corte; acesso a convidados/RSVP via flags fica em RF-056.

## 5. Pré-condições

Evento da conta do Organizer, SPEC-002. A SPEC-004 continua valendo para situações, totais e o link por convite.

## 6. Fluxo principal

1. ~~O Organizer cria grupos pelo nome.~~ Grupos suspensos (seção 18).
2. Cria um convite com nome e, se quiser, observação.

3. Inclui pelo menos um convidado: nome obrigatório; DDI, celular, RSVP, mesa, gênero, faixa, custo e CPF opcionais (o RG saiu, SPEC-037) (CPF validado e gravado sem máscara, SPEC-034).
4. No convite, escolhe o telefone de um convidado deste convite. Esse convidado fica principal e o telefone do convite passa a ser o dele.
5. ~~Com transfer ativo no evento, o convite pergunta se usa o serviço e, se sim, o local de origem.~~ Retirado da aba (seção 18).
6. A lista filtra por situação, telefone e observação. No topo da aba, três cards contam os convidados: Pendentes, Confirmados e Não confirmados.
7. Importação usa a planilha padrão de 11 colunas.
8. Na edição, o convite tem Histórico de mensagens e QR Code, com download e envio por WhatsApp.

## 7. Fluxos alternativos

- Convite sem nome ou sem convidado: a tela exige pelo menos um convidado para salvar o convite novo.
- Escolher como principal um convidado sem telefone, ou de outro convite: não grava essa escolha.
- Transfer Sim sem local de origem: o campo aparece; gravar sem local não foi forçado.
- Importar arquivo que não é `.xlsx` ou `.xls`: o seletor não oferece outro tipo.
- Filtro "só confirmados" no mapa: convidado pendente some da lista da mesa.

## 8. Regras de negócio

- Grupo pertence à conta do Organizer. Padrão visto: Amigos, Amigos da Noiva, Amigos do Noivo, Família da Noiva, Família do Noivo. Criar grupo novo é só o nome.
- Convidado e convite têm telefone. O do convidado é o cadastro da pessoa, com DDI e celular. O do convite não é digitado à parte: o Organizer escolhe um convidado deste convite que já tenha telefone.
 Esse convidado é o principal, e o único. O telefone mostrado no convite é o dele. Trocar a escolha troca o principal. Convidado sem telefone não pode ser escolhido. Sem escolha, o convite fica sem telefone e sem principal. Se o telefone do principal mudar, o convite mostra o número novo. Se o principal sair do convite ou perder o telefone, o convite fica sem telefone e sem principal.
- Situações na lista: Pendente, Confirmado, Não comparecerá. No ícone do convidado a recusa aparece como Cancelado.
- Faixas vistas nos totais: Adulto, Idoso, Adolescente, Criança, Criança de colo.
- Custos: Inteira, Meia, Gratuita. A planilha também traz Free.
- Gêneros na tela: Masculino, Feminino, Não binário. A planilha usa `M` e `F`.
- Transfer é do evento. Local é um nome. A aba Convidados não configura transfer nem pergunta Sim/Não e origem no convite; dados já gravados permanecem.
- Os cards por situação contam convidados (pessoas), não convites. Pendentes = Pendente; Confirmados = Confirmado; Não confirmados = Não comparecerá. Situação sem convidados mostra 0. Os cards ignoram os filtros da lista.
- Mesa no convidado aceita valor novo pela busca.

Colunas da planilha, nesta ordem: Nome do convite *, DDI, DDD + Telefone para confirmação de presença, Grupo do convite, Observação do convite, Nome dos convidados *, Gênero, Faixa etária, Custo/pagamento, Situação, Mesa.

## 9. Validações

Nome do convite e nome do convidado obrigatórios. Situação, faixa, custo e gênero, se preenchidos, só os valores da seção 8. O principal precisa ser um convidado deste convite e ter telefone. Transfer Sim exige local quando o campo está visível. Arquivo de importação só `.xlsx` e `.xls`.

## 10. Estados

Convidado nasce pendente, salvo importação com outra situação. Transfer do evento: desligado ou ligado, com zero ou mais locais.

## 11. Dados necessários

Grupo: nome. Local de transfer: nome. Convite: nome, convidado principal, grupo, observação, usa transfer, local de origem, QR Code. O telefone do convite é o do principal. Convidado: nome, DDI, celular, situação, mesa, gênero, faixa, custo, CPF.

## 12. Interface

Duas visões. Filtros da seção 2.1 do inventário. Modais de convite, convidado e importação. Edição do convite com três abas. Três cards por situação acima da lista; sem os cards Totais, Transfer do evento e Grupos.

## 13. Erros

Validação no campo. Convite de outra conta não revela dado. Planilha inválida: o resultado do erro de importação não foi visto.

## 14. Critérios de aceite

1. Convite novo sem convidado não grava.
2. O convidado grava o próprio celular. No convite, escolher esse telefone marca o convidado como principal e a lista do convite mostra o número dele.
3. ~~Grupo criado na conta aparece no convite.~~ Suspenso: o convite não tem grupo na tela.
4. A aba Convidados não mostra os cards Totais, Transfer do evento e Grupos, nem o campo Usa transfer no convite.
5. A aba mostra os cards Pendentes, Confirmados e Não confirmados com a contagem de convidados, inclusive 0.
6. A planilha padrão tem as 11 colunas da seção 8.
7. QR Code existe na edição do convite, com baixar e enviar por WhatsApp (DDI, celular, mensagem).
8. Outra conta não vê convite nem convidado.

## 15. Cenários de teste

Criar convite com dois convidados, um com celular. Escolher esse celular e conferir o principal. Trocar a escolha. Evento com 2 pendentes, 1 confirmado e nenhum não confirmado: cards 2, 1 e 0. Aba sem Totais, Transfer e Grupos. Abrir a planilha padrão e conferir o cabeçalho. Isolamento entre contas. Importação com arquivo válido ainda não foi executada. Na importação, o telefone da linha do convite grava no convidado daquela linha e esse convidado nasce principal.

## 16. Dependências

SPEC-001, SPEC-002, SPEC-004.

## 17. Premissas e pontos não definidos

Formulário público de RSVP. Resultado de uma importação real. Envio efetivo do WhatsApp do QR Code. O que a aba Histórico mostra depois de um disparo. Excluir todos os convites.

## 18. Revisão do card #22 (a aprovar)

Muda: a aba Convidados perde os cards Totais (faixa e custo), Transfer do evento e Grupos. Os cards por situação, hoje só das situações que têm convidados, passam a ser três fixos e substituem os Totais. Não muda: banco, API e regras de transfer, grupo, faixa e custo. Nada é apagado e não há migration.

Decisões do dono do projeto:

1. **Usa transfer no convite.** Retirado do modal de convite junto com o card Transfer.
2. **Grupos suspensos (decisão posterior do dono).** Nesta fase não há grupo em lugar nenhum da tela de convidados: sem seletor no convite, sem rótulo na lista, sem criar grupo. Fica em aberto como o recurso volta de forma definitiva. (Revisto em 21/11/2026: dados, API e coluna de grupo foram apagados, SPEC-036; se o recurso voltar, é funcionalidade nova com spec própria.) Vale para as regras de grupo da SPEC-010 (fluxo, seção 8, planilha) e da SPEC-004 (itens de grupo), que ficam sem efeito na tela até nova definição.
3. **Clique no card.** Clicar num card aplica o filtro de situação da lista; clicar de novo limpa.
4. **Portaria.** O texto de origem pedia apenas cards separados para pendentes, confirmados e não confirmados. Nada além dos três cards.
