# 045. Contratar fornecedor e anexar o contrato assinado

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #28, com as opções mais simples e conservadoras nos pontos em aberto).** Fonte: card #28 do Trello; [produto-v1.md](../produto-v1.md) 5.6. Revisa a [SPEC-018](018-servicos-e-fornecedores.md) (fornecedores do evento) e a [SPEC-043](043-pagamentos-a-fornecedores.md) §17 (pontos 1 e 6); usa o banco da [SPEC-040](040-parcelas-por-documento.md).

## 1. Identificador e nome

SPEC-045. Contratar fornecedor e anexar o contrato assinado.

## 2. Objetivo

Na aba Fornecedores do evento: (a) escolher o fornecedor e, na sequência, os serviços dele; (b) **Contratar** pede só o valor, sem parcelas (o parcelamento é feito depois, na aba Dinheiro); (c) ao contratar, e depois, o organizador **anexa o contrato assinado** pelo fornecedor e pelo casal. A plataforma só recebe o arquivo: não há modelo, leitura nem envio ao casal.

## 3. Requisitos relacionados

RF-058, RF-059 (etapas), RF-068 (parcelas a fornecedores; agora definidas no Dinheiro). Regra 7 do [roteiro de execução](../roteiro-execucao.md).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Admin, Organizer, Assistant | Contratar e anexar/abrir/excluir o contrato assinado nos eventos a que têm acesso (mesma regra do Contratar de hoje). |
| Outra conta | Não vê (404). |

O casal subir o contrato assinado pelo link é o card #34 (feito na [SPEC-046](046-link-do-casal-financeiro.md)).

## 5. Pré-condições

Evento da conta; fornecedor do cadastro da conta; serviço no evento.

## 6. Fluxo principal

### 6.1. Adicionar fornecedor: fornecedor primeiro, depois os serviços

1. O diálogo pede primeiro o **fornecedor** (busca no cadastro, com "Cadastrar novo fornecedor").
2. Na sequência, **Serviços**: lista com marcação múltipla. As opções são os serviços do evento mais os serviços que o fornecedor presta e que ainda não existem no evento (marcados "novo no evento"). Os que o fornecedor presta vêm primeiro e **pré-marcados**; serviços do evento em que ele já está aparecem desabilitados ("Já está neste serviço").
3. Confirmar cria um vínculo em Orçamento para cada serviço marcado (criando antes os serviços novos). Precisa marcar ao menos um.
4. Aberto a partir de um serviço (botão "Fornecedor" da linha), esse serviço já vem marcado.

### 6.2. Contratar

1. "Contratar" no vínculo abre um modal com **Valor** (começa com o valor do orçamento do vínculo) e **Contrato assinado** (arquivo opcional). Não há parcelas nem entrada.
2. Confirmar: o vínculo vai para Contratado, o serviço fica contratado com o valor, as tarefas ligadas ao serviço são concluídas e o **contrato de fornecedor** do serviço nasce (sem parcelas). Se o arquivo foi escolhido, é enviado em seguida.
3. O pagamento aparece na aba Dinheiro como pagamento sem parcelas, que lá pode ser parcelado.

### 6.3. Contratar de novo (depois de "Voltar para orçamento")

O contrato existente é **mantido**, com parcelas, pagamentos, comprovantes e contrato assinado. Contratar de novo só atualiza o valor do serviço. Se o contrato tem parcelas e o novo valor não é a soma delas, é recusado (400): o parcelamento é refeito antes na aba Dinheiro.

### 6.4. Contrato assinado

1. Na linha do fornecedor contratado, o menu traz **Contrato assinado**: Anexar (ou Substituir), Abrir e Excluir. A linha mostra um selo com o nome do arquivo quando há um.
2. Um arquivo por serviço contratado (JPG, JPEG, PNG ou PDF até 5 MB, como os comprovantes). Enviar outro substitui e apaga o anterior. Excluir apaga o arquivo.
3. Voltar o vínculo para orçamento não apaga o arquivo (vale o §6.3).

## 7. Fluxos alternativos

- Valor vazio ou negativo: 400. Arquivo de outro tipo ou acima de 5 MB: 400.
- Anexar contrato em serviço não contratado: 404. Serviço, vínculo ou arquivo de outra conta: 404.
- Contratar com contrato parcelado e valor diferente da soma das parcelas: 400 com mensagem.
- Se o envio do arquivo falhar depois de contratar, a contratação vale e o aviso diz para anexar pelo menu.

## 8. Regras de negócio

- O contrato de fornecedor nasce em todo caminho que deixa o serviço contratado: Contratar, adicionar o fornecedor já em Contratado e avançar a etapa. A aba Dinheiro não cria mais contrato no primeiro uso.
- **Banco (migration `ContratoAssinadoDoFornecedor`, uma só):** `ContratosFornecedor` ganha o arquivo assinado (`ContratoAssinadoArquivoId`, `ContratoAssinadoNome`, `ContratoAssinadoTipoConteudo`) e, por SQL na mesma migration, todo serviço contratado sem contrato de fornecedor recebe um (sem parcelas).
- **API:** `POST /eventos/{id}/servicos/{servicoId}/contrato-assinado` (multipart, campo `arquivo`) e `DELETE` no mesmo caminho; ambos devolvem o detalhe do evento. `POST .../contratar` passa a receber só `{ valor }`. `ServicoLeitura` ganha `contratoAssinado` (`arquivoId`, `nome`, `tipoConteudo`) ou nulo. Saem do pedido: `quantidadeParcelas`, `primeiraParcela`, `comEntrada`, `baseEntrada`, `valorEntrada`, `dataEntrada`. Abre-se o arquivo por `GET /arquivos/{id}` (já existe).

## 9. Validações

Valor maior ou igual a zero; arquivo JPG, JPEG, PNG ou PDF de até 5 MB; ao menos um serviço no "Adicionar fornecedor".

## 10. Estados

Vínculo: Orçamento ou Contratado (inalterado). Contrato assinado: anexado ou não.

## 11. Dados necessários

Valor contratado; arquivo (id, nome original, tipo) guardado no contrato do fornecedor.

## 12. Interface

Tudo em modal (design-system 5.10). Menu de ações da linha contratada: Contrato assinado (Anexar/Substituir, Abrir, Excluir) e Voltar para orçamento.

## 13. Erros

Mensagem no modal ou aviso. Outra conta: indisponível.

## 14. Critérios de aceite

1. Adicionar fornecedor: escolher o fornecedor mostra os serviços dele pré-marcados; marcar dois cria dois vínculos em Orçamento.
2. Contratar pede só o valor (e o arquivo opcional); o serviço fica contratado e aparece no Dinheiro sem parcelas.
3. Contratar com arquivo guarda o contrato assinado; Abrir, Substituir e Excluir funcionam; tipo inválido é recusado; outra conta recebe 404.
4. Parcelar no Dinheiro, marcar parcela paga e comprovar; voltar para orçamento e contratar de novo mantém tudo (pagos, comprovantes e contrato assinado).
5. Contratar de novo com valor diferente da soma das parcelas é recusado.

## 15. Cenários de teste

Só integração (a regra do valor contra a soma das parcelas fica no serviço): contratar sem parcelas, anexar/substituir/excluir (PDF, texto recusado), isolamento, contratar de novo preservando parcelas e comprovantes e recusando valor diferente da soma. Escritos e compilando; a execução fica para o fim das ondas (Docker).

## 16. Dependências

SPEC-018, SPEC-040 (banco), SPEC-043 (Dinheiro). Depois: #34 (casal sobe o contrato assinado pelo link), #29 (gráficos na mesma tela).

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono):

1. **Onde fica o arquivo.** No `ContratoFornecedor` do serviço (SPEC-040), um arquivo por serviço contratado. O card falava em "vínculo fornecedor/serviço"; o contrato já é um por serviço.
2. **Quando o arquivo é enviado.** Contratar e o envio são duas chamadas (o arquivo vai logo depois da contratação, pelo mesmo modal). Não há endpoint único multipart.
3. **Limite do arquivo.** Mesmo dos comprovantes: JPG, JPEG, PNG ou PDF até 5 MB. Contrato maior ou em Word não é aceito.
4. **Contratar de novo.** Mantém o contrato existente. Valor diferente da soma das parcelas é recusado, em vez de refazer ou apagar parcelas (corrige o ponto 6 da SPEC-043: pagos e comprovantes não se perdem).
5. **Serviços no "Adicionar fornecedor".** Saiu a opção "Novo serviço…" com nome livre: os serviços novos vêm do que o fornecedor presta; outros se criam pelo botão "Adicionar serviço" da tela.
6. **Dados antigos.** Serviços contratados sem contrato de fornecedor ganham um na migration; nenhum dado é apagado.
7. **Arquivo excluído ou substituído** é apagado do volume (como o comprovante).
8. **Quem pode.** Mesma permissão do Contratar atual (equipe), não a do financeiro.
