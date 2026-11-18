# 030. Contrato do evento

**Status: rascunho (bloco 7).** Fonte: [produto-v1.md](../produto-v1.md) 5.10, RF-098. Assinatura simulada na 1.0 (pendência 1 do produto-v1).

## 1. Identificador e nome

SPEC-030. Contrato do evento.

## 2. Objetivo

Ter **um** modelo de contrato por conta, preencher o contrato do evento, ver como fica, baixar PDF e marcar como assinado (simulado), gerando as parcelas no Dinheiro do evento.

## 3. Requisitos relacionados

RF-098 (contrato do evento). RF-095 / SPEC-029 (parcelas geradas). RF-088 (CPF/CNPJ e Pix no texto). RF-087 (nome/marca). Modelos de contrato do **funil** (SPEC-028) continuam separados.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Edita o modelo da conta; gera, baixa e assina (simulado) o contrato do evento. |
| Assistant | Não edita o modelo da conta (fica com a dona, RF-045). Pode gerar/baixar no evento se a dona liberar financeiro? (§17). |
| Casal | Pode ver/assinar pelo link só se o bloco 11 e esta spec decidirem (§17). |
| Outra conta | Não vê. |

## 5. Pré-condições

Conta com (ou sem) modelo. Evento em andamento para gerar o contrato preenchido. Dados do cliente e do evento quanto mais completos, melhor o preenchimento.

## 6. Fluxo principal

### 6.1. Modelo da conta

1. Em Cadastros / Conta, a dona mantém **um** modelo de contrato (texto com campos marcados).
2. Campos disponíveis: nome do cerimonial, CPF/CNPJ dela, nome/CPF/endereço/WhatsApp/e-mail do cliente, título do evento, tipo, data, horário, local, convidados, valor, lista de parcelas, data de hoje.
3. "Ver como fica" mostra o texto com os campos **destacados** (placeholders ou valores de exemplo).

### 6.2. Contrato do evento

1. No evento, aba Contrato (grupo Dinheiro): "Gerar contrato" usa o modelo da conta e os dados do evento/cliente.
2. A dona pode ajustar o valor e a lista de parcelas antes de confirmar; ao confirmar, as parcelas vão para o Dinheiro do evento (SPEC-029).
3. "Baixar PDF" gera o arquivo preenchido.
4. "Assinar" (1.0): marca o contrato como **assinado**, registra data/hora e mostra um aviso de que a assinatura é simulada, sem serviço externo.

## 7. Fluxos alternativos

- Conta sem modelo: não gera; pede para criar o modelo.
- Evento sem cliente: gera com campos de cliente vazios ou bloqueia (§17).
- Assinar de novo: mantém assinado; não desfaz sem ação explícita (§17).
- Serviço de assinatura real: fora da 1.0 (pendência do produto).

## 8. Regras de negócio

- Um modelo só por conta (decisão 18/11/2026).
- Assinatura simulada: não chama provedor externo.
- Parcelas do contrato alimentam RF-095.
- O modelo do funil (SPEC-028) não é este modelo.

## 9. Validações

Modelo: texto não vazio. Valor ≥ 0. Evento da conta.

## 10. Estados

Contrato do evento: rascunho (gerado) → assinado (simulado). Sem "recusado" neste corte (§17).

## 11. Dados necessários

Modelo (texto + lista de campos). Contrato do evento (texto preenchido ou referência + snapshot dos valores, PDF, situação, data da assinatura). Parcelas geradas.

## 12. Interface

Edição do modelo e "ver como fica" em modal/página de detalhe (§17). PDF em download. Aviso claro na assinatura simulada.

## 13. Erros

Sem modelo: mensagem clara. Outra conta: indisponível. Falha no PDF: nada marca como assinado.

## 14. Critérios de aceite

1. A conta tem no máximo um modelo de contrato editável.
2. "Ver como fica" destaca os campos.
3. Gerar no evento preenche com dados do evento/cliente e permite baixar PDF.
4. Assinar marca assinado e mostra aviso de simulação.
5. As parcelas vão para o Dinheiro do evento.
6. Outra conta não vê o modelo nem o contrato.

## 15. Cenários de teste

Criar/editar o modelo único. Gerar com cliente completo e sem cliente. Baixar PDF. Assinar e reler estado. Isolamento. Conferir que SPEC-028 não muda.

## 16. Dependências

SPEC-005/RF-087/088 (dados da conta), SPEC-008/009 (evento e cliente), SPEC-029 (parcelas), SPEC-028 (só para não misturar).

## 17. Premissas e pontos não definidos

1. Sintaxe dos campos no texto do modelo (mustache, `{{campo}}`, etc.).
2. Onde fica a tela do modelo (Perfil, Ajustes, Cadastros).
3. Assistant pode ou não gerar/baixar contrato no evento.
4. Casal assina pelo link na 1.0 ou só a dona marca simulado.
5. Dá para "desassinir" / gerar de novo após assinado.
6. Biblioteca de geração de PDF escolhida na implementação (fora desta spec de comportamento).
7. Estado "recusado" ou "aguardando assinatura" real quando houver provedor.
