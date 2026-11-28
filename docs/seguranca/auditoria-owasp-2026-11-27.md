# Auditoria de segurança — OWASP Top 10:2025

- **Data:** 27/11/2026
- **Escopo:** repositório `aralu`, branch `staging` (commit `e748db8`): backend .NET 10 (`src/backend`), frontend Angular (`src/frontend`), deploy (`compose.production.yaml`, `deploy/`, `src/frontend/Caddyfile`, `.github/workflows/deploy.yml`).
- **Método:** revisão estática e manual. Nenhum código do projeto foi executado (sem build, testes, `npm audit`, `dotnet list package --vulnerable` ou scanners). Isto é uma primeira análise: não prova que algo seja explorável em produção.
- **Contexto de execução:** API ASP.NET Core Minimal API (servidor) atrás de dois Caddy (proxy da VPS em `network_mode: host` → Caddy do container `frontend` → `api:8080`); SPA Angular (navegador); PostgreSQL via EF Core; GitHub Actions publica na VPS via SSH.

## Resumo executivo

A base está acima da média em segurança. O isolamento multi-tenant usa filtro global do EF Core (`HasQueryFilter` por `ContaId`). As permissões são relidas do banco a cada pedido (`EquipeEndpoints.AplicarAcesso`). Os tokens públicos vêm de CSPRNG, os códigos de acesso são guardados como hash com comparação em tempo constante, o upload valida o tipo pelo conteúdo, o HTML rico é sanitizado no servidor por lista de permissões e o tratamento global de exceções não vaza detalhes. **Nenhum achado Crítico ou Alto foi confirmado.**

Os riscos principais são de **configuração e desenho**:

1. O rate limiting provavelmente usa o IP errado por causa da cadeia de dois proxies, e vira um limite **global** (por exemplo, 10 logins/min para todos os usuários juntos).
2. O JWT continua válido por até 8 h depois de sair ou redefinir a senha.
3. Faltam cabeçalhos de segurança (CSP, HSTS, anti-clickjacking).
4. O endpoint público de leads não tem limite de frequência.

| Severidade | Qtde | | Confiança | Qtde |
|---|---|---|---|---|
| Crítica | 0 | | Alta | 4 |
| Alta | 0 | | Média | 4 |
| Média | 3 | | Baixa | 1 |
| Baixa | 5 | | | |
| Informativa | 1 | | | |

---

## Achados

### A02:2025 — Security Misconfiguration

#### OWASP-A02-001 — Diagnóstico do Asaas ligado por padrão no `.env` gerado pelo deploy
- **CWE:** [CWE-489 — Active Debug Code](https://cwe.mitre.org/data/definitions/489.html)
- **Severidade:** Baixa. Expõe ao usuário logado as requisições e respostas brutas trocadas com o Asaas; não expõe a API key (que vai no cabeçalho) nem dados de cartão (o pedido não leva cartão).
- **Confiança:** Média. O fluxo do workflow está confirmado; o conteúdo do `.env` real da produção não foi visto.
- **Local:**
  - `.env.example:60`: `ASAAS_DIAGNOSTICO=true`
  - `.github/workflows/deploy.yml`: `if [ ! -f ${dir}/.env ]; then cp ${dir}/.env.example ${dir}/.env; ...`
  - `src/backend/Project.Infrastructure/Assinaturas/AssinaturaServico.cs:532`: `Diagnostico(passos) => opcoes.Value.DiagnosticoNoNavegador ? passos : null`
  - `src/backend/Project.Api/Conta/AssinaturaEndpoints.cs:168`: `new { code = ..., message = ..., diagnostico }`
- **Caminho:** um ambiente novo nasce com `.env` copiado do exemplo. Se ninguém trocar a flag, `POST /api/v1/assinatura/...` devolve no corpo de erro e de sucesso o `PassoAsaas` (rota, status, JSON enviado e recebido).
- **Impacto:** vaza identificadores internos do Asaas (customer/subscription IDs), mensagens do gateway e o CPF/CNPJ ecoado. Ajuda a reconhecer a integração.
- **Correção:** deixe `ASAAS_DIAGNOSTICO=false` no `.env.example` e ligue só no staging. Outra opção é condicionar a flag a `App__Environment != production` no código.
- **Verificação manual:** `grep ASAAS_DIAGNOSTICO /opt/aralu/.env` na VPS.

---

### A05:2025 — Injection

#### OWASP-A05-001 — `innerHTML` direto em `FolhaContrato` contorna o sanitizador do Angular
- **CWE:** [CWE-79 — Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)
- **Severidade:** Baixa. O HTML persistido já passa por `HtmlSeguro` no servidor, então o caminho remoto está mitigado; sobra o risco de defesa em profundidade, caso surja uma fonte não sanitizada no futuro.
- **Confiança:** Média. O caminho do HTML salvo está mitigado; a prévia de texto ainda não salvo é de autoria do próprio usuário (self-XSS).
- **Local:** `src/frontend/src/app/pages/contratos/folha-contrato.ts:78`
  ```ts
  el.innerHTML = cabecalho + linhas.map((linha) => `<div class="linha">${linha}</div>`).join('');
  ```
  `blocosDoContrato` (linha 156) devolve `outerHTML` dos nós sem tirar atributos (`onerror`, `href="javascript:"`). Já `limparHtml` (linha 103) existe, mas só é usado na impressão.
- **Controles verificados:** `HtmlSeguro.LimparRico/Sanitizar` em `ContratoServico.cs:97`, `ContratoFunilServico.cs:105/205`, `ModelosFunilServicos.cs:228/282`, `OrcamentoFunilServico.cs:177/247`. As tags `{{...}}` recebem `HtmlEncode` (`Contratos.cs:91`, `ParametrosOrcamento.cs:101`, `PaginaAceite.cs:128`).
- **Correção:** aplique `limparHtml()` (ou DOMPurify) antes de atribuir em `el.innerHTML`, ou use o `DomSanitizer.sanitize(SecurityContext.HTML, ...)`.
- **Referência:** [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

### A06:2025 — Insecure Design

#### OWASP-A06-001 — Rate limiting por IP pode virar limite global atrás da cadeia de proxies
- **CWE:** [CWE-799 — Improper Control of Interaction Frequency](https://cwe.mitre.org/data/definitions/799.html) (a causa raiz é de configuração, ver também A02)
- **Severidade:** Média. Um único atacante esgota a janela de login (10/min), cadastro (5/h) ou recuperação (3/h) de **todos** os usuários: negação de serviço barata das funções de autenticação. Além disso, os logs perdem o IP real.
- **Confiança:** Média. A topologia está confirmada no repositório; o IP de origem visto pelo Caddy interno depende do `userland-proxy` do Docker e não foi observado em execução.
- **Local:**
  - `deploy/proxy/Caddyfile`: proxy externo → `reverse_proxy 127.0.0.1:8081` (preenche `X-Forwarded-For` com o IP real).
  - `src/frontend/Caddyfile`: `reverse_proxy api:8080` **sem `trusted_proxies`**. Por padrão o Caddy descarta o XFF recebido de origem não confiável e grava o IP do par imediato (o gateway Docker, 172.x).
  - `src/backend/Project.Api/Program.cs:133-143`: confia em `172.16.0.0/12`, `10.0.0.0/8` e `192.168.0.0/16` (`compose.production.yaml`).
  - `Program.cs:204-216`: `Janela()` particiona por `http.Connection.RemoteIpAddress`.
- **Caminho:** cliente → Caddy host (XFF=IP real) → docker-proxy (origem vira gateway) → Caddy frontend (XFF reescrito = gateway) → API (`RemoteIpAddress` = gateway). Todos caem na mesma partição.
- **Correção:** no `src/frontend/Caddyfile`, adicione `trusted_proxies static private_ranges` (diretiva global `servers { trusted_proxies ... }`) para preservar o XFF do proxy externo. Na API, use `ForwardLimit = 2` ou restrinja `KnownIPNetworks` à sub-rede da rede `interna`. Uma alternativa é particionar login também por e-mail normalizado.
- **Verificação manual:** registre `RemoteIpAddress` por um tempo em staging e compare com o seu IP público.

#### OWASP-A06-002 — Endpoint público de lead sem limite de frequência
- **CWE:** [CWE-799 — Improper Control of Interaction Frequency](https://cwe.mitre.org/data/definitions/799.html)
- **Severidade:** Baixa. Permite inundar o funil de qualquer conta com oportunidades falsas (poluição de dados e de custo operacional); não há leitura de dados.
- **Confiança:** Alta.
- **Local:** `src/backend/Project.Api/Negocio/NegocioEndpoints.cs:207`: `app.MapPost("/api/v1/public/leads/{contaId}", LeadPublico);` sem `RequireRateLimiting`. `OportunidadeServico.cs:411` valida só o nome, o tipo e convidados ≥ 0.
- **Entrada:** anônima; o `contaId` é publicado no formulário do site da assessoria.
- **Correção:** aplique uma política de janela por IP e por `contaId`, além de um limite de tamanho por campo. Avalie um honeypot ou CAPTCHA no formulário. O mesmo vale para `POST /api/v1/rsvp/{token}` e `POST /api/v1/publico/propostas/{token}/resposta`, que hoje dependem só da entropia do token.

#### OWASP-A06-003 — Sem proteção contra clickjacking nem CSP
- **CWE:** [CWE-1021 — Improper Restriction of Rendered UI Layers or Frames](https://cwe.mitre.org/data/definitions/1021.html)
- **Severidade:** Baixa. Páginas com ações de um clique (aceitar proposta, confirmar RSVP, marcar pagamento no link do cliente) podem ser emolduradas por terceiros. A falta de CSP também tira uma camada contra XSS (A05-001).
- **Confiança:** Média. Nenhum cabeçalho aparece nos dois Caddyfiles nem no pipeline da API; não verifiquei se um CDN ou WAF à frente os injeta.
- **Local:** `deploy/proxy/Caddyfile` (bloco `aralu.com.br` só remove `Server`) e `src/frontend/Caddyfile`.
- **Correção:** no bloco do site, adicione:
  ```
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Frame-Options "DENY"
    Content-Security-Policy "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com"
    Referrer-Policy "strict-origin-when-cross-origin"
    X-Content-Type-Options "nosniff"
  }
  ```
  Ajuste a CSP ao iframe da página de aceite.
- **Referência:** [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)

---

### A07:2025 — Authentication Failures

#### OWASP-A07-001 — JWT não é revogado ao sair nem ao redefinir ou trocar a senha
- **CWE:** [CWE-613 — Insufficient Session Expiration](https://cwe.mitre.org/data/definitions/613.html)
- **Severidade:** Média. Quem obtiver o token (XSS, máquina compartilhada, log de proxy) mantém acesso por até 8 h, mesmo depois de a vítima redefinir a senha justamente para expulsá-lo.
- **Confiança:** Alta.
- **Local:**
  - `src/backend/Project.Api/Conta/ContaEndpoints.cs:247`: `private static IResult Sair() => Results.NoContent();`
  - `ContaEndpoints.cs` (`RedefinirSenha`) e `EquipeServico.TrocarSenhaAsync` atualizam o `SecurityStamp` (`EquipeServico.cs:256/283/319/357/401`), mas o JWT (`EmissorJwt.cs`) não carrega o stamp, e `EquipeEndpoints.AplicarAcesso` só revalida a situação do membro.
  - `compose.production.yaml`: `Jwt__ExpiryHours: "8"`.
- **Mitigação existente:** remover ou desativar um membro derruba o acesso na hora (o membro é relido a cada pedido). Já o Admin não passa por essa checagem.
- **Correção:** emita o claim `AspNet.Identity.SecurityStamp` (ou um `jti` + versão de sessão) e compare em `AplicarAcesso` com o valor do banco (com cache curto). Faça `Sair` gravar a revogação. Considere reduzir a validade e usar refresh token em cookie `HttpOnly`.
- **Referência:** [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

#### OWASP-A07-002 — Política de senha só com comprimento mínimo e sem checagem de senhas vazadas
- **CWE:** [CWE-521 — Weak Password Requirements](https://cwe.mitre.org/data/definitions/521.html)
- **Severidade:** Informativa. Oito caracteres sem regras de composição está alinhado ao NIST 800-63B, mas a mesma norma pede bloquear senhas comuns ou vazadas. O lockout (`lockoutOnFailure: true`) e o rate limit reduzem a força bruta online.
- **Confiança:** Alta.
- **Local:** `src/backend/Project.Infrastructure/Conta/OpcoesDeConta.cs:9-12`.
- **Correção:** adicione um `IPasswordValidator<ApplicationUser>` com uma lista de senhas comuns (ou uma consulta k-anonymity ao HIBP, se o envio para fora for aceito) e avalie um mínimo de 10 caracteres. MFA opcional para o Dono e o Admin.

---

### A08:2025 — Software or Data Integrity Failures

#### OWASP-A08-001 — Action e imagens base referenciadas por tag mutável
- **CWE:** [CWE-829 — Inclusion of Functionality from Untrusted Control Sphere](https://cwe.mitre.org/data/definitions/829.html)
- **Severidade:** Baixa. Um comprometimento upstream ou uma troca de tag entraria no build, que roda com a chave SSH da VPS (usuário root, segundo o comentário do workflow).
- **Confiança:** Alta (as referências estão confirmadas); o risco upstream é teórico.
- **Local:** `.github/workflows/deploy.yml:31` `actions/checkout@v4`; `src/frontend/Dockerfile` (`node:22-alpine`, `caddy:2-alpine`); `src/backend/Project.Api/Dockerfile` (`dotnet/sdk:10.0`, `aspnet:10.0`); `compose.production.yaml` (`postgres:16-alpine`); `deploy/proxy/compose.yaml` (`caddy:2.8-alpine`).
- **Correção:** fixe a Action por SHA de commit e as imagens por `@sha256:<digest>`, e use Dependabot para atualizar. Use um usuário de deploy não-root na VPS. No CI, prefira gravar a chave do host conhecida em um secret (`SSH_KNOWN_HOSTS`) em vez de `ssh-keyscan` (linha 57, confiança no primeiro uso).

---

### A09:2025 — Security Logging and Alerting Failures

#### OWASP-A09-001 — Falhas de login, bloqueios e redefinições não geram evento de segurança
- **CWE:** [CWE-778 — Insufficient Logging](https://cwe.mitre.org/data/definitions/778.html)
- **Severidade:** Baixa. Sem esses eventos não dá para detectar credential stuffing nem investigar uma conta tomada; o impacto depende de haver monitoramento.
- **Confiança:** Média. Não há chamada de log em `Entrar`, `RedefinirSenha` nem `AplicarContaDoAdmin`. Pode haver telemetria fora do repositório.
- **Local:** `src/backend/Project.Api/Conta/ContaEndpoints.cs` (`Entrar`, `RedefinirSenha`), `src/backend/Project.Api/Conta/AdminEndpoints.cs` (uso do cabeçalho `X-Aralu-Conta`, quando o Admin opera uma conta).
- **Ponto positivo:** a rejeição do webhook do Asaas é registrada, e os logs de falha de e-mail mascaram segredos e tokens (`DetalheLocal`).
- **Correção:** registre `login_falhou` (e-mail com hash ou mascarado, IP), `conta_bloqueada`, `senha_redefinida`, `admin_impersonou(contaId)`, sem senha nem token, e configure alertas por volume.

---

## Controles positivos verificados

- **Multi-tenant:** `AppDbContext.cs:316-317` aplica `HasQueryFilter(ContaFiltro == null || item.ContaId == ContaFiltro)` a toda entidade `ITemConta`; `ContaAtualHttp` só devolve uma conta em endpoint autenticado. Arquivos (`ArquivoRegistro : ITemConta`) são abertos por `(id, conta)`.
- **Autorização por módulo:** `PermissaoPorRota` + `AplicarAcesso` releem papel, grupo e permissões do banco a cada pedido; `EscopoAssistente.Filtro` restringe por evento atribuído.
- **Links públicos:** tokens de 256 bits (`RandomNumberGenerator.GetBytes(32)`). O código de 6 dígitos tem limite de tentativas, expiração e intervalo entre pedidos, e é salvo como hash comparado com `FixedTimeEquals`. O cookie de sessão é `HttpOnly`, `SameSite=Strict` e tem `Path` restrito ao token.
- **Webhook Asaas:** token comparado em tempo constante, recusa quando não está configurado e trata eventos repetidos (`AsaasEventId`).
- **Upload:** tipo detectado pelo conteúdo, extensão conferida, tamanho limitado durante o streaming, nome físico gerado por GUID, checagem de `StartsWith(raiz)`, download com `nosniff`.
- **HTML rico:** sanitizador do servidor por lista de permissões (`HtmlSeguro`), valores de tag com `HtmlEncode`, página de aceite em iframe sem scripts.
- **JWT:** HS256 com segredo de pelo menos 32 caracteres exigido no boot, validação de issuer, audience, lifetime e assinatura.
- **Erros:** `UseExceptionHandler` devolve uma mensagem genérica e registra só o tipo da exceção; Swagger desligado por padrão.
- **Segredos:** `appsettings*.json` e `.env.example` só têm placeholders vazios; `.env` fica fora do Git e do rsync.
- **SQL:** não encontrei `FromSqlRaw`/`ExecuteSqlRaw`; todo o acesso é por LINQ/EF Core, parametrizado.

## Cobertura por categoria

| Categoria | Situação | Observação |
|---|---|---|
| A01 Broken Access Control | Parcialmente avaliada | Filtro de tenant, papéis e escopo do Assistente revisados por amostragem; `NegocioEndpoints.cs` (1.740 linhas) e os serviços não foram lidos rota a rota. Lead para verificação manual: `GET /api/v1/arquivos/{id}` não aplica `EscopoAssistente` (um membro restrito abre qualquer arquivo da conta se souber o GUID). |
| A02 Security Misconfiguration | Avaliada | CORS restrito à origem pública com credenciais; cookies corretos. |
| A03 Supply Chain | Não avaliável | Sem execução de `npm audit`/`dotnet list package --vulnerable`. `package-lock.json` presente; o NuGet não tem `packages.lock.json` (considere `RestorePackagesWithLockFile`). |
| A04 Cryptographic Failures | Avaliada | Nada relevante; TLS fica a cargo do Caddy (Let's Encrypt). |
| A05 Injection | Avaliada | Ver A05-001. Importação de Excel e mesclagem Word não foram analisadas a fundo (XXE/zip bomb no OpenXML são leads de baixa prioridade). |
| A06 Insecure Design | Parcialmente avaliada | Regras de negócio financeiras (parcelas, pro-rata) não revisadas quanto a concorrência. |
| A07 Authentication Failures | Avaliada | Ver A07-001/002. A recuperação de senha não enumera contas. |
| A08 Integrity Failures | Avaliada | Sem desserialização nativa; os DTOs são records explícitos (sem mass assignment evidente). |
| A09 Logging and Alerting | Parcialmente avaliada | A infraestrutura de logs e alertas fora do repositório não é visível. |
| A10 Exceptional Conditions | Avaliada | Handler global seguro; nenhum fail-open encontrado nos filtros de acesso. |

## Plano de correção sugerido

1. **A06-001**: `trusted_proxies` no Caddy do frontend e ajuste de `KnownIPNetworks` (esforço baixo, maior ganho).
2. **A07-001**: validar o security stamp no `AplicarAcesso` e revogar ao sair.
3. **A06-003 / A02-001**: cabeçalhos de segurança no Caddy e `ASAAS_DIAGNOSTICO=false` no `.env.example`.
4. **A06-002, A05-001, A08-001, A09-001**: rate limit nos endpoints públicos, sanitizar o `innerHTML`, fixar digests e eventos de log.

## Limitações

- A análise foi só estática; nenhum cabeçalho, IP ou fluxo foi confirmado em execução.
- O `.env` da VPS, os headers efetivos em produção, as versões de runtime e as CVEs das dependências não foram verificados.
- O frontend foi revisado só nos pontos de `innerHTML`, no armazenamento do token (`sessionStorage`) e nas chamadas públicas.
- Documentação, roteiros (`docs/manual/fonte`) e testes ficaram fora dos achados de produção.
