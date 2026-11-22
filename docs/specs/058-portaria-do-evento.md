# 058. Portaria do evento: QR code, link da equipe e check-in

**Status: aprovada (21/11/2026; aprovação antecipada do dono do projeto, repassada pela sessão que abriu o card #25, com as opções mais simples e conservadoras nos pontos em aberto).** Fonte: card #25 do Trello; [produto-v1.md](../produto-v1.md) 5.7 e 6. Usa o RSVP e a lista de presença da [SPEC-054](054-rsvp-com-prazo.md), o QR do convite da [SPEC-021](021-oportunidades-de-rsvp.md)/[SPEC-010](010-convites-convidados-completo.md) (`GeradorQr`) e o padrão de link sem login do casal ([SPEC-046](046-link-do-casal-financeiro.md), [SPEC-052](052-link-do-casal-cadastra-convites.md)).

## 1. Identificador e nome

SPEC-058. Portaria do evento: QR de entrada, link da equipe e marcação de quem compareceu.

## 2. Objetivo

No dia do evento, uma pessoa da equipe, sem login, abre um link da portaria, escaneia o QR code do convite (ou confere a lista completa), vê todos os convidados do convite e marca quem compareceu.

## 3. Requisitos relacionados

RF-063, RF-064. Regra 7 do [roteiro de execução](../roteiro-execucao.md).

Fora (1.1, [produto-v1.md](../produto-v1.md) 6): modo dia completo e QR offline; estatística de chegada por horário; aviso de presença ao casal.

## 4. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer (dona) | Gerar, copiar, trocar e desativar o link da portaria do evento; baixar o QR de entrada de um convite; ver na lista de presença quem compareceu. |
| Assistant com a permissão de Convidados | Baixar o QR de entrada de um convite e ver a lista de presença (como já faz na aba Convidados). Não gerencia o link. |
| Equipe da portaria (quem tem o link) | Só a portaria **daquele evento**: ver totais e lista de convites confirmados, abrir um convite (pelo QR ou pela lista) e marcar quem compareceu. Nada mais. |
| Quem tem o link de RSVP do convite | Vê o QR de entrada na página de RSVP quando há convidado confirmado. |
| Link inválido, trocado ou desativado | 404. |

## 5. Pré-condições

Evento da conta. Para marcar presença: evento em andamento e convidado Confirmado (entrada na lista de presença da SPEC-054).

## 6. Fluxo principal

### 6.1. Organizadora

1. No menu **Mais** do evento, **Link da portaria** abre uma janela: gerar link, copiar, trocar (o endereço antigo deixa de valer) e desativar.
2. Na aba **Convidados**, cada convite com ao menos um convidado confirmado ganha o botão **Baixar QR de entrada** (PNG). O QR de RSVP que já existe não muda.
3. Na **Lista de presença**, a coluna **Compareceu** mostra a data e hora da marcação ou "Não".

### 6.2. Quem recebe o convite

Depois de confirmar, a página de RSVP mostra o **QR code de entrada** do convite (a mesma imagem que a organizadora baixa). Convite sem confirmados, link expirado ou evento fora de andamento: sem QR.

### 6.3. Equipe da portaria (`/portaria/{código}`)

1. A tela mostra o nome do evento, os totais (**Confirmados**, **Já entraram**, **Faltam**), o botão **Escanear QR code** e a **lista completa** dos convites com confirmados (cada convite com seus convidados confirmados e se já entraram), com busca por convite ou convidado.
2. **Escanear QR code** abre a câmera do navegador (pede permissão), lê o QR e abre o convite. Sem câmera ou sem permissão, avisa e a equipe escolhe o convite pela lista.
3. A **tela do convite** mostra todos os convidados do convite: os confirmados com caixa de marcar e os demais (pendente, não comparecerá) sem caixa, com a situação. Os confirmados já presentes vêm marcados; se ninguém entrou ainda, todos os confirmados vêm marcados (o caso comum é a família inteira entrar junta) e a equipe desmarca quem não veio.
4. **Confirmar presença** grava: quem está marcado passa a "Entrou às HH:mm"; quem não está marcado fica "Ainda não entrou". Dá para voltar ao convite e corrigir depois.

## 7. Fluxos alternativos

- QR de outro evento, de convite sem confirmados ou texto que não é um QR do sistema: 404 ("QR code não reconhecido para este evento.").
- Marcar convidado que não é do convite: 404. Marcar convidado não confirmado: 400.
- Evento fora de andamento: a portaria ainda abre e lista; marcar presença é recusado (400, "O evento não está em andamento.").
- Convidado que deixa de estar Confirmado perde a entrada na lista de presença (SPEC-054) e, com ela, a marcação de comparecimento.

## 8. Regras de negócio

- **Link da portaria:** um por evento, sem senha, com código aleatório de 256 bits (mesmo padrão do link do casal). Trocar gera outro código e o antigo deixa de valer. **Desativar apaga o link.** O código só resolve o evento dele; nenhuma rota da portaria aceita convite, convidado ou evento fora dele.
- **QR de entrada:** carrega o texto `entrada:{código do convite}` (o mesmo código do link de RSVP do convite). Só é gerado com ao menos um convidado confirmado. O QR vale para o convite todo: a tela do convite decide quem entra.
- **Comparecimento** é por convidado confirmado, guardado na entrada da lista de presença (`PresencasEvento.CompareceuEm`, data e hora UTC). Marcar de novo quem já entrou mantém a hora original. Quem foi desmarcado volta a nulo. Se o convidado desconfirmar e reconfirmar, a entrada nasce de novo (SPEC-054) e o comparecimento zera.
- **Banco (migration `PortariaDoEvento`, uma só):** tabela nova `LinksPortaria` (`Id`, `EventoId` único, `ContaId`, `Token` único, `CriadoEm`) e coluna `PresencasEvento.CompareceuEm` (data e hora, opcional). Nada é apagado.
- **API da organizadora:** `GET`, `POST` (gera ou troca) e `DELETE /api/v1/eventos/{id}/link-portaria`; `GET /api/v1/convites/{id}/qr-entrada` (PNG); a lista de presença (`GET /api/v1/eventos/{id}/presencas`) traz `compareceuEm`.
- **API pública:** `GET /api/v1/rsvp/{token}/qr-entrada` (PNG, 404 sem confirmados). Portaria, base `/api/v1/publico/portaria/{token}`: `GET` (totais e convites), `GET /qr/{texto}` (convite do QR lido), `GET /convites/{conviteId}`, `PUT /convites/{conviteId}/comparecimento` com `{ compareceram: [ids] }`.

## 9. Validações

Código do link existente; convite do evento do link; convidados do pedido pertencem ao convite e estão confirmados.

## 10. Estados

Link da portaria: inexistente, ativo (trocar muda o código) ou apagado (desativado). Convidado confirmado: não entrou ou entrou (com hora).

## 11. Dados necessários

Link: evento, conta, código. Presença: comparecimento (data e hora).

## 12. Interface

Página pública para celular primeiro, no estilo da página do casal; janela do link conforme o design-system. A leitura do QR usa a câmera do navegador (biblioteca `jsQR`, funciona em Chrome, Safari e Firefox em HTTPS).

## 13. Erros

Link indisponível: aviso simples na página. QR não reconhecido ou câmera negada: mensagem na tela, sem travar a lista.

## 14. Critérios de aceite

1. A dona gera o link da portaria, copia, troca (o antigo deixa de abrir) e desativa (deixa de abrir).
2. Convite com confirmado ganha QR de entrada, na página de RSVP e para baixar na aba Convidados; sem confirmado, não.
3. Pelo link, a equipe vê totais e a lista completa e busca por convite ou convidado.
4. Ao ler o QR do convite, abre a tela do convite com todos os convidados; marcar e confirmar grava quem compareceu (o marido não veio, a esposa e o filho sim) e os totais se atualizam.
5. O link da portaria de um evento não alcança convite, QR nem presença de outro evento ou conta.
6. A lista de presença da organizadora mostra quem compareceu.

## 15. Cenários de teste

Unitários (dados em memória): gerar, trocar e desativar; outra conta é 404; link vazio ou desconhecido; lista só com convites confirmados e totais; QR com e sem prefixo; QR de outro evento, de convite sem confirmados e inválido; marcar, manter a hora e desmarcar; recusar não confirmado e convidado de outro convite; evento fora de andamento recusa marcar mas lista; QR pelo link de RSVP. Frontend: cliente da portaria, página da portaria (lista, link inválido, marcar) e QR na página de RSVP. Integração: escrita e compilando; execução no fim das ondas.

## 16. Dependências

SPEC-054 (lista de presença), SPEC-004/010 (convite e RSVP), SPEC-046/052 (padrão do link sem login). Biblioteca nova no frontend: `jsqr`.

## 17. Premissas e pontos não definidos

Decididos nesta entrega pela opção mais simples e conservadora (a conferir pelo dono):

1. **O QR carrega o código do convite que já existe** (o do link de RSVP), com o prefixo `entrada:`. Não há código separado: quem vê o QR também tem o link de RSVP do convite, então não ganha poder novo. A equipe da portaria que lê o QR conhece o código, mas o link da portaria não abre o RSVP.
2. **Um QR por convite** (não por convidado), o convite todo na tela da portaria. O card diz "um QR por convite confirmado, referente aos convidados confirmados".
3. **Sem horário-limite para o check-in** (o card #24 cogitava "até a hora do evento"): a portaria funciona enquanto o evento estiver em andamento, qualquer dia.
4. **Link da portaria só pela dona (Organizer)**, como o link do casal; assistente não gerencia.
5. **Desativar apaga o link** (como o link do casal), sem estado "pausado".
6. **Todos os confirmados vêm marcados** ao abrir um convite que ninguém usou ainda, para a família que chega junta entrar com um toque; a equipe desmarca quem não veio.
7. **Só confirmados entram.** Convidado pendente ou que disse que não vai aparece na tela do convite, sem caixa de marcar. A portaria não confirma presença na hora (isso é da organizadora, pela edição do convidado).
8. **Sem leitura offline** e sem conferência quando a internet cair (modo dia completo e QR offline ficam na 1.1). A leitura do QR usa a câmera do navegador (HTTPS); sem câmera, a lista completa com busca cobre.
9. **Guarda só o último estado:** data e hora de quem entrou, sem histórico de quem marcou, nem quem da equipe marcou.
10. **O link expirado de RSVP não mostra o QR**, mesmo para confirmados; a organizadora baixa o QR de entrada pela aba Convidados.
11. **Dependência nova (`jsqr`)** para ler QR em qualquer navegador, em vez do `BarcodeDetector`, que não existe no Safari nem no Firefox.
