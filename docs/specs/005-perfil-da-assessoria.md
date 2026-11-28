# 005. Perfil da assessoria

**Status: aprovada.** O código segue esta spec. O endereço foi estruturado pela [SPEC-038](038-endereco-estruturado-do-perfil.md) (21/11/2026).

## 1. Identificador e nome

SPEC-005. Perfil da assessoria.

## 2. Objetivo

O Organizer guarda os dados da empresa que foram vistos na tela de perfil da assessoria. Este é o perfil do Organizer.

## 3. Requisitos relacionados

RF-044. A conta e o e-mail vêm da SPEC-001.

## 4. Atores e permissões

O Organizer vê e edita o próprio perfil. Não vê o perfil de outra conta. Admin não tem tela de perfil de assessoria nesta spec. O cliente não entra na plataforma (SPEC-060).

## 5. Pré-condições

Organizer autenticado com e-mail confirmado.

## 6. Fluxo principal

1. O Organizer abre o perfil.
2. O e-mail da conta aparece e não pode ser editado.
3. Ele informa nome da empresa, responsável, CPF ou CNPJ, celular, data de nascimento e endereço.
4. Salva.
5. Ao reabrir, os dados gravados continuam lá.
6. Se quiser, envia uma foto. Sem foto, a tela mostra só "Enviar foto". Com foto, passar o mouse sobre ela mostra "Alterar" e "Remover". Alterar substitui o arquivo. Remover apaga a foto e volta ao botão único.

## 7. Fluxos alternativos

- Primeira abertura, sem perfil gravado: o e-mail aparece e os outros campos vêm vazios.
- Salvar sem preencher os campos opcionais: grava o perfil só com o e-mail.
- Data de nascimento inválida: não grava.
- Outra conta: não existe caminho para o perfil alheio.

## 8. Regras de negócio

- Há um perfil por conta de Organizer.
- O e-mail é o da autenticação e permanece somente leitura, como na tela vista.
- CPF ou CNPJ é um único campo de documento. Desde a SPEC-034 o documento é validado (CPF ou CNPJ, inclusive alfanumérico, com dígitos verificadores) e gravado sem máscara.
- Endereço estruturado (CEP, endereço, número, complemento, bairro, cidade, estado e país), com consulta de CEP, conforme a SPEC-038. Não é mais um texto único.
- Estes dados não criam evento, contato de cliente nem conta Identity.
- A foto é opcional. JPG, PNG ou WebP de até 5 MB, o mesmo limite das outras imagens. Sem foto gravada, não há miniatura.

## 9. Validações

Data de nascimento, se preenchida, é uma data válida e não futura. Os demais textos aceitam vazio. Tamanho máximo e máscara de celular ou documento não foram vistos.

## 10. Estados

Sem perfil gravado e perfil gravado. Salvar de novo substitui os campos editáveis e mantém o e-mail.

## 11. Dados necessários

E-mail da conta, nome da empresa, responsável, documento, celular, nascimento, endereço e foto opcional.

## 12. Interface

Uma página autenticada. O título é "Editar" e o nome do responsável, ou o da empresa, ou "Editar perfil" quando os dois estão vazios. Duas colunas: Identidade e Endereço à esquerda; foto e Ações à direita. O e-mail fica visível e bloqueado. Os outros campos são editáveis. Ações tem Salvar e Cancelar. Cancelar restaura o texto da última leitura e não apaga a foto. Sem foto, só o botão "Enviar foto". Com foto, o círculo mostra a imagem e, no hover, "Alterar" e "Remover". Sem assistente ou notificação.

## 13. Erros

Data inválida indica o campo e não salva. Falha ao gravar mantém o perfil anterior. Mensagem sem detalhe interno.

## 14. Critérios de aceite

1. O e-mail da conta aparece e não muda por esta tela.
2. Salvar e reabrir devolve os mesmos campos.
3. Salvar com os campos vazios não apaga o e-mail.
4. Data futura ou inválida não grava.
5. Outra conta não lê esse perfil.
6. Sem foto, a página mostra "Enviar foto" e não mostra "Remover". Com foto, "Alterar" e "Remover" estão na foto. Remover volta ao botão único.

## 15. Cenários de teste

Primeiro salvamento. Segundo salvamento substituindo o nome. Documento e endereço estruturado (SPEC-038). Data futura recusada. Duas contas com perfis diferentes.

## 16. Dependências

SPEC-001. Nenhuma dependência de evento.

## 17. Premissas e pontos não definidos

Quais campos além do e-mail são obrigatórios. Validação de CPF e CNPJ. Troca de e-mail, que esta tela não faz e a SPEC-001 também não define.
