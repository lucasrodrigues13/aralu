const fs = require('fs');
const cur = require('./schema.json');

// ---------- referências lógicas (colunas *Id sem FK no banco) ----------
const LOGICAL = {
  'Arquivos.ContaId': null,
  'Clientes.FotoId': 'Arquivos', 'Eventos.ImagemId': 'Arquivos', 'Perfis.FotoId': 'Arquivos', 'Fornecedores.FotoId': 'Arquivos',
  'ItemInspiracao.ArquivoId': 'Arquivos', 'AnexosTarefa.ArquivoId': 'Arquivos', 'OrcamentoFornecedor.AnexoId': 'Arquivos',
  'ContratosFunil.FundoArquivoId': 'Arquivos', 'ContratosFunil.LogoArquivoId': 'Arquivos', 'ContratosFunil.DocumentoArquivoId': 'Arquivos',
  'ContratosConta.FundoArquivoId': 'Arquivos', 'ContratosConta.LogoArquivoId': 'Arquivos', 'ContratosConta.WordArquivoId': 'Arquivos',
  'TarefasFunil.AnexoArquivoId': 'Arquivos', 'ContratosFornecedor.ComprovanteArquivoId': 'Arquivos',
  'ContratosFornecedor.ContratoAssinadoArquivoId': 'Arquivos', 'ParcelasContratoFornecedor.ComprovanteArquivoId': 'Arquivos',
  'ContratosFunil.OportunidadeId': 'Oportunidades', 'OrcamentosFunil.OportunidadeId': 'Oportunidades', 'TarefasFunil.OportunidadeId': 'Oportunidades',
  'LeadsRsvp.OportunidadeId': 'Oportunidades', 'LeadsRsvp.EventoId': 'Eventos', 'LeadsRsvp.ConviteId': 'Convites',
  'ContratosFunil.ModeloId': 'ContratosConta', 'OrcamentosFunil.ModeloId': 'ModelosOrcamentoFunil',
  'Oportunidades.ModeloServicoFunilId': 'ModelosServicoFunil', 'Oportunidades.ClienteId': 'Clientes',
  'BriefingsOportunidade.ModeloBriefingId': 'ModelosBriefing',
  'ServicoEvento.ServicoContaId': 'ServicosConta', 'ServicoModelo.ServicoContaId': 'ServicosConta',
  'FornecedorNoServico.FornecedorId': 'Fornecedores', 'Convites.PrincipalId': 'Convidados',
  'PresencasEvento.EventoId': 'Eventos', 'PresencasEvento.ConviteId': 'Convites',
  'Assistentes.UsuarioId': 'AspNetUsers', 'Clientes.UsuarioId': 'AspNetUsers', 'AspNetUsers.OrganizerId': 'AspNetUsers',
  'Tarefas.ResponsavelContaId': 'AspNetUsers', 'ComentariosTarefa.AutorContaId': 'AspNetUsers', 'ServicoEvento.FornecedorContaId': 'AspNetUsers',
};
const POLY = { 'VinculoModeloEvento.BibliotecaId': 'polimórfica (Tipo → modelo de briefing/cronograma/roteiro…)',
  'ResponsaveisTarefa.ReferenciaId': 'polimórfica (assistente/fornecedor/cliente)', 'ResponsaveisTarefaFunil.ReferenciaId': 'polimórfica',
  'ItensChecklistTarefa.ResponsavelReferenciaId': 'polimórfica' };

const DOMAINS = [
  { id: 'conta', nome: 'Identidade e conta', cor: '#6b5bd6', t: ['AspNetUsers','AspNetRoles','AspNetUserRoles','AspNetUserClaims','AspNetRoleClaims','AspNetUserLogins','AspNetUserTokens','Perfis','Assistentes','Arquivos'] },
  { id: 'eventos', nome: 'Clientes e eventos', cor: '#1f8a70', t: ['Clientes','Vinculos','Eventos','Tags','EventoTagConta','EventosAssistentes','Compromissos','LinksCliente','LinksPortaria'] },
  { id: 'convites', nome: 'Convites e RSVP', cor: '#c0567d', t: ['Convites','Convidados','PresencasEvento','ImportacoesConvidados'] },
  { id: 'tarefas', nome: 'Tarefas do evento', cor: '#d08a1c', t: ['Tarefas','ComentariosTarefa','ItensChecklistTarefa','ResponsaveisTarefa','AnexosTarefa'] },
  { id: 'fornec', nome: 'Serviços e fornecedores', cor: '#2f7dc0', t: ['ServicosConta','ServicoEvento','SubitemServico','FornecedorNoServico','ContratosFornecedor','ParcelasContratoFornecedor','Fornecedores','FornecedorServico','EmailFornecedor','TelefoneFornecedor','OrcamentoFornecedor'] },
  { id: 'modelos', nome: 'Modelos (biblioteca)', cor: '#7a8a2a', t: ['Modelos','ServicoModelo','TarefaModelo','ItensChecklistTarefaModelo','VinculoModeloEvento','ModelosBriefing','SecaoBriefing','PerguntaBriefing','ModelosCronograma','ItemCronograma','ModelosInspiracao','ItemInspiracao','ModelosMensagem','ModelosRoteiro','SecaoRoteiro','ItemRoteiro','ContratosConta'] },
  { id: 'funil', nome: 'Funil comercial', cor: '#b5453a', t: ['EstagiosFunil','Oportunidades','ContatoOportunidade','BriefingsOportunidade','ItensBriefingOportunidade','TarefasFunil','ResponsaveisTarefaFunil','OrcamentosFunil','ParcelasOrcamento','RespostasPropostaFunil','ContratosFunil','ParcelasContrato','RecebimentosParcela','ModelosOrcamentoFunil','ModelosServicoFunil','LeadsRsvp','MetricasRsvpFunil'] },
];
const SAAS = { id: 'saas', nome: 'Assinatura SaaS (nova)', cor: '#12a150', t: ['Assinaturas','CobrancasAssinatura','EventosWebhookAsaas','DocumentosTrial'] };

// ---------- estado futuro ----------
const fut = JSON.parse(JSON.stringify(cur));
const NEW_TABLES = new Set(SAAS.t);
const NEW_COLS = new Set(['Perfis.AceiteTermosEm', 'Perfis.VersaoTermos']);
const col = (n, t, nn = true) => ({ n, t, nn });
fut.Assinaturas = { pk: ['Id'], uniq: ['ContaId', 'AsaasSubscriptionId'], cols: [
  col('Id','uuid'), col('ContaId','text'), col('Situacao','text'), col('TrialIniciaEm','timestamp with time zone'), col('TrialTerminaEm','timestamp with time zone'),
  col('AsaasCustomerId','text',false), col('AsaasSubscriptionId','text',false), col('FormaPagamento','text',false), col('Valor','numeric(12,2)'),
  col('ProximoVencimento','date',false), col('PagoAte','date',false), col('CanceladaEm','timestamp with time zone',false),
  col('CriadaEm','timestamp with time zone'), col('AtualizadaEm','timestamp with time zone')],
  fks: [{ col: 'ContaId', ref: 'AspNetUsers', on: 'RESTRICT' }] };
fut.CobrancasAssinatura = { pk: ['Id'], uniq: ['AsaasPaymentId'], cols: [
  col('Id','uuid'), col('AssinaturaId','uuid'), col('AsaasPaymentId','text'), col('Valor','numeric(12,2)'), col('Vencimento','date'),
  col('Status','text'), col('FormaPagamento','text',false), col('PagaEm','timestamp with time zone',false), col('LinkFatura','text',false), col('CriadaEm','timestamp with time zone')],
  fks: [{ col: 'AssinaturaId', ref: 'Assinaturas', on: 'RESTRICT' }] };
fut.EventosWebhookAsaas = { pk: ['Id'], uniq: ['AsaasEventId'], cols: [
  col('Id','uuid'), col('AsaasEventId','text'), col('Tipo','text'), col('Payload','jsonb'), col('RecebidoEm','timestamp with time zone'),
  col('ProcessadoEm','timestamp with time zone',false), col('Tentativas','integer'), col('Erro','text',false)], fks: [] };
fut.DocumentosTrial = { pk: ['Id'], uniq: ['DocumentoHash'], cols: [
  col('Id','uuid'), col('DocumentoHash','text'), col('ContaId','text'), col('UsadoEm','timestamp with time zone')],
  fks: [{ col: 'ContaId', ref: 'AspNetUsers', on: 'RESTRICT' }] };
fut.Perfis.cols.push(col('AceiteTermosEm','timestamp with time zone',false), col('VersaoTermos','text',false));

// ---------- helpers ----------
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const shortType = t => t.replace('timestamp with time zone','timestamptz').replace('character varying','varchar').replace('integer','int').replace('boolean','bool').replace('numeric(12,2)','numeric');
const domOf = n => [...DOMAINS, SAAS].find(d => d.t.includes(n));

function edgesOf(S, name) {
  const t = S[name], out = [];
  for (const f of t.fks) out.push({ from: name, col: f.col, to: f.ref, kind: 'fk', on: f.on });
  for (const c of t.cols) {
    const k = name + '.' + c.n;
    if (LOGICAL[k] && !t.fks.some(f => f.col === c.n)) out.push({ from: name, col: c.n, to: LOGICAL[k], kind: 'log' });
  }
  return out;
}

const RH = 15, HH = 26, BW = 262;
function boxH(t) { return HH + t.cols.length * RH + 6; }

// desenha um domínio como ER detalhado
function domainER(S, dom, opts = {}) {
  const names = dom.t.filter(n => S[n]);
  const set = new Set(names);
  const edges = names.flatMap(n => edgesOf(S, n)).filter(e => e.to !== e.from);
  const inner = edges.filter(e => set.has(e.to));
  const outer = edges.filter(e => !set.has(e.to) && S[e.to]);
  // profundidade: pais à esquerda
  const depth = {};
  const calc = (n, seen = new Set()) => {
    if (depth[n] != null) return depth[n];
    if (seen.has(n)) return 0; seen.add(n);
    const ps = inner.filter(e => e.from === n && e.to !== n).map(e => e.to);
    return depth[n] = ps.length ? 1 + Math.max(...ps.map(p => calc(p, seen))) : 0;
  };
  names.forEach(n => calc(n));
  const maxH = opts.maxH || 1000;
  const cols = [];
  const byDepth = {};
  names.forEach(n => (byDepth[depth[n]] ||= []).push(n));
  Object.keys(byDepth).sort((a, b) => a - b).forEach(d => {
    let colArr = [], h = 0;
    for (const n of byDepth[d]) {
      const bh = boxH(S[n]) + 34;
      if (h + bh > maxH && colArr.length) { cols.push(colArr); colArr = []; h = 0; }
      colArr.push(n); h += bh;
    }
    cols.push(colArr);
  });
  const pos = {};
  const GAP = 120;
  cols.forEach((c, i) => { let y = 20; c.forEach(n => { pos[n] = { x: 20 + i * (BW + GAP), y, ci: i }; y += boxH(S[n]) + 34; }); });
  // fantasmas externos
  const ghosts = [...new Set(outer.map(e => e.to))];
  const gx = 20 + cols.length * (BW + GAP);
  ghosts.forEach((g, i) => { pos[g] = { x: gx, y: 20 + i * 46, ghost: true, ci: cols.length }; });
  const W = gx + (ghosts.length ? 200 : 0) + 20;
  const H = Math.max(...Object.entries(pos).map(([n, p]) => p.y + (p.ghost ? 34 : boxH(S[n])))) + 30;

  let svg = '', top = '';
  const rowY = (n, c) => { const i = S[n].cols.findIndex(x => x.n === c); return pos[n].y + HH + (i < 0 ? 0 : i) * RH + RH / 2 + 2; };
  // arestas
  for (const e of [...inner, ...outer]) {
    const a = pos[e.from], b = pos[e.to]; if (!a || !b) continue;
    const y1 = rowY(e.from, e.col);
    const y2 = b.ghost ? b.y + 17 : rowY(e.to, 'Id');
    let x1, x2;
    if (b.x + (b.ghost ? 180 : BW) < a.x) { x1 = a.x; x2 = b.x + (b.ghost ? 180 : BW); }
    else if (b.x > a.x + BW) { x1 = a.x + BW; x2 = b.x; }
    else { x1 = a.x + BW; x2 = b.x + (b.ghost ? 180 : BW); }
    const dx = Math.max(50, Math.abs(x2 - x1) / 2);
    const sameSide = x1 === a.x + BW && x2 === b.x + (b.ghost ? 180 : BW);
    const c1 = x1 + (x1 === a.x ? -dx : dx), c2 = sameSide ? x2 + dx : x2 + (x2 > x1 ? -dx : dx);
    const isNew = NEW_TABLES.has(e.from) || NEW_TABLES.has(e.to);
    const skip = Math.abs(a.ci - b.ci) > 1;
    let out = '';
    const color = isNew ? '#12a150' : e.kind === 'fk' ? '#475569' : '#d97706';
    out += `<path d="M${x1},${y1} C${c1},${y1} ${c2},${y2} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="${isNew ? 2.2 : 1.4}" ${e.kind === 'log' ? 'stroke-dasharray="5 4"' : ''} opacity="0.85"/>`;
    out += `<circle cx="${x2}" cy="${y2}" r="3.2" fill="${color}"/>`;
    // pé de galinha no lado N
    const dir = x1 === a.x ? -1 : 1;
    out += `<path d="M${x1},${y1 - 5} L${x1 + dir * 9},${y1} L${x1},${y1 + 5}" fill="none" stroke="${color}" stroke-width="1.3"/>`;
    if (e.kind === 'fk' && e.on && e.on !== 'CASCADE') out += `<text x="${x1 + dir * 12}" y="${y1 - 4}" font-size="8.5" fill="${color}" text-anchor="${dir < 0 ? 'end' : 'start'}">${esc(e.on.toLowerCase())}</text>`;
    if (skip) top += `<g opacity="0.55">${out}</g>`; else svg += out;
  }
  // caixas
  for (const n of names) {
    const t = S[n], p = pos[n], isNewT = NEW_TABLES.has(n);
    const fkc = new Set(t.fks.map(f => f.col));
    const logc = new Set(t.cols.filter(c => LOGICAL[n + '.' + c.n] && !fkc.has(c.n)).map(c => c.n));
    const uq = new Set(t.uniq.filter(u => !u.includes(',')));
    const h = boxH(t);
    svg += `<g><rect x="${p.x}" y="${p.y}" width="${BW}" height="${h}" rx="7" fill="#fff" stroke="${isNewT ? '#12a150' : '#cbd5e1'}" stroke-width="${isNewT ? 2.5 : 1}"/>`;
    svg += `<rect x="${p.x}" y="${p.y}" width="${BW}" height="${HH}" rx="7" fill="${isNewT ? '#12a150' : dom.cor}"/><rect x="${p.x}" y="${p.y + HH - 7}" width="${BW}" height="7" fill="${isNewT ? '#12a150' : dom.cor}"/>`;
    svg += `<text x="${p.x + 10}" y="${p.y + 17.5}" font-size="12.5" font-weight="700" fill="#fff">${esc(n)}</text>`;
    if (isNewT) svg += `<text x="${p.x + BW - 10}" y="${p.y + 17}" font-size="9.5" font-weight="800" fill="#fff" text-anchor="end">NOVA</text>`;
    else if (t.cols.some(c => c.n === 'ContaId')) svg += `<text x="${p.x + BW - 10}" y="${p.y + 17}" font-size="9" fill="#ffffffcc" text-anchor="end">tenant</text>`;
    t.cols.forEach((c, i) => {
      const y = p.y + HH + i * RH + 2;
      const isNewC = NEW_COLS.has(n + '.' + c.n) || isNewT;
      if (NEW_COLS.has(n + '.' + c.n)) svg += `<rect x="${p.x + 2}" y="${y}" width="${BW - 4}" height="${RH}" fill="#dcfce7"/>`;
      let badge = '', bc = '';
      if (t.pk.includes(c.n)) { badge = 'PK'; bc = '#b45309'; }
      else if (fkc.has(c.n)) { badge = 'FK'; bc = '#475569'; }
      else if (logc.has(c.n)) { badge = 'ref'; bc = '#d97706'; }
      else if (POLY[n + '.' + c.n]) { badge = 'poli'; bc = '#9333ea'; }
      if (badge) svg += `<text x="${p.x + 8}" y="${y + 11}" font-size="8.5" font-weight="800" fill="${bc}">${badge}</text>`;
      svg += `<text x="${p.x + 30}" y="${y + 11}" font-size="10.5" fill="${isNewC && !isNewT ? '#166534' : '#0f172a'}" font-weight="${t.pk.includes(c.n) || isNewC && !isNewT ? 700 : 400}">${esc(c.n)}${uq.has(c.n) ? ' <tspan fill="#2563eb" font-size="8.5" font-weight="700">UQ</tspan>' : ''}</text>`;
      svg += `<text x="${p.x + BW - 8}" y="${y + 11}" font-size="9.5" fill="#64748b" text-anchor="end">${esc(shortType(c.t))}${c.nn ? '' : '?'}</text>`;
    });
    svg += `</g>`;
  }
  for (const g of ghosts) {
    const p = pos[g], d = domOf(g);
    svg += `<rect x="${p.x}" y="${p.y}" width="180" height="34" rx="7" fill="#f8fafc" stroke="${d ? d.cor : '#94a3b8'}" stroke-dasharray="4 3"/>`;
    svg += `<text x="${p.x + 10}" y="${p.y + 15}" font-size="11" font-weight="700" fill="#334155">${esc(g)}</text><text x="${p.x + 10}" y="${p.y + 27}" font-size="8.5" fill="${d ? d.cor : '#64748b'}">${esc(d ? d.nome : '')}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, sans-serif">${svg}${top}</svg>`;
}

// mapa geral (domínios)
function overview(S, doms) {
  const L = { conta: [560, 40], eventos: [560, 360], convites: [1060, 360], tarefas: [1060, 640], fornec: [60, 640], modelos: [60, 40], funil: [1060, 40], saas: [560, 700] };
  const CW = 420, chipH = 19;
  const boxes = {};
  let svg = '';
  const chipPos = {};
  for (const d of doms) {
    const [x, y] = L[d.id]; const names = d.t.filter(n => S[n]);
    const perRow = 2, rows = Math.ceil(names.length / perRow);
    const h = 44 + rows * (chipH + 6) + 8;
    boxes[d.id] = { x, y, w: CW, h };
    const isNew = d.id === 'saas';
    svg += `<rect x="${x}" y="${y}" width="${CW}" height="${h}" rx="14" fill="${d.cor}12" stroke="${d.cor}" stroke-width="${isNew ? 3 : 1.6}" ${isNew ? '' : ''}/>`;
    svg += `<text x="${x + 16}" y="${y + 26}" font-size="16" font-weight="800" fill="${d.cor}">${esc(d.nome)}</text><text x="${x + CW - 16}" y="${y + 26}" font-size="11" fill="${d.cor}" text-anchor="end">${names.length} tabelas</text>`;
    names.forEach((n, i) => {
      const cx = x + 12 + (i % perRow) * ((CW - 24) / perRow), cy = y + 40 + Math.floor(i / perRow) * (chipH + 6);
      const nw = (CW - 24) / perRow - 8; chipPos[n] = { x: cx + nw / 2, y: cy + chipH / 2 };
      const tenant = S[n].cols.some(c => c.n === 'ContaId');
      svg += `<rect x="${cx}" y="${cy}" width="${nw}" height="${chipH}" rx="5" fill="#fff" stroke="${NEW_TABLES.has(n) ? '#12a150' : '#e2e8f0'}" stroke-width="${NEW_TABLES.has(n) ? 2 : 1}"/>`;
      svg += `<text x="${cx + 8}" y="${cy + 13.5}" font-size="11" fill="#0f172a" font-weight="${NEW_TABLES.has(n) ? 800 : 500}">${esc(n)}</text>`;
      if (tenant) svg += `<circle cx="${cx + nw - 9}" cy="${cy + chipH / 2}" r="3.5" fill="${d.cor}"/>`;
    });
  }
  // arestas agregadas entre domínios
  const agg = {};
  for (const d of doms) for (const n of d.t.filter(n => S[n])) for (const e of edgesOf(S, n)) {
    const dt = domOf(e.to); if (!dt || dt.id === d.id || !doms.includes(dt)) continue;
    const k = [d.id, dt.id].sort().join('|'); (agg[k] ||= { fk: 0, log: 0, a: d.id, b: dt.id }); agg[k][e.kind]++;
  }
  let edg = '', lbl = '';
  const center = b => [b.x + b.w / 2, b.y + b.h / 2];
  for (const k in agg) {
    const g = agg[k]; const A = boxes[g.a], B = boxes[g.b];
    let [x1, y1] = center(A), [x2, y2] = center(B);
    const clipB = (b, cx, cy, tx, ty) => { const dx = tx - cx, dy = ty - cy; const k = Math.min(Math.abs((b.w / 2) / (dx || 1e-9)), Math.abs((b.h / 2) / (dy || 1e-9))); return [cx + dx * k, cy + dy * k]; };
    const [ax, ay] = clipB(A, x1, y1, x2, y2), [bx, by] = clipB(B, x2, y2, x1, y1);
    const isNew = g.a === 'saas' || g.b === 'saas';
    const tot = g.fk + g.log;
    edg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${isNew ? '#12a150' : '#64748b'}" stroke-width="${2 + tot * 0.8}" opacity="0.35" ${g.fk === 0 ? 'stroke-dasharray="10 7"' : ''}/>`;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    lbl += `<g><rect x="${mx - 46}" y="${my - 12}" width="92" height="24" rx="12" fill="#fff" stroke="${isNew ? '#12a150' : '#94a3b8'}"/><text x="${mx}" y="${my + 4}" font-size="10.5" text-anchor="middle" fill="#334155"><tspan font-weight="700">${g.fk}</tspan> FK · <tspan font-weight="700" fill="#d97706">${g.log}</tspan> ref</text></g>`;
  }
  return `<svg viewBox="0 0 1540 ${doms.some(d => d.id === 'saas') ? 920 : 920}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, sans-serif">${edg}${svg}${lbl}</svg>`;
}

// ---------- fluxos ----------
function flowsSVG() {
  const lanes = [
    { id: 'u', nome: 'Pessoa (Organizer / Admin)', cor: '#6b5bd6' },
    { id: 'api', nome: 'API Aralu', cor: '#0f172a' },
    { id: 'db', nome: 'Banco (tabelas)', cor: '#12a150' },
    { id: 'as', nome: 'Asaas', cor: '#2f7dc0' },
    { id: 'job', nome: 'Job diário', cor: '#d08a1c' },
  ];
  const LW = 1500, LH = 128, top = 10, left = 170;
  let s = '';
  lanes.forEach((l, i) => {
    s += `<rect x="0" y="${top + i * LH}" width="${LW + left}" height="${LH}" fill="${i % 2 ? '#f8fafc' : '#fff'}"/>`;
    s += `<rect x="0" y="${top + i * LH}" width="${left - 10}" height="${LH}" fill="${l.cor}12"/><text x="14" y="${top + i * LH + LH / 2 + 5}" font-size="13" font-weight="800" fill="${l.cor}">${esc(l.nome)}</text>`;
  });
  const laneY = id => top + lanes.findIndex(l => l.id === id) * LH + LH / 2;
  const steps = [
    // [lane, x, label, sub, flowNo]
    ['u', 0, 'Cadastra conta', 'POST /api/conta/cadastro', 1],
    ['api', 0, 'Cria usuário + trial', 'CadastroServico', 1],
    ['db', 0, 'AspNetUsers · Perfis', 'Assinaturas: Trial, +14d', 1],
    ['u', 1, 'Usa o sistema', 'qualquer rota autenticada', 2],
    ['api', 1, 'Filtro de acesso', 'lê Assinaturas (cache)', 2],
    ['db', 1, 'Assinaturas', 'SELECT Situacao, prazos', 2],
    ['u', 2, 'Clica “Assinar”', 'POST /api/assinatura', 3],
    ['api', 2, 'Valida documento', 'Perfis.Documento → hash', 3],
    ['db', 2, 'DocumentosTrial', 'INSERT · Assinaturas.Asaas*', 3],
    ['as', 2, 'POST /customers', 'POST /subscriptions', 3],
    ['as', 3, 'Gera e cobra fatura', 'PAYMENT_CREATED / CONFIRMED', 4],
    ['api', 3, 'Webhook /asaas', 'valida token · grava · 200', 4],
    ['db', 3, 'EventosWebhookAsaas', '→ CobrancasAssinatura · Assinaturas', 4],
    ['as', 4, 'Atraso / cancelamento', 'OVERDUE · SUBSCRIPTION_DELETED', 5],
    ['db', 4, 'Assinaturas', 'Inadimplente / Cancelada', 5],
    ['job', 4, 'Varre prazos', 'trial vencido → Expirada', 6],
    ['job', 3, 'Envia e-mails', 'dias 11, 13, 14 · atraso', 6],
    ['u', 4, 'Admin estende trial', 'PUT /api/admin/assinaturas', 7],
  ];
  const colX = i => left + 30 + i * 295;
  const BWf = 250, BHf = 62;
  const flowCol = ['', '#6b5bd6', '#0f766e', '#2f7dc0', '#12a150', '#b5453a', '#d08a1c', '#7c3aed'];
  const pos = steps.map(([l, c]) => ({ x: colX(c), y: laneY(l) - BHf / 2 }));
  // conexões
  const links = [[0,1],[1,2],[3,4],[4,5],[6,7],[7,8],[7,9],[9,8],[10,11],[11,12],[13,12],[12,14],[15,14],[17,14]];
  let e = '';
  links.forEach(([a, b]) => {
    const A = pos[a], B = pos[b], col = flowCol[steps[b][4]];
    let x1 = A.x + BWf / 2, y1 = A.y + BHf, x2 = B.x + BWf / 2, y2 = B.y;
    if (A.y > B.y) { y1 = A.y; y2 = B.y + BHf; }
    if (Math.abs(A.y - B.y) < 5) { x1 = A.x + BWf; y1 = A.y + BHf / 2; x2 = B.x; y2 = y1; }
    if (A.x !== B.x && Math.abs(A.y - B.y) > 5) { x1 = A.x + (B.x > A.x ? BWf : 0); y1 = A.y + BHf / 2; x2 = B.x + BWf / 2; }
    e += `<path d="M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}" fill="none" stroke="${col}" stroke-width="2.2" marker-end="url(#ar${steps[b][4]})"/>`;
  });
  let defs = '<defs>' + flowCol.map((c, i) => i ? `<marker id="ar${i}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>` : '').join('') + '</defs>';
  steps.forEach(([l, c, lab, sub, f], i) => {
    const p = pos[i], col = flowCol[f];
    s += `<rect x="${p.x}" y="${p.y}" width="${BWf}" height="${BHf}" rx="10" fill="#fff" stroke="${col}" stroke-width="2"/>`;
    s += `<circle cx="${p.x + 18}" cy="${p.y + 20}" r="11" fill="${col}"/><text x="${p.x + 18}" y="${p.y + 24.5}" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">${f}</text>`;
    s += `<text x="${p.x + 36}" y="${p.y + 25}" font-size="13" font-weight="700" fill="#0f172a">${esc(lab)}</text>`;
    s += `<text x="${p.x + 14}" y="${p.y + 47}" font-size="10.5" fill="#475569">${esc(sub)}</text>`;
  });
  return `<svg viewBox="0 0 ${left + 30 + 5 * 295} ${top + lanes.length * LH + 10}" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, sans-serif">${defs}${s}${e}</svg>`;
}

function stateSVG() {
  const S = [
    ['Trial', 40, 140, '#6b5bd6'], ['Ativa', 470, 140, '#12a150'], ['Inadimplente', 900, 140, '#d08a1c'],
    ['Expirada', 40, 400, '#b5453a'], ['Cancelada', 900, 400, '#64748b'],
  ];
  const P = Object.fromEntries(S.map(([n, x, y]) => [n, { x, y }]));
  const W = 230, H = 64;
  const T = [
    ['Trial', 'Ativa', 'PAYMENT_CONFIRMED / RECEIVED', -14, [355, 122]],
    ['Trial', 'Expirada', 'Job diário: TrialTerminaEm < agora', 0, [300, 230]],
    ['Ativa', 'Inadimplente', 'PAYMENT_OVERDUE', -16, [800, 124]],
    ['Inadimplente', 'Ativa', 'PAYMENT_CONFIRMED / RECEIVED', 18, [800, 206]],
    ['Inadimplente', 'Cancelada', 'carência vencida ou', 0, [1170, 296], 'SUBSCRIPTION_INACTIVATED'],
    ['Ativa', 'Cancelada', 'Usuário cancela →', -14, [930, 280], 'SUBSCRIPTION_DELETED'],
    ['Expirada', 'Ativa', 'Assina e paga (sem novo trial)', 0, [450, 345]],
    ['Cancelada', 'Ativa', 'Reassina e paga', 14, [700, 345]],
  ];
  let s = '<defs><marker id="st" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#334155"/></marker></defs>';
  T.forEach(([a, b, lab, off, lp, lab2]) => {
    const A = P[a], B = P[b];
    let x1 = A.x + W / 2, y1 = A.y + H / 2, x2 = B.x + W / 2, y2 = B.y + H / 2;
    // recorta na borda
    const clip = (cx, cy, tx, ty) => { const dx = tx - cx, dy = ty - cy; const k = Math.min(Math.abs((W / 2) / (dx || 1e-9)), Math.abs((H / 2) / (dy || 1e-9))); return [cx + dx * k, cy + dy * k]; };
    [x1, y1] = clip(x1, y1 + off, x2, y2 + off); [x2, y2] = clip(B.x + W / 2, B.y + H / 2 + off, A.x + W / 2, A.y + H / 2 + off);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#334155" stroke-width="1.8" marker-end="url(#st)"/>`;
    const [mx, my] = lp;
    if (lab2) s += `<text x="${mx}" y="${my + 15}" font-size="11" text-anchor="middle" fill="#0f172a" paint-order="stroke" stroke="#fff" stroke-width="5">${esc(lab2)}</text>`;
    s += `<text x="${mx}" y="${my}" font-size="11" text-anchor="middle" fill="#0f172a" paint-order="stroke" stroke="#fff" stroke-width="5">${esc(lab)}</text>`;
  });
  s += `<text x="20" y="40" font-size="12" fill="#475569">● Cadastro cria sempre em <tspan font-weight="700">Trial</tspan> (TrialTerminaEm = cadastro + 14 dias). Acesso liberado: Trial no prazo · Ativa · Inadimplente/Cancelada até PagoAte (+ carência 3 dias).</text>`;
  S.forEach(([n, x, y, c]) => {
    s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="32" fill="${c}" />`;
    s += `<text x="${x + W / 2}" y="${y + H / 2 + 6}" font-size="17" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>`;
  });
  return `<svg viewBox="0 0 1300 490" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, sans-serif">${s}</svg>`;
}

// flows do produto atual
function productFlowSVG() {
  const nodes = {
    lead: ['Formulário público / RSVP', 'LeadsRsvp · Oportunidades', 20, 80, '#b5453a'],
    opo: ['Oportunidade no funil', 'Oportunidades · EstagiosFunil', 420, 80, '#b5453a'],
    orc: ['Orçamento / proposta', 'OrcamentosFunil · ParcelasOrcamento', 820, 80, '#b5453a'],
    resp: ['Cliente responde proposta', 'RespostasPropostaFunil', 1220, 80, '#b5453a'],
    ctr: ['Contrato', 'ContratosFunil · ParcelasContrato', 820, 270, '#b5453a'],
    rec: ['Recebimento de parcela', 'RecebimentosParcela', 1220, 270, '#b5453a'],
    evt: ['Evento', 'Eventos · Vinculos · Clientes', 420, 270, '#1f8a70'],
    mod: ['Modelo aplicado', 'Modelos → Tarefas · ServicoEvento', 20, 270, '#7a8a2a'],
    tar: ['Tarefas do evento', 'Tarefas · Checklist · Responsáveis', 20, 460, '#d08a1c'],
    srv: ['Serviços e fornecedores', 'ServicoEvento · ContratosFornecedor', 420, 460, '#2f7dc0'],
    cvt: ['Convites e convidados', 'Convites · Convidados', 820, 460, '#c0567d'],
    pre: ['Portaria (dia do evento)', 'LinksPortaria · PresencasEvento', 1220, 460, '#c0567d'],
  };
  const E = [
    ['lead', 'opo', 'GerarOportunidadeAsync / CriarLeadPublicoAsync'],
    ['opo', 'orc', 'OrcamentoFunil.CriarAsync'],
    ['orc', 'resp', 'link público → RegistrarRespostaAsync'],
    ['orc', 'ctr', 'ContratoFunil.CriarAsync'],
    ['ctr', 'rec', 'ReceberAsync'],
    ['opo', 'evt', 'EventoServico.CriarAsync (Oportunidade.EventoId)'],
    ['mod', 'evt', 'importação de modelo'],
    ['evt', 'tar', 'TarefaServico / AdicionarEmMassa'],
    ['evt', 'srv', 'FornecedorServico'],
    ['evt', 'cvt', 'ConviteServico (manual / planilha)'],
    ['cvt', 'pre', 'check-in pelo link de portaria'],
  ];
  const W = 290, H = 70; const pfLbl = [];
  let s = '<defs><marker id="pf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#334155"/></marker></defs>';
  E.forEach(([a, b, lab]) => {
    const A = nodes[a], B = nodes[b];
    let ax = A[2] + W / 2, ay = A[3] + H / 2, bx = B[2] + W / 2, by = B[3] + H / 2;
    if (Math.abs(ay - by) < 5) { ax = A[2] + (bx > ax ? W : 0); bx = B[2] + (bx > ax ? 0 : W); }
    else { ay = A[3] + (by > ay ? H : 0); by = B[3] + (by > ay ? 0 : H); }
    s += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#334155" stroke-width="1.8" marker-end="url(#pf)"/>`;
    const horiz = Math.abs(A[3] - B[3]) < 5;
    s += `<text x="${(ax + bx) / 2}" y="${horiz ? A[3] - 8 : (ay + by) / 2 - 6}" font-size="10.5" text-anchor="middle" fill="#0f172a" paint-order="stroke" stroke="#fff" stroke-width="5">${esc(lab)}</text>`;
  });
  for (const k in nodes) {
    const [t, sub, x, y, c] = nodes[k];
    s += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="10" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="${x}" y="${y}" width="7" height="${H}" rx="3" fill="${c}"/>`;
    s += `<text x="${x + 18}" y="${y + 28}" font-size="14" font-weight="700" fill="#0f172a">${esc(t)}</text><text x="${x + 18}" y="${y + 50}" font-size="11" fill="#475569">${esc(sub)}</text>`;
  }
  return `<svg viewBox="0 0 1530 560" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Segoe UI, sans-serif">${s}</svg>`;
}

// ---------- estatísticas ----------
const all = Object.keys(cur);
const fkCount = all.reduce((a, n) => a + cur[n].fks.length, 0);
const logCount = all.reduce((a, n) => a + edgesOf(cur, n).filter(e => e.kind === 'log').length, 0);
const tenantTables = all.filter(n => cur[n].cols.some(c => c.n === 'ContaId'));

const legend = `<div class="legend">
 <span><b class="b pk">PK</b> chave primária</span><span><b class="b fk">FK</b> chave estrangeira real</span>
 <span><b class="b ref">ref</b> referência só no código (sem FK)</span><span><b class="b poli">poli</b> referência polimórfica</span>
 <span><b class="b uq">UQ</b> índice único</span><span><i>?</i> aceita nulo</span>
 <span><svg width="44" height="10"><line x1="0" y1="5" x2="44" y2="5" stroke="#475569" stroke-width="2"/></svg> FK</span>
 <span><svg width="44" height="10"><line x1="0" y1="5" x2="44" y2="5" stroke="#d97706" stroke-width="2" stroke-dasharray="5 4"/></svg> ref lógica</span>
 <span><svg width="44" height="10"><line x1="0" y1="5" x2="44" y2="5" stroke="#12a150" stroke-width="3"/></svg> novo</span>
 <span><span class="sw new"></span> tabela/coluna nova</span></div>`;

const page = (title, kicker, body, note = '') => `<section class="page"><header><div class="kicker">${kicker}</div><h1>${title}</h1>${note ? `<p class="note">${note}</p>` : ''}</header><div class="body">${body}</div><footer>Aralu · modelo de dados · gerado de deploy/schema.sql (migração 20261125221155_MidiasDaPaginaDeAceite)</footer></section>`;

let html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Aralu — Modelo de dados atual e SaaS</title><style>
@page { size: A3 landscape; margin: 0 }
* { box-sizing: border-box } body { margin: 0; font-family: Inter, "Segoe UI", sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.page { width: 420mm; height: 297mm; padding: 14mm 16mm 10mm; display: flex; flex-direction: column; page-break-after: always; overflow: hidden }
header .kicker { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #64748b; font-weight: 700 }
header h1 { margin: 4px 0 6px; font-size: 30px } .note { margin: 0 0 8px; color: #475569; font-size: 13.5px; max-width: 1350px; line-height: 1.45 }
.body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px } .body > svg { flex: 1; min-height: 0; width: 100%; height: 100% }
footer { font-size: 10px; color: #94a3b8; padding-top: 6px; border-top: 1px solid #e2e8f0 }
.legend { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 11.5px; color: #334155; align-items: center }
.legend span { display: inline-flex; align-items: center; gap: 6px } .b { font-size: 10px; padding: 1px 5px; border-radius: 4px; color: #fff }
.b.pk{background:#b45309}.b.fk{background:#475569}.b.ref{background:#d97706}.b.poli{background:#9333ea}.b.uq{background:#2563eb}
.sw { width: 18px; height: 12px; border-radius: 3px; display: inline-block } .sw.new { background: #dcfce7; border: 2px solid #12a150 }
.cover { justify-content: center } .cover h1 { font-size: 54px; margin: 8px 0 } .cover .sub { font-size: 20px; color: #475569; max-width: 1100px; line-height: 1.5 }
.kpis { display: flex; gap: 18px; margin: 34px 0 } .kpi { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 22px; min-width: 190px }
.kpi b { display: block; font-size: 38px } .kpi span { color: #64748b; font-size: 13px }
.toc { columns: 2; font-size: 15px; line-height: 1.9; color: #334155; max-width: 1100px }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; font-size: 13.5px; line-height: 1.5 }
.card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px } .card h3 { margin: 0 0 8px; font-size: 16px }
.card ul { margin: 0; padding-left: 18px } .card li { margin: 3px 0 }
.tag { display: inline-block; font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px; color: #fff; margin-right: 6px }
.r { background: #b91c1c } .a { background: #d97706 } .g { background: #12a150 }
table.t { border-collapse: collapse; width: 100%; font-size: 12.5px } table.t td, table.t th { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top } table.t th { background: #f8fafc }
code { font-family: Consolas, monospace; font-size: .92em; background: #f1f5f9; padding: 0 4px; border-radius: 3px }
</style></head><body>`;

// capa
html += `<section class="page cover"><div class="kicker" style="font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#64748b;font-weight:700">Aralu · banco de dados · 25/11/2026</div>
<h1>Modelo de dados: hoje e com o SaaS</h1>
<p class="sub">Retrato fiel do PostgreSQL de produção (reconstruído de <code>deploy/schema.sql</code>, todas as migrações aplicadas) e o mesmo banco depois do plano SaaS: trial de 14 dias, plano único de R$ 179/mês e cobrança pelo Asaas.</p>
<div class="kpis"><div class="kpi"><b>${all.length}</b><span>tabelas hoje</span></div><div class="kpi"><b>${fkCount}</b><span>FKs reais</span></div>
<div class="kpi"><b style="color:#d97706">${logCount}</b><span>referências sem FK</span></div><div class="kpi"><b>${tenantTables.length}</b><span>tabelas com ContaId (tenant)</span></div>
<div class="kpi" style="border-color:#12a150"><b style="color:#12a150">+4</b><span>tabelas novas · +2 colunas</span></div></div>
<div class="toc"><div>1. Mapa geral — hoje</div><div>2–8. ER detalhado por domínio — hoje</div><div>9. Mapa geral — com SaaS</div><div>10. ER de Conta + Assinatura — com SaaS</div>
<div>11. Fluxo de dados da assinatura (quem move cada dado)</div><div>12. Ciclo de vida da assinatura</div><div>13. Fluxo de dados do produto atual</div><div>14. Prontidão para produção</div></div>
<div style="margin-top:30px">${legend}</div></section>`;

html += page('Mapa geral — estado atual', 'Hoje · visão por domínio', overview(cur, DOMAINS),
  `Cada caixa é um domínio; cada chip, uma tabela. O ponto colorido marca tabela com <code>ContaId</code> (dados separados por assessoria). As linhas somam as ligações entre domínios: <b>FK</b> = chave estrangeira no banco; <b style="color:#d97706">ref</b> = a ligação só existe no código. <code>ContaId</code> aponta para <code>AspNetUsers.Id</code> em ${tenantTables.length} tabelas, mas <b>nenhuma</b> delas tem FK — essas ligações não estão desenhadas para não poluir o mapa.`);

for (const d of DOMAINS) {
  html += page(d.nome, 'Hoje · ER detalhado', legend + domainER(cur, d, { maxH: 960 }),
    `Tabelas à esquerda são “pais”; à direita, as que dependem delas. Caixas tracejadas na borda direita são tabelas de outros domínios. O pé de galinha marca o lado N da relação; rótulos <i>restrict</i>/<i>set null</i> indicam o ON DELETE quando não é cascade.`);
}

html += page('Mapa geral — com o SaaS', 'Futuro · visão por domínio', overview(fut, [...DOMAINS, SAAS]),
  `O domínio novo (verde) fica isolado: liga-se ao resto só por <code>AspNetUsers</code> (a conta). Nenhuma tabela de negócio muda — o bloqueio por assinatura acontece na API, não nos dados.`);

const contaFut = { ...DOMAINS[0], t: ['AspNetUsers', 'Perfis', 'Assistentes', ...SAAS.t] };
html += page('Conta + assinatura — com o SaaS', 'Futuro · ER detalhado', legend + domainER(fut, contaFut, { maxH: 960 }),
  `Novas tabelas em verde. Diferente das tabelas de hoje, as novas têm <b>FK real</b> de <code>ContaId</code> para <code>AspNetUsers</code> (ON DELETE restrict: ninguém apaga uma conta com histórico de cobrança). O CPF/CNPJ reaproveita <code>Perfis.Documento</code>, que já existe; entram só <code>AceiteTermosEm</code> e <code>VersaoTermos</code>. Tabelas de Identity sem mudança foram omitidas.`);

html += page('Fluxo de dados da assinatura', 'Futuro · quem move cada dado', flowsSVG() + `
<table class="t"><tr><th>#</th><th>Ação que dispara</th><th>Tabelas escritas</th><th>Tabelas lidas</th></tr>
<tr><td>1</td><td>Visitante envia o cadastro</td><td>AspNetUsers, Perfis, <b>Assinaturas</b> (Trial, TrialTerminaEm = +14 dias)</td><td>—</td></tr>
<tr><td>2</td><td>Qualquer pedido autenticado de Organizer/Assistant</td><td>—</td><td><b>Assinaturas</b> (Situacao, TrialTerminaEm, PagoAte) → libera ou devolve 402</td></tr>
<tr><td>3</td><td>Organizer clica “Assinar”</td><td><b>DocumentosTrial</b>, Assinaturas (AsaasCustomerId, AsaasSubscriptionId, FormaPagamento, ProximoVencimento)</td><td>Perfis.Documento, DocumentosTrial (documento já usou trial?)</td></tr>
<tr><td>4</td><td>Asaas gera/confirma fatura → webhook</td><td><b>EventosWebhookAsaas</b> (bruto) → <b>CobrancasAssinatura</b> → Assinaturas (Ativa, PagoAte)</td><td>EventosWebhookAsaas (já processado?)</td></tr>
<tr><td>5</td><td>Asaas avisa atraso ou cancelamento</td><td>EventosWebhookAsaas, CobrancasAssinatura.Status, Assinaturas (Inadimplente/Cancelada)</td><td>—</td></tr>
<tr><td>6</td><td>Job diário (BackgroundService)</td><td>Assinaturas (Trial vencido → Expirada)</td><td>Assinaturas, AspNetUsers.Email (avisos)</td></tr>
<tr><td>7</td><td>Admin estende trial (cortesia/suporte)</td><td>Assinaturas.TrialTerminaEm</td><td>—</td></tr></table>`);

html += page('Ciclo de vida da assinatura', 'Futuro · Assinaturas.Situacao', stateSVG() + `<div class="grid2">
<div class="card"><h3>Regra dos 14 dias</h3><ul><li>Só o cadastro cria <code>Trial</code>; não existe transição de volta para Trial.</li><li>O documento (CPF/CNPJ) vai para <code>DocumentosTrial</code> na primeira assinatura: segunda conta com o mesmo documento assina sem trial.</li><li>Assinar durante o trial: primeiro vencimento = <code>TrialTerminaEm</code>.</li></ul></div>
<div class="card"><h3>O que o filtro de acesso lê</h3><ul><li><code>Trial</code> e agora &lt; TrialTerminaEm → libera</li><li><code>Ativa</code> → libera</li><li><code>Inadimplente</code>/<code>Cancelada</code> e hoje ≤ PagoAte + 3 dias → libera</li><li>Qualquer outro caso → 402 <code>assinatura_expirada</code></li></ul></div></div>`);

html += page('Fluxo de dados do produto atual', 'Hoje · do lead ao dia do evento', productFlowSVG() +
  `<p class="note">Cada seta traz o método de serviço que grava o dado (pasta <code>Project.Application/Negocio</code>). Perceba que quase todo o funil se liga por referências sem FK (<code>OportunidadeId</code>, <code>ModeloId</code>): a integridade depende só do código.</p>`);

// prontidão
html += page('Prontidão para produção', 'Achados do schema', `<div class="grid2">
<div class="card"><h3><span class="tag r">ALTO</span>Tenant sem FK e sem filtro global</h3><ul>
<li><code>ContaId</code> está em ${tenantTables.length} tabelas, é <code>text</code> e não tem FK para <code>AspNetUsers</code>. Uma conta apagada deixa dados órfãos.</li>
<li>Não há <code>HasQueryFilter</code> no EF: cada consulta precisa lembrar do <code>Where(ContaId == …)</code>. Um esquecimento vaza dados de outra assessoria. Recomendo filtro global por tenant + teste automatizado de isolamento.</li></ul></div>
<div class="card"><h3><span class="tag r">ALTO</span>${logCount} referências sem FK</h3><ul>
<li>Funil inteiro (Contratos/Orçamentos/Tarefas → <code>OportunidadeId</code>), todos os <code>*ArquivoId</code>, <code>Oportunidades.ClienteId</code>, <code>LeadsRsvp.EventoId</code>, <code>PresencasEvento.EventoId</code>.</li>
<li>Exclusões não propagam: apagar uma oportunidade deixa orçamento e contrato apontando para o nada; apagar um arquivo não limpa quem o usa.</li>
<li>Decidir caso a caso: FK com cascade, FK com set null, ou manter lógico de propósito (documentar).</li></ul></div>
<div class="card"><h3><span class="tag a">MÉDIO</span>Índices por tenant faltando</h3><ul>
<li>Sem índice começando por <code>ContaId</code>: <b>Eventos, Clientes, Arquivos, Modelos, Compromissos, Tarefas, Convites</b>, RespostasPropostaFunil, BriefingsOportunidade, LinksCliente, LinksPortaria, ImportacoesConvidados.</li>
<li>Toda listagem filtra por <code>ContaId</code>: com muitas contas, viram varredura de tabela. Eventos e Clientes são os primeiros a doer.</li></ul></div>
<div class="card"><h3><span class="tag a">MÉDIO</span>Tipos e consistência</h3><ul>
<li><code>ContaId</code> é <code>text</code> em umas tabelas e <code>varchar(450)</code> em outras (LinksCliente, LinksPortaria, ImportacoesConvidados).</li>
<li>Referências polimórficas (<code>VinculoModeloEvento.BibliotecaId</code>, <code>ReferenciaId</code> de responsáveis) não têm como ter FK — exigem limpeza no código.</li>
<li><code>Oportunidades</code> (61 colunas) e <code>Eventos</code> (42) estão largas; não bloqueia PRD, mas pesa em migrações futuras.</li></ul></div>
<div class="card"><h3><span class="tag g">OK</span>O que já está pronto</h3><ul>
<li>Toda tabela tem PK; ids <code>uuid</code> (sem enumeração).</li><li>Filhos diretos (itens, parcelas, seções) usam FK com cascade de forma coerente.</li>
<li>Tokens de links públicos têm índice único (Convites, LinksCliente, LinksPortaria).</li><li>Schema versionado por migrações EF e script idempotente para deploy.</li></ul></div>
<div class="card"><h3>Antes de ligar a cobrança</h3><ul>
<li>1. Filtro global por tenant + teste de isolamento.</li><li>2. Índices <code>(ContaId)</code> nas 12 tabelas listadas.</li>
<li>3. Novas tabelas SaaS já nascem com FK real e índices únicos (desenhado nas págs. 9–10).</li>
<li>4. Revisar as referências do funil e de arquivos (FK ou limpeza explícita).</li><li>5. Backup automático do Postgres e teste de restauração antes de dados pagos.</li></ul></div>
</div>`);

html += '</body></html>';
fs.writeFileSync(process.argv[2], html);
console.log('ok', fkCount, logCount, tenantTables.length);
