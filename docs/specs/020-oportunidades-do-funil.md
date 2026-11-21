# 020. Oportunidades do funil

**Status: aprovada (versão 2, 20/11/2026).** O código segue esta spec. A versão 1 está no histórico do Git. Fonte da v2: pedido do usuário de 20/11/2026 para o quadro seguir o molde da tela Hoje, com leads em cartões, e para o lead virar cliente no fim do funil (seções 6.1, 6.2 e 8.1). Estágios configuráveis, arrastar, data de retorno, origem em lista fechada, aviso de contato repetido e proposta por link (RF-075) continuam para o bloco 16.

> **Revisão de 21/11/2026 (card #43, [SPEC-049](049-dados-do-contratante-na-oportunidade.md)):** a oportunidade guarda os dados do contratante, o modal foi reorganizado (contato, evento, locais, comercial, dados para contrato), "Virar cliente" (§6.2) abre o cadastro preenchido com todos esses dados e descartar apaga CPF/CNPJ, nascimento e endereço.

## 1. Identificador e nome

SPEC-020. Oportunidades do funil.

## 2. Objetivo

O Organizer gerencia o quadro de oportunidades do funil: cria, edita, exclui, filtra, exporta e move entre os quatro estágios, inclusive descarte com motivo. Os números alimentam o dashboard da SPEC-007.

## 3. Requisitos relacionados

RF-075, no recorte de oportunidades, quadro, filtro, exportação, descarte com motivo, formulário público de lead e checagem de data. RF-082 e SPEC-007 para quantidade e valor nos mesmos quatro estágios. Contratos, orçamentos e tarefas comerciais ficam nas SPEC-022, SPEC-025 e SPEC-023. RF-079 fica fora.

## 4. Atores e permissões

O `Organizer` cria, lista, edita, exclui, filtra, exporta e muda estágio das oportunidades da própria conta. Outro `Organizer` não vê. `Admin` acessa qualquer conta. `Client` não acessa o funil neste corte. Lead preenche só o formulário público, sem login. Assistente e fornecedor com login ficam fora.

## 5. Pré-condições

Conta autenticada, SPEC-001. O dashboard da SPEC-007 reflete as mesmas oportunidades.

## 6. Fluxo principal

1. O Organizer abre Oportunidades no funil de vendas.
2. Vê o quadro com quatro colunas, nesta ordem: Contato inicial, Orçamento enviado, Contratado e Descartado. Cada coluna mostra quantidade e valor da conta.
3. Cria oportunidade com nome, estágio, e ao menos um contato; opcionalmente fonte, valor da proposta, responsável, serviço/produto, dados do evento previsto, locais e demais contatos.
4. A oportunidade aparece no cartão da coluna do estágio escolhido; quantidade e valor da coluna e do dashboard atualizam.
5. Edita os mesmos campos e salva.
6. Move a oportunidade entre estágios (exceto o descarte, que exige motivo).
7. Exporta a lista filtrada da conta.
8. Exclui a oportunidade quando não precisar mais dela.

### 6.1. Quadro em cartões (v2)

1. No topo, título com "N leads em aberto · valor em negociação" (soma de Contato inicial e Orçamento enviado) e as ações Link do lead, Exportar e Nova oportunidade.
2. Abaixo, um cartão por estágio no padrão dos cartões da Hoje (ícone, nome, quantidade e valor), com cor fixa: Contato inicial azul (info), Orçamento enviado amarelo (warning), Contratado verde (success), Descartado vermelho (error). Tocar leva à coluna.
3. Filtros em cartão próprio, com "Limpar" quando há filtro.
4. Quatro colunas (uma por linha no celular). Cada lead é um cartão com: nome; valor da proposta ou "Sem valor"; tipo e data prevista; convidados; primeiro contato com telefone e atalho para o WhatsApp; origem; motivo, no descartado; há quantos dias está no estágio.
5. Tocar no cartão abre a edição. O menu do cartão traz Editar, Mover para cada outro estágio, Virar cliente (se ainda não virou) e Excluir.
6. Ação rápida no pé do cartão: em Contato inicial, "Orçamento enviado →"; em Orçamento enviado e Contratado, "Virar cliente"; lead que já virou cliente mostra o selo "Cliente", que leva a Clientes.
7. Mover para Descartado abre modal pedindo o motivo.

### 6.2. Lead vira cliente (v2)

1. O Organizer toca em "Virar cliente".
2. Abre o modal de novo cliente (SPEC-009) já preenchido com o primeiro contato do lead: nome, e-mail, celular, cidade e UF, e a observação "Veio do funil: {oportunidade} (origem: {fonte})".
3. Ele completa o que faltar (e-mail e celular são obrigatórios no cliente) e salva.
4. O cliente é criado, a oportunidade guarda o vínculo com ele e vai para Contratado (sai do descarte, se vier de lá).
5. Cancelar o modal não muda nada.

## 7. Fluxos alternativos

- Conta sem oportunidade: as quatro colunas ficam em 0 e R$ 0,00.
- Nome vazio ou sem contato: não grava.
- Mover para Descartado: exige motivo; sem motivo não grava o descarte.
- Filtro por responsável, tipo de evento, data prevista e ordenação: restringe o quadro à própria conta.
- Busca por nome da oportunidade: restringe os cartões visíveis.
- Formulário público de lead: o visitante envia dados mínimos; a oportunidade nasce em Contato inicial na conta dona do link.
- Checagem de data: ao informar data prevista, o sistema informa se a agenda da conta já tem compromisso naquela data; o Organizer decide se grava mesmo assim.
- Estágios configuráveis e “gerenciar estágios” da referência ficam fora: os quatro estágios são fixos, alinhados à SPEC-007.

## 8. Regras de negócio

- Os estágios são só os quatro da SPEC-007 e de RF-075 vistos na conta: contato inicial, orçamento enviado, contratado e descartado. Rótulo de produto: Orçamento enviado (não “Enviado orçamento”).
- Quantidade é o número de oportunidades da conta na coluna. Valor é a soma dos valores informados na coluna. Oportunidade sem valor não soma.
- Oportunidade pertence à conta do Organizer.
- Descarte exige motivo. Motivo fica gravado e alimenta o relatório de motivos da SPEC-024.
- Serviço/produto usa o catálogo da SPEC-026 quando existir item; o Organizer também pode informar texto livre na criação.
- Responsável, neste corte sem assistente, é a própria conta do Organizer ou outro identificador interno da mesma conta; não há atribuição a outra conta.
- Exportação cobre as oportunidades da conta no filtro atual.
- RF-079 e peças da loja/vitrine/MeLink ficam fora.

### 8.1. Vínculo com o cliente (v2)

- A oportunidade tem um cliente opcional (`ClienteId`), da mesma conta. Vincular coloca a oportunidade em Contratado e limpa o motivo de descarte.
- Cliente de outra conta ou inexistente: não grava.
- O vínculo não cria evento. Criar o evento a partir do lead fica para o bloco 16.
- Excluir o cliente depois não apaga a oportunidade.

## 9. Validações

Nome da oportunidade obrigatório. Estágio obrigatório e um dos quatro. Ao menos um contato com nome. Valor, se preenchido, é número não negativo. Data prevista, se preenchida, é data válida. Motivo obrigatório no descarte.

## 10. Estados

Contato inicial, Orçamento enviado, Contratado e Descartado. Criação pode nascer em qualquer estágio, salvo o formulário público, que nasce em Contato inicial. Exclusão remove o registro.

## 11. Dados necessários

Nome, estágio, fonte opcional, valor opcional, responsável, serviço/produto, contatos (nome e, se houver, telefone e e-mail), tipo do evento, quantidade estimada de convidados, data prevista, horários e quantidades de padrinhos/damas quando informados, local e endereço de cerimônia e de recepção, motivo de descarte quando aplicável.

## 12. Interface

Quadro em quatro colunas com quantidade e valor. Busca, filtro, adicionar, editar, excluir e exportar. Formulário em blocos: sobre a oportunidade, sobre o evento, cerimônia, recepção e contatos. Angular Material, DA-044. Sem gerenciar estágios.

Textos dos estágios: Contato inicial, Orçamento enviado, Contratado e Descartado.

## 13. Erros

Campo inválido indica o campo. Descarte sem motivo não grava. Item de outra conta fica indisponível. Falha ao gravar mantém o estágio anterior. Quadro vazio não é erro.

## 14. Critérios de aceite

1. O quadro mostra os quatro estágios com quantidade e valor da própria conta.
2. Sem oportunidade, cada coluna mostra 0 e R$ 0,00.
3. Criar com nome, estágio e contato coloca o cartão na coluna e atualiza o dashboard da SPEC-007.
4. Sem nome ou sem contato, nada é gravado.
5. Editar e excluir alteram só a conta do Organizer.
6. Mover para Descartado exige motivo.
7. Filtro e exportação não incluem outra conta.
8. Lead pelo formulário público nasce em Contato inicial.
9. Não há coluna além dos quatro estágios nem tela de gerenciar estágios.
10. (v2) Os cartões de estágio no topo mostram quantidade e valor iguais aos das colunas.
11. (v2) "Virar cliente" cria o cliente com os dados do contato, liga a oportunidade a ele e a leva para Contratado com o selo "Cliente".
12. (v2) Vincular cliente de outra conta, ou sem informar o cliente, não grava.

## 15. Cenários de teste

Quadro vazio. Criar, editar, excluir. Mudar entre os três estágios ativos. Descartar com e sem motivo. Filtrar e exportar. Duas contas. Lead público. Data prevista com compromisso na agenda. Conferir SPEC-007.

## 16. Dependências

SPEC-001, SPEC-007 e SPEC-019 para a checagem de data. SPEC-026 para serviço/produto cadastrado. SPEC-021, SPEC-022, SPEC-023, SPEC-024 e SPEC-025 complementam o funil.

## 17. Premissas e pontos não definidos

Lista fechada de motivos de descarte. Se a checagem de data um dia passar a bloquear em vez de só avisar.

(v2) Se "Virar cliente" deve também criar o evento já com tipo, data, convidados e locais do lead. Se um lead pode virar mais de um cliente (o casal: noiva e noivo). Por ora, um cliente por oportunidade. Decidido na SPEC-031 §17 (pontos 13 e 14): "Virar cliente" também cria o evento, com opção de desmarcar; um cliente por oportunidade; motivos de descarte em lista fechada (Preço, Data indisponível, Fechou com outra assessoria, Desistiu do evento, Sem resposta, Outro).
