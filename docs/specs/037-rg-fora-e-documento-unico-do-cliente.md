# 037. RG fora e CPF/CNPJ em campo único no cliente

**Status: aprovada.** O dono do projeto aprovou antecipadamente (21/11/2026) e o código segue esta spec. Origem: card #42 do board "Tarefas Aralu" ([tarefas-trello.md](../tarefas-trello.md)); [produto-v1.md](../produto-v1.md) 5.1. Inclui, combinado com o dono, a remoção de `Evento.ModeloId` e da criação de evento por modelo na API (pendência da [SPEC-036](036-limpeza-do-legado.md) §6).

## 1. Identificador e nome

SPEC-037. Remoção do RG (cliente e convidado), campo único "CPF/CNPJ" no cadastro de cliente e fim da criação de evento por modelo.

## 2. Objetivo

No Brasil o RG não é mais exigido e novos cidadãos só têm CPF. O RG sai do sistema. O cliente passa a ter um único campo de documento com máscara dupla, no lugar de CPF e CNPJ separados. A criação de evento deixa de aceitar modelo, porque o pacote saiu da criação (card #19, SPEC-008 v4).

## 3. Requisitos relacionados

RF-044 e as telas de cliente e convidado. Complementa as SPEC-009, 010 (RG sai), 034 (campo único e regras do documento) e 036 (limpeza do legado).

## 4. Atores e permissões

Os mesmos das telas afetadas (Organizer e Assistant). Nada de permissão nova.

## 5. Pré-condições

Nenhuma além das das telas afetadas.

## 6. Fluxo principal

1. No cadastro de cliente há um campo "CPF/CNPJ". Começa com a máscara de CPF; se a pessoa digita letra ou passa de 11 caracteres, vira a máscara de CNPJ (regra da SPEC-034 §8).
2. Ao salvar, a API recebe `documento`. Com 11 caracteres grava na coluna `Cpf`; com 14, na coluna `Cnpj`. Vazio grava as duas nulas.
3. Ao reabrir, a API devolve `documento` (o CPF ou, se não houver, o CNPJ) e a tela aplica a máscara.
4. Cadastro de cliente e de convidado não têm mais RG: nem tela, nem API, nem coluna.
5. `POST /api/v1/eventos` não aceita mais `modeloId`. O tipo do evento é obrigatório no pedido. O pacote de um modelo entra depois, por "aplicar modelo" no evento (SPEC-012).

## 7. Fluxos alternativos

- Documento com tamanho diferente de 11 ou 14, caractere inválido ou dígito verificador errado: não grava; mensagem "Informe um CPF ou CNPJ válido.".
- Criação de evento sem `tipo`: "Escolha o tipo do evento.". Um `modeloId` enviado por cliente antigo é ignorado.

## 8. Regras de negócio

- **Armazenamento:** as colunas `Cpf` e `Cnpj` de `Clientes` continuam separadas (contratos, mesclagem e o card #43 leem as duas). O campo único é só da tela e do pedido da API; a gravação separa pelo tamanho.
- **Validação:** `Documentos.CpfOuCnpj` da SPEC-034.
- **Resposta:** `ClienteLeitura` troca `cpf`, `rg` e `cnpj` por `documento`.
- **Convidado:** continua com CPF (SPEC-034). Só o RG sai.

## 9. Validações

"Informe um CPF ou CNPJ válido." (cliente). As demais mensagens da SPEC-034 não mudam.

## 10. Estados

Não há estados novos.

## 11. Dados necessários

Cliente: `Cpf`, `Cnpj` (colunas mantidas; `Rg` removida). Convidado: `Cpf` (`Rg` removida). Evento: coluna `ModeloId` removida.

Migration `RgEModeloDoEventoFora`: apaga `Clientes.Rg`, `Convidados.Rg` e `Eventos.ModeloId` (regra 7 do [roteiro](../roteiro-execucao.md): funcionalidade removida sai do banco, mesmo perdendo dados). `deploy/schema.sql` gerado de novo.

## 12. Interface

Cadastro de cliente: o campo "CPF/CNPJ" (máscara `documento`) substitui CPF e CNPJ; o RG some. Cadastro de convidado: já não mostrava o RG (card #22); nada a mudar na tela. Nenhuma tela de evento muda (a criação já não escolhia modelo).

## 13. Erros

Mensagens da §9, sem detalhe interno.

## 14. Critérios de aceite

1. Cliente salvo com `111.444.777-35` grava `Cpf = 11144477735` e `Cnpj` nulo; com um CNPJ válido grava `Cnpj` e `Cpf` nulo; reabrir mostra a máscara certa.
2. Documento com tamanho diferente de 11 ou 14, ou dígito errado, é recusado.
3. Nenhuma tela, DTO, endpoint ou coluna fala de RG.
4. `POST /api/v1/eventos` sem `tipo` é recusado; com `modeloId` o campo é ignorado e o evento nasce sem serviços e tarefas copiados.

## 15. Cenários de teste

Unitário: `ClientePermissoesTests` com o pedido novo. Integração (roda no fim das ondas): testes que criam evento passam a mandar `tipo`; `Evento_segue_modelo_conta_assessoria_e_cep` e `Importar_aplicar_duas_vezes_salvar_como_modelo_e_isolar` aplicam o modelo por `aplicar-modelo` em vez de depender da criação.

## 16. Dependências

Depende de #45 (SPEC-034). Vem antes do #43 (dados do contratante), que usa o mesmo campo. Única sessão com migration no momento da entrega.

## 17. Premissas e pontos não definidos

Decisões tomadas por serem a opção mais simples e conservadora (o dono pode rever):

1. **Colunas do RG apagadas**, e não só escondidas: o card dizia "decidir ao implementar"; vale a regra 7 do roteiro.
2. **`Cpf` e `Cnpj` continuam duas colunas** em `Clientes`, com campo único só na tela e no pedido. Juntar em uma coluna mexeria em contratos e mesclagem sem ganho.
3. **Pedido da API:** `documento` substitui `cpf`/`cnpj` (sem compatibilidade com o formato antigo, pois não há cliente de API externo na 1.0).
4. **Dados de RG perdidos** na migration (aceito pela regra 7).
5. **Criação de evento sem modelo:** `tipo` passa a ser obrigatório no pedido; `modeloId` enviado é ignorado, não gera erro.
