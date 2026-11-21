# 030. Contratos (cadastro)

**Status: aprovada (versão 3, 21/11/2026; aprovação do dono do projeto repassada pela sessão que abriu o card, com as opções mais simples e conservadoras nos pontos em aberto).** A versão 2 (aprovada em 18/11/2026, com vínculo ao modelo de evento, aba Contratos no evento e link de leitura por e-mail) está no histórico do Git. Esta versão aplica o card #36 do Trello: o contrato do organizador com o cliente **não tem vínculo com o evento**. Fonte: decisão do usuário em 21/11/2026; [produto-v1.md](../produto-v1.md) 5.10; RF-098.

## 1. Identificador e nome

SPEC-030. Contratos (cadastro de contratos da conta). O nome do arquivo (`030-contrato-do-evento`) fica, para não quebrar links, mas o contrato deixa de ser "do evento".

## 2. Objetivo

Cadastrar contratos da conta (nome e texto com campos de mesclagem), para o organizador usar com os clientes. O contrato **não se liga a modelo de evento nem a evento**. O envio ao cliente é só pelo contrato do funil ([SPEC-022](022-contratos-do-funil.md), ação "Enviar") e, depois, pela assinatura eletrônica ([SPEC-033](033-assinatura-eletronica.md)). Os modelos de contrato são unificados na tela única "Modelos de Contrato" pelo card #38; até lá a tela Contratos continua como está, sem vínculo.

## 3. Requisitos relacionados

RF-098 (contrato). RF-087 / RF-088 (nome, documento e Pix da conta no texto). SPEC-012 (modelo de evento: perde a aba Contratos). SPEC-028 (modelo de contrato do funil, não muda aqui). SPEC-022 (contrato do funil, não muda aqui). Contratos de fornecedor: card #30 (aba Contratos do evento lista só arquivos de fornecedor).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Admin | Vê e mantém a tela Contratos da própria conta. |
| Organizer | Vê e mantém a tela Contratos. |
| Assistant | Não vê a tela Contratos. |
| Casal (sem login) | Não há mais leitura de contrato por link. |
| Outra conta | Não vê. |

## 5. Pré-condições

Usuário autenticado como Admin ou Organizer (SPEC-001).

## 6. Fluxo principal

### 6.1. Tela Contratos (cadastro)

Igual à versão 2, sem mudança de comportamento:

1. No menu (grupo Modelos), a tela **Contratos** segue o padrão de lista (design-system 5.4 e 5.7): botão "Novo contrato", tabela com nome e data de atualização, Editar e Excluir.
2. "Novo contrato" e "Editar" abrem o modal largo com **Nome** e **Texto**. Ao lado do texto fica a lista de **campos de mesclagem**; clicar num campo insere a marca no cursor.
3. "Ver como fica" mostra o texto com as marcas destacadas e preenchidas com valores de exemplo.
4. A tela só aparece para Admin e Organizer.

### 6.2. Campos de mesclagem

Escritos no texto como `{{campo}}`. **Saem** os campos que dependem do evento: `evento_nome`, `evento_tipo`, `evento_data`, `evento_local`, `evento_convidados`, `contrato_valor` e `contrato_parcelas`. Ficam:

| Marca | Valor |
|---|---|
| `{{contratante_nome}}` | Nome completo do cliente |
| `{{contratante_documento}}` | CPF ou CNPJ do cliente |
| `{{contratante_endereco}}` | Endereço completo do cliente |
| `{{contratante_email}}` | E-mail do cliente |
| `{{contratante_telefone}}` | Telefone/WhatsApp do cliente |
| `{{contratada_nome}}` | Nome da empresa (Perfil) |
| `{{contratada_documento}}` | CPF/CNPJ da empresa (Perfil) |
| `{{contratada_endereco}}` | Endereço da empresa (Perfil) |
| `{{contratada_responsavel}}` | Responsável (Perfil) |
| `{{contratada_pix}}` | Chave Pix (Perfil) |
| `{{data_hoje}}` | Data de hoje por extenso |

Valor e parcelas voltam como campos quando o contrato do funil os copiar do orçamento aprovado (card #39). Marca desconhecida (inclusive as removidas, em textos já salvos) fica no texto como está. Campo sem dado sai como linha em branco (`________`).

### 6.3. O que sai

1. **Aba Contratos no editor do modelo de evento** (SPEC-012): removida. O evento criado do modelo **não** recebe contratos.
2. **Aba Contratos do evento** (lista, Adicionar, Remover, Ler, Imprimir, Enviar por e-mail): removida da tela e da rota. O card #30 cria a nova aba, só com contratos de fornecedor (arquivos).
3. **Link de leitura sem login** (página pública `/contrato/:token` e endpoint público): removido. Links já enviados deixam de funcionar.
4. **API:** saem `GET/PUT /modelos/{id}/contratos`, `GET /eventos/{id}/contratos`, `POST/DELETE /eventos/{id}/contratos/{contratoId}`, `GET .../texto`, `POST .../enviar` e `GET /publico/contratos/{token}`. Ficam só os endpoints da tela Contratos (`/contratos`, `/contratos/{id}`, `/contratos/campos`).

## 7. Fluxos alternativos

- Contrato sem nome ou sem texto: o modal não grava.
- Excluir contrato: confirma; não há mais vínculo a desfazer.
- Evento criado de qualquer modelo: começa sem contratos.

## 8. Regras de negócio

- Vários contratos por conta.
- O contrato não tem vínculo com modelo de evento nem com evento, na tela e na API.
- O envio do contrato ao cliente é só pelo contrato do funil (Enviar e, depois, assinatura eletrônica, SPEC-033). **Consequência confirmada no card #36:** não há mais leitura do contrato pelo e-mail com link de 7 dias, e nada no evento envia contrato ao casal.
- **Banco:** `ContratosDoModelo`, `ContratosDoEvento` e `LinksLeituraContrato` foram apagadas por migration, com as classes e o mapeamento (SPEC-036, regra 7 do roteiro: funcionalidade removida sai também do banco). Os dados delas foram perdidos.

## 9. Validações

Nome obrigatório (até 120 caracteres). Texto obrigatório.

## 10. Estados

Contrato cadastrado ou excluído.

## 11. Dados necessários

Contrato da conta: nome, texto, datas. As três tabelas de vínculo e de link deixaram de existir (SPEC-036).

## 12. Interface

Tela Contratos (lista + modal largo com a lista de campos). Sem aba Contratos no modelo de evento, sem aba Contratos no evento (até o card #30) e sem página pública de leitura.

## 13. Erros

Validação no campo. Outra conta: indisponível.

## 14. Critérios de aceite

1. Admin e Organizer criam, editam e excluem contratos; a tela não aparece para outros papéis.
2. Clicar num campo de mesclagem insere `{{campo}}` no texto; "Ver como fica" destaca os campos; a lista não traz campos de evento, valor nem parcelas.
3. O editor do modelo de evento não tem aba Contratos; evento criado do modelo nasce sem contratos.
4. O evento não tem aba Contratos nem rota `/eventos/:id/contratos`.
5. Os endpoints removidos respondem 404; `/contrato/:token` não existe mais.
6. As três tabelas legadas continuam no banco; o snapshot de migrations não muda.
7. Outra conta não vê contratos de outra conta.

## 15. Cenários de teste

Criar, editar e excluir contrato com marcas; lista de campos sem os de evento/valor; "Ver como fica"; criar evento de modelo e conferir que não recebe contrato; rotas e endpoints removidos; isolamento entre contas; SPEC-022 e SPEC-028 inalteradas.

## 16. Dependências

SPEC-001 (papéis), SPEC-005 (Perfil), SPEC-006/009 (cliente), SPEC-012 (modelo de evento), SPEC-022 (contrato do funil). Quem vem depois: #38 (tela única de modelos), #39 (contrato do funil com tags e valor/parcelas), #30 (aba Contratos do evento só de fornecedor).

## 17. Premissas e pontos não definidos

1. **Pendência: assinatura eletrônica.** Rascunho em [SPEC-033](033-assinatura-eletronica.md). Até lá não há assinatura nem simulação.
2. **Em aberto (fora deste card, já registrado no card #30):** onde o contrato do organizador com o cliente é visto, impresso e enviado ao casal dentro do evento, já que a aba sai. Até o #30/#39 não há esse lugar.
4. Decisões conservadoras tomadas ao aprovar: `contrato_valor` e `contrato_parcelas` saem agora (voltam no #39); a tela Contratos fica como está até o #38; as tabelas legadas ficam no mapeamento do EF.
3. Textos de contrato já salvos com marcas removidas (`{{evento_nome}}` etc.) ficam com a marca crua; o dono precisa editá-los. Premissa: aceitável, pois a tela é substituída pelo card #38.
