# 033. Assinatura eletrônica de contratos

**Status: pendente (rascunho, ainda não aprovada).** Não implementar. Falta escolher o fornecedor (§17, ponto 1) e decidir o nível de validade jurídica (§17, ponto 2). Nasceu em 21/11/2026, depois do teste do Ato 7 do [roteiro](../roteiro-teste-funil.md), quando ficou claro que "Enviar" e "Assinar" são só registros manuais. Fonte: pedido do usuário em 21/11/2026; [produto-v1.md](../produto-v1.md) 5.10; pendência já registrada na SPEC-030 §17, ponto 1.

## 1. Identificador e nome

SPEC-033. Assinatura eletrônica de contratos, por integração com um serviço de assinatura.

## 2. Objetivo

Trocar os registros manuais "Enviar" e "Assinar" por um fluxo real: a plataforma envia o documento ao signatário, coleta a assinatura e devolve o documento assinado, e o sistema acompanha o estado. A tela de contratos é **revisitada** junto, porque hoje ela só guarda datas digitadas pelo próprio organizador (ver §3).

## 3. Situação atual (o que existe hoje)

- **Contratos do funil (SPEC-022).** "Enviar" só grava a data de envio; o sistema não manda nada ao cliente. "Assinar" move o contrato para Assinados, sem prova de quem assinou. A lista tem a coluna Situação ("Não enviado", "Enviado em", "Assinado em"), criada em 21/11/2026 para o registro ficar visível.
- **Contratos do evento (SPEC-030).** O cliente só **lê** o contrato por um link de 7 dias enviado por e-mail. Não há assinatura nem simulação.
- Nenhum dos dois tem validade jurídica de assinatura. O roteiro já avisa isso no passo 4 do Ato 7.

## 4. Requisitos relacionados

RF-075 (contratos do funil, SPEC-022), RF-098 (contrato do evento, SPEC-030), SPEC-039 (modelos de contrato, tela única), SPEC-020 (oportunidade e cliente), SPEC-031 (proposta por link, que já tem link público e estados).

## 5. Atores e permissões

| Ator | Pode |
|---|---|
| Organizer | Envia o contrato para assinatura, acompanha o estado, cancela o envio, baixa o documento assinado. |
| Assistant | Só se tiver a permissão do contrato (a definir; hoje a assistente não vê a tela Contratos da conta, mas vê os contratos do funil). |
| Signatário (cliente, cliente, sem login) | Recebe o documento pela plataforma, assina e não precisa de conta no sistema. |
| Admin | Como o Organizer, na conta que está operando. |

## 6. Fluxo principal (proposta, a validar)

1. No contrato em andamento, o Organizer toca em **Enviar para assinatura**.
2. O sistema congela o texto do contrato (cópia que não muda mais), gera o documento e o envia à plataforma com os signatários (contato da oportunidade; no evento, o cliente). O contrato passa a **Aguardando assinatura**.
3. A plataforma avisa o signatário (e-mail ou WhatsApp, conforme o fornecedor) e coleta a assinatura.
4. A plataforma avisa o sistema por webhook a cada mudança. O sistema atualiza o estado: **Assinado**, **Recusado** ou **Expirado**.
5. Ao assinar, o sistema guarda o PDF assinado e o certificado de assinatura (trilha de auditoria) e os deixa para baixar na tela do contrato.
6. O Organizer pode **cancelar** um envio pendente; a plataforma deixa de aceitar a assinatura.
7. Contrato recusado ou expirado volta a poder ser editado e reenviado (novo envio, novo documento congelado).

## 7. Fluxos alternativos

- **Vários signatários** (cliente, dois contratantes, testemunha) e **ordem de assinatura**: ver §17, ponto 3.
- **Falha da plataforma** ao enviar: o contrato continua Em andamento, com mensagem clara, e dá para tentar de novo.
- **Webhook perdido ou atrasado:** o sistema consulta o estado na plataforma ao abrir o contrato e em uma rotina periódica.
- **Contrato editado depois do envio:** não pode. O texto está congelado; para mudar, cancela o envio e envia de novo.
- **Assinatura manual (registro de papel):** decidir se continua existindo, marcada como "registro manual, sem validade eletrônica" (§17, ponto 4).

## 8. Regras de negócio (propostas)

- O texto enviado é uma **cópia congelada** do contrato no momento do envio. O que foi assinado é esse texto, nunca a versão editável.
- Estados: Em andamento → Aguardando assinatura → Assinado, ou Recusado, ou Expirado, ou Cancelado. Assinado não volta atrás.
- Enviar para assinatura, no funil, não move o lead de estágio sozinho. Quando o contrato fica **Assinado**, o sistema pode **sugerir** mover o lead para Contratado (decisão do usuário, como já acontece com a proposta aceita).
- A integração é por conta: cada assessoria usa as próprias credenciais da plataforma, ou o sistema usa uma conta única e repassa o custo (§17, ponto 5).
- O documento assinado e a trilha de auditoria ficam guardados no armazenamento do sistema, por conta, com o mesmo isolamento dos outros arquivos.
- Nenhum segredo da plataforma vai para o front nem para o repositório; ficam na configuração do servidor, como as credenciais de e-mail.

## 9. Validações

Contrato com conteúdo e com oportunidade da conta. Signatário com nome e um canal de contato válido (e-mail ou celular, conforme a plataforma). Contrato só é enviado se estiver Em andamento. Não há segundo envio enquanto um estiver Aguardando.

## 10. Estados

Em andamento → Aguardando assinatura → Assinado. Aguardando → Recusado, Expirado ou Cancelado. Recusado, Expirado e Cancelado → (reenvio) → Aguardando. O contrato já Assinado só muda para Cancelado, com aviso de que o documento assinado continua válido na plataforma.

## 11. Dados necessários

Por contrato: estado, identificador do documento na plataforma, data de envio, de assinatura, de recusa e de expiração, texto congelado, signatários (nome, contato, situação de cada um), arquivo do PDF assinado, arquivo da trilha de auditoria, data da última sincronização. Por conta: fornecedor escolhido e credenciais, guardadas fora do banco comum ou cifradas.

## 12. Interface (a revisitar)

A tela de contratos do funil (e a do evento) ganha, quando a integração existir:

- Coluna **Situação** com o estado real e a data do último evento, no lugar do registro manual.
- Ação **Enviar para assinatura** (abre quadro para conferir os signatários antes de enviar), **Cancelar envio** e **Baixar assinado**.
- Detalhe do contrato com a lista de signatários e a situação de cada um.
- O botão **Assinar** (caneta) some ou vira "Registrar assinatura manual", conforme o §17, ponto 4.
- Aviso permanente enquanto não houver integração: "Assinar é só um registro, sem validade eletrônica".

Segue Angular Material e o design system, como o restante do funil.

## 13. Erros

Credencial da plataforma inválida ou vencida: o envio falha com mensagem para o organizador e o contrato fica Em andamento. Webhook com assinatura inválida: ignorado e registrado. Documento já assinado na plataforma e cancelado aqui: o sistema avisa a divergência.

## 14. Critérios de aceite (propostos)

1. Enviar para assinatura congela o texto e muda o contrato para Aguardando assinatura.
2. O signatário recebe o documento e assina sem criar conta no sistema.
3. Ao assinar, o contrato vira Assinado sozinho e o PDF assinado fica disponível.
4. Recusa e expiração aparecem na lista e liberam o reenvio.
5. Editar o texto depois do envio não é possível.
6. Outra conta não vê documento, estado nem arquivo.
7. Falha da plataforma não deixa o contrato num estado intermediário.

## 15. Cenários de teste

Envio feliz até Assinado. Recusa. Expiração. Cancelar envio pendente. Reenvio depois de recusa. Webhook repetido (idempotência). Webhook perdido e recuperado pela consulta. Credencial inválida. Cliente com dois signatários. Isolamento entre contas. Ambiente de teste (sandbox) do fornecedor, sem cobrança.

## 16. Dependências

SPEC-022 (contratos do funil), SPEC-030 (contratos do evento), SPEC-039 (modelo), armazenamento de arquivos do sistema, configuração de segredos do servidor, rota pública para receber webhooks (sem login, validada por assinatura do fornecedor), e-mail da conta (SPEC-001) para avisos.

## 17. Premissas e pontos não definidos

1. **Escolher o fornecedor.** Candidatos: ZapSign, Clicksign, D4Sign, Autentique e DocuSign. Critérios: preço por documento ou por plano, API e sandbox, webhooks, assinatura por WhatsApp além de e-mail, aceita vários signatários e ordem, guarda trilha de auditoria, retorno do PDF assinado, suporte em português e termos de uso. Fazer uma comparação curta antes de aprovar. Não há preço nem fornecedor definidos neste rascunho.
2. **Nível de validade jurídica.** Contratos entre assessoria e cliente costumam bastar com assinatura eletrônica simples ou avançada (Lei 14.063/2020); ICP-Brasil (qualificada) só se alguém exigir. Validar com o usuário e, se for o caso, com um advogado antes de prometer validade jurídica na tela.
3. **Signatários e ordem.** Quem assina nos dois fluxos: no funil, o contato da oportunidade e a assessoria? No evento, todos os clientes do evento? A assessoria assina por último?
4. **O que fazer com o "Assinar" manual.** Manter como registro de papel (com selo "manual"), ou remover.
5. **Quem paga e quem tem a conta.** Cada assessoria contrata a plataforma (credenciais dela no Perfil) ou o sistema tem uma conta única e embute o custo no plano.
6. **Canal de aviso ao signatário.** Só e-mail, ou também WhatsApp (depende do fornecedor e do custo).
7. **Prazo de validade do documento** enviado (por exemplo, 7 ou 30 dias) e o que acontece ao vencer.
8. **Contratos antigos.** Os já marcados como Assinados manualmente continuam como estão, com o selo de registro manual.
9. **Relação com a proposta.** Se a proposta aceita (SPEC-031) pode gerar o contrato já pronto para assinatura.
10. **LGPD.** Dados dos signatários e documentos assinados ficam em um terceiro; confirmar contrato de tratamento de dados com o fornecedor.
