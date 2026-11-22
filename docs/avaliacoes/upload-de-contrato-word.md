# Avaliação: subir um contrato em Word e trocar os dados pelas tags

**Status: avaliação de viabilidade (21/11/2026). Não é spec e não aprova implementação.** Card #17 do Trello ([tarefas-trello.md](../tarefas-trello.md)). Base: [produto-v1.md](../produto-v1.md) 5.10, [SPEC-039](../specs/039-modelos-de-contrato-tela-unica.md) (modelos), [SPEC-050](../specs/050-contrato-do-funil-com-tags.md) (tags e geração), [SPEC-053](../specs/053-seletor-de-tags-do-modelo-de-contrato.md) (seletor), [SPEC-055](../specs/055-live-preview-do-modelo-de-contrato.md) (Live Preview), [SPEC-056](../specs/056-logo-e-fundo-do-modelo-de-contrato.md) (logo e fundo) e [SPEC-033](../specs/033-assinatura-eletronica.md) (assinatura, sem fornecedor).

**Sobre as fontes:** o desenho abaixo vem do que o sistema já tem (specs acima). As informações sobre bibliotecas (licença, manutenção, recursos) são de conhecimento geral e **não foram reconferidas na web nesta avaliação**; cada licença deve ser confirmada no repositório oficial antes de qualquer adoção. Nenhum dado do projeto foi enviado para fora.

## 1. Resumo e recomendação

**Recomendação: adiar (não descartar).** É viável tecnicamente, mas é um recurso grande para prioridade BAIXA, e três pontos que o dono ainda não decidiu mudam o desenho: o formato final entregue ao cliente (Word ou PDF), a assinatura eletrônica (SPEC-033, sem fornecedor) e se o "Ver como fica" precisa funcionar para o arquivo Word. Se o dono responder as perguntas da seção 9, a versão mínima (subir `.docx`, validar tags, gerar `.docx` preenchido para baixar, sem preview fiel e sem PDF) cabe em cerca de 8 passos (seção 8). Até lá, o editor de texto com tags, Live Preview e logo/fundo já cobre o caso "colar meu contrato e trocar os dados por tags".

## 2. O que o dono quer

Pelo card: em vez de usar o texto padrão do sistema, a pessoa **sobe o contrato dela em Word (.docx)**, com os dados (nome, CPF, valor...) trocados pelas **tags do sistema** (as do seletor da SPEC-053, como `{{contratante_nome}}`), e o sistema gera o contrato final trocando as tags pelos dados reais. Fica limitado a arquivos Word. Hoje a pessoa cola o texto no editor do modal do modelo; o ganho do upload seria **manter o layout, a fonte, as tabelas e o cabeçalho do documento dela**, que o editor de texto simples não guarda.

## 3. Como funcionaria

### 3.1. Leitura do .docx

Um `.docx` é um zip com XML (OOXML). O texto fica em `word/document.xml`; cabeçalhos e rodapés em `word/header*.xml` e `word/footer*.xml`; imagens em `word/media/`. Ler é abrir o zip e percorrer os parágrafos (`w:p`), trechos (`w:r`, os "runs") e textos (`w:t`).

### 3.2. Onde as tags aparecem e o problema dos runs

Quando a pessoa digita `{{contratante_nome}}` no Word, o texto **nem sempre fica num único `w:t`**. O Word divide o parágrafo em runs sempre que muda a formatação (negrito, cor) e também por motivos invisíveis: correção ortográfica, revisão de texto, edição em vários momentos, colar de outra fonte. É comum a tag virar, no XML, algo como:

```xml
<w:r><w:t>{{contratante_</w:t></w:r>
<w:r><w:rPr><w:b/></w:rPr><w:t>nome</w:t></w:r>
<w:r><w:t>}}</w:t></w:r>
```

Uma busca simples por `{{contratante_nome}}` no XML **não acha** essa tag. Isto é o principal risco técnico do recurso. A solução padrão tem quatro partes:

1. Por parágrafo, juntar o texto de todos os runs, achar as tags no texto juntado (regex `\{\{\s*([a-z_]+)\s*\}\}`) e guardar, para cada letra, a qual run ela pertence.
2. Para cada tag encontrada, colocar o valor no **primeiro run** que a tag toca e apagar o trecho da tag nos demais (runs que ficarem vazios saem).
3. O valor herda a formatação do **primeiro run** da tag (o que a pessoa vê na tag é o que vai ver no valor). Se a tag começa em negrito, o valor sai em negrito.
4. Tratar os mesmos cuidados em cabeçalho, rodapé, tabelas (parágrafos dentro de células), caixas de texto e notas de rodapé.

Casos que complicam: tag partida por quebra de linha ou tabulação; tag dentro de campo do Word (`w:fldSimple`, `w:instrText`) ou de controle de conteúdo (`w:sdt`); marcas de revisão (`w:ins`/`w:del`, "controlar alterações" ligado), em que o texto "apagado" ainda está no XML; e aspas "inteligentes" ou chaves coladas de outros programas. Recomenda-se **rejeitar ou avisar** quando o documento tiver revisões pendentes.

### 3.3. Substituição preservando a formatação

Por causa de 3.2, o trabalho é de **substituição por parágrafo**, não por documento. Valores com várias linhas (ex.: `contrato_parcelas`, hoje separado por "; ") viram um run por linha com quebra (`w:br`) ou, melhor, uma frase única, como já é hoje. Valores vindos do sistema precisam ser **escapados** como texto XML (nunca inseridos como XML cru). Tag desconhecida fica como está e é avisada (mesmo comportamento da SPEC-055); tag sem dado vira `________` (SPEC-050 §6.3).

### 3.4. Geração do contrato final

Ao gerar o contrato do funil (SPEC-050 §6.1), o servidor abre o `.docx` do modelo, faz a substituição com os dados do contratante, do orçamento aprovado e da assessoria e **grava o resultado como um arquivo novo** (`.docx` preenchido), guardado no armazenamento da conta (`IArmazenamentoArquivo`, tabela `Arquivos`) e ligado ao contrato. Como o contrato já guarda uma cópia do texto/valores no momento da geração, o contrato Word também deve ser **uma cópia congelada** (mudar o modelo depois não altera contratos já gerados, regra da SPEC-056 §6.3 e da SPEC-033 §8).

## 4. Bibliotecas .NET candidatas

O projeto é .NET 10, com Application sem dependências externas pesadas e Infrastructure para recursos externos (`project-architecture.mdc`). A leitura/escrita do Word entraria **atrás de uma interface em Application** (ex.: um gerador de documento) com implementação na Infrastructure, como o e-mail e o armazenamento.

| Biblioteca | Licença (conferir) | O que faz | Riscos |
|---|---|---|---|
| **DocumentFormat.OpenXml** (Open XML SDK, Microsoft) | MIT | Acesso de baixo nível ao XML do Word. Mantida pela Microsoft. | É de baixo nível: a junção de runs (3.2) é **código nosso**. Mais trabalho, mais controle e nenhuma licença paga. **Opção principal.** |
| **Open-XML-PowerTools** | MIT | Utilitários sobre o SDK (busca e troca de texto com runs, entre outros). | Projeto pouco ativo; a versão que serve ao .NET moderno é de forks. Dependência frágil; bom como referência de como juntar runs. |
| **MiniWord** | MIT | Gera Word a partir de modelo com `{{tag}}` (o mesmo formato das nossas tags), com troca de texto, imagem e tabelas. | Projeto pequeno, mantido por poucas pessoas; precisa de teste com os casos de 3.2. Atraente pela semelhança com as nossas tags. Confirmar suporte a cabeçalho/rodapé. |
| **Xceed DocX** (`DocX`) | Community License: grátis só para uso **não comercial**; comercial é paga | API simples de trocar texto e imagens. | O sistema é comercial: exigiria licença paga. Descartar, salvo compra. |
| **NPOI** (módulo Word, XWPF) | Apache 2.0 | Port do Apache POI. | O suporte a Word é menor que o de Excel; documentação fraca; sem vantagem sobre o SDK. |
| **Aspose.Words / Syncfusion DocIO / GemBox.Document** | Comerciais (GemBox tem versão gratuita com limite de tamanho) | Completas, inclusive converter para PDF e renderizar. | Custo por desenvolvedor ou por servidor, a validar. Só se o dono quiser PDF no servidor e não quiser montar a conversão por conta própria. |
| **LibreOffice em modo headless** (programa externo, não biblioteca .NET) | MPL 2.0 | Converte `.docx` em PDF no servidor. | Entra no Compose como mais um contêiner/programa: imagem maior, processo externo, fontes do cliente podem faltar no servidor e mudar a paginação. Ver seção 6. |

**Para ler o .docx e trocar tags a recomendação é o Open XML SDK (MIT)**, com uma classe nossa de junção de runs coberta por testes unitários, ou MiniWord se uma prova de conceito mostrar que dá conta dos casos de 3.2. **Não há biblioteca leve e gratuita que renderize o Word com fidelidade** (para preview ou PDF): isso só existe em produtos pagos ou via LibreOffice.

## 5. Segurança

O `.docx` é **arquivo enviado por usuário** (Organizer ou Admin, não o público) e é processado no servidor, então precisa das proteções abaixo. O sistema já tem validação de tipo por conteúdo para imagens (SPEC-056 §9) e armazenamento isolado por conta; o mesmo padrão vale aqui.

- **Tipo e extensão:** aceitar só `.docx`. Validar por **conteúdo**: é um zip com `[Content_Types].xml` e `word/document.xml`. Rejeitar `.doc` (formato binário antigo, bem mais perigoso), `.docm` e `.dotm` (com macro), `.rtf` e outros. Não confiar em extensão nem em `Content-Type` do navegador.
- **Macros:** `.docx` não pode ter macros; ainda assim recusar se houver `word/vbaProject.bin`. Como o servidor **nunca executa** o documento (só lê XML), macros não rodariam aqui; o risco passa para quem **baixa** o contrato preenchido. Por isso rejeitar na entrada.
- **Objetos embutidos e vínculos externos:** recusar ou remover `word/embeddings/`, objetos OLE e relações externas (`TargetMode="External"`, por exemplo modelo ou imagem remota; o Word pode tentar buscar a URL ao abrir). Recusar também `altChunk`.
- **Zip bomb e tamanho:** limitar o arquivo enviado (sugestão: **2 MB**; um contrato de texto raramente passa de 200 KB) e o **tamanho descompactado** total e por entrada (ex.: 20 MB e 10 MB), e o número de entradas. Ler em fluxo, sem extrair em disco.
- **XML:** usar leitor com **DTD desativado e sem resolver entidades externas** (XXE e "billion laughs"). O Open XML SDK e o `XmlReader` com `DtdProcessing.Prohibit` atendem.
- **Injeção pelos dados:** os valores (nome do cliente, endereço) são texto digitado por terceiros. Inserir sempre como texto XML escapado, nunca como XML.
- **Isolamento e acesso:** arquivo da conta, baixado só por quem está logado na conta (`GET /api/v1/arquivos/{id}`), como a logo e o fundo.
- **Vírus:** não há antivírus no VPS único do Compose. O risco é aceitável porque o servidor não executa o arquivo e só quem tem login envia; avisar o dono de que o arquivo baixado é aberto no Word por quem o recebe e que, por isso, a validação rejeita macros e vínculos externos. Antivírus no servidor ficaria como decisão futura.
- **LGPD:** o contrato preenchido guarda dados pessoais do cliente (CPF, endereço) em arquivo. Já ocorre com o texto do contrato no banco; o arquivo precisa do mesmo cuidado de acesso e de backup.

## 6. Convivência com o que já existe

### 6.1. Editor atual

**Os dois modos devem conviver** por um bom tempo: modelo "de texto" (hoje) e modelo "Word". O editor de texto continua o caminho principal, sem dependência de Word e com preview. Um modelo é de um tipo ou do outro (campo de tipo no modelo). Misturar (editar o Word dentro do sistema) está **fora de questão**: o sistema não tem editor de Word. Para mudar o texto do Word, a pessoa edita o arquivo no Word dela e sobe de novo.

### 6.2. Live Preview (SPEC-055)

O Live Preview mostra exemplos no lugar das tags, atualizando a cada tecla, no navegador. **Para um `.docx` isso não existe de graça**: o navegador não renderiza Word, e não há preview fiel sem converter para PDF/HTML. Opções, da mais simples à mais cara:

1. **Sem preview.** Ao subir, o sistema só **lista as tags encontradas e as desconhecidas** (parte do "aviso de tag inexistente" da SPEC-055), e a pessoa vê o resultado ao baixar um exemplo preenchido com os dados de exemplo. Esta é a recomendada para uma primeira versão.
2. **Texto extraído** do Word (sem layout) mostrado na folha existente; é aproximado e pode enganar.
3. **PDF de amostra** gerado no servidor com LibreOffice/Aspose, mostrado num `<iframe>`; é fiel, mas depende do item abaixo e é lento (segundos por conversão), então só ao clicar, não a cada tecla.

### 6.3. Logo e fundo (SPEC-056)

Hoje a logo e o fundo são colocados pelo sistema na folha HTML. **Num modelo Word eles não se aplicam**: a pessoa já coloca logo, cabeçalho e fundo no próprio documento, e é isso o ganho do recurso. O modal de um modelo Word deve **esconder** as áreas de logo e fundo. Não vale tentar injetar imagem no XML do Word.

### 6.4. Assinatura eletrônica (SPEC-033) e impressão/PDF

Pontos já definidos: hoje o contrato é impresso pelo navegador (SPEC-056 §17.5), **não há PDF no servidor** e a assinatura está **pendente de fornecedor** (SPEC-033 §17). O fluxo da SPEC-033 envia um **documento congelado** à plataforma e recebe de volta um PDF assinado.

- **Word x PDF:** as plataformas de assinatura mais comuns (candidatas da SPEC-033: ZapSign, Clicksign, D4Sign, Autentique, DocuSign) trabalham com **PDF** (algumas aceitam `.docx` e convertem por conta própria). O Word, sozinho, **não é o formato de assinatura**. Duas rotas:
  - **A. Converter no servidor** o `.docx` preenchido em PDF (LibreOffice ou biblioteca paga) e mandar o PDF à plataforma. Fidelidade depende das fontes instaladas no servidor.
  - **B. Mandar o `.docx`** direto, se o fornecedor escolhido aceitar, deixando a conversão para ele. Decide o fornecedor, não o aralu.
- **Impressão:** o "Imprimir" atual abre a folha HTML. Um contrato Word **não tem a folha HTML**; imprimir seria baixar o `.docx` e imprimir no Word, ou usar o PDF convertido (rota A).
- **Conclusão:** enquanto a SPEC-033 não escolher fornecedor, o upload de Word **não deve prometer** assinatura eletrônica nem PDF. O contrato gerado seria um `.docx` para baixar, imprimir e assinar por fora (como o registro manual de hoje). Se o dono quiser que o contrato Word entre na assinatura, escolher primeiro o fornecedor (e conferir o formato aceito) **antes** de implementar o upload.

## 7. O que exigiria de banco e de API

**Banco (migration que só acrescenta; nada apagado).** Esboço, a refinar na spec:

- `ContratosConta` (modelo): campo de tipo do modelo (texto ou Word) e `ArquivoWordId` (uuid nulo, sem chave estrangeira, como `LogoArquivoId`); nome original do arquivo; lista das tags encontradas no upload (opcional, para avisar).
- `ContratosFunil` (contrato gerado): `ArquivoWordId` do `.docx` preenchido (cópia congelada) e, se vier PDF, `ArquivoPdfId`.
- `Arquivos`: já existe; hoje valida imagens. Precisa aceitar `.docx` com a validação da seção 5 (regra nova no armazenamento, tipo e tamanho próprios).

**API** (Admin e Organizer, como a SPEC-056):

- `POST /api/v1/contratos/{id}/word` (multipart, campo `arquivo`): valida, guarda, devolve as tags encontradas e as desconhecidas. `DELETE` do mesmo caminho.
- `GET /api/v1/contratos/{id}` passa a trazer o tipo, o nome do arquivo e as tags.
- `POST /api/v1/contratos-funil` (existente): com modelo Word, gera o `.docx` preenchido em vez do texto. A regra de orçamento aprovado e dados completos (SPEC-050) vale igual.
- `GET /api/v1/contratos-funil/{id}/word`: baixa o preenchido (ou usa `GET /arquivos/{id}`).
- Opcional: `POST .../amostra` gera o `.docx` com os exemplos da lista de tags, para a pessoa conferir antes de usar.

**Interface:** no modal do modelo, escolha de tipo, botão "Subir Word" (só `.docx`, com mensagem de erro clara), lista de tags encontradas e desconhecidas; esconder logo/fundo/Live Preview para o tipo Word; na tela de contratos, "Baixar Word" no lugar de "Ver contrato" e "Imprimir".

## 8. Esforço estimado

Em passos (sem datas), para a versão mínima recomendada (sem PDF, sem preview fiel, sem assinatura):

1. **Prova de conceito** da junção de runs com 5 a 10 `.docx` reais da cerimonialista (inclusive com tag partida, tabela, cabeçalho). Decide entre Open XML SDK e MiniWord. *É o passo que reduz o maior risco; fazer antes de escrever a spec.*
2. Spec (modelo, tipos, regras, mensagens) e aprovação.
3. Validação segura do upload (seção 5) e armazenamento do `.docx`.
4. Leitura das tags do arquivo (encontradas e desconhecidas) e `POST`/`DELETE` do modelo.
5. Geração do `.docx` preenchido ao criar o contrato (substituição com formatação preservada; cabeçalho, rodapé, tabelas) e guarda como cópia congelada.
6. Migration e ajustes de DTO/API.
7. Interface: tipo do modelo, subir/remover, aviso de tags, "Baixar Word", ocultar logo/fundo/preview.
8. Testes: unitários da junção de runs e da validação de segurança (arquivos maliciosos de teste); integração do upload e da geração; conferência manual no Word real e no LibreOffice.

Ordem de grandeza: **médio-grande** (mais que as logos e fundo da SPEC-056, que também fez migration e API). Estimativa grosseira: o núcleo difícil é o passo 5; o resto é rotina do projeto. Acrescentar PDF no servidor (rota A da seção 6.4) soma **mais um bloco grande** (contêiner LibreOffice, fontes, teste de paginação) e só vale se a assinatura entrar.

## 9. Perguntas para o dono

1. **Isso vale a pena agora?** O editor com tags, Live Preview e logo/fundo já cobre "colar meu contrato". O que a cerimonialista **perde** sem o Word: tabelas, formatação detalhada, cabeçalho e rodapé do documento dela? Há contrato que ela já usa que não cabe no editor?
2. **Formato que o cliente recebe:** `.docx` para baixar, ou **PDF**? Se for só Word, o cliente edita o contrato; é aceitável?
3. **Assinatura eletrônica:** o contrato Word precisa entrar na assinatura (SPEC-033)? Se sim, é preciso escolher o fornecedor antes e conferir se ele aceita `.docx` ou só PDF. Isso decide se o PDF no servidor entra.
4. **Preview:** serve **não ter** Live Preview para o Word (só a lista de tags e uma amostra para baixar)? Ou precisa ver o documento na tela (custo de conversão)?
5. **Convivência:** um modelo é **ou texto ou Word**, e o editor atual continua para quem quiser? Pode-se esconder logo e fundo no modelo Word?
6. **Quem edita o Word:** a pessoa edita no Word dela e sobe de novo a cada mudança (sem editor no sistema)? Aceita?
7. **Tags:** o usuário digita `{{tag}}` à mão no Word, consultando a lista do "?" (SPEC-053). Aceita esse trabalho, ou quer algum atalho (ex.: baixar um modelo Word de exemplo já com tags)?
8. **Licença e custo:** ok usar só bibliotecas gratuitas (Open XML SDK, MIT), mesmo com mais trabalho nosso, ou há orçamento para uma biblioteca paga (por exemplo, para PDF)? Se houver PDF, aceita o LibreOffice no servidor (um contêiner a mais no Compose)?
9. **Tamanho e segurança:** limite de 2 MB por arquivo e recusa de macros e links externos são aceitáveis? Quer antivírus no servidor?
10. **Prioridade:** entra na 1.0 ou fica para depois (a recomendação é depois, depois da escolha do fornecedor de assinatura)?

## 10. Resultado

| Item | Resposta |
|---|---|
| Viável? | Sim, com Open XML SDK (MIT) e código próprio para juntar runs. |
| Principal risco técnico | A tag dividida em vários runs (3.2); mitigado por prova de conceito com documentos reais. |
| Principal risco de produto | Formato do contrato final (Word x PDF) e assinatura eletrônica sem fornecedor. |
| Esforço | Médio-grande (8 passos); sem PDF. |
| Recomendação | **Adiar.** Retomar depois que o dono responder as perguntas da seção 9 e a SPEC-033 definir o fornecedor e o formato. Se o dono quiser seguir, começar pela prova de conceito (passo 1). |
