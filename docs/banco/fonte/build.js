const fs=require('fs');
const src=fs.readFileSync('gen.js','utf8');
const head=src.slice(0,src.indexOf('// ---------- helpers'));
const ctx={};(new Function('require','ctx',head+';Object.assign(ctx,{cur,fut,LOGICAL,POLY,DOMAINS,SAAS,NEW_TABLES:[...NEW_TABLES],NEW_COLS:[...NEW_COLS]});'))(require,ctx);
const {cur,LOGICAL,POLY,DOMAINS,SAAS}=ctx;
const clone=o=>JSON.parse(JSON.stringify(o));
function mk(S){ // tables with edges
  const out={};
  for(const [n,t] of Object.entries(S)){
    const fk=new Set(t.fks.map(f=>f.col));
    out[n]={cols:t.cols.map(c=>{const k=n+'.'+c.n;return {n:c.n,t:c.t.replace('timestamp with time zone','timestamptz').replace('character varying','varchar').replace('time without time zone','time').replace('integer','int').replace('boolean','bool'),nn:c.nn,pk:t.pk.includes(c.n),fk:fk.has(c.n)?t.fks.find(f=>f.col===c.n).ref:null,on:fk.has(c.n)?t.fks.find(f=>f.col===c.n).on:null,ref:!fk.has(c.n)&&LOGICAL[k]?LOGICAL[k]:null,poly:POLY[k]||null,uq:t.uniq.includes(c.n)}})};
  }
  return out;
}
const hoje=mk(cur);
// proposta
const P=clone(ctx.fut);
P.ClienteEventos=P.Vinculos; delete P.Vinculos;
const col=(n,t,nn=true)=>({n,t,nn});
P.Contas={pk:['Id'],uniq:[],fks:[{col:'DonoUsuarioId',ref:'AspNetUsers',on:'RESTRICT'}],cols:[col('Id','uuid'),col('Nome','text'),col('DonoUsuarioId','text'),col('CriadaEm','timestamp with time zone')]};
P.MembrosConta={pk:['Id'],uniq:['TokenConviteHash'],fks:[{col:'ContaId',ref:'Contas',on:'CASCADE'},{col:'UsuarioId',ref:'AspNetUsers',on:'RESTRICT'},{col:'GrupoId',ref:'GruposAcesso',on:'RESTRICT'}],cols:[col('Id','uuid'),col('ContaId','uuid'),col('UsuarioId','text',false),col('Email','text'),col('Tipo','text'),col('GrupoId','uuid',false),col('TokenConviteHash','text',false),col('ConviteExpiraEm','timestamp with time zone',false),col('Situacao','text'),col('ConvidadoEm','timestamp with time zone'),col('PrimeiroAcessoEm','timestamp with time zone',false),col('RemovidoEm','timestamp with time zone',false)]};
P.GruposAcesso={pk:['Id'],uniq:[],fks:[{col:'ContaId',ref:'Contas',on:'CASCADE'}],cols:[col('Id','uuid'),col('ContaId','uuid'),col('Nome','varchar(60)'),col('VeTodosEventos','boolean'),col('Padrao','boolean'),col('CriadoEm','timestamp with time zone')]};
P.PermissoesGrupo={pk:['GrupoId','Modulo'],uniq:[],fks:[{col:'GrupoId',ref:'GruposAcesso',on:'CASCADE'}],cols:[col('GrupoId','uuid'),col('Modulo','text'),col('Ver','boolean'),col('Editar','boolean'),col('Excluir','boolean')]};
P.CodigosAcessoCliente={pk:['Id'],uniq:[],fks:[{col:'LinkClienteId',ref:'LinksCliente',on:'CASCADE'}],cols:[col('Id','uuid'),col('LinkClienteId','uuid'),col('Canal','text'),col('Destino','text'),col('CodigoHash','text'),col('ExpiraEm','timestamp with time zone'),col('Tentativas','integer'),col('UsadoEm','timestamp with time zone',false),col('CriadoEm','timestamp with time zone')]};
P.SessoesLinkCliente={pk:['Id'],uniq:['TokenHash'],fks:[{col:'LinkClienteId',ref:'LinksCliente',on:'CASCADE'}],cols:[col('Id','uuid'),col('LinkClienteId','uuid'),col('TokenHash','text'),col('ExpiraEm','timestamp with time zone'),col('CriadaEm','timestamp with time zone'),col('UltimoAcessoEm','timestamp with time zone',false)]};
P.LinksCliente.cols.push(col('ExigeCodigo','boolean'));
P.EventosMembros={pk:['EventoId','MembroId'],uniq:[],fks:[{col:'EventoId',ref:'Eventos',on:'CASCADE'},{col:'MembroId',ref:'MembrosConta',on:'CASCADE'}],cols:[col('EventoId','uuid'),col('MembroId','uuid')]};
delete P.EventosAssistentes; delete P.Assistentes;
P.AspNetUsers.cols=P.AspNetUsers.cols.filter(c=>c.n!=='OrganizerId');
for(const n of ['Assinaturas','DocumentosTrial']){ const t=P[n]; t.cols.find(c=>c.n==='ContaId').t='uuid'; t.fks=t.fks.map(f=>f.col==='ContaId'?{...f,ref:'Contas'}:f); }
P.Planos={pk:['Id'],uniq:['Codigo'],fks:[],cols:[col('Id','uuid'),col('Codigo','varchar(40)'),col('Nome','varchar(80)'),col('Descricao','text',false),col('ValorMensal','numeric(12,2)'),col('Publico','boolean'),col('Padrao','boolean'),col('Ativo','boolean'),col('Ordem','integer'),col('CriadoEm','timestamp with time zone'),col('AtualizadoEm','timestamp with time zone')]};
P.RecursosPlano={pk:['PlanoId','Recurso'],uniq:[],fks:[{col:'PlanoId',ref:'Planos',on:'CASCADE'}],cols:[col('PlanoId','uuid'),col('Recurso','text'),col('Limite','integer',false)]};
P.AlteracoesAssinatura={pk:['Id'],uniq:[],fks:[{col:'AssinaturaId',ref:'Assinaturas',on:'CASCADE'},{col:'PlanoAnteriorId',ref:'Planos',on:'RESTRICT'},{col:'PlanoNovoId',ref:'Planos',on:'RESTRICT'},{col:'FeitoPorUsuarioId',ref:'AspNetUsers',on:'RESTRICT'}],cols:[col('Id','uuid'),col('AssinaturaId','uuid'),col('PlanoAnteriorId','uuid',false),col('PlanoNovoId','uuid',false),col('ValorAnterior','numeric(12,2)',false),col('ValorNovo','numeric(12,2)',false),col('Motivo','text',false),col('FeitoPorUsuarioId','text'),col('FeitoEm','timestamp with time zone')]};
{const t=P.Assinaturas; const i=t.cols.findIndex(c=>c.n==='Valor'); t.cols.splice(i,1,col('PlanoId','uuid'),col('ValorPersonalizado','numeric(12,2)',false),col('DescontoPercentual','numeric(5,2)',false),col('DescontoAte','date',false),col('Valor','numeric(12,2)')); t.fks.push({col:'PlanoId',ref:'Planos',on:'RESTRICT'});}
const {decCol,removidas}=require('./dec.js')(P,col);
// ---- tenant em todas as tabelas + índice recomendado ----
const sqlTxt=fs.readFileSync('C:/Users/fluca/OneDrive/Belgeler/GitHub/aralu/deploy/schema.sql','utf8');
const idxs=[...sqlTxt.matchAll(/CREATE (?:UNIQUE )?INDEX "[^"]+" ON "([^"]+)" \(([^)]+)\)/g)].map(m=>({t:m[1],c:m[2].replace(/"/g,'').split(/,\s*/)}));
const SEM_TENANT=new Set(['Contas','EventosWebhookAsaas','Planos','RecursosPlano']);
const IDX_MANUAL={Eventos:['Data'],Clientes:['Nome'],Tarefas:['Prazo'],TarefasFunil:['Prazo'],Compromissos:['Data'],Oportunidades:['EstagioFunilId'],ParcelasContrato:['Vencimento'],ParcelasOrcamento:['Vencimento'],ParcelasContratoFornecedor:['Vencimento'],CobrancasAssinatura:['Vencimento'],Fornecedores:['Nome'],LeadsRsvp:['CriadoEm'],Arquivos:[],Perfis:[],Assinaturas:[],MetricasRsvpFunil:[],Tags:['Nome'],EstagiosFunil:['Ordem']};
const UNIQUE_CONTA=new Set(['Perfis','Assinaturas','MetricasRsvpFunil']);
const tenant={};
const oldName={ClienteEventos:'Vinculos'};
for(const [n,t] of Object.entries(P)){
  if(n.startsWith('AspNet')||SEM_TENANT.has(n)) continue;
  const had=t.cols.some(c=>c.n==='ContaId');
  if(!had){ t.cols.splice(t.pk.length&&t.pk[0]==='Id'?1:0,0,col('ContaId','uuid')); }
  const fkCol=(t.fks.find(f=>f.col!=='ContaId')||{}).col;
  const extra=IDX_MANUAL[n]!==undefined?IDX_MANUAL[n]:(fkCol?[fkCol]:[]);
  const src=oldName[n]||n;
  const existe=idxs.some(i=>i.t===src&&i.c[0]==='ContaId');
  tenant[n]={had,idx:['ContaId',...extra],unique:UNIQUE_CONTA.has(n),existe:had&&existe};
}
const proposta=mk(P);
// ContaId vira FK para Contas em todas
const DATA_NEW=new Set(['Planos','RecursosPlano','AlteracoesAssinatura','Contas','MembrosConta','GruposAcesso','PermissoesGrupo','EventosMembros','Assinaturas','CobrancasAssinatura','EventosWebhookAsaas','DocumentosTrial','CodigosAcessoCliente','SessoesLinkCliente']);
for(const [n,t] of Object.entries(proposta)) for(const c of t.cols){ const d=decCol[n+'.'+c.n]; if(d){ c.mudou=d; c.decisao=true; } }
for(const [n,t] of Object.entries(proposta)){ if(tenant[n]) t.tenant=tenant[n]; for(const c of t.cols) if(c.n==='ContaId'){ if(!c.fk){c.fk='Contas';c.on='RESTRICT';} c.t='uuid'; if(tenant[n]&&!tenant[n].had){c.novaTenant=true;c.mudou='coluna nova: tenant, FK para Contas';} else if(!c.mudou && !(DATA_NEW.has(n))) c.mudou='text → uuid com FK para Contas'; } }
const status={ // por tabela / coluna, só na proposta
  tables:{ClienteEventos:{s:'renomeada',de:'Vinculos',why:'Nome explícito da tabela de junção cliente ↔ evento, no padrão <Entidade1><Entidade2>.'},
    Contas:{s:'nova',why:'Nasce automaticamente quando o usuário assinante se cadastra (DonoUsuarioId = ele). É a "casa" dos dados e da assinatura: todo ContaId aponta para cá. Fica separada do usuário para o login continuar sendo só login, e para um dia ser possível transferir a conta sem mexer nos dados.'},
    MembrosConta:{s:'nova',why:'Quem entra na conta (SPEC-062). Tipo = Dono ou Membro; pode haver vários Donos (sócios) e sempre ao menos um. Membro tem um GrupoId que define o acesso; Dono não tem grupo e pode tudo. Entram por convite (Email + TokenConviteHash, 7 dias) e ganham UsuarioId ao aceitar. Só entram com a assinatura da conta em dia.'},
    Planos:{s:'nova',why:'Catálogo de planos que o Admin da plataforma mantém (RF-118). Publico = aparece para o Dono assinar; um plano não público (ex.: "Fundadores") só é atribuído pelo Admin. Padrao = plano do trial e da assinatura comum (Pro, R$ 179). Mudar o preço vale para assinaturas novas.'},
    RecursosPlano:{s:'nova',why:'O que cada plano libera (RF-119): uma linha por recurso, com limite opcional por mês (ex.: minutos de ligação com IA). A lista de recursos fica no código, porque cada recurso precisa de código que o verifique.'},
    AlteracoesAssinatura:{s:'nova',why:'Histórico de troca de plano, valor ou desconto: quem fez, quando, de quanto para quanto e por quê. Serve para o Admin e para suporte.'},
    GruposAcesso:{s:'nova',why:'Grupos que o Dono monta em Configurações → Grupos (RF-113). VeTodosEventos = alcance: todos os eventos ou só os atribuídos. Padrao marca Organizadores e Assistentes, criados com a conta. Não se apaga grupo com membros (FK restrict).'},
    PermissoesGrupo:{s:'nova',why:'Uma linha por módulo do grupo, com ver, editar e excluir. A lista de módulos fica no código (clientes, eventos, convidados, tarefas, agenda, funil, orçamentos e contratos, financeiro, fornecedores, modelos).'},
    CodigosAcessoCliente:{s:'nova',why:'Código de confirmação enviado por e-mail ou SMS antes de abrir o link do cliente. Guarda só o hash do código, expira em minutos e conta tentativas para bloquear força bruta.'},
    SessoesLinkCliente:{s:'nova',why:'Depois do código validado, o cliente recebe uma sessão curta e não precisa pedir código a cada clique.'},
    EventosMembros:{s:'nova',why:'Substitui EventosAssistentes: qualquer membro (organizador ou assistente) pode ser atribuído a eventos.'},
    Assinaturas:{s:'nova',why:'Uma assinatura por conta. PlanoId = plano atual. Valor = o que o Asaas cobra: o valor do plano, ou ValorPersonalizado, ou com DescontoPercentual até DescontoAte (RF-120).'},
    CobrancasAssinatura:{s:'nova',why:'Cada fatura gerada pelo Asaas.'},
    EventosWebhookAsaas:{s:'nova',why:'Log bruto dos webhooks; evita processar o mesmo evento duas vezes.'},
    DocumentosTrial:{s:'nova',why:'Impede um segundo trial com o mesmo CPF/CNPJ.'}},
  removed:{...removidas,Assistentes:'Absorvida por MembrosConta (Papel = Assistente).',EventosAssistentes:'Substituída por EventosMembros.','AspNetUsers.OrganizerId':'O vínculo usuário → conta passa a ser MembrosConta.'},
  newCols:['Perfis.AceiteTermosEm','Perfis.VersaoTermos','LinksCliente.ExigeCodigo']
};
const domains=DOMAINS.map(d=>({...d,t:[...d.t]}));
const dp=clone(domains);
const conta=dp.find(d=>d.id==='conta'); conta.t=conta.t.filter(n=>n!=='Assistentes'); conta.t.unshift('Contas','MembrosConta','GruposAcesso','PermissoesGrupo');
const ev=dp.find(d=>d.id==='eventos'); ev.t.push('CodigosAcessoCliente','SessoesLinkCliente'); ev.t=ev.t.map(n=>n==='Vinculos'?'ClienteEventos':n==='EventosAssistentes'?'EventosMembros':n);
dp.push({...SAAS,t:['Planos','RecursosPlano',...SAAS.t,'AlteracoesAssinatura']});
const data={hoje:{tables:hoje,domains},proposta:{tables:proposta,domains:dp},status};
fs.writeFileSync('data.json',JSON.stringify(data));
console.log((JSON.stringify(data).length/1024).toFixed(0)+'KB');
