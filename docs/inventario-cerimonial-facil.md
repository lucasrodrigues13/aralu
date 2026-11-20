# Inventário: Cerimonial Fácil

**Status: observado.** Leitura de 18/11/2026 em cerimonialfacil.com.br, na conta de teste do cliente (eventos "Casamento Teste — Ana e Bruno" e um contato de funil de teste). Só leitura: abri formulários sem salvar. Organizado pelos passos de [analise-plano-v1.md](analise-plano-v1.md). Nada aqui é requisito aprovado.

Plano: R$ 49,90/mês, tudo ilimitado. Web responsiva + "Instalar no celular" (PWA, rota `/celular` com QR).

## 1. Navegação

Menu lateral: Novo evento, Agenda (`/painel`), Presente Fácil, Vendas, Financeiro, Clientes, Fornecedores, Equipe, Relatórios, Ajustes, Ajuda, Sugerir melhoria, Instalar no celular, Tema noite, Sair. No celular, barra inferior com Presentes, **Novo**, Mais.

Botão flutuante **Assistente** (fale ou escreva; "Nada é gravado sem você conferir e tocar em Confirmar") com atalhos: "O que eu tenho essa semana?", "Quanto tenho pra receber este mês?", "Novo contato: …", "Manda a cobrança de quem está atrasado". Também "Gravar reunião" (presencial ou online).

## 2. Tela inicial / "Hoje" (`/painel`) — passo 4

- Saudação com data ("Quarta, 18 de novembro · Boa tarde").
- Vídeos curtos de onboarding com "Assistir agora / Ver depois"; aviso que "volta amanhã" com "Lembrar amanhã".
- Checklist de configuração "1 de 5 feitos": modelo de contrato, lista de fornecedores, chave Pix, logo e cor, página pública, equipe — cada um com "Pular este passo".
- Quatro números: **Próximo evento** (dias, nome, data/hora), **Tarefas na semana** ("nada atrasado"), **A cobrar em 7 dias** (R$ e nº de parcelas), **Precisa de você** (lista de ações: "1 contato pra retornar hoje", "Mande o acesso pro cliente", com botão que leva à tela).
- **Agenda**: Próximos / Passados; cartão por evento com mês/dia/semana, nome, tipo · hora · cliente, "faltam N dias", situação (ex.: Orçamento) e tarefas feitas/total (1/27).

## 3. Novo evento (`/eventos/novo`) — passo 1

1. Escolhe o **tipo** em cartões, cada um mostrando o que vem pronto: Casamento (25 tarefas · 20 momentos), 15 anos (22 · 17), Formatura (16 · 15), Corporativo (12 · 12), Aniversário (12 · 9), Bodas (12 · 9), Outro (5 · 3). Os modelos próprios aparecem primeiro.
2. Formulário curto: **Nome do evento*** (único obrigatório), Data (campo nativo, digitável), Horário de início, Convidados previstos, Local, **Cliente** (seleciona existente ou "+ Cliente novo": Nome, WhatsApp, E-mail opcional), Valor do contrato, Situação (Fechado / Ainda em orçamento).
3. Extras: "Traga todos de uma vez" (lista, foto, PDF ou planilha → IA cria vários eventos) e registrar eventos passados em sequência.

Editar (aba **Dados**): mesmos campos + Situação (Orçamento, Fechado, Realizado, Cancelado), Observações, dados do cliente (inclui CPF/CNPJ), **Excluir evento** (dentro de Dados, não no cartão) e **Salvar como modelo** ("as tarefas com prazo em dias antes e o roteiro deste evento viram um modelo seu").

## 4. Evento (`/eventos/{id}`)

Cabeçalho: data, nome, hora · faltam N dias · local; cliente com telefone e botões **Ligar**, **WhatsApp**; ações **Contrato**, **Recepção** (modo dia/check-in), **Editar evento**, **Dossiê do dia**, **Gravar reunião**.

Abas em grupos (base do PDF):

| Grupo | Abas |
|---|---|
| — | Resumo |
| Planejar | Tarefas (1/27), Roteiro (20), Fornecedores (1), Equipe, Fotos, Checklist |
| Convidados | Convidados (12), Site e presentes, Mural |
| Dinheiro e cliente | Financeiro, Acesso do cliente |
| Evento | Notas, Dados |

**Resumo**: um cartão por área com uma frase e um link: Tarefas "1/27 feitas · 1 pra esta semana · Próxima: …"; Financeiro "R$ 3.000 de R$ 12.000 · Parcela 1 de 5: R$ 1.800 · vence 10/12"; Convidados "12 pessoas em 6 convites · 0 confirmadas · 1 convite com mesa"; Fornecedores "1 contratado · R$ 25.000 em contratos"; Roteiro "20 momentos · Começa às 17:00"; Equipe "0 pessoas na escala"; Acesso do cliente "O cliente ainda não abriu o link"; Notas. Acima, alertas acionáveis ("Mande o acesso pro cliente · Mandar").

### 4.1. Tarefas — passo 3

- Grupos fixos: **Próximos 7 dias**, **Depois**, **Sem prazo**, **Para conferir (o prazo já tinha passado quando você pegou o evento)**, **Feitas** ("feita por {pessoa}").
- Linha: título, "até {dia da semana}, dd/mm/aaaa", "+ responsável" (Cliente ou pessoa da equipe), "+ prazo" quando não há.
- Tarefas com responsável "Cliente" aparecem no link do cliente para ele marcar.
- Prazos do modelo contados da **data do evento**; o que já passou vai para "Para conferir", não vira "atrasada".

### 4.2. Checklist (`aba=orcamento`)

"Tudo o que este evento vai ter": itens com Grupo, Valor e Mês previsto (opcionais). **Colar uma lista**: cada linha vira item e os títulos viram grupos. Itens da proposta fechada no funil entram sozinhos. É o equivalente leve do "planejamento de budget" da Assessoria VIP.

### 4.3. Roteiro — passo 9

- Montar com IA ou "Usar um modelo de roteiro" (Casamento, Casamento católico, Casamento evangélico, 15 anos, Formatura, Corporativo, Aniversário, Bodas, Outro). "Salvar como modelo".
- Filtro **Cerimônia (9) / Recepção (11) / Tudo**.
- Momento: horário, título, responsável/local (Cerimonial, Celebrante, Fotógrafo), música, **"Nomes de quem entra"** em formato Sem nomes / Uma lista / **Dois lados** (cortejo). "+ Novo momento" com "Faz parte da cerimônia".
- "Mandar a cerimônia no WhatsApp", "Imprimir a cerimônia".
- **Script do mestre de cerimônias**: texto livre com modelos (15 anos, Casamento católico, Casamento evangélico), salvo automaticamente. É o que a Assessoria VIP separa como outro documento.

### 4.4. Convidados — passo 7

- Adicionar: "Família no mesmo convite? Escreva o nome de cada um, separado por vírgula".
- **Colar a lista**, **Foto ou PDF da lista**, **Pedir a lista pro cliente**.
- Contadores: pessoas, confirmaram, sem resposta, **chegaram**.
- Ações: Mandar convites, Recepção, Planilha, Imprimir, Imprimir QR de entrada. Visões **Por nome / Por mesa / Mapa do salão**.
- Linha: "Carla Teste + marido · 2 pessoas", grupo (Amigos do trabalho, Prima, Tio), mesa, "sem convite", Convidar, Editar. O parser entende "+ marido" e "(3 pessoas)".
- Ajustes da lista: "Qualquer pessoa com o link confirma · só a equipe monta a lista" (ou equipe e cliente).
- Não há faixa etária nem inteira/meia/gratuito (ponto forte da Assessoria VIP, mantido no PDF).

### 4.5. Financeiro do evento — passo 5

- Topo: **Contrato** R$ 12.000, **Recebido** R$ 3.000, **A receber** R$ 9.000, **Resultado** (contrato − despesas).
- "Parcelas do contrato": Entrada "recebida ter, 17/11/2026 · Pix" com **Recibo**, **Desfazer**, Editar, ✕; "Parcela 1 de 5 · vence qui, 10/12/2026 · R$ 1.800,00" com **Cobrar**, **Recebi**, Editar, ✕; "+ Adicionar parcela".
- Aviso: "Cadastre a sua chave Pix em Ajustes pra cobrança já ir com o Pix copia-e-cola."
- **Despesas e entradas do evento**: "+ Lançamento" Despesa/Entrada, Categoria (Equipe, Transporte, Alimentação, Material, Fornecedor, Marketing, Aluguel, Impostos, Outros), "Já paguei".
- **Comprovantes e documentos**: tipos Contrato, Orçamento, Comprovante, Outro; PDF, foto, Word ou Excel até 8 MB; "Só a sua equipe abre".

### 4.6. Fornecedores do evento — passo 8

- Topo: R$ contratado (N fornecedores) e R$ em orçamento.
- Linha: nome, situação (**Contratado** / em orçamento), serviço, valor; **Dados p/ contrato (copiar)**, Arquivos, Alinhamentos, Editar.
- "+ Cadastrar fornecedor novo · a agenda completa fica em Fornecedores".

### 4.7. Equipe do dia

Pessoa, função e **hora de chegada**; nomes sugeridos da Equipe e de quem já trabalhou. **"Mandar a escala no WhatsApp"** monta a mensagem com o horário de cada um e dos fornecedores contratados. "Essas pessoas não entram no sistema."

### 4.8. Acesso do cliente — passo 10

- Link **sem senha** (`/cliente/{token}`), "Mandar pro cliente", "Copiar mensagem", **"Ver como o cliente vê"**, **"Trocar link"** (desliga o antigo).
- "O que o cliente vê" (marcações): Andamento (tarefas; as do cliente sempre), Parcelas do contrato (com Pix), Fornecedores contratados (valor e quanto foi pago), Convidados (quantos confirmaram + link do site), Roteiro do dia, Fotos dos preparativos (ele também envia).
- **Aprovações**: "+ Pedir aprovação" (cardápio, decoração, convite); cliente responde aprovado ou pede ajuste; ela recebe e-mail.
- Depois do evento: cliente baixa fotos do mural e deixa **depoimento** (vai para a página pública se ela publicar).
- Status: "O cliente ainda não abriu o link dele".

### 4.9. Fora do PDF (só registro)

Site e presentes (Presente Fácil, Pix na conta do cliente, CPF para liberar), Mural de fotos com QR nas mesas e telão, Fotos, Notas, Dossiê do dia, Gravar reunião.

## 5. Vendas (`/funil`)

- Topo: **Em negociação** (qtd), **Em jogo** (R$), **Fechamento** (%).
- Colunas fixas: Novo contato, Em conversa, Reunião, Proposta enviada, Fechado, Perdido. Cartão: nome, data prevista · origem, valor, **"retornar {data}"**, atalho WhatsApp.
- Contato (`/funil/{id}`): estágio em botões, **"Fechou: criar o evento"**, Apagar, Gravar reunião de venda. Dados: Tipo de evento, **Como chegou** (Instagram, Indicação, WhatsApp, Google, Site, Site de evento, Feira/evento, Fornecedor parceiro, Outro).
- **Propostas**: "+ Nova proposta"; item "Proposta de assessoria · Aguardando · R$ 9.000 · ainda não foi aberta" com Copiar link, Ver, Editar, Apagar. A proposta é um link que o cliente abre (o PDF cita respostas "aceitar / tenho dúvidas / não vou seguir").

## 6. Financeiro da empresa (`/financeiro`)

Mês corrente: Recebido no mês, Pago no mês, Saldo do mês, A receber. "A cobrar: atrasadas e próximos 7 dias". "Movimento de {mês}" com cada entrada/saída (evento, cliente, Desfazer). "+ Lançamento" com Despesa/Entrada, Categoria e **evento ou "Sem evento (do cerimonial)"**.

## 7. Fornecedores (`/fornecedores`), Equipe (`/equipe`), Relatórios

- Fornecedores: agenda agrupada por serviço (BUFFET …) com "N eventos"; **Importar uma lista com IA**.
- Equipe: gerentes, assistentes e freelancers; ficha com foto, WhatsApp, nascimento, endereço, condução, Pix e **tamanhos de blusa, calça e calçado** (o sistema soma para o fardamento na escala).
- Relatórios (por ano): Eventos no ano, Contratado, Recebido no ano, Ticket médio; Eventos por mês; Recebido por mês (+ a receber hoje); Eventos por tipo; Fornecedores mais contratados; Vendas: contatos, fechados, taxa, tabela **De onde vieram** (contatos, fecharam, taxa); tabela mês a mês.

## 8. Ajustes (`/configuracoes`)

| Seção | Conteúdo |
|---|---|
| Marca | Logo, nome do cerimonial, WhatsApp, cor (prévia do botão). Usada no site do evento, RSVP, lista de presentes e tela de login da equipe. |
| **Resumo do dia por e-mail** | Todo dia de manhã: eventos do dia e da semana, tarefas vencendo, cobranças, retornos de orçamento, fotos do mural. "Só chega quando tem algo." "Ver como fica o de hoje". |
| Página pública | `/{slug}`: apresentação, cidade, Instagram, tipos de evento, portfólio (12 fotos), depoimentos, **botão de orçamento que cai no funil**. Checklist "1 de 6". |
| **Agenda no celular** | Feed de calendário (Google Agenda / iPhone), atualiza sozinho; link secreto, "Gerar link novo". |
| Meus modelos | Eventos salvos como modelo aparecem primeiro em Novo evento. |
| **Equipe com acesso** | Convite por e-mail (link 7 dias); "Pode ver o financeiro (valores, parcelas e contrato)"; "Vê: todos os eventos / só os eventos dela" (sem Vendas nem Relatórios); plano, Pix, contrato e página só com a dona; link de entrada com a logo. |
| Pix | Tipo (CPF, CNPJ, Celular, E-mail, Aleatória), chave, CPF/CNPJ que vai no contrato. "O sistema não enxerga a sua conta: marque Recebi." |
| **Modelo de contrato** | Enviar Word/PDF/texto ou colar; **IA troca os dados por campos** `{{cliente}}`; etiquetas: nome do cerimonial, seu CPF/CNPJ, nome/CPF/endereço/WhatsApp/e-mail do cliente, título, tipo, data, horário, local, nº convidados, valor, **lista das parcelas com vencimentos**, data de hoje; "Editar texto", **"Ver como fica"**, "começar com um exemplo"; aviso de que não revisa cláusulas. No evento, botão Contrato gera preenchido para imprimir ou o cliente assinar pelo celular. |

## 9. O que muda na análise

| Passo | O que confirmou | Ajuste sugerido para as specs |
|---|---|---|
| 1 | Só nome obrigatório; cliente inline; tipo traz tarefas e roteiro; data nativa digitável | Exigir só tipo + nome (+ data opcional); cartões de tipo mostrando "N tarefas · N momentos" |
| 2 | "Salvar evento como modelo"; prazo em dias antes | Adicionar "salvar como modelo" a partir do evento |
| 3 | Grupos: Próximos 7 dias, Depois, Sem prazo, Para conferir, Feitas; responsável Cliente | Incluir grupo **Sem prazo**; "Para conferir" = prazo já vencido na criação do evento |
| 4 | Painel com 4 números + "Precisa de você" + agenda de eventos | Base da spec da tela Hoje |
| 5 | Entrada + parcelas, Cobrar, Recebi, Recibo, Desfazer, despesas por categoria, comprovantes | Incluir Recibo, Resultado (contrato − despesas) e categorias de despesa |
| 6 | Modelo de contrato único (não por pacote), etiquetas fixas, IA marca campos | Etiquetas fixas na 1.0 (IA na 1.1); assinatura via serviço externo (decisão 7) |
| 7 | Colar lista com "+ marido"; foto/PDF via IA; pedir lista ao cliente; check-in "chegaram" | Colar texto na 1.0; "pedir a lista pro cliente" pelo link |
| 8 | 2 situações (orçamento / contratado); "Dados p/ contrato (copiar)"; alinhamentos | Confirma decisão 8 |
| 9 | Cerimônia/Recepção, cortejo "dois lados", WhatsApp/imprimir, script do mestre de cerimônias | O "cronograma" separado (decisão 9) pode ser o script do mestre de cerimônias |
| 10 | Link sem senha, trocar link, ver como o cliente vê, marcações, aprovações | Base da spec do link do casal |
| 11 | Resumo diário só por e-mail, só quando há algo | Confirma decisão 6 |
| Equipe | Login de assistente com "pode ver financeiro" e "só os eventos dela"; equipe do dia sem login com hora de chegada e fardamento | Confirma decisão de login de assistente |
| Relatórios | Recebido por mês, ticket médio, origem dos contatos | Somar aos 9 relatórios do funil da Assessoria VIP |

## 10. Ideias novas para decidir

1. **Página pública** da cerimonialista com botão de orçamento que cai no funil (o aralu já tem formulário público de lead, spec 020).
2. **Feed de calendário (iCal)** para Google/iPhone — alternativa barata à integração com o Google Agenda.
3. **Aprovações** do cliente pelo link (cardápio, decoração, convite).
4. **Depoimento** pós-evento pelo link do cliente.
5. **Checklist do evento** (itens com valor e mês, colar lista) — sobrepõe parte do "planejamento de budget" da Assessoria VIP.
6. **Fardamento** (tamanhos na ficha da equipe, soma na escala).
7. **"Fechou: criar o evento"** a partir da oportunidade.
8. **Recibo** de parcela recebida.
