// Asaas falso do ambiente E2E: responde as rotas v3 que o aralu usa (AsaasCliente.cs), guarda tudo em memória.
// Webhooks não saem daqui: o teste posta direto em /api/v1/webhooks/asaas, controlando ordem e repetição.
// GET /_estado devolve o que foi criado, para o teste conferir o que a API mandou ao Asaas.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const estado = { clientes: new Map(), assinaturas: new Map(), cobrancas: new Map(), chamadas: [] };

const json = (res, status, corpo) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(corpo));
};

const lerCorpo = (req) =>
  new Promise((ok) => {
    let dados = '';
    req.on('data', (parte) => (dados += parte));
    req.on('end', () => ok(dados ? JSON.parse(dados) : {}));
  });

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://asaas');
  const caminho = url.pathname;
  const corpo = ['POST', 'PUT'].includes(req.method) ? await lerCorpo(req) : {};

  if (caminho === '/_estado') {
    return json(res, 200, {
      clientes: [...estado.clientes.values()],
      assinaturas: [...estado.assinaturas.values()],
      cobrancas: [...estado.cobrancas.values()],
      chamadas: estado.chamadas,
    });
  }
  if (caminho === '/_zerar' && req.method === 'POST') {
    for (const mapa of [estado.clientes, estado.assinaturas, estado.cobrancas]) mapa.clear();
    estado.chamadas.length = 0;
    return json(res, 200, { ok: true });
  }

  if (req.headers['access_token'] !== process.env.ASAAS_API_KEY) {
    return json(res, 401, { errors: [{ code: 'invalid_access_token', description: 'Chave inválida' }] });
  }
  estado.chamadas.push({ metodo: req.method, caminho, corpo });

  let m;
  if (req.method === 'POST' && caminho === '/v3/customers') {
    const cliente = { id: `cus_${randomUUID()}`, ...corpo };
    estado.clientes.set(cliente.id, cliente);
    return json(res, 200, cliente);
  }
  if (req.method === 'POST' && caminho === '/v3/subscriptions') {
    const assinatura = { id: `sub_${randomUUID()}`, status: 'ACTIVE', ...corpo };
    estado.assinaturas.set(assinatura.id, assinatura);
    const cobranca = {
      id: `pay_${randomUUID()}`,
      subscription: assinatura.id,
      customer: corpo.customer,
      value: corpo.value,
      dueDate: corpo.nextDueDate,
      status: 'PENDING',
      billingType: corpo.billingType,
      invoiceUrl: 'http://asaas-falso/fatura',
    };
    estado.cobrancas.set(cobranca.id, cobranca);
    return json(res, 200, assinatura);
  }
  if ((m = caminho.match(/^\/v3\/subscriptions\/([^/]+)\/payments$/)) && req.method === 'GET') {
    const data = [...estado.cobrancas.values()].filter((c) => c.subscription === m[1]);
    return json(res, 200, { object: 'list', totalCount: data.length, data });
  }
  if ((m = caminho.match(/^\/v3\/subscriptions\/([^/]+)$/)) && req.method === 'PUT') {
    const assinatura = estado.assinaturas.get(m[1]);
    if (!assinatura) return json(res, 404, { errors: [{ description: 'Assinatura não encontrada' }] });
    Object.assign(assinatura, corpo);
    return json(res, 200, assinatura);
  }
  if (req.method === 'POST' && caminho === '/v3/payments') {
    const cobranca = { id: `pay_${randomUUID()}`, status: 'PENDING', invoiceUrl: 'http://asaas-falso/fatura', ...corpo };
    estado.cobrancas.set(cobranca.id, cobranca);
    return json(res, 200, cobranca);
  }
  if ((m = caminho.match(/^\/v3\/payments\/([^/]+)$/)) && req.method === 'DELETE') {
    estado.cobrancas.delete(m[1]);
    return json(res, 200, { deleted: true, id: m[1] });
  }

  return json(res, 404, { errors: [{ description: `Rota não simulada: ${req.method} ${caminho}` }] });
}).listen(8080, () => console.log('asaas-falso ouvindo em 8080'));
