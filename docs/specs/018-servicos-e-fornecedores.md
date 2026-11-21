# 018. Serviços e fornecedores

**Status: aprovada (revisão do card #27: busca e "Cadastrar novo serviço" no seletor de serviços do fornecedor).** O código segue esta spec. Fonte: [inventario-referencia.md](../inventario-referencia.md) §1.9, §1.10, §1.11, §1.12 e §1.13. Catálogo de modelos de serviço do funil permanece na SPEC-026.

> **Card #29 (21/11/2026, [SPEC-047](047-graficos-de-orcamento-no-evento.md)).** O modal "Planejamento de budget" (§12) foi substituído por cards com gráficos no topo da aba Fornecedores; os números e as regras do §8 não mudaram. O critério 6 vale para os gráficos (indicadores e barras), não mais para um modal; o estimado e os subitens seguem editáveis pelo botão "Estimado" de cada serviço.

> **Card #41 (21/11/2026, [SPEC-040](040-parcelas-por-documento.md)).** `ParcelaServico` saiu do banco. Ao contratar, o sistema cria o `ContratoFornecedor` do serviço, com as parcelas a pagar (mesma estrutura e mesmo gerador). A leitura do serviço (`parcelas`), a aba Fornecedores, a aba Dinheiro do evento, a tela Pagamentos e a tela Hoje leem dele. O serviço "Assessoria e Organização" e `POST /eventos/{id}/assessoria` saíram.

> **Card #28 (21/11/2026, [SPEC-045](045-contratar-fornecedor-e-contrato-assinado.md)).** "Adicionar fornecedor" escolhe o fornecedor e depois os serviços (marcação múltipla). **Contratar** pede só o valor, sem parcelas (o parcelamento é feito na aba Dinheiro, SPEC-043), e aceita o contrato assinado, guardado no `ContratoFornecedor`. Onde esta spec diz que Contratar gera parcelas (itens 4 e 58 da seção 6, item 5 da 14, e o cenário da seção 15), vale a SPEC-045. Contratar de novo mantém o contrato existente.

## 1. Identificador e nome

SPEC-018. Serviços e fornecedores.

## 2. Objetivo

O Organizer mantém o catálogo de fornecedores e a lista de serviços da conta, gerencia fornecedores por serviço no evento (incluindo as oito abas do cadastro), conduz a negociação até contratado e acompanha o planejamento de budget do evento.

## 3. Requisitos relacionados

RF-057 (catálogo de fornecedores e lista de serviços). RF-058 (serviços e budget no evento). RF-059 (negociação). RF-068 (parcelas), no que nasce do contratado.

Fora: RF-060 (login / formulário público do fornecedor para completar dados). RF-079. RF-045 (assistente). SPEC-026 (modelos de serviço do funil).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | CRUD de fornecedores e serviços da conta; gerenciar fornecedores no evento; avançar/voltar etapas de negociação; editar estimado, subitens e valor contratado; gerar parcelas do contratado. |
| Client | Vê recomendações, comparativos e parcelas só se as flags (RF-056) e as marcas de visibilidade permitirem. Não edita o catálogo da conta. |
| Admin | Acessa catálogo e eventos de qualquer conta. |
| Visitante | Não acessa o catálogo autenticado. |

Assistente e fornecedor-with-login ficam fora deste corte. Solicitação de preenchimento por link público (RF-060) não entra.

## 5. Pré-condições

Conta autenticada, SPEC-001. Para ações no evento: evento da mesma conta, SPEC-002 / SPEC-008. Serviços do modelo podem nascer com o evento (SPEC-012 / SPEC-008).

## 6. Fluxo principal

### 6.1 Catálogo da conta

1. O Organizer abre Serviços e Fornecedores.
2. No catálogo, vê fornecedores com nome, serviços oferecidos e situação do cadastro (completo ou incompleto).
3. Cria ou edita fornecedor no formulário de oito abas (seção 11) e salva. Nome e serviços são obrigatórios.
3a. No campo Serviços do formulário (seleção múltipla), o Organizer pode marcar quantos serviços quiser. Ao abrir a lista, vê um campo de busca no topo que filtra as opções pelo nome (sem diferenciar maiúsculas e acentos) e, na lista, a opção "Cadastrar novo serviço". Ao escolhê-la, informa só o nome; o serviço é criado na conta e já fica marcado no fornecedor, sem fechar o formulário nem perder o que já foi preenchido. A lista de serviços da conta (item 4) segue disponível.
4. Na lista de serviços da conta, vê nomes (alguns podem ser Padrão) e pode adicionar serviço com nome.
5. Pode buscar, filtrar e excluir fornecedor ou serviço da conta, com confirmação na exclusão.

### 6.2 No evento

1. Na home, cada serviço mostra fornecedores na trilha de negociação, tarefas e valores (estimado / contratado).
2. O Organizer adiciona fornecedor ao serviço (recomendando ou contratando) a partir do catálogo da conta ou criando novo.
3. No evento, conduz a negociação em duas etapas: Orçamento → Contratado (RF-059). O fornecedor entra em Orçamento; Contratar leva a Contratado e pode voltar para Orçamento.
4. Em Contratado, informa valor, gera parcelas (RF-068) e segue o bloco de pagamentos.
5. No Planejamento de budget (§1.9): vê Budget, Estimado, Contratado, custo por convidado e prova real; edita valor estimado por serviço; adiciona subitens (descrição, quantidade, valor unitário).

## 7. Fluxos alternativos

- Cadastro incompleto: fornecedor aparece como incompleto até preencher os dados mínimos da conta; sem RF-060, o Organizer completa os dados.
- Contratar direto: o fornecedor recém-adicionado em Orçamento já pode ser contratado, com valor e parcelas.
- Descartar fornecedor / descartar orçamento: remove da trilha ou volta etapa, conforme a ação do hub.
- Serviço sem fornecedor: valor contratado vazio; estimado editável.
- Com subitens: o valor estimado do serviço passa a ser a soma dos subitens.
- Ocultar serviço para Client; ordenar serviços; agrupar em pacotes: ações do menu Serviços da home.
- Adicionar serviço inexistente no catálogo da conta: cria o serviço na conta e associa ao evento.
- Solicitação de dados / "Ver todos": listagens auxiliares do catálogo; exportação/mescla se presentes em RF-057.
- Fornecedor de outra conta: Organizer não vê.

## 8. Regras de negócio

- Fornecedor e serviço de catálogo pertencem à conta do Organizer. RF-057.
- Nome do fornecedor e pelo menos um serviço oferecido são obrigatórios. RF-057.
- Formulário do fornecedor tem oito abas: Dados, Redes sociais, Endereço, Dados bancários, Orçamentos, Diferencial, Inf. gerais, Portfólio. RF-057 / inventário §1.11.
- Orçamentos genéricos do fornecedor e Diferencial podem ser marcados como visíveis ao Client; Inf. gerais e Portfólio são restritos ao Organizer (e Admin).
- No evento, cada serviço tem fornecedores, tarefas e valores; a home compara estimado e contratado. RF-058.
- Etapas de negociação: Orçamento e Contratado. Solicitar contrato é ação do contratado, não uma terceira etapa. RF-059.
- Planejamento de budget: Budget = estimado do evento; Estimado = soma dos estimados dos serviços; Contratado = soma dos contratados; Prova real = Estimado + Contratado; custo por convidado = (Estimado + Contratado) / convidados estimados quando houver convidados. Inventário §1.9.
- Serviço da conta tem só o nome. Criar serviço com nome já existente na conta devolve o existente, sem duplicar (comportamento atual da API). Cadastrar novo serviço pelo formulário do fornecedor usa a mesma regra e marca o serviço devolvido.
- A busca do seletor de serviços só filtra as opções exibidas; serviços já marcados continuam marcados mesmo quando o filtro os esconde.
- Subitens detalham o serviço; com subitens, o estimado do serviço é a soma deles.
- Parcelas do contratado seguem RF-068 / inventário §1.12.
- Isolamento por conta. Catálogo `/funnel/models/service` é outro módulo (SPEC-026).
- Sem login de fornecedor neste corte (RF-060 fora).

## 9. Validações

Nome do fornecedor obrigatório. Pelo menos um serviço oferecido. E-mail, se informado, formato válido. CNPJ/CPF e o CPF/CNPJ dos dados bancários, se informados, são válidos (dígitos verificadores; CNPJ pode ser alfanumérico) e gravados sem máscara (SPEC-034). Valores monetários ≥ 0. Quantidade de subitem e de parcelas: inteiro > 0 quando o fluxo as exige. CEP completo pode preencher país, endereço, estado, cidade e bairro. O CEP é o primeiro campo do endereço. Fornecedor/serviço/evento de outra conta: rejeitado sem vazar dado.

## 10. Estados

Cadastro do fornecedor na conta: completo ou incompleto (e, se a UI mantiver, dados solicitados só como rótulo interno do Organizer — sem portal do fornecedor).

Negociação no evento: Orçamento, Contratado.

Parcela: Pendente ou Pago (RF-068).

## 11. Dados necessários

### Fornecedor — aba Dados

Foto; Nome*; serviços oferecidos*; telefones (responsável, DDI, número, móvel/fixo); e-mails; razão social; CNPJ; CPF; nome do responsável; faixa de preço (de/até).

### Redes sociais

Site, Facebook, Instagram, Youtube, Pinterest.

### Endereço

CEP, país, endereço, número, estado, cidade, bairro, complemento.

### Dados bancários

Conta (banco, agência, conta, titular, tipo, documentos) e Pix (tipo de chave e chave).

### Orçamentos

Título; anexo ou link; visível aos clientes.

### Diferencial / Inf. gerais / Portfólio

Textos; links; anexos; imagens.

### Serviço da conta

Nome (até 200 caracteres na referência); marca Padrão quando for serviço de sistema/conta inicial.

### No evento / hub

Etapa de negociação; valor do orçamento/contratado; parcelas (entrada, quantidade, datas, método de pagamento); observações; anexos; alinhamentos; chat interno (se mantido sem login do fornecedor, fica só como nota do Organizer).

### Budget

Valor estimado do serviço; subitem (descrição, quantidade, valor unitário, total).

## 12. Interface

Catálogo `/suppliers` (ou equivalente): lista, busca, filtros, contagens, abas de solicitação de dados e lista de serviços.

Formulário de fornecedor com oito abas e Salvar. No campo Serviços da aba Dados: campo "Buscar serviço" no topo da lista (mesmo padrão do seletor de Banco), nenhuma opção encontrada mostra "Nenhum serviço encontrado", e a opção "Cadastrar novo serviço" fica sempre visível ao final da lista, abrindo um pequeno diálogo com o campo Nome.

Aba Fornecedores do evento: tabela Serviço / Fornecedor / Etapa / Valor / Ações, botão Adicionar fornecedor acima da tabela (modal que vincula um fornecedor do cadastro a um serviço do evento) e filtros à direita.

Hub do fornecedor no evento: painel lateral e abas Orçamento (funil), Observações, Anexos, Alinhamentos, Portfólio (Chat sem contraparte logada fica opcional/omitido neste corte).

Modal Planejamento de budget: indicadores, tabela Serviço / Estimado / Contratado, subitens, exportar se existir.

## 13. Erros

Campo inválido permanece no formulário. Falha ao salvar mantém o anterior. Recurso de outra conta não revela dado. Exclusão de fornecedor ainda referenciado em evento: confirmação; o vínculo no evento não some sem ação explícita no evento.

## 14. Critérios de aceite

1. O Organizer cria fornecedor com nome e serviço; sem um dos dois, não grava.
2. O formulário expõe as oito abas e grava os campos da seção 11.
3. A lista de serviços da conta permite criar serviço por nome.
3a. O fornecedor aceita mais de um serviço. No campo Serviços do formulário, a busca filtra as opções pelo nome e "Cadastrar novo serviço" cria o serviço só com nome e o deixa marcado no fornecedor, sem perder os dados já digitados.
4. No evento, o fornecedor entra em Orçamento, vai a Contratado e pode voltar para Orçamento.
5. Contratar define a etapa Contratado; o hub aceita valor e geração de parcelas.
6. Planejamento de budget mostra Budget, Estimado, Contratado, prova real e permite editar estimado e subitens; com subitens, o estimado do serviço é a soma deles.
7. Client não acessa o catálogo da conta; só vê o que as flags e a visibilidade permitirem no evento.
8. Outra conta não vê fornecedor nem serviço.
9. Não há login de fornecedor nem formulário público RF-060 neste fluxo.

## 15. Cenários de teste

Criar fornecedor "Banda Teste" com serviço Banda. Adicionar ao evento em Orçamento, contratar com valor e parcelas, voltar para Orçamento e contratar de novo. Editar estimado e um subitem no budget. Criar serviço personalizado na conta e marcar no evento. Conta B não vê o fornecedor. No formulário de um fornecedor novo, buscar "ban" mostra só serviços com esse trecho; escolher "Cadastrar novo serviço", digitar "Fotografia" e confirmar deixa Fotografia marcado junto dos já marcados; repetir o nome não cria duplicata. Tentar gravar fornecedor sem nome: falha.

## 16. Dependências

SPEC-001, SPEC-002, SPEC-008 (evento e serviços iniciais do modelo). SPEC-012 (checklist). RF-068 / pagamentos para parcelas. SPEC-026 distinta para funil.

## 17. Premissas e pontos não definidos

- Critério exato que diferencia cadastro "completo" de "incompleto" campo a campo.
- Comportamento de mescla de fornecedores duplicados (RF-057 nomeia; regra fina não fechada).
- Se o Chat do hub existe sem RF-060 (recomendação: omitir ou restringir a notas internas).
- Exportação Excel do budget: formato de arquivo.
- Efeito da marca Padrão além de identificar serviços iniciais (editar/excluir).
