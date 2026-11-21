# 048. Aba Contratos do evento: contratos de fornecedor

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #30, com as opções mais simples e conservadoras nos pontos em aberto).** Fonte: card #30 do Trello; [produto-v1.md](../produto-v1.md) 5.10. Usa a [SPEC-045](045-contratar-fornecedor-e-contrato-assinado.md) (contrato assinado do fornecedor) e a [SPEC-046](046-link-do-casal-financeiro.md) (o casal sobe o contrato pelo link). Cria a aba que a [SPEC-030](030-contrato-do-evento.md) v3 §6.3 deixou para este card.

## 1. Identificador e nome

SPEC-048. Aba Contratos do evento.

## 2. Objetivo

Dar ao evento uma aba **Contratos** que lista todos os contratos **com fornecedores** enviados ao sistema naquele evento, tanto os anexados pela organizadora (SPEC-045) quanto os subidos pelo casal pelo link sem login (SPEC-046), identificando o fornecedor e o serviço de cada um. A plataforma só **recebe** o arquivo: a aba lista, abre e baixa.

## 3. Requisitos relacionados

RF-098 (contrato), RF-058 e RF-059 (fornecedor e etapas). Regra 7 do [roteiro de execução](../roteiro-execucao.md).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Admin, Organizer, Assistant | Ver a aba, abrir e baixar os contratos dos eventos a que têm acesso (mesma regra da aba Fornecedores). |
| Casal (link) | Não usa esta aba; sobe o contrato pelo financeiro do link (SPEC-046 §6.3). |
| Outra conta | Não vê (404). |

## 5. Pré-condições

Evento da conta.

## 6. Fluxo principal

1. O evento ganha a aba **Contratos** (entre Fornecedores e Dinheiro), rota `/eventos/:id/contratos`.
2. A aba mostra uma tabela com **Fornecedor**, **Serviço** e **Arquivo** (nome do arquivo) e as ações **Abrir** (nova janela) e **Baixar**. Um contrato por serviço contratado que tenha arquivo.
3. A lista vem do detalhe do evento (`servicos[].contratoAssinado`), então inclui o que o casal subir pelo link (as duas origens gravam no mesmo lugar, SPEC-045 §8 e SPEC-046 §8).
4. Sem contratos: texto explicando que o contrato assinado é anexado na aba Fornecedores e que o do casal também aparece aqui.
5. **Anexar, substituir e excluir** continuam na aba Fornecedores (menu da linha contratada, SPEC-045 §6.4). A aba Contratos é só leitura.
6. **Contratos criados de modelo** (contrato do organizador com o cliente) não aparecem aqui (SPEC-030 v3).

## 7. Fluxos alternativos

- Falha ao carregar ou ao abrir o arquivo: aviso (toast). Arquivo de outra conta: 404.
- Fornecedor voltou para orçamento depois do envio (o arquivo é mantido, SPEC-045 §6.3): a linha aparece com "—" no fornecedor.

## 8. Regras de negócio

- Fonte única: `ContratoFornecedor.ContratoAssinado*` (um arquivo por serviço). **Sem migration e sem mudança de API.**
- Nada é apagado do banco nem da API (regra 7 do roteiro: não há funcionalidade removida neste card).

## 9. Validações

Nenhuma nova (o envio segue a SPEC-045: JPG, JPEG, PNG ou PDF até 5 MB).

## 10. Estados

Serviço com contrato enviado ou sem.

## 11. Dados necessários

Os de leitura já existentes: serviço, fornecedor contratado, arquivo (id, nome, tipo).

## 12. Interface

Aba no padrão das demais (design-system 5.4): cartão com título, subtítulo e tabela; sem modal.

## 13. Erros

Aviso por toast; evento de outra conta indisponível.

## 14. Critérios de aceite

1. A aba Contratos aparece no evento e lista os serviços com contrato enviado, com fornecedor, serviço e arquivo.
2. Contrato anexado pela organizadora e contrato subido pelo casal aparecem na mesma lista.
3. Abrir e Baixar entregam o arquivo; serviço sem contrato não aparece.
4. Contrato criado de modelo não aparece.

## 15. Cenários de teste

Unitário (Angular, `montarContratosDoEvento`): lista só serviços com contrato, fornecedor só quando contratado, ordem por serviço, vazio. Sem mudança de backend; os fluxos de envio já são cobertos nas SPEC-045 e 046.

## 16. Dependências

SPEC-045, SPEC-046, SPEC-030 v3. Depois: #20 (Resumo do evento aponta para os contratos).

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono):

1. **"Quem enviou (organizador ou casal)" e "data do envio" NÃO são mostrados.** O banco não registra nem autor nem data do envio (o `ContratoFornecedor` e o registro do arquivo não têm esses campos) e o card exige **sem migration**. A aba mostra fornecedor, serviço e arquivo. **Para ter os dois, é preciso uma migration** em `ContratosFornecedor` (por exemplo `ContratoAssinadoEnviadoPor` e `ContratoAssinadoEnviadoEm`), gravada nos dois caminhos (`FornecedorServico.EnviarContratoAssinadoAsync`, pela organizadora e pelo link). Fica pendente, para entrar na fila do banco se o dono quiser.
2. **Um contrato por serviço**, não por fornecedor: é como a SPEC-045 guarda o arquivo. Dois fornecedores contratados no mesmo serviço aparecem na mesma linha, separados por vírgula.
3. **Aba só de leitura.** Enviar, substituir e excluir ficam na aba Fornecedores; não duplicamos a ação.
4. **A aba aparece para todos que veem o evento** (inclusive Assistant), como Fornecedores; não depende da permissão do financeiro.
5. **Onde o contrato do organizador com o cliente (de modelo) é visto, impresso e enviado ao casal dentro do evento** segue em aberto, fora deste card (já registrado no card).
