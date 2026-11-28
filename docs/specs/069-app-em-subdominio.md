# 069. App em `app.aralu.com.br`

**Status: proposta (27/11/2026).** Fonte: decisão de domínio para o lançamento. Abre espaço para a landing da [SPEC-068](068-landing-page.md) em `aralu.com.br`. Deve entrar antes dos primeiros clientes em produção.

## 1. Identificador e nome

SPEC-069. O app de produção passa de `aralu.com.br` para `app.aralu.com.br`; o domínio raiz fica com a landing.

## 2. Objetivo

Quem pesquisa a Aralu chega na página que apresenta o produto, e a autoridade de busca se concentra no domínio raiz. O app continua igual, em outro endereço, e nenhum link já enviado deixa de funcionar.

## 3. Fora do escopo

- Mudar o staging: `staging.aralu.com.br` continua sendo o app de homologação, com `noindex`.
- Domínio próprio da cerimonialista para os links do cliente.
- Separar a API do app em outro subdomínio.

## 4. Comportamento

### 4.1. Endereços

| Endereço | Serve |
|---|---|
| `aralu.com.br` | Landing (SPEC-068). |
| `www.aralu.com.br` | Redireciona para `aralu.com.br`. |
| `app.aralu.com.br` | App e API de produção. |
| `staging.aralu.com.br` | App de homologação, sem mudança. |

### 4.2. Links antigos

1. Em `aralu.com.br`, o que não for arquivo da landing redireciona com 301 para `app.aralu.com.br`, mantendo caminho e parâmetros. Isso cobre `/rsvp/...`, `/proposta/...`, `/briefing/...`, `/cliente/...`, `/equipe/...`, `/lead/...`, `/entrar`, `/cadastro`, `/confirmar-email`, `/convite`, `/redefinir-senha`, QR codes e o logo dos e-mails (`/marca/aralu-email.png`).
2. `aralu.com.br/api/*` continua encaminhado ao app, sem redirecionar, durante a transição: um 301 transforma `POST` em `GET` e quebraria o webhook do Asaas e formulários abertos. Sai quando os registros de acesso mostrarem 30 dias sem chamada.
3. Os endereços da landing (`/`, `/crm-para-cerimonialistas`, `/gestao-de-eventos`, `/planos`, `sitemap.xml`, `robots.txt` e arquivos estáticos) não colidem com rotas do app. Rota nova na landing precisa ser conferida contra [app.routes.ts](../../src/frontend/src/app/app.routes.ts).

### 4.3. App

- `PublicUrl` e `Cors:Origins` de produção passam a `https://app.aralu.com.br` (variável `DOMAIN` do [compose.production.yaml](../../compose.production.yaml)). Links e e-mails novos saem com o endereço novo.
- O frontend monta links com o endereço atual da página, então acompanha a mudança sem alteração.
- Sessões abertas em `aralu.com.br` não valem no endereço novo: quem estiver dentro entra de novo. Os cookies de link público (`aralu_equipe` e os das SPEC-063/066) também pedem código outra vez.
- O app responde `X-Robots-Tag: noindex, nofollow` em `app.aralu.com.br`, como o staging.
- `voltexstores.com` passa a redirecionar para a landing, como hoje aponta para a raiz.

### 4.4. Fora do repositório

| Onde | O que mudar |
|---|---|
| DNS | Registro `app` apontando para a VPS. |
| Asaas | Endereço do webhook para `https://app.aralu.com.br/...`. |
| Microsoft Entra (SMTP) | Conferir se há endereço de retorno cadastrado com o domínio antigo. |
| `.env` de produção | `DOMAIN=app.aralu.com.br`. |
| Google Search Console | Propriedade do domínio (SPEC-068). |

## 5. Regras

| # | Regra |
|---|---|
| R1 | Nenhum link enviado antes da mudança deixa de abrir. |
| R2 | O app de produção não é indexado por buscadores. |
| R3 | Chamadas de API no domínio antigo não são redirecionadas enquanto a transição durar. |

## 6. Ordem da virada

O proxy só é publicado pela branch `main`, então cada mudança do [Caddyfile](../../deploy/proxy/Caddyfile) vale depois do merge.

1. **Feito no repositório (27/11/2026):** bloco `app.aralu.com.br` no Caddy, com `noindex`, apontando para o mesmo app. O app responde nos dois endereços.
2. Criar o DNS de `app` apontando para a VPS e publicar a `main`. O Caddy emite o certificado sozinho.
3. Trocar `DOMAIN` para `app.aralu.com.br` no `.env` de produção e subir o app de novo. Conferir cadastro, e-mail de confirmação e um link público.
4. Trocar o webhook do Asaas e conferir uma cobrança de teste.
5. Enquanto a landing não existe: `aralu.com.br` redireciona para o app com 302, menos `/api/*`. O redirecionamento é temporário porque um 301 da raiz ficaria guardado nos navegadores e esconderia a landing depois.
6. Publicar a landing em `aralu.com.br` com os redirecionamentos do §4.2 (301 só para o que não é da landing).
7. Conferir os links antigos de cada tipo e o envio do sitemap.

Os passos 5 e 6 só entram no Caddyfile depois do passo 3: antes disso, o redirecionamento levaria a um endereço que ainda não responde.

Volta: restaurar o bloco antigo do Caddyfile e o `DOMAIN`. O app nunca sai do ar, porque responde nos dois endereços até o passo 5.

## 7. Testes

- Depois da virada, em produção: um link antigo de cada tipo (RSVP, proposta, briefing, cliente, equipe, lead) abre no endereço novo; o webhook do Asaas chega; o e-mail de confirmação sai com o endereço novo; `app.aralu.com.br` responde com `noindex`; `aralu.com.br/` responde com a landing.
- Testes automatizados existentes não mudam: usam endereço local.

## 8. Decisões em aberto

| # | Decisão | Quem |
|---|---|---|
| D1 | Onde homologar a landing antes de publicar (o staging é o ambiente do sócio): um endereço próprio com `noindex`, como `previa.aralu.com.br`, ou só local. | Dono |
