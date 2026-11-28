# 068. Landing page da Aralu

**Status: em construção (28/11/2026).** Landing estática construída em `src/landing` e conferida localmente; falta publicar, os depoimentos no backend e a migration do valor do plano (ver §13). Fonte: pedido do dono para o lançamento em produção. Depende da [SPEC-069](069-app-em-subdominio.md) (o app sai de `aralu.com.br` para `app.aralu.com.br`) e usa o cadastro e o trial da [SPEC-062](062-conta-assinatura-e-equipe.md). Visual e texto seguem [regras-de-design.md](../marca/regras-de-design.md), não o app atual.

## 1. Identificador e nome

SPEC-068. Landing page pública em `aralu.com.br`: apresenta a Aralu, o plano e leva ao cadastro; inclui a tabela e a gestão de depoimentos.

## 2. Objetivo

A cerimonialista que pesquisa um sistema, ou que recebeu a indicação, entende em uma rolagem o que a Aralu faz, quanto custa e que pode usar 14 dias sem cartão. Um botão a leva ao cadastro. A página é encontrada no Google para "sistema para cerimonialista", "CRM para cerimonialistas" e "sistema de gestão de eventos".

## 3. Fora do escopo

- Blog e artigos: ficam para uma spec própria depois do lançamento.
- Páginas de comparação por concorrente (`/alternativa-...`): depois do lançamento, quando o texto comparativo estiver validado.
- Formulário de contato, chat e captura de e-mail: o único caminho é o cadastro.
- Outros idiomas.
- Alinhar o app ao manual da marca (seção 10 de [regras-de-design.md](../marca/regras-de-design.md)).
- Termos de uso e Política de privacidade: a landing só aponta para eles. **Precisam existir antes do lançamento** (ver §11).

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Visitante | Ler as páginas e ir para o cadastro ou para a tela de entrar. |
| Admin da plataforma | Cadastrar, editar, ordenar, publicar e despublicar depoimentos. |
| Organizer, Assistant | Nada nesta spec. |
| Buscadores | Indexar todas as páginas da landing. Não indexam o app (SPEC-069). |

## 5. Comportamento

### 5.1. Páginas

| Endereço | Busca-alvo | Conteúdo |
|---|---|---|
| `/` | sistema para cerimonialista | A página completa (§5.2). |
| `/crm-para-cerimonialistas` | CRM para cerimonialistas | Funil: oportunidades, orçamento, contrato com assinatura eletrônica, tarefas e relatórios. Fecha com o plano e o botão. |
| `/gestao-de-eventos` | sistema de gestão de eventos | Evento: tarefas, roteiro, cronograma, briefing, convidados, portaria, dinheiro, fornecedores, equipe. Fecha com o plano e o botão. |
| `/planos` | preço | O cartão do plano e as perguntas frequentes. |

Cabeçalho em todas: logo, **Funções**, **Plano**, **Entrar** (vai para `app.aralu.com.br/entrar`) e o botão **Experimentar por 14 dias** (vai para `app.aralu.com.br/cadastro`). Rodapé: "Aralu · Tudo em dia", Termos de uso, Política de privacidade e e-mail de contato.

### 5.2. Seções da página inicial

1. **Abertura.** Título em Playfair Display com a promessa "Tudo em dia". Uma frase com dado concreto sobre o que a Aralu organiza. Botão **Experimentar por 14 dias** e, logo abaixo, "Sem cartão de crédito". Captura real do Painel.
2. **O que a Aralu faz.** Seis blocos, na ordem do trabalho, cada um com título que diz o resultado, uma frase e uma tela:
   - Funil: oportunidades, orçamento e contrato com assinatura eletrônica.
   - Evento: tarefas, roteiro, cronograma e briefing preenchido pelo cliente.
   - Convidados: convites, RSVP com prazo e portaria com QR.
   - Dinheiro: parcelas do cliente e pagamentos a fornecedores.
   - Link do cliente: com o nome e o logo da cerimonialista.
   - Equipe: assistentes com permissão e equipe de apoio do dia.
3. **Diferenciais.** Três afirmações, cada uma com a prova na tela (ver §5.3).
4. **Depoimentos.** Só existe quando há ao menos um publicado (§5.5).
5. **Plano.** Um cartão: Pro, R$ 179,90 por mês, o que inclui, "14 dias para experimentar, sem cartão de crédito" e o botão.
6. **Perguntas frequentes.** Preciso de cartão para testar? O que acontece no 15º dia? Posso cancelar quando quiser? Minha equipe entra no mesmo plano? Consigo trazer meus dados de planilha? Meus dados e os dos meus clientes ficam seguros? Funciona no celular?
7. **Fechamento.** Linha do horizonte, uma frase e o mesmo botão.

Só aparece o que o produto já faz. Função marcada como "Em breve" no app não entra.

### 5.3. Diferenciais

A Wedy Pro se anuncia como gratuita e a Assessoria VIP tem mais tempo de mercado. A landing não disputa lista de recursos; diz por que vale pagar:

1. **A marca que o cliente vê é a sua.** Link do cliente, proposta, briefing e convites levam o nome e o logo da cerimonialista.
2. **Feita só para cerimonial.** Palavras, etapas e modelos do setor, sem adaptação.
3. **Você é a cliente.** Um plano, um preço, sem venda para o seu cliente nem anúncio.

Regras do texto comparativo:

- No lançamento, nenhum concorrente é citado pelo nome. A comparação é "Aralu e outras plataformas".
- Só fatos públicos e verificáveis. Nada visto de dentro de conta de concorrente.

### 5.4. Visual, texto e movimento

- Fundo Creme, títulos de marca em Playfair Display 500, o resto em Red Hat Text. Petróleo no botão principal. Um ponto de luz dourado na página, sempre com texto ao lado.
- Um botão principal por dobra, sempre com o mesmo texto: **Experimentar por 14 dias**.
- Cantos de 8 px, cartão com contorno de 1 px e sem sombra, ícones Phosphor.
- Capturas de uma conta de demonstração, com dados fictícios. Sem foto de casal, aliança ou buquê. Sem ilustração de personagem.
- Texto segundo a seção 7 do manual: "clientes" (não "noivos"), sem "completo", "inovador", "inteligente" ou "revolucionário", sem emoji, no máximo uma exclamação.
- **Rolagem suave** com Lenis, só a suavização, sem prender a rolagem. Entradas de seção com CSS (opacidade e 16 px de deslocamento, 300 ms, curva de entrada do manual). Com "reduzir movimento" ativo, a Lenis não carrega e as seções aparecem sem animação.
- Celular primeiro (360 px). Leitura até 720 px; página até 1200 px.
- Modo escuro não entra no lançamento.

### 5.5. Depoimentos

1. O Admin abre **Admin › Depoimentos** e cadastra: nome, papel (ex.: Cerimonialista), assessoria, cidade e UF, texto (até 400 caracteres), foto opcional, e como e quando a pessoa autorizou o uso.
2. O depoimento nasce como rascunho. **Publicar** só fica disponível com a autorização preenchida.
3. O Admin ordena os publicados; a landing mostra na ordem, até 6.
4. A landing consulta os publicados ao abrir. Com lista vazia, ou se a consulta falhar, a seção não existe na página: sem título, sem espaço e sem item no menu.
5. **Despublicar** tira da landing na próxima consulta (até 5 minutos de cache).

## 6. Regras

| # | Regra |
|---|---|
| R1 | Todo botão de experimentar leva a `https://app.aralu.com.br/cadastro`. O cadastro não pede cartão (SPEC-062). |
| R2 | O valor do plano aparece em um único lugar do código da landing e é igual ao do plano padrão cadastrado. |
| R3 | "Sem cartão de crédito" aparece junto de todo botão de experimentar e no cartão do plano. |
| R4 | A seção de depoimentos só é montada com ao menos um depoimento publicado. |
| R5 | Depoimento só é publicado com data e forma da autorização registradas. |
| R6 | A landing não grava cookie nem usa rastreador que exija consentimento. |
| R7 | Nenhuma tela mostrada tem dado real de cliente. |

## 7. Construção

- Site estático gerado com **Astro**, em `src/landing`, no repositório do aralu. Sai HTML pronto por página; JavaScript só para o menu no celular, a Lenis e a consulta de depoimentos.
- Tokens de cor, tipo e espaço num arquivo único, com os nomes de função do manual (4.4). Nenhum HEX direto nas páginas.
- Fontes Playfair Display e Red Hat Text hospedadas no próprio site, só os pesos usados, com `font-display: swap`.
- Imagens em AVIF/WebP com largura e altura declaradas; as de fora da primeira dobra com carregamento tardio.
- Container próprio, servido pelo Caddy em `aralu.com.br` (SPEC-069), no mesmo padrão do container de landing que já existe no [Caddyfile](../../deploy/proxy/Caddyfile).
- Medição de visitas sem cookie (Plausible ou equivalente), se o dono quiser. Sem ela, só o Search Console.

## 8. SEO

- Um `<title>` e uma descrição por página, com a busca-alvo no começo. Um `<h1>` por página.
- `link rel="canonical"` em toda página; `www` redireciona para a raiz.
- Dados estruturados: `Organization` e `SoftwareApplication` (com `Offer` no valor do plano) na inicial; `FAQPage` onde há perguntas. Depoimentos não viram `Review` nem nota em estrelas.
- `sitemap.xml` e `robots.txt` gerados no build. `robots.txt` aponta o sitemap.
- Imagem de compartilhamento (1200×630) e marcações Open Graph.
- Metas no celular (Lighthouse): desempenho, acessibilidade, boas práticas e SEO em 95 ou mais; LCP até 2,5 s; CLS até 0,1.
- No dia do lançamento: propriedade de domínio no Google Search Console e envio do sitemap.
- Expectativa: domínio novo leva de 3 a 6 meses para aparecer bem. "Sistema de gestão de eventos" é disputado por plataformas de ingresso e é aposta de prazo longo.

## 9. Dados e API

- Migration `Depoimentos`, com `deploy/schema.sql` regerado:
  - Tabela `Depoimentos`: `Id`, `Nome`, `Papel`, `Assessoria`, `Cidade`, `Uf`, `Texto`, `FotoArquivo` (opcional), `Ordem`, `Publicado`, `PublicadoEm`, `AutorizadoEm`, `AutorizacaoObservacao`, `ContaId` (opcional, `SET NULL`), `CriadoEm`.
- Migration `ValorDoPlanoPro`: o plano Pro passa de R$ 179,00 para **R$ 179,90**, com `deploy/schema.sql` regerado. Hoje o valor vem da migration da SPEC-062 (`Planos`, 179.0). Não há assinante em produção, então ninguém fica no valor antigo. Junto, atualizar o valor citado na SPEC-062, no RF-115 de [requirements.md](../requirements.md), no comentário de `Plano.cs` e nos exemplos de teste que usam 179 como valor do Pro.
- Admin, em `/api/v1/admin/depoimentos`: `GET`, `POST`, `PUT /{id}`, `DELETE /{id}`, `PUT /{id}/publicacao` (`{ publicado }`) e `PUT /ordem` (`{ ids }`). Quem não é Admin recebe 403.
- Público: `GET /api/v1/publico/depoimentos` devolve só os publicados, na ordem, com nome, papel, assessoria, cidade, UF, texto e endereço da foto. `Cache-Control: public, max-age=300`. Com limite de requisições.
- CORS: `https://aralu.com.br` liberado só para esse `GET`, sem credenciais.

## 10. Testes

- Integração (`DepoimentosFluxoTests`): só Admin gerencia; publicar sem autorização é recusado; o público só vê os publicados, na ordem; despublicar some da lista.
- Frontend do app: tela **Admin › Depoimentos**.
- Landing: build sem erro; verificação de links; a seção de depoimentos ausente com lista vazia e presente com um item; Lighthouse dentro das metas do §8; "reduzir movimento" desliga a Lenis.

## 11. Decisões em aberto

| # | Decisão | Quem |
|---|---|---|
| D1 | ~~Valor do plano~~ **Decidido em 27/11/2026: R$ 179,90 por mês.** Ver §9. | Dono |
| D2 | ~~Imagens~~ **Decidido em 28/11/2026:** uma foto de bastidores do material da proposta padrão, com uso autorizado por enquanto, e representações das telas. Fotos melhores ficam para a segunda rodada (§13). | Dono |
| D3 | Termos de uso e Política de privacidade: há um texto inicial publicado em `/termos-de-uso` e `/politica-de-privacidade`. **Antes do lançamento:** revisar com apoio jurídico e preencher os dados da empresa (§13). | Dono |
| D4 | ~~Medição de visitas~~ **Decidido em 28/11/2026:** Umami em servidor próprio (`deploy/metricas`), sem cookie. | Dono |
| D5 | Conferir no uso o que a Wedy Pro entrega de graça, antes de fechar o texto dos diferenciais. | Dono |

## 12. Referências

- Estrutura: `wedy.com/negocios` (abertura com prova, produto em movimento, blocos por área, migração, depoimentos, perguntas). O visual escuro, os emojis e o vocabulário de lá não se aplicam.
- Rolagem: `aisleplanner.com` (Lenis).
- Respiro e hierarquia: Linear, Things e Squarespace.

## 13. Estado da construção e pendências

### Feito (28/11/2026)

- Site em `src/landing` (Astro): `/`, `/crm-para-cerimonialistas`, `/gestao-de-eventos`, `/planos`, `/termos-de-uso` e `/politica-de-privacidade`, com sitemap, `robots.txt`, dados estruturados e imagem de compartilhamento.
- Container próprio (`src/landing/Dockerfile`) e serviço `landing` no `compose.production.yaml`, ligado só onde o `.env` tem `COMPOSE_PROFILES=landing`.
- O que não é página da landing redireciona para o app com 301, dentro do container da landing (SPEC-069 §4.2).
- Medição de visitas: Umami em `deploy/metricas`, atendido em `metricas.aralu.com.br`. O script só entra no HTML com `UMAMI_SCRIPT` e `UMAMI_SITE` preenchidos.
- A seção de depoimentos existe na página, mas só é montada com `DEPOIMENTOS_URL` preenchido e ao menos um depoimento publicado.

### Para publicar

1. DNS `metricas` apontando para a VPS; subir `deploy/metricas`; trocar a senha do Umami; criar o site e copiar o id para `UMAMI_SITE`.
2. No `.env` de produção: `COMPOSE_PROFILES=landing`, `UMAMI_SCRIPT` e `UMAMI_SITE`.
3. No proxy, trocar o bloco de `aralu.com.br`: `/api/*` continua no app; o resto vai para a landing (`127.0.0.1:8091`). Só depois de o container da landing estar no ar.
4. Search Console: propriedade do domínio e envio de `sitemap-index.xml`.

### Antes do lançamento

| # | Pendência |
|---|---|
| P1 | **Termos e privacidade:** revisar com apoio jurídico. Pontos a decidir: prazo de guarda depois do cancelamento (o texto diz até 6 meses), limite de responsabilidade (12 meses de assinatura), aviso de reajuste (30 dias), direito de arrependimento de 7 dias, foro, e quem é o encarregado de dados. |
| P2 | **Dados da empresa** em `src/landing/src/config.ts`: razão social, CNPJ, endereço, foro e e-mail de contato (hoje `contato@aralu.com.br`, a confirmar que a caixa existe). |
| P3 | **LGPD no produto:** conferir se o que a política promete está implementado: exclusão de dados a pedido, exportação dos dados da conta, registro de acesso por 6 meses, aceite dos termos no cadastro (com data e versão) e contrato de operador com as assessorias. Listar os fornecedores e onde cada um guarda dados. |
| P4 | **Backend dos depoimentos** (§5.5 e §9): tabela, tela do Admin e endpoint público. |
| P5 | **Migration do valor do plano** para R$ 179,90 (§9). Até lá a landing mostra R$ 179,90 e o app cobra R$ 179,00. |
| P6 | Conferir no uso o que a Wedy Pro entrega de graça e ajustar os diferenciais (D5). |
| P7 | Medir no Lighthouse com o site publicado (metas do §8). |

### Segunda rodada

| # | Pendência |
|---|---|
| S1 | **Fotos melhores:** a foto atual (`src/landing/src/assets/bastidores.jpg`) tem resolução baixa e mostra um buquê, que o manual pede para evitar. Trocar por fotos de cerimonialistas trabalhando, com autorização de uso de imagem por escrito. |
| S2 | **Capturas reais** do produto, de uma conta de demonstração, no lugar das representações de tela (`Tela.astro`). |
| S3 | Páginas de comparação e blog (§3). |

