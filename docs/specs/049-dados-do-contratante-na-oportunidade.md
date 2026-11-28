# 049. Dados do contratante na oportunidade

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #43, com as opções mais simples e conservadoras nos pontos em aberto, listados na seção 17).** Fonte: card #43 do Trello ([tarefas-trello.md](../tarefas-trello.md)); [produto-v1.md](../produto-v1.md) 5.13 e 5.1. Revisa a [SPEC-020](020-oportunidades-do-funil.md) (oportunidade e lead vira cliente), a [SPEC-031](031-funil-estagios-retorno-e-proposta.md) parte C (tela de aceite da proposta) e a [SPEC-009](009-cadastro-completo-de-cliente.md) (cadastro de cliente). Usa o CPF/CNPJ da [SPEC-034](034-cpf-cnpj-sem-mascara.md) e o campo único da [SPEC-037](037-rg-fora-e-documento-unico-do-cliente.md).

## 1. Identificador e nome

SPEC-049. Dados do contratante na oportunidade: cadastro reorganizado, pedido na tela de aceite, conversão em cliente pré-preenchida e descarte que apaga dados sensíveis.

## 2. Objetivo

Enviar o orçamento e gerar o contrato sem criar o cliente antes de fechar. A oportunidade passa a guardar os principais dados que preenchem um cliente (quem assina o contrato). Os dados são pedidos ao lead quando ele está disposto a fechar. O cliente só nasce ao fechar, com o cadastro já preenchido. Lead descartado perde os dados sensíveis.

## 3. Requisitos relacionados

RF-075 (funil), RF-044 (cliente), SPEC-020, 031, 034 e 037. Quem gera o contrato com esses dados é o card #39 (fora desta spec).

## 4. Atores e permissões

`Organizer` e `Assistant` (com acesso ao funil) preenchem e leem os dados na oportunidade. O **lead** preenche pela tela de aceite da proposta por link, sem login (SPEC-031 parte C). Nada de permissão nova.

## 5. Pré-condições

Oportunidade da conta. Para o lead preencher: orçamento enviado por link, link válido, oportunidade não descartada.

## 6. Fluxo principal

### 6.1. Cadastro de oportunidade reorganizado

O modal da oportunidade agrupa o que tem relação, nesta sequência:

1. **Contato:** nome da oportunidade, contatos (nome, telefone, e-mail) e a marca "É o contratante (quem assina o contrato)" em um dos contatos. Aviso de contato repetido.
2. **Evento:** tipo, data prevista (com aviso de compromisso), convidados e os quatro horários.
3. **Locais:** cerimônia e recepção.
4. **Comercial:** estágio (e motivo do descarte), origem, serviço/produto, valor da proposta, responsável e retorno.
5. **Dados para contrato** (seção opcional): nome completo, CPF/CNPJ (campo único, máscara dupla), nascimento, estado civil, nacionalidade, profissão, e-mail, celular e endereço completo (CEP, endereço, número, complemento, bairro, cidade, estado e país). Sem RG. O CEP preenche o endereço.

### 6.2. Contratante

Um contato da oportunidade pode ser marcado como o contratante; no máximo um. Ao marcar, o nome, o e-mail e o celular do contato preenchem os campos de dados do contratante que estiverem vazios. A marca é só uma indicação de quem assina; os dados do contratante ficam nos campos da seção 5 do modal.

### 6.3. Pedido na tela de aceite

1. Ao tocar em **Aceitar** na proposta por link, a tela mostra "Para fechar, preencha mais dados para gerar o contrato." e o formulário dos dados do contratante, já preenchido com o que a assessoria sabe.
2. Para confirmar o aceite, o lead preenche os campos obrigatórios (6.4). Sem eles o aceite não grava e a tela diz o que falta.
3. Ao confirmar, os dados vão para a oportunidade e o aceite é registrado como antes (o lead não vai sozinho para Contratado).
4. "Tenho dúvidas" e "Não vou seguir" não pedem dados.

### 6.4. O que é "completo"

Para gerar o contrato: nome completo, CPF/CNPJ, estado civil, nacionalidade, e-mail, celular e endereço completo (CEP, endereço, número, bairro, cidade e estado). Nascimento, profissão, complemento e país são opcionais. A leitura da oportunidade traz `dadosContratoCompletos`, para o card #39 usar. A organizadora pode registrar o aceite por fora (ligação) sem os dados; o contrato só sai com eles.

### 6.5. Link da tela de aceite

Na seção "Dados para contrato" do modal há o botão **Copiar link da tela de aceite**. O link é o da proposta por link (SPEC-031); ele só existe depois de o orçamento ser enviado por link. Sem orçamento enviado, o botão fica desligado e o texto explica.

### 6.6. Virar cliente

"Virar cliente" abre o cadastro de cliente já preenchido com tudo da oportunidade: nome, CPF/CNPJ (vai para CPF ou CNPJ pelo número de dígitos, SPEC-037), nascimento, profissão, estado civil, nacionalidade, e-mail, celular e endereço. Quando o contratante não tem e-mail, celular ou nome, valem os do contato marcado como contratante, ou do primeiro contato. Sem endereço do contratante, valem a cidade e o estado do evento, como antes. Sobram só os campos menos relevantes: redes sociais, religião, observações, foto e acesso ao portal. O resto do fluxo é o da SPEC-020 §6.2.

Depois de virar cliente, o cliente é a fonte dos dados: a oportunidade não sobrescreve o que for editado nele (a conversão só preenche o formulário na hora; nada volta da oportunidade para o cliente depois).

### 6.7. Estado civil e nacionalidade no cliente

O cadastro de cliente ganha **estado civil** (lista fechada) e **nacionalidade** (texto), na aba Dados pessoais.

### 6.8. Lead descartado

Ao descartar (por mover para Descartado ou por salvar a oportunidade em Descartado), a API apaga o **CPF/CNPJ, o nascimento e o endereço** do contratante. Nome, e-mail, celular, estado civil, nacionalidade e profissão ficam, para o histórico do funil. A ação de descartar avisa isso antes (no modal do motivo e no modal da oportunidade). Dado sensível novo não é gravado em lead descartado.

## 7. Fluxos alternativos

- Pedido sem o bloco de dados do contratante (cliente antigo da API): os dados que já estão na oportunidade ficam como estão.
- Mais de um contato marcado como contratante: não grava ("Marque só um contato como contratante.").
- Aceite pelo link de oportunidade já descartada: "Esta proposta não aceita mais resposta."
- Dona logada abrindo o link: continua só vendo (SPEC-031); não responde nem preenche.

## 8. Regras de negócio

- CPF/CNPJ do contratante segue a SPEC-034 (sem máscara, maiúsculas, dígitos verificadores). Um campo, `documento`.
- Estado civil: Solteiro(a), Casado(a), União estável, Separado(a), Divorciado(a), Viúvo(a).
- Nacionalidade: texto livre.
- O lead descartado perde os dados sensíveis na hora, sem recuperação.
- Excluir a oportunidade apaga tudo, como antes.

## 9. Validações

"Informe um CPF ou CNPJ válido.", "Informe um e-mail válido para o contratante.", "A data de nascimento não pode ser futura.", "Escolha o estado civil na lista.", "O CEP deve ter 8 dígitos.". No aceite: "Para fechar, preencha mais dados para gerar o contrato. Falta: …". Na oportunidade nada é obrigatório nessa seção.

## 10. Estados

Sem estado novo. A leitura da oportunidade ganha `dadosContratoCompletos` (verdadeiro/falso).

## 11. Dados necessários

Oportunidade: colunas do contratante (nome, documento, nascimento, profissão, estado civil, nacionalidade, e-mail, celular, CEP, endereço, número, bairro, cidade, estado, complemento e país). Contato da oportunidade: marca de contratante. Cliente: estado civil e nacionalidade. Migration `DadosDoContratante` (só colunas novas, nada apagado); `deploy/schema.sql` gerado de novo.

## 12. Interface

Modal da oportunidade na sequência da 6.1, com o botão de copiar o link. Tela de aceite da proposta com o formulário (campos obrigatórios com asterisco). Modal de descarte com o aviso. Aba Dados pessoais do cliente com estado civil e nacionalidade.

## 13. Erros

Mensagens da seção 9, sem detalhe interno. Link inválido, vencido ou cancelado segue a SPEC-031.

## 14. Critérios de aceite

1. O modal da oportunidade mostra as seções Contato, Evento, Locais, Comercial e Dados para contrato, nessa ordem.
2. Marcar um contato como contratante desmarca os outros e preenche nome, e-mail e celular vazios dos dados do contratante.
3. "Aceitar" na proposta por link pede os dados; sem os obrigatórios o aceite não grava; com eles, grava na oportunidade e registra o aceite.
4. O botão "Copiar link da tela de aceite" copia o link da proposta e fica desligado sem orçamento enviado.
5. "Virar cliente" abre o cadastro preenchido com os dados do contratante (documento separado em CPF ou CNPJ ao salvar).
6. O cadastro de cliente grava e mostra estado civil e nacionalidade.
7. Descartar o lead apaga CPF/CNPJ, nascimento e endereço do contratante e avisa antes.
8. `dadosContratoCompletos` é verdadeiro só com os campos da 6.4.

## 15. Cenários de teste

Unitário (`ContratanteRegrasTests`): normalização do documento, do CEP e do estado civil; recusas; o que falta para o contrato; limpeza dos dados sensíveis. Integração (roda no fim das ondas): `PropostaFluxoTests` aceita com e sem os dados e descarta apagando o documento e o endereço. Frontend: `contratante-campos.spec.ts`.

## 16. Dependências

Depende do #42 (SPEC-037) e do #45 (SPEC-034). Alimenta o #39 (contrato do funil com as tags). Única sessão com migration na entrega.

## 17. Premissas e pontos não definidos

Decisões tomadas por serem a opção mais simples e conservadora (o dono pode rever):

1. **Dados mínimos "completos"** (card #39 pedia para confirmar): nome, CPF/CNPJ, estado civil, nacionalidade, e-mail, celular e endereço completo. Nascimento e profissão ficam opcionais, embora o card os liste na seção.
2. **Aceitar pelo link exige os dados mínimos**; a organizadora pode registrar o aceite por fora sem eles. Alternativa não adotada: aceitar sem dados e pedir depois.
3. **Estado civil em lista fechada** (seis itens) e **nacionalidade em texto livre**.
4. **Nome, e-mail e celular do contratante têm campos próprios**, separados do contato marcado: o nome completo pode diferir do apelido do contato. A marca de contratante serve para indicar quem assina e pré-preencher.
5. **O que o descarte apaga:** só CPF/CNPJ, nascimento e endereço (o que o card lista). Nome, e-mail, celular, estado civil, nacionalidade e profissão ficam.
6. **A tela de aceite mostra ao lead o que a assessoria já preencheu**, inclusive CPF/CNPJ, pois o link é secreto e o lead é o titular. Não há máscara parcial.
7. **Sem consulta de CEP na tela pública**: a API de CEP exige login. O lead digita o endereço.
8. **Lead descartado não aceita proposta pelo link**, para não gravar dado sensível de novo.
9. **Nada é copiado da oportunidade para o cliente depois da conversão**: o cadastro abre preenchido uma vez.
