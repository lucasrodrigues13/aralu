# 030. Contratos

**Status: aprovada (versão 2, 18/11/2026).** A versão 1 (um modelo único por conta, assinatura simulada) está no histórico do Git. Implementada em 18/11/2026. Fonte: decisões do usuário em 18/11/2026; [produto-v1.md](../produto-v1.md) 5.10; RF-098.

## 1. Identificador e nome

SPEC-030. Contratos (cadastro, vínculo ao modelo de evento e contratos do evento).

## 2. Objetivo

Cadastrar contratos da conta com campos de mesclagem, vinculá-los aos modelos de evento e mostrá-los preenchidos no evento. O casal lê o contrato por um link com prazo de validade enviado por e-mail. Assinatura eletrônica fica para quando houver integração com uma plataforma (pendência 1 da §17).

## 3. Requisitos relacionados

RF-098 (contrato do evento). RF-095 / SPEC-029 (valor e parcelas do casal, lidos pelo contrato). RF-087 / RF-088 (nome, documento e Pix da conta no texto). RF-056 (acesso sem login do casal). SPEC-012 (modelo de evento). Os modelos de contrato do **funil** (SPEC-028) continuam separados.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Admin | Vê e mantém a tela Contratos da própria conta. |
| Organizer | Vê e mantém a tela Contratos; vincula contratos ao modelo de evento; vê os contratos do evento; envia o link de leitura por e-mail. |
| Assistant | Não vê a tela Contratos. Contratos no evento só com "pode ver o financeiro" (SPEC-032 §17, ponto 3). |
| Casal (sem login) | Lê o contrato preenchido pelo link recebido por e-mail, enquanto o link não expirar. Não edita. |
| Outra conta | Não vê. |

## 5. Pré-condições

Usuário autenticado como Admin ou Organizer (SPEC-001). Para o contrato do evento: evento da conta. Os campos do cliente saem do cliente vinculado ao evento (SPEC-006/009); os valores, do Dinheiro do evento (SPEC-029).

## 6. Fluxo principal

### 6.1. Tela Contratos (cadastro)

1. No menu (grupo Modelos), a tela **Contratos** segue o padrão de lista (design-system 5.4 e 5.7): botão "Novo contrato" acima da tabela, tabela com nome e data de atualização, Editar e Excluir na última coluna.
2. "Novo contrato" e "Editar" abrem o modal largo com **Nome** e **Texto**. Ao lado do texto fica a lista de **campos de mesclagem**; clicar num campo insere a marca no cursor.
3. "Ver como fica" mostra o texto com as marcas destacadas e preenchidas com valores de exemplo.
4. A tela só aparece para Admin e Organizer.

### 6.2. Campos de mesclagem

Escritos no texto como `{{campo}}`. Lista inicial:

| Marca | Valor |
|---|---|
| `{{contratante_nome}}` | Nome completo do cliente do evento |
| `{{contratante_documento}}` | CPF ou CNPJ do cliente |
| `{{contratante_endereco}}` | Endereço completo do cliente |
| `{{contratante_email}}` | E-mail do cliente |
| `{{contratante_telefone}}` | Telefone/WhatsApp do cliente |
| `{{contratada_nome}}` | Nome da empresa (Perfil) |
| `{{contratada_documento}}` | CPF/CNPJ da empresa (Perfil) |
| `{{contratada_endereco}}` | Endereço da empresa (Perfil) |
| `{{contratada_responsavel}}` | Responsável (Perfil) |
| `{{contratada_pix}}` | Chave Pix (Perfil) |
| `{{evento_nome}}` | Nome do evento |
| `{{evento_tipo}}` | Tipo do evento |
| `{{evento_data}}` | Data do evento (dd/mm/aaaa) |
| `{{evento_local}}` | Local do evento |
| `{{evento_convidados}}` | Convidados estimados |
| `{{contrato_valor}}` | Valor do contrato (SPEC-029), em reais |
| `{{contrato_parcelas}}` | Lista das parcelas (vencimento e valor) |
| `{{data_hoje}}` | Data de hoje por extenso |

Campo sem dado sai como uma linha em branco sublinhada (`________`), para não sumir do texto.

### 6.3. Aba Contratos no modelo de evento

1. O editor do modelo de evento (SPEC-012) ganha a aba **Contratos**.
2. A aba lista os contratos da conta com uma marcação por contrato; os marcados ficam vinculados ao modelo.
3. Ao criar um evento a partir do modelo, os contratos vinculados entram no evento.

### 6.4. Aba Contratos no evento

1. O evento ganha a aba **Contratos**. Ela lista os contratos do evento: os que vieram do modelo e os que a dona adicionar ("Adicionar contrato", escolhendo da tela Contratos). "Remover" tira o contrato do evento sem apagar o cadastro.
2. "Ler" abre o contrato preenchido com os dados atuais do evento, do cliente, do Perfil e do Dinheiro do evento. "Imprimir" usa a impressão do navegador (dá para salvar em PDF).
3. "Enviar por e-mail" manda ao e-mail do cliente do evento um link de leitura sem login, com validade de **7 dias**. A tela mostra a data de expiração do último envio.

### 6.5. Leitura sem login

1. O link abre uma página pública com o contrato preenchido, a marca da assessoria e o aviso de validade.
2. Link expirado ou inválido mostra "Este link expirou. Peça um novo à sua assessoria." e nenhum dado do contrato.

## 7. Fluxos alternativos

- Contrato sem nome ou sem texto: o modal não grava.
- Excluir contrato vinculado a modelo ou evento: confirma; o vínculo sai do modelo e do evento.
- Evento sem cliente com e-mail: "Enviar por e-mail" fica indisponível e a tela explica o motivo.
- Evento sem valor no Dinheiro: os campos de valor saem em branco.
- Evento criado antes desta spec ou sem modelo: começa sem contratos; a dona adiciona.

## 8. Regras de negócio

- Vários contratos por conta (substitui a decisão "um modelo só" da versão 1).
- O contrato do evento é sempre lido com os dados atuais. Não há cópia congelada enquanto não existir assinatura.
- O valor e as parcelas vêm do Dinheiro do evento (SPEC-029). O contrato não grava valor.
- Sem assinatura nesta versão: nenhum botão "Assinar".
- O link de leitura vale 7 dias. Um envio novo gera outro link; os anteriores continuam até expirar.

## 9. Validações

Nome obrigatório (até 120 caracteres). Texto obrigatório. Marcas desconhecidas ficam no texto como estão. Evento e contrato da mesma conta.

## 10. Estados

Contrato do evento: vinculado. Link de leitura: válido → expirado. Sem estado de assinatura nesta versão.

## 11. Dados necessários

Contrato da conta: nome, texto, datas. Vínculo modelo ↔ contrato. Vínculo evento ↔ contrato. Link de leitura: token, evento, contrato, expira em, criado em.

## 12. Interface

Tela Contratos em Cadastros (lista + modal largo com a lista de campos). Aba Contratos no editor do modelo (marcações). Aba Contratos no evento (tabela com Ler, Imprimir, Enviar por e-mail, Remover). Página pública de leitura sem a casca.

## 13. Erros

Validação no campo. Outra conta: indisponível. Falha no envio do e-mail: aviso e nenhum link mostrado como enviado. Link expirado: mensagem sem dados.

## 14. Critérios de aceite

1. Admin e Organizer criam, editam e excluem contratos; a tela não aparece para outros papéis.
2. Clicar num campo de mesclagem insere `{{campo}}` no texto; "Ver como fica" destaca os campos.
3. A aba Contratos do modelo vincula contratos; o evento criado do modelo já mostra esses contratos.
4. No evento, "Ler" mostra o texto com os dados do cliente, do evento, do Perfil e do Dinheiro.
5. "Enviar por e-mail" manda o link; o link abre sem login por 7 dias e depois mostra que expirou.
6. Outra conta não vê contratos, vínculos nem o link de outra conta.

## 15. Cenários de teste

Criar contrato com marcas. Vincular ao modelo e criar evento do modelo. Adicionar e remover contrato no evento. Ler com cliente completo e sem cliente. Enviar por e-mail, abrir o link, expirar o link. Isolamento entre contas. Conferir que a SPEC-028 não muda.

## 16. Dependências

SPEC-001 (papéis), SPEC-005 (Perfil e Pix), SPEC-006/009 (cliente), SPEC-008 (evento), SPEC-012 (modelo de evento), SPEC-029 (valor e parcelas), envio de e-mail da conta (SPEC-001).

## 17. Premissas e pontos não definidos

1. **Pendência: assinatura eletrônica.** Escolher a plataforma (ex.: Clicksign, ZapSign, D4Sign, DocuSign) e definir o fluxo: quem assina, ordem, estados (aguardando, assinado, recusado), cópia congelada do texto na hora do envio e retorno do documento assinado. Até lá não há assinatura nem simulação.
2. Validade de 7 dias para o link de leitura (premissa; ajustar se o usuário pedir outro prazo).
3. Se o casal com link do casal (bloco 11) vê os contratos direto no link, sem e-mail.
4. Lista de campos de mesclagem além da §6.2.
