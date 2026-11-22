# 057. HTML do modelo de orçamento na tela de aceite

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #18, com as opções mais simples e conservadoras nos pontos em aberto, listados na seção 17).** Fonte: card #18 do Trello ([tarefas-trello.md](../tarefas-trello.md)); [produto-v1.md](../produto-v1.md) 5.13. Estende a [SPEC-027](027-modelo-de-orcamento-do-funil.md) (modelo de orçamento) e a [SPEC-031](031-funil-estagios-retorno-e-proposta.md) parte C (proposta por link, tela de aceite).

## 1. Identificador e nome

SPEC-057. HTML do modelo de orçamento na tela de aceite.

## 2. Objetivo

A cerimonialista cadastra, no modelo de orçamento, um trecho de HTML (apresentação, diferenciais, portfólio, depoimentos) que o cliente vê na tela em que aceita a proposta, como parte do convencimento.

## 3. Requisitos relacionados

RF-075 (funil). Sem RF novo.

## 4. Atores e permissões

Quem edita modelos de orçamento (Organizer e Admin, SPEC-027; a assistente com a permissão do funil). O cliente vê o resultado pelo link da proposta, sem login (SPEC-031 parte C).

## 5. Pré-condições

Modal "Novo/Editar modelo de orçamento" aberto; orçamento criado a partir do modelo; link da proposta válido.

## 6. Fluxo principal

1. No modal do modelo de orçamento há o campo **HTML da tela de aceite (opcional)**, com a lista do que é aceito e uma **prévia já filtrada**.
2. Ao salvar, o **servidor sanitiza** o HTML (seção 8) e grava só o resultado.
3. Ao criar um orçamento a partir do modelo (SPEC-025), o servidor **copia o HTML do modelo para o orçamento**. Depois disso o orçamento tem vida própria: editar ou excluir o modelo não muda orçamentos já criados (mesma regra do texto, SPEC-027 §8).
4. Na tela de aceite (`proposta-publica`) o HTML aparece **entre o texto da proposta e o valor**, dentro da mesma folha. Sem HTML, a tela fica como antes.

## 7. Fluxos alternativos

- HTML vazio ou que a sanitização esvazia (só `<script>`, por exemplo): o modelo grava sem HTML.
- Orçamento criado sem modelo, ou antes desta entrega: sem HTML.
- Proposta vencida ou cancelada: não mostra o HTML (só a marca e o contato).

## 8. Regras de negócio (segurança)

O HTML é digitado pela assessoria e **exibido a terceiros (o cliente)**, por isso é tratado como não confiável:

- **Sanitização no servidor** (`HtmlSeguro.Sanitizar`), reconstruindo o HTML do zero com **lista permitida**:
  - Tags: `p`, `div`, `span`, `br`, `hr`, `h1` a `h6`, `strong`, `b`, `em`, `i`, `u`, `s`, `small`, `sub`, `sup`, `ul`, `ol`, `li`, `blockquote`, `a`, `img`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td`, `caption`, `figure`, `figcaption`.
  - Atributos: `a`: `href` e `title`; `img`: `src`, `alt`, `title`, `width`, `height`; `td` e `th`: `colspan` e `rowspan`. **Nenhum outro** (sem `style`, `class`, `id`, `on*`).
  - URLs: `href` só `http`, `https`, `mailto` e `tel`; `src` de imagem só `https`. Relativas, `//host`, `javascript:`, `data:`, `vbscript:` e `file:` são descartadas, inclusive com maiúsculas, espaços, controles ou entidades (`&#106;avascript:`) no meio. O valor é decodificado antes de olhar o esquema e reescapado ao gravar.
  - Links ganham `target="_blank"` e `rel="noopener noreferrer nofollow"` fixos.
  - Sem scripts, `iframe`, `object`, `embed`, `style`, `svg`, `math`, formulários, `link`, `meta`, `base` e comentários; as tags que têm conteúdo próprio (`script`, `style`, `iframe`, `object`...) perdem também o que há dentro.
  - Texto sempre escapado; `<` solto e tag sem fechamento viram texto; tags abertas são fechadas; profundidade máxima 40; entrada até 50.000 caracteres.
- **Defesa em profundidade:** o servidor sanitiza **de novo ao servir** a proposta (se um dado antigo ou editado direto no banco tivesse HTML perigoso, ele não sai) e o **frontend não confia no HTML**: exibe com `[innerHTML]` do Angular, que filtra de novo (nunca com `bypassSecurityTrust*`).
- A sanitização é idempotente.

## 9. Validações

HTML opcional, até 50.000 caracteres (o que passar é cortado antes de sanitizar). Nenhum erro por conteúdo perigoso: ele é só removido.

## 10. Estados

Modelo e orçamento com ou sem HTML de aceite.

## 11. Dados necessários

Migration `HtmlDeAceiteDoOrcamento`: `ModelosOrcamentoFunil.HtmlAceite` e `OrcamentosFunil.HtmlAceite`, `text` nulas. Só acrescenta colunas; nada é apagado nem perdido. API: `POST` e `PUT /api/v1/modelos-orcamento-funil` aceitam `htmlAceite`; a leitura do modelo e `GET /api/v1/publico/propostas/{token}` (pública) trazem `htmlAceite` já sanitizado.

## 12. Interface

Modal do modelo de orçamento: caixa de texto de 8 linhas e prévia filtrada abaixo, só no tipo orçamento. Tela de aceite: seção entre o texto e o valor, com imagens e tabelas limitadas à largura da tela (celular).

## 13. Erros

Falha ao gravar mantém o modelo anterior (SPEC-027 §13).

## 14. Critérios de aceite

1. Salvar um modelo com HTML grava só o HTML sanitizado; `<script>`, `on*`, `style`, `iframe` e URLs `javascript:` somem.
2. Orçamento criado desse modelo mostra o HTML na tela de aceite, entre o texto e o valor.
3. Editar o HTML do modelo depois não muda orçamentos já criados.
4. Modelo sem HTML: a tela de aceite fica como antes.
5. Proposta vencida ou cancelada não mostra o HTML.

## 15. Cenários de teste

Unidade (`HtmlSeguroTests`): tags perigosas e conteúdo delas, manipuladores de evento, `style`, URLs perigosas (maiúsculas, espaço, tabulação, entidades, `data:`, `//host`), imagem só https, aspas e HTML dentro de atributo, `<` solto, tag sem fechamento, aninhamento profundo, limite de tamanho, idempotência, HTML legítimo mantido. Integração (precisa do Docker, rodar no fim das ondas): salvar modelo com HTML, criar orçamento do modelo, `GET` da proposta pública com o HTML sanitizado. A tela é conferida no navegador.

## 16. Dependências

SPEC-027, SPEC-025, SPEC-031 parte C, SPEC-042 (parcelas, na mesma tela).

## 17. Premissas e pontos não definidos (opção mais simples e conservadora; o dono pode rever)

1. **Onde se cadastra:** no **modelo** de orçamento (o card diz "modelo de orçamento"), copiado para o orçamento ao criá-lo. Não há campo de HTML no orçamento avulso nem edição do HTML de um orçamento já criado.
2. **Cópia, não referência:** orçamentos já criados não acompanham mudanças do modelo, e orçamentos anteriores a esta entrega ficam sem HTML.
3. **Sem `style`, `class` nem CSS:** o HTML aparece com o estilo da tela de aceite. É o mais seguro (sem estilo externo nem `url()`); o custo é menos liberdade visual. Cores do modelo (primária e secundária) continuam sem uso na tela pública.
4. **Sem vídeo, iframe, formulário nem script** (incluindo YouTube): fora da lista permitida.
5. **Imagens só por `https` de outro endereço:** não há envio de imagem para o HTML nesta entrega (a imagem é carregada do endereço informado, o que revela o acesso ao dono do endereço).
6. **Local na tela:** entre o texto e o valor/parcelas, dentro da mesma folha; não há posição configurável.
7. **Sem editor visual:** só caixa de texto com HTML; a prévia usa o mesmo filtro do cliente.
8. **Sem migration de dados:** modelos e orçamentos existentes ficam sem HTML.
