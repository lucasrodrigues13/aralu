# Pendências do manual

Mudanças no sistema que ainda não entraram no manual. Ao aplicar um item no `src/frontend/public/manual/index.html` e refazer os prints, mova o item para "Aplicadas".

Para cada item: o commit, o que mudou, onde está no manual, os prints a refazer e o roteiro que os captura.

## Abertas

### Padronização de interface (27/11/2026)

Textos e telas que mudaram e que o manual (`index.html`) ainda descreve do jeito antigo. Prints não foram refeitos.
- **Criar a conta e Entrar (linhas ~164 a 177):** telas de acesso com cartão largo e painel da marca; cadastro agora diz "Criar conta" no botão e "Teste grátis de 14 dias, sem cartão." no subtítulo; "Esqueci a senha" e "Reenviar confirmação" com novos botões ("Enviar link", "Reenviar e-mail") e link "Voltar para entrar".
- **RSVP (linha ~752):** os rótulos "Confirmado" e "Não comparecerá" na página do convite viram "Vou" e "Não vou"; o botão vira "Enviar resposta".
- **Botões renomeados:** "Novo grupo", "Convidar pessoa", "Adicionar tarefa" (Tarefas do Funil vira "Nova tarefa") e "Adicionar serviço" (Serviços da conta vira "Novo serviço"; no evento e no modelo de evento continua "Adicionar serviço"); botões de importar usam "Importar planilha".
- **Modais:** todos têm X no topo; "Entendi" e "Pronto" viraram "Fechar"; confirmação destrutiva em vermelho. Capturas de modal ficam com o rodapé e o topo antigos.
- **Listas:** nome do registro clicável; coluna "Ações" visível; menu "Mais ações" em contratos, orçamentos e convidados; paginação; estados vazio e "Carregando…". Afeta as capturas dessas telas.
- **Telas públicas** (RSVP, lead, briefing, proposta, equipe, link do cliente, portaria): sempre no tema claro, sem botão de tema; links inválidos mostram "Este link não está mais disponível".

### Prints do modelo de evento e das tarefas (commits 6cc6926, 4faff6e, 39f5cbf)

O texto já foi atualizado. Faltam os prints, que ainda mostram as telas antigas:
- `13c-modelo-evento-tarefas.png`: aba Serviços e tarefas.
- `13d-colar-tarefas.png`: modal Adicionar tarefas em massa.
- `35a-nova-tarefa-checklist.png`: formulário sem Grupo e com o novo Prazo.
- `32b-evento-resumo-final.png`: a lista de tarefas do Resumo mudou.
- `51a-salvar-como-modelo.png`.

Os roteiros do capítulo 5 clicam em "Checklist", "Tarefas", "Colar tarefas" e preenchem "Grupo"; ajuste-os antes de rodar.

## Aplicadas

- **Texto do modelo de evento e das tarefas** (24/11/2026). Atualizados os capítulos 5, 15.2, 15.3, 16.1, 16.2 e 23.2: aba Serviços e tarefas, prazo relativo/data exata, sem Grupo, Adicionar em massa e as prévias de aplicar e de salvar como modelo.
