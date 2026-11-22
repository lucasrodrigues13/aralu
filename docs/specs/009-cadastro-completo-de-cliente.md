# 009. Cadastro completo de cliente

**Status: aprovada.** O código segue esta spec. Incremento sobre a SPEC-006. Fonte observada: [inventario-referencia.md](../inventario-referencia.md) §1.7 e §5.

> **Revisão de 21/11/2026 (card #43, [SPEC-049](049-dados-do-contratante-na-oportunidade.md)):** o cadastro de cliente ganha **estado civil** (lista fechada) e **nacionalidade** (texto), na aba Dados pessoais. Colunas novas em `Clientes`.

## 1. Identificador e nome

SPEC-009. Cadastro completo de cliente.

## 2. Objetivo

O cadastro de cliente (contato de negócio) passa a ter os campos vistos na referência. O vínculo com o evento continua nascendo no evento, não na ficha do cliente. O Organizer gerencia esses contatos.

## 3. Requisitos relacionados

RF-055. O acesso do cliente é só o link público do evento, com token gerado pelo organizador (RF-056, SPEC-046 e [SPEC-060](060-cliente-sem-login-e-link-do-cliente.md)). Cadastrar um cliente não cria conta, não envia e-mail de primeiro acesso e não tem aba de acesso nem permissões.

## 4. Atores e permissões

O Organizer cria, lista e edita os próprios clientes (contatos). Outro Organizer não vê. O cliente não tem login na plataforma (SPEC-060). Admin fica fora do miolo desta spec.

## 5. Pré-condições

Organizer autenticado. Para vincular, evento da mesma conta, SPEC-002.

## 6. Fluxo principal

1. Na lista da conta, o Organizer abre Adicionar cliente.
2. Preenche os campos da seção 11, em três abas.
3. Salva. A lista mostra nome, telefone, e-mail e eventos vinculados.
4. No evento, Gerenciar clientes oferece três caminhos: link para o próprio cliente se cadastrar, selecionar existente, cadastrar novo já vinculado.
5. O cartão do cliente na lista aponta para os eventos vinculados.

## 7. Fluxos alternativos

- Nome, papel, e-mail ou celular vazios: não grava.
- E-mail inválido: não grava.
- CEP completo: preenche país, endereço, estado, cidade e bairro. O CEP é o primeiro campo do endereço.
- Sem evento vinculado: o cartão diz "Nenhum evento vinculado".
- Cadastrar pelo evento: a referência avisa que o cliente será notificado do primeiro acesso. Aqui não há notificação nem primeiro acesso: o cliente recebe o link do cliente quando a organizadora o envia (SPEC-060).

## 8. Regras de negócio

- Cliente (contato) pertence à conta do Organizer. O evento só guarda o vínculo, como na SPEC-006.
- O casal gravado no evento (SPEC-008) não cria cliente sozinho.
- Papel (função no evento) é lista fechada, vista na tela: Anfitrião, Aniversariante, Avó, Avô, Comissão, Formando(a), Mãe, Noiva, Noivo, Pai, Promotor, Representante, Tia, Tio. O cadastro novo não vem com papel marcado: a organizadora escolhe, já que a plataforma atende vários tipos de evento (SPEC-060).
- DDI padrão `+55`.
- Um cliente pode estar em mais de um evento da conta.
- Excluir: a lista tem lixeira; a consequência da exclusão nos vínculos não foi executada.
- Distinção: o registro desta spec é pessoa ligada a eventos, sem conta nem login. O que o cliente vê é decidido no link do cliente (SPEC-046, SPEC-052).

## 9. Validações

Nome completo, papel, e-mail, DDI e celular obrigatórios. E-mail com formato válido. CPF e CNPJ, se preenchidos, são válidos (dígitos verificadores) e gravados sem máscara, com CNPJ alfanumérico (SPEC-034). CEP, se preenchido, segue a máscara da tela. Tamanho máximo dos textos não foi definido.

## 10. Estados

Cliente cadastrado, com zero ou mais eventos. Sem situação de convite. Sem conta Identity neste incremento.

## 11. Dados necessários

Dados pessoais: foto, nome completo, papel, nascimento, e-mail, DDI, celular, telefone fixo, CPF/CNPJ (campo único, SPEC-037; o RG saiu), profissão, inscrição municipal, religião, observação.

Redes: Facebook, Instagram.

Endereço: CEP, país, endereço, número, estado, cidade, bairro, complemento.

Lista: eventos vinculados. Não há coluna de último acesso (o cliente não entra na plataforma).

## 12. Interface

Lista com busca por nome. Modal de três abas. No evento, modal Gerenciar clientes com Clientes do evento e Cadastrar novo cliente (sem aba Permissões: o cliente não tem login, SPEC-060) nas três opções da seção 6.

## 13. Erros

Campo inválido permanece no modal. Cliente ou evento de outra conta não revela dado. Falha ao gravar mantém o anterior.

## 14. Critérios de aceite

1. Sem nome, papel, e-mail ou celular, nada grava.
2. Cadastro válido aparece só na lista da própria conta do Organizer.
3. O formulário do cliente não pede evento.
4. Vincular pelo evento mostra o evento no cartão e o cliente na home.
5. Desvincular tira os dois lados.
6. Papel só aceita um valor da lista da seção 8.
7. Não existe login de cliente (SPEC-060).

## 15. Cenários de teste

Cadastro só com os obrigatórios. E-mail inválido. CEP que completa o endereço. Vínculo e desvínculo. Um cliente em dois eventos. Isolamento entre contas.

## 16. Dependências

SPEC-001, SPEC-006, SPEC-002 para o vínculo.

## 17. Premissas e pontos não definidos

Obrigatoriedade de foto. Duplicidade de e-mail na mesma conta. Exclusão e o destino dos vínculos.
