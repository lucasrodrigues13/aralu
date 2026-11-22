# 056. Modelo de contrato: logo e imagem de fundo

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #16, com as opções mais simples e conservadoras nos pontos em aberto, listados na seção 17).** Fonte: card #16 do Trello ([tarefas-trello.md](../tarefas-trello.md)); [produto-v1.md](../produto-v1.md) 5.10. Estende a [SPEC-039](039-modelos-de-contrato-tela-unica.md) (modelo da tela única), a [SPEC-055](055-live-preview-do-modelo-de-contrato.md) (Live Preview) e a [SPEC-050](050-contrato-do-funil-com-tags.md) (geração do contrato).

## 1. Identificador e nome

SPEC-056. Logo e imagem de fundo do modelo de contrato.

## 2. Objetivo

A cerimonialista coloca a marca dela (logo) no topo e, se quiser, uma imagem de fundo no contrato. Vê o resultado no Live Preview ao editar o modelo e no contrato gerado para o cliente, inclusive na impressão.

## 3. Requisitos relacionados

RF-098 (contrato). Sem RF novo.

## 4. Atores e permissões

Quem edita modelos de contrato (Admin e Organizer, SPEC-039). Quem usa o funil (inclusive a assistente) **vê** o contrato gerado com a logo e o fundo.

## 5. Pré-condições

Modal "Novo/Editar modelo de contrato" aberto (cadastro); contrato do funil já gerado (visualização).

## 6. Fluxo principal

### 6.1. No modal do modelo

1. Duas áreas, **Logo** e **Imagem de fundo**, cada uma com "Escolher imagem" (ou "Trocar"), miniatura e "Remover".
2. A imagem escolhida aparece de imediato na miniatura e no Live Preview; só vai para o servidor ao **Salvar** o modelo (o arquivo é guardado depois do modelo gravado). Cancelar não grava nada.
3. Formatos e tamanho: JPG, PNG ou WebP até 5 MB (regra do armazenamento de imagens). Outro arquivo: mensagem "A imagem não foi aceita. Use JPG, PNG ou WebP de até 5 MB.".

### 6.2. No Live Preview

A folha mostra a logo centralizada no topo (até 200 x 80 px), o título e o texto; a imagem de fundo cobre a folha atrás do texto, com transparência (18%) para não atrapalhar a leitura.

### 6.3. No contrato gerado

1. Ao criar o contrato com um modelo (SPEC-050), o servidor **copia para o contrato** a referência da logo e do fundo do modelo. Depois disso o contrato tem vida própria: trocar ou remover a imagem do modelo não muda contratos já gerados.
2. Em Funil de vendas > Contratos, o ícone "Ver contrato" abre a folha como o cliente a recebe (logo, texto, fundo). O botão **Imprimir** abre uma janela só com a folha e chama a impressão do navegador; o fundo sai impresso.
3. Contrato criado sem modelo, ou de modelo sem imagem, aparece só com o texto.

## 7. Fluxos alternativos

- Imagem recusada (formato ou tamanho): erro no modal, o modelo continua como estava.
- Falha ao enviar a imagem depois de o texto ter sido salvo: o modelo fica salvo e aparece o erro; a imagem pode ser enviada de novo editando o modelo.
- Modelo excluído: contratos gerados dele continuam com a logo e o fundo.

## 8. Regras de negócio

- Usa o armazenamento de arquivos que já existe (`IArmazenamentoArquivo`, tabela `Arquivos`); a imagem é da conta e só é aberta por quem está logado na conta.
- Trocar ou remover a imagem **não apaga o arquivo antigo**, porque contratos já gerados guardam o mesmo arquivo (seção 17, item 6).
- O contrato guarda os ids dos arquivos, sem chave estrangeira (como `ModeloId`).

## 9. Validações

Formato por conteúdo do arquivo (JPG, PNG, WebP), extensão coerente e até 5 MB (as do armazenamento de imagens). O modelo precisa ser da conta; senão, 404.

## 10. Estados

Modelo com ou sem logo, com ou sem fundo (independentes).

## 11. Dados necessários

Migration `LogoEFundoDoModeloDeContrato`: `ContratosConta.LogoArquivoId` e `FundoArquivoId` e `ContratosFunil.LogoArquivoId` e `FundoArquivoId`, todas `uuid` nulas. Só acrescenta colunas; nada é apagado nem perdido. API nova (Admin e Organizer): `POST` e `DELETE /api/v1/contratos/{id}/logo` e `/fundo` (envio em `multipart/form-data`, campo `arquivo`). `GET /contratos/{id}` e a leitura do contrato do funil trazem `logoArquivoId` e `fundoArquivoId`; o arquivo é baixado por `GET /api/v1/arquivos/{id}`.

## 12. Interface

Modal do modelo com as duas áreas acima do texto; folha do Live Preview e do "Ver contrato" é o mesmo componente (`app-folha-contrato`). Em tela estreita as áreas ficam uma sob a outra.

## 13. Erros

Imagem recusada, modelo indisponível e falha de rede aparecem como aviso; o texto do modelo não se perde.

## 14. Critérios de aceite

1. Escolher uma logo no modal a mostra na miniatura e no topo da folha do Live Preview; o fundo aparece atrás do texto.
2. Salvar grava as imagens; reabrir o modelo mostra as mesmas imagens; "Remover" tira a imagem ao salvar.
3. PDF ou arquivo acima de 5 MB é recusado com a mensagem do item 6.1.
4. Contrato gerado de um modelo com imagens abre em "Ver contrato" com logo, texto e fundo; trocar a logo do modelo depois não muda esse contrato.
5. "Imprimir" abre a folha com logo e fundo para impressão.
6. Modelo de outra conta não aceita envio de imagem (404).

## 15. Cenários de teste

Unidade: ligar, trocar e remover logo e fundo sem mexer um no outro; salvar nome e texto não apaga as imagens; modelo de outra conta é indisponível. Integração (precisa do Docker, rodar no fim das ondas): envio de PNG e de arquivo inválido, modelo de outra conta, leitura com os ids, remoção. Frontend: validação de formato e tamanho; `textoEmHtml` escapa e quebra linha. A folha e a impressão são conferidas no navegador.

## 16. Dependências

SPEC-039, SPEC-050, SPEC-055 (SPEC-053 pelas tags). Vem depois: #17 (avaliar upload de Word).

## 17. Premissas e pontos não definidos (opção mais simples e conservadora; o dono pode rever)

1. **Formatos e tamanho:** JPG, PNG e WebP até 5 MB, os do armazenamento de imagens que já existe. Sem redução nem corte da imagem.
2. **Posição da logo:** centralizada no topo da folha, uma única posição, tamanho máximo 200 x 80 px. Sem escolha de alinhamento ou tamanho.
3. **Fundo:** cobre a folha inteira (`cover`), atrás do texto, com 18% de opacidade fixa para o texto continuar legível. Sem escolher posição, repetição nem opacidade.
4. **Live Preview:** mostra a mesma folha do contrato gerado, com a logo e o fundo escolhidos no modal (inclusive os ainda não salvos).
5. **Impressão:** o contrato gerado é impresso por uma janela do navegador (logo, texto e fundo); não há geração de PDF no servidor nem anexo de arquivo (a assinatura eletrônica, SPEC-033, segue sem fornecedor).
6. **Arquivos antigos ficam:** trocar ou remover a imagem do modelo não apaga o arquivo do armazenamento, porque contratos já gerados o usam. Sem limpeza de arquivos órfãos nesta entrega.
7. **Só no modelo da tela única (#38):** não há logo própria no contrato avulso criado sem modelo, nem edição da logo do contrato já gerado.
8. **Sem migration de dados:** modelos e contratos existentes ficam sem imagem.
