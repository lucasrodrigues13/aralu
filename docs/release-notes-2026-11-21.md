# Release notes: 21/11/2026

Os 30 cards do board "Tarefas Aralu" foram entregues. Os marcados com ⚠️ funcionam, mas ainda precisam de melhoria (sugestões abaixo do card).

## Evento
- **#19** Cadastro de evento simplificado.
- **#22** Aba Convidados limpa, com cards por situação.
- **#21** Tarefas com prazo e responsável por item.
- **#20** ⚠️ Resumo absorve a aba Tarefas.
  - Ligar a tarefa a contrato, documento e pagamento (hoje só liga ao fornecedor, pelo serviço).
- **#29** ⚠️ Gráficos de orçamento na aba Fornecedores.
  - Mais gráficos (por etapa, evolução no tempo).
- **#30** ⚠️ Aba Contratos do evento, com fornecedor e quem enviou.
  - Definir onde o contrato do cliente (de modelo) aparece dentro do evento.

## Fornecedores e dinheiro
- **#27** Busca e "Cadastrar novo serviço" no cadastro de fornecedor.
- **#28** Contratar sem parcelas e anexar contrato assinado.
- **#31** Pagamentos a fornecedores com parcelas e comprovantes.
- **#41** Parcelas por documento (orçamento, contrato e contrato de fornecedor).
- **#34** Link do casal com acesso ao financeiro.
- **#32** ⚠️ Gestão Financeira no menu Principal.
  - Mostrar o valor do orçamento nos contratos sem parcelas e subtotal por cliente.
- **#33** ⚠️ Parcelas do mês e atrasadas, com Cobrar e Recebi.
  - Falta anexar comprovante ao recebimento (precisa de migration).

## Cadastros
- **#45** CPF/CNPJ sem máscara, com CNPJ alfanumérico.
- **#42** RG removido; CPF/CNPJ em campo único no cliente.
- **#46** Endereço do Perfil estruturado, com CEP.
- **#43** ⚠️ Dados do contratante na oportunidade.
  - Consulta de CEP na tela pública de aceite (hoje o lead digita o endereço).

## Funil e contratos
- **#44** Parcelas no orçamento e na proposta por link.
- **#18** ⚠️ HTML personalizado na tela de aceite do orçamento.
  - Permitir estilo (cores e CSS seguro), envio de imagem e editor visual; editar o HTML de orçamentos já criados.
- **#37** Menu com Modelos como último grupo.
- **#38** Tela única de Modelos de Contrato.
- **#39** ⚠️ Contrato gerado com dados do contratante e tags.
  - Avisar o que falta ao escolher a oportunidade, não só na hora de gerar.
- **#40** Seletor de tags com busca e ajuda (?).
- **#15** ⚠️ Live Preview do modelo de contrato.
  - Visualizar com dados reais de um evento ou oportunidade, em vez de exemplos fixos.
- **#16** ⚠️ Logo e imagem de fundo no modelo.
  - Escolher posição e tamanho da logo e a opacidade do fundo; limpar arquivos antigos não usados.
- **#36** Vínculo do contrato com o evento removido.
- **#17** ⚠️ Upload de contrato em Word: só avaliação feita, recomendação é adiar (depende da assinatura eletrônica).

## Convidados
- **#23** ⚠️ Link do casal para cadastrar convites.
  - Enviar o e-mail do convite de fato e importar planilha com e-mail e data de envio.
- **#24** ⚠️ RSVP com prazo, exceção por convite e lista de presença.
  - Aviso automático de prazo próximo ou encerrado.
- **#25** ⚠️ Portaria com QR code, link da equipe e check-in.
  - Funcionar sem internet (modo offline) e guardar histórico de quem marcou a entrada.

## Extra
- Limpeza do legado (contratos por evento, grupos de convite e transfer saíram do banco e da API).
