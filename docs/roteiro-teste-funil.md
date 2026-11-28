# Roteiro 1: do primeiro contato ao contrato fechado

**A história.** Júlia é dona do *Ateliê Júlia Cerimonial*. Numa segunda-feira, Marina chama no Instagram: vai casar com Rafael daqui a 8 meses, 150 convidados. Este roteiro acompanha a Júlia da preparação da conta até a Marina assinar e virar cliente. O que acontece depois (montar e rodar o casamento) está no [Roteiro 2](roteiro-teste-evento.md).

**Como usar.** Siga em ordem. Cada linha é: o que fazer **→** o que conferir. Marque `[x]`. Se não bater, anote na tabela do fim.

**Antes de começar**
- Conta de teste. Duas janelas: normal (Júlia, logada) e **anônima** (Marina, sem login). Todo link público abre na anônima.
- Um segundo e-mail (para a assistente, no Roteiro 2).
- Dados: Marina Alves (noiva, quem assina), Rafael Costa (noivo), (11) 98888-1111.

---

## 1. A Júlia arruma a casa

*Antes de vender, ela deixa tudo pronto para só escolher depois.*

**Perfil** (menu Principal)
- [ ] Preencha empresa, responsável, CPF/CNPJ (campo único), endereço com CEP, celular, **Chave Pix** e logo → o CEP completa o endereço; o nome aparece no topo do sistema.
- [ ] Abra **Hoje** → checklist de configuração (perfil, Pix, contrato…) aparece e dá para **Pular**.

**Modelos** (último grupo do menu)
- [ ] **Modelos de serviços**: crie "Assessoria completa" (R$ 8.000) e "Assessoria do dia" → nome vazio ou descrição > 200 caracteres não grava.
- [ ] **Modelo de orçamento**: texto com `#nome_oportunidade`, `#data_evento`, `#convidados`, `#valor`, `#validade`, `#nome_assessoria`. No campo **HTML da tela de aceite** cole uma apresentação curta (título, foto, depoimento) e um `<script>` → a prévia já mostra o HTML sem o script.
- [ ] **Modelos de Contrato** → **Novo modelo**. Cole um contrato e insira tags pelo campo **Inserir tag no cursor** (busca por "cpf", "valor", "parcelas") → a tag entra onde está o cursor.
- [ ] Toque no **?** → tabela de todas as tags, com origem e exemplo.
- [ ] **Live Preview** → painel "Como chega ao cliente" atualiza a cada tecla; uma tag inventada (`{{xyz}}`) fica amarela com aviso.
- [ ] Suba **Logo** e **Imagem de fundo** → aparecem no preview; arquivo que não é JPG/PNG/WebP até 5 MB é recusado. Salve.
- [ ] **Modelos de briefing**: "Primeira conversa" com 5 perguntas (data, convidados, estilo, orçamento, o que não pode faltar). Teste **Clonar**.

**Estágios** (Funil de vendas > Oportunidades > Gerenciar estágios)
- [ ] Crie **Reunião marcada** entre Contato inicial e Orçamento enviado; troque a cor → o quadro mostra a nova coluna.
- [ ] Tente renomear/excluir Contratado ou Descartado, e criar nome repetido → não deixa.

---

## 2. A Marina chega

*A Júlia manda o link do formulário pelo direct.*

- [ ] Oportunidades > **Link do lead** (copia). Na anônima, preencha como Marina e envie → lead em **Contato inicial**, nome "Casamento Marina", origem Formulário do site.
- [ ] **Nova oportunidade** manual: "Casamento Camila e Bruno", origem Instagram → sem nome ou sem contato não grava.
- [ ] Abra o lead da Marina. Confira os blocos: **Contato · Evento · Locais · Comercial · Dados para contrato**.
- [ ] Adicione o Rafael como contato e marque a Marina como **É o contratante** → nome, e-mail e celular dela vão para "Dados para contrato". Só um contato pode ser o contratante.
- [ ] Preencha data prevista num dia com compromisso na **Minha agenda** → aviso "Já há compromisso…", sem bloquear.
- [ ] Nova oportunidade com o telefone da Marina escrito de outro jeito → aviso "Esse contato já está no funil", sem bloquear. Pelo formulário público → selo **Contato repetido**.

---

## 3. A primeira conversa

- [ ] Cartão da Marina > **⋮ > Briefing** > modelo "Primeira conversa"; responda e salve → reabre com as respostas. Editar o modelo depois não muda o lead.
- [ ] **Retornar em**: ontem (vermelho), hoje (amarelo), amanhã (neutro) em três leads → **Hoje** lista os de hoje e atrasados em "Retornos do funil".
- [ ] No atrasado, **Retornei** → pede a próxima data (ou "sem próximo retorno").
- [ ] **Tarefas do funil**: uma de cada tipo (Reunião, Ligação, E-mail, Tarefa) com prazo e responsável → nasce em Incompletas; concluir leva a Completas; filtros funcionam.

---

## 4. A Júlia move o funil

- [ ] Arraste a Marina para **Reunião marcada** → totais da coluna e do topo atualizam.
- [ ] Use **⋮ > Mover para…** e a ação rápida do pé do cartão.
- [ ] Busque, filtre (responsável, tipo, data), **Limpar** e **Exportar** → baixa `oportunidades.csv` só com o filtrado.

---

## 5. Proposta por link

*Depois da reunião, a Júlia manda o orçamento pelo WhatsApp.*

**Funil de vendas > Orçamentos**
- [ ] **Novo orçamento**: oportunidade da Marina, depois o modelo → os `#parâmetros` viram os dados do lead.
- [ ] Ícone **Parcelas**: entrada de 30% + 5 parcelas → diálogo mostra as parcelas; a soma bate com o valor.
- [ ] **Enviar proposta** → modal com link, **Copiar link** e **Enviar pelo WhatsApp**; lead vai para **Orçamento enviado**; cartão diz "Proposta ainda não foi aberta".
- [ ] Abra o link logada → aviso "Você está vendo como assessoria", botões desligados, não conta como aberta.

**Na anônima, como Marina**
- [ ] Abra o link → logo da Júlia, texto, **HTML de apresentação** (entre o texto e o valor), valor e **Forma de pagamento** com as parcelas. Cartão passa a "Aberta em…".
- [ ] **Tenho dúvidas** ("dá pra parcelar em 6?") → dúvida no cartão, retorno do lead para hoje, orçamento segue Em andamento.
- [ ] (Júlia) Edite o valor ou refaça as parcelas e salve → proposta volta a "não foi aberta"; mesmo link. Mudar o valor apaga as parcelas: refaça.
- [ ] **Aceitar** → pede "Para fechar, preencha mais dados para gerar o contrato". Tente sem CPF → diz o que falta. Preencha CPF, estado civil, nacionalidade, endereço com CEP e confirme.
- [ ] Cartão com selo **Aceitou**; orçamento em **Respondidos**; lead **não** vai sozinho para Contratado.
- [ ] Tente editar o orçamento aceito → "Só orçamentos em andamento podem ser editados".

**Outros caminhos** (use leads extras)
- [ ] **Registrar resposta** (cliente respondeu por telefone): teste Aceitou, Tem dúvidas, Não vai seguir → não conta como abertura do link.
- [ ] **Não vou seguir** pelo link → "Recusada"; **Descartar** já traz o motivo.
- [ ] **Cancelar** um orçamento e abrir o link → "Esta proposta não está mais disponível".
- [ ] No lead, seção Dados para contrato, **Copiar link da tela de aceite** → só funciona depois do orçamento enviado.

---

## 6. A Camila desiste

- [ ] Mova a Camila para **Descartado** → pede motivo (Preço, Data indisponível…) e avisa que CPF, nascimento e endereço serão apagados. Sem motivo não grava.
- [ ] Volte o lead para um estágio aberto → motivo limpo; CPF/endereço continuam vazios.

---

## 7. O contrato

*Marina aceitou e mandou os dados. A Júlia gera o contrato sem precisar cadastrar cliente antes.*

**Funil de vendas > Contratos**
- [ ] **Novo contrato** num lead **sem** orçamento aprovado → "Esta oportunidade ainda não tem orçamento aprovado…".
- [ ] Num lead com aceite registrado por telefone mas sem CPF → "Faltam dados do contratante… CPF/CNPJ, estado civil…".
- [ ] Marina + modelo → gera em **Em andamento**, com todas as tags preenchidas (nome, CPF, endereço, data do evento, valor, parcelas, dados da Júlia). Tag sem dado vira `________`.
- [ ] **Ver contrato** → folha com logo e fundo; **Imprimir** sai com o fundo.
- [ ] **Enviar** → "Envio registrado", situação "Enviado em…" (o sistema não manda nada; a Júlia envia por fora).
- [ ] **Assinar** → vai para **Assinados** (registro manual; assinatura eletrônica ainda não existe).
- [ ] Trocar a logo do modelo depois → contrato já gerado não muda.

---

## 8. O dinheiro da Júlia

*A entrada da Marina cai no Pix.*

**Principal > Gestão Financeira**
- [ ] Contrato da Marina na lista com valor, recebido, saldo e selo **N parcelas**; totais Contratado / Recebido / A receber.
- [ ] Cartões do topo **A receber no mês** e **Atrasadas** → não mudam com filtro ou busca.
- [ ] **Parcelas do contrato** > **Cobrar** na entrada → abre WhatsApp com texto e Pix.
- [ ] **Recebi**: metade da entrada, depois o resto → parcela quitada; receber mais que o saldo não grava. **Desfazer último recebimento** volta.
- [ ] Num contrato sem recebimento, **Refazer parcelamento** (1 parcela = à vista) → substitui. Com recebimento → não deixa.
- [ ] Em outro contrato sem recebimento, refaça o parcelamento com a 1ª parcela no mês passado → aparece em **Parcelas atrasadas** com Cobrar e Recebi.
- [ ] **Hoje** → "Cobranças a fazer" lista parcelas até 7 dias e leva à Gestão Financeira.

---

## 9. Marina vira cliente

- [ ] Cartão > **Virar cliente** → cadastro já preenchido: nome, CPF, nascimento, estado civil, nacionalidade, e-mail, celular, endereço, observação "Veio do funil…".
- [ ] Salve → "Marina agora é cliente. O lead foi para Contratado."; selo **Cliente** no cartão; o botão some.
- [ ] Edite a Marina em **Clientes** → a oportunidade não sobrescreve o cliente depois.
- [ ] Exclua um cliente de teste sem evento → some; o lead continua em Contratado sem o selo.

---

## 10. Os números do mês

**Funil de vendas > Relatórios** (período que inclua os testes)
- [ ] Confira os 9: fechados x perdidos, fonte, serviço, estágio, região, responsável, data prevista, motivos de descarte, RSVP → Marina em Contratado, Camila em Descartado com o motivo.
- [ ] Período vazio → tudo zerado, sem erro. **Exportar** funciona.
- [ ] **Hoje** → números do funil batem com o quadro.

---

## 11. Limites e isolamento (rápido)

- [ ] Segunda conta não vê nada da primeira (leads, orçamentos, contratos, clientes, relatórios).
- [ ] Link de proposta com token inventado → mensagem neutra.
- [ ] Excluir estágio com leads → exige estágio de destino. Nono estágio aberto → recusado.
- [ ] Celular: quadro em coluna, "Mover para…" funciona, proposta pública legível.

---

## Pendências

| Passo | Esperado | Aconteceu |
|---|---|---|
| | | |
