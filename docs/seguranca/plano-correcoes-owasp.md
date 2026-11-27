# Plano de implementação — correções da auditoria OWASP (27/11/2026)

Origem: [auditoria-owasp-2026-11-27.md](auditoria-owasp-2026-11-27.md).

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Sessão (A07-001) | Security stamp no JWT, conferido a cada pedido. Mantém `sessionStorage` e a validade de 8 h. "Sair" troca o stamp. |
| Lead público (A06-002) | Rate limit por IP e por conta + honeypot (campo oculto + tempo mínimo). |
| Senha (A07-002) | Lista local de senhas comuns + mínimo de 10 caracteres para senhas novas. |
| MFA | Fora deste plano; fica como evolução futura. |
| Diagnóstico Asaas (A02-001) | As duas proteções: padrão `false` no `.env.example` **e** bloqueio no código quando `App__Environment=production`. |
| `innerHTML` (A05-001) | Reaproveitar o `limparHtml()` já existente em `folha-contrato.ts`, sem nova dependência. |
| Rate limit de login | Partição por IP **e** por e-mail normalizado (duas políticas encadeadas). |

## Ordem e lotes

Cada lote sai em um commit/PR próprio para a `staging`, é validado lá e só então vai para a `main`.

---

### Lote 1 — IP real e rate limit (A06-001) · prioridade máxima

**Código**
1. `src/frontend/Caddyfile`: adicionar o bloco global, para o Caddy interno confiar no XFF vindo do proxy da VPS:
   ```
   {
   	servers {
   		trusted_proxies static private_ranges
   	}
   }
   ```
2. `src/backend/Project.Api/Program.cs` (`ForwardedHeadersOptions`): `options.ForwardLimit = 2;`. Manter as redes conhecidas, mas restringi-las à rede Docker `interna`, fixando a sub-rede no `compose.production.yaml`:
   ```yaml
   networks:
     interna:
       ipam:
         config:
           - subnet: 172.30.0.0/24   # produção; staging usa 172.31.0.0/24 via variável
   ```
   Depois, trocar `ForwardedHeaders__KnownNetworks__*` por `${DOCKER_SUBNET}` (uma entrada só).
3. Login particionado também por e-mail: nova política `login-email` (5 tentativas/15 min por e-mail normalizado). O corpo precisa ser lido antes do limiter, então a forma simples é um limiter manual no próprio `Entrar` (`PartitionedRateLimiter` registrado como singleton) chamado depois de `EmailNormalizado`.
4. Log temporário (nível Debug) de `RemoteIpAddress` no handler `/api/health`, para validar.

**Testes:** teste de integração de `Janela` com `X-Forwarded-For` simulado; teste da política por e-mail (6ª tentativa → 429).

**VPS (você executa)**
- Na VPS, `.env` de cada ambiente: acrescentar `DOCKER_SUBNET=172.30.0.0/24` (produção, `/opt/aralu/.env`) e `DOCKER_SUBNET=172.31.0.0/24` (staging, `/opt/aralu-staging/.env`). Confira antes se as sub-redes estão livres:
  ```bash
  docker network inspect $(docker network ls -q) --format '{{.Name}} {{range .IPAM.Config}}{{.Subnet}}{{end}}'
  ```
- A rede muda de sub-rede, e o Compose só recria rede parada. Faça a primeira publicação com uma janela curta:
  ```bash
  cd /opt/aralu-staging && docker compose -p aralu-staging -f compose.production.yaml down   # sem -v: o banco fica
  ```
  Depois rode o workflow. Repita na produção quando a staging estiver ok.
- Validação: faça login em staging e veja `docker logs aralu-staging-api-1 | grep RemoteIp`. Tem que aparecer o seu IP público, não um 172.x.

---

### Lote 2 — Revogação de sessão (A07-001)

**Código**
1. `IEmissorJwt.Emitir(...)` recebe `securityStamp` e grava o claim `aralu_stamp` com um hash SHA-256 curto do stamp (não o valor bruto).
2. `ContaEndpoints.Entrar`: passar `await usuarios.GetSecurityStampAsync(usuario)`.
3. `EquipeEndpoints.AplicarAcesso`: comparar o claim com o stamp atual do banco; se for diferente, devolver 401 `sessao_encerrada`. O Admin hoje sai cedo desse middleware: mover a checagem do stamp para **antes** do `if (... IsInRole(Admin))`, para valer para todos.
   - Cache: `IMemoryCache` de 30 s por usuário. Invalidação explícita do cache em `UpdateSecurityStampAsync` via um wrapper `SessaoServico.EncerrarAsync(usuario)`.
4. `Sair`: chamar `SessaoServico.EncerrarAsync` (desloga todas as abas e dispositivos; documentar isso na tela).
5. `RedefinirSenha` e `TrocarSenhaAsync`: o Identity já troca o stamp; garantir a invalidação do cache.
6. Front (`core/auth.service.ts` / interceptor): tratar 401 `sessao_encerrada` igual a `acesso_removido`, limpando a sessão e mandando para `/entrar`.
7. Tokens antigos sem o claim: aceitar só até a validade natural (8 h após o deploy) e recusar a partir de uma data de corte configurável (`Jwt:StampObrigatorioDesde`), para ninguém ser deslogado em massa no deploy.

**Testes:** login → trocar a senha → token antigo recebe 401; "Sair" invalida o token; Admin também é invalidado.

**VPS:** nada.

---

### Lote 3 — Cabeçalhos de segurança (A06-003)

**Código**
1. `src/frontend/Caddyfile` (vale para produção e staging, porque o proxy da VPS só repassa):
   ```
   header {
   	Strict-Transport-Security "max-age=31536000; includeSubDomains"
   	X-Frame-Options "DENY"
   	X-Content-Type-Options "nosniff"
   	Referrer-Policy "strict-origin-when-cross-origin"
   	Permissions-Policy "camera=(self), geolocation=(), microphone=()"
   	Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data:; frame-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
   }
   ```
   - `camera=(self)`: a portaria lê QR code; confirme se usa câmera.
   - A CSP entra primeiro em **Report-Only** em staging. Depois de uma rodada do [roteiro-teste-evento](../roteiro-teste-evento.md) e do [roteiro-teste-funil](../roteiro-teste-funil.md) sem violações no console, trocar para `Content-Security-Policy`.
   - Iframe da página de aceite: se for `srcdoc`, herda a CSP do pai, então conferir se as Google Fonts do HTML da assessoria continuam carregando (`style-src`/`font-src` acima já cobrem).
2. API: um middleware simples que adiciona `X-Content-Type-Options: nosniff` e `Cache-Control: no-store` nas respostas de `/api/` (exceto mídias públicas, que já definem cache).

**VPS (você executa)**
- **HSTS com `includeSubDomains`** vale para todos os subdomínios de `aralu.com.br`. Confirme que nenhum subdomínio é servido só por HTTP. Na dúvida, comece com `max-age=86400` sem `includeSubDomains` e aumente depois de uma semana.
- Validação: `curl -sI https://staging.aralu.com.br | grep -iE "strict|frame|content-security"`.

---

### Lote 4 — Diagnóstico Asaas (A02-001)

**Código**
1. `.env.example:60` → `ASAAS_DIAGNOSTICO=false`, com o comentário "ligue só no staging".
2. `AssinaturaServico.Diagnostico(...)` (e o equivalente em `TrocaDePlano.cs:138`): devolver `null` quando `App:Environment == "production"`, mesmo com a flag ligada. Registrar um aviso no boot quando a flag estiver ligada em produção.

**Testes:** unitário de `Diagnostico` com as combinações de ambiente e flag.

**VPS (você executa)**
```bash
grep -n ASAAS_DIAGNOSTICO /opt/aralu/.env /opt/aralu-staging/.env
```
- Produção: `ASAAS_DIAGNOSTICO=false` (ou remover a linha). Staging: pode ficar `true`.
- Conferir também `APP_ENV=production` em `/opt/aralu/.env`, porque a trava do código depende dele.
- Aplicar com `docker compose -p aralu -f compose.production.yaml up -d` (sem rebuild).

---

### Lote 5 — Lead público e demais rotas anônimas (A06-002)

**Código**
1. `Program.cs`: novas políticas.
   - `publico-ip`: 20 pedidos/min por IP.
   - `lead-conta`: 30 leads/h por `contaId` (partição pela rota `RouteValues["contaId"]`).
2. `NegocioEndpoints.cs:207`: `.RequireRateLimiting("publico-ip")` e `"lead-conta"`. Aplicar `publico-ip` também em `POST /api/v1/rsvp/{token}`, `POST /api/v1/publico/propostas/{token}/resposta`, nos grupos `/api/v1/publico/cliente/{token}/acesso` e `/api/v1/publico/briefings/{token}`, e em `POST /api/v1/conta/aceitar-convite`.
3. Honeypot:
   - `LeadPublicoPedido`: acrescentar `Site` (campo isca) e `IniciadoEm` (epoch ms gerado quando o formulário abre).
   - `CriarLeadPublicoAsync`: se `Site` vier preenchido ou se `agora - IniciadoEm < 3 s`, responder **sucesso falso** (201 sem gravar), para o bot não aprender.
   - Front `pages/lead-publico`: input `name="site"` fora da tela (`position:absolute; left:-9999px`, `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`) e `IniciadoEm` definido no `ngOnInit`. Se o formulário também é embutido no site da assessoria (HTML externo), atualizar o snippet/documentação.
4. Limites de tamanho nos campos do lead (nome 120, contato 200, mensagem 2.000); acima disso, 400.
5. Conta inexistente: garantir 404 em vez de 500 quando `ListarEstagiosFunilAsync` vier vazio.

**Testes:** honeypot preenchido não grava; envio em menos de 3 s não grava; 31º lead/h → 429; campo longo → 400.

**VPS:** nada.

---

### Lote 6 — Política de senha (A07-002)

**Código**
1. `OpcoesDeConta.cs:9`: `RequiredLength = 10`. Isso vale só para **senhas novas**: o Identity só valida senha no cadastro, na troca e na redefinição, então quem já tem senha de 8 continua entrando.
2. Novo `SenhaComumValidador : IPasswordValidator<ApplicationUser>` em `Project.Infrastructure/Conta`:
   - Lista embutida como recurso (`EmbeddedResource`) com cerca de 10 mil senhas comuns (por exemplo, o top 10k do SecLists, licença MIT), mais termos do domínio: `aralu`, `casamento`, `cerimonial`, `assessoria`, ano corrente.
   - Comparação normalizada (minúsculas, sem acento). Também recusa senha igual ao e-mail ou à parte antes do `@`.
   - Registrar com `.AddPasswordValidator<SenhaComumValidador>()`.
3. Mensagens: o back hoje só diz "A senha não atende às regras". Devolver o motivo (`curta` | `comum`) para o front mostrar "Use pelo menos 10 caracteres" ou "Essa senha é muito comum".
4. Front: atualizar a dica de senha em cadastro, redefinir-senha, aceitar-convite e minha-conta, seguindo o padrão de vocabulário atual.
5. Spec: registrar a regra na [001-autenticacao-e-conta](../specs/001-autenticacao-e-conta.md).

**Testes:** `"12345678ab"` recusada (comum), `"aralu2026!"` recusada (domínio), senha de 9 recusada, senha boa aceita; login com senha antiga de 8 continua funcionando.

**VPS:** nada.

---

### Lote 7 — `innerHTML` do contrato (A05-001)

**Código**
1. `folha-contrato.ts:78`: `el.innerHTML = cabecalho + linhas.map((l) => \`<div class="linha">${limparHtml(l)}</div>\`).join('');`, ou limpar uma vez em `blocosDoContrato(limparHtml(html))`, que é mais eficiente.
2. `limparHtml`: acrescentar `src` com `data:` só para `img` (para não quebrar a logo, se ela vier como data URL) e remover `srcdoc`, `formaction` e `xlink:href`.
3. Revisar os outros `innerHTML` do front (`previa-word.ts:49` só limpa; `proposta-publica` e `tarefas-funil` passam pelo sanitizador do Angular, então estão ok).

**Testes:** spec com `<img src=x onerror=alert(1)>` e `<a href="javascript:...">`: os atributos somem e o texto fica.

**VPS:** nada.

---

### Lote 8 — Cadeia de build e deploy (A08-001)

**Código**
1. `.github/workflows/deploy.yml`: `actions/checkout@<SHA-do-v4.x>  # v4.x.y`.
2. Dockerfiles e compose: `imagem:tag@sha256:<digest>` em `node:22-alpine`, `caddy:2-alpine`, `dotnet/sdk:10.0`, `dotnet/aspnet:10.0`, `postgres:16-alpine` e `caddy:2.8-alpine`. Para obter o digest: `docker buildx imagetools inspect <imagem:tag>`.
3. `.github/dependabot.yml` com os ecossistemas `github-actions`, `docker`, `npm` (`/src/frontend`) e `nuget` (`/src/backend`), semanal, apontando para a `staging`.
4. NuGet lock: `<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>` num `Directory.Build.props`, commitar os `packages.lock.json` gerados e usar `dotnet restore --locked-mode` no Dockerfile.
5. Known hosts: trocar `ssh-keyscan` pelo secret `SSH_KNOWN_HOSTS` (`printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts`).
6. Auditoria de dependências (cobre o A03, que não foi avaliável): job `audit` no workflow com `npm audit --omit=dev --audit-level=high` e `dotnet list package --vulnerable --include-transitive`, rodando **antes** do deploy. Começa só informativo (`continue-on-error: true`); depois de zerado, passa a bloquear.

**VPS (você executa): usuário de deploy não-root**
```bash
# como root, uma única vez
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy                     # atenção: grupo docker ≈ root; ainda assim tira o shell root direto do CI
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/ # só a chave do deploy; remova-a do root depois
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /opt/aralu /opt/aralu-staging /opt/proxy
```
- No GitHub: `SSH_USER=deploy`, e criar o secret `SSH_KNOWN_HOSTS` com a saída de `ssh-keyscan -p <porta> <IP>`, **conferida contra** `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` executado na própria VPS.
- Depois de um deploy bem-sucedido com `deploy`, tire a chave do CI de `/root/.ssh/authorized_keys` e, se ainda não estiver assim, defina `PermitRootLogin prohibit-password` (ou `no`) em `/etc/ssh/sshd_config` e rode `systemctl reload ssh`. **Mantenha uma sessão root aberta enquanto testa**, para não ficar trancado.
- O `/opt/proxy` contém o Caddyfile do `jmreboque`: confira que o repositório de landing pages também publica com o novo usuário (ou mantenha esse diretório com o dono atual).

---

### Lote 9 — Eventos de segurança no log (A09-001)

**Código**
1. Logger `aralu.seguranca`, sempre com `EventId` fixo e campos estruturados, sem senha nem token:
   - `login_falhou` (e-mail mascarado com `RegrasAcessoCliente.Mascarar` ou hash, IP, motivo: `inexistente` | `senha` | `sem_membro`)
   - `login_bloqueado`, `login_ok`
   - `senha_redefinida`, `senha_trocada`, `sessao_encerrada` (Lote 2)
   - `admin_operou_conta` (adminId, contaId, método e rota) em `AdminEndpoints.AplicarContaDoAdmin`
   - `rate_limit` no `OnRejected` (política, IP, rota)
   - `codigo_link_esgotado` (link/briefing chegou ao máximo de tentativas)
2. Tomar cuidado com a injeção de log (CWE-117): só campos estruturados, nunca concatenar o e-mail digitado na mensagem.

**VPS (você executa): retenção e alerta mínimos**
- Limitar o tamanho dos logs do Docker, que hoje crescem sem limite, em `/etc/docker/daemon.json`:
  ```json
  { "log-driver": "json-file", "log-opts": { "max-size": "20m", "max-file": "10" } }
  ```
  Aplicar com `systemctl restart docker`. Isso reinicia todos os containers, então faça numa janela.
- Alerta simples, sem ferramenta nova: um cron de 5 min que conta `login_falhou` e `rate_limit` nos últimos 5 min e envia e-mail acima de um limiar (por exemplo, 50). Se quiser algo melhor depois, vale avaliar Grafana Loki ou um serviço gerenciado; essa decisão fica para depois.

---

### Lote 10 — Leads de verificação manual (A01)

1. `GET /api/v1/arquivos/{id}` com um Assistente restrito: descobrir o vínculo do arquivo (anexo de tarefa, comprovante, contrato) e aplicar `EscopoAssistente.LiberadosAsync` quando o arquivo pertencer a um evento. Arquivos de modelo e perfil continuam liberados.
2. Revisão rota a rota de `NegocioEndpoints.cs` para o escopo do Assistente: listar as rotas sem `{id}` de evento que devolvem dados de evento (`/agenda`, `/tarefas`, `/clientes`, `/eventos/estatisticas`, `/painel`, `/hoje`) e confirmar que cada uma filtra por `LiberadosAsync`. Hoje só as linhas 325, 687, 878 e 1240 filtram.
3. Conferir a impersonação do Admin: `AplicarContaDoAdmin` grava `dona.Id` (id de usuário) como `conta_id`, mas `ListarUsuarios` devolve `conta.Id`. Confirmar que `ContaAssessoria.Id == DonoUsuarioId`; se não for, corrigir (é funcional, mas impacta o tenant).

Sai um relatório curto com cada rota marcada ok/corrigida. As correções que surgirem viram commits neste mesmo lote.

---

## Fora deste plano (registrado)

- MFA/TOTP para Dono e Admin.
- Refresh token em cookie e access token curto.
- CAPTCHA no lead (só se o honeypot não bastar; medir com o log `lead_descartado_honeypot`).

## Checklist de VPS (resumo)

| Quando | Ação | Ambiente |
|---|---|---|
| Antes do Lote 1 | Escolher sub-redes livres e pôr `DOCKER_SUBNET` no `.env` | staging → produção |
| Deploy do Lote 1 | `docker compose ... down` (sem `-v`) antes de rodar o workflow | staging → produção |
| Depois do Lote 1 | Validar o IP real no log da API | staging |
| Lote 3 | Decidir `includeSubDomains`/`max-age` do HSTS; `curl -sI` para validar | ambos |
| Lote 4 | `ASAAS_DIAGNOSTICO=false` e `APP_ENV=production` em `/opt/aralu/.env` | produção |
| Lote 8 | Criar o usuário `deploy`, o secret `SSH_KNOWN_HOSTS`, trocar `SSH_USER`, fechar o root | VPS + GitHub |
| Lote 9 | `daemon.json` com rotação de log e cron de alerta | VPS |

## Testes e build

Todos os lotes de 1 a 10 tocam `src/` ou deploy: rodar os testes e o build em cada um, conforme o [CLAUDE.md](../../CLAUDE.md). O Lote 2 não exige migration (o stamp já existe na tabela do Identity). Se algum lote acabar criando migration, regerar o `deploy/schema.sql` no mesmo commit.
