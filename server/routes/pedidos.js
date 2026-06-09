const express = require('express');
const crypto = require('crypto');
const supabase = require('../supabase');
const { getCheckoutUrlForPacote, isPacoteVendavel } = require('../pacotesCheckout');
const { syncPedidoPayment } = require('../services/paymentSync');
const cashApi = require('../services/cashApi');

const router = express.Router();

function newOrderId() {
  return `ord_${crypto.randomBytes(12).toString('hex')}`;
}

function buildCheckoutUrl(pedido, pkg, campanha) {
  const base = getCheckoutUrlForPacote(pkg) || process.env.ANIMUS_CHECKOUT_BASE_URL || '';
  if (!base) return null;

  const postbackUrl =
    process.env.CASH_POSTBACK_URL ||
    `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}/api/webhooks/cash`;
  const returnUrl = `${process.env.PUBLIC_SITE_URL || 'http://localhost:3000'}/obrigado.html?orderId=${pedido.order_id}`;

  const params = new URLSearchParams({
    externalId: pedido.order_id,
    postbackUrl,
    returnUrl,
    amount: String(pedido.amount_centavos),
    description: `${pkg.nome} — ${campanha.titulo || 'Sorte Real'}`,
    name: pedido.nome,
    email: pedido.email,
    document: pedido.cpf,
  });

  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}${params.toString()}`;
}

function postbackUrl() {
  return (
    process.env.CASH_POSTBACK_URL ||
    `${process.env.PUBLIC_API_URL || 'http://localhost:3000'}/api/webhooks/cash`
  );
}

async function createPixForPedido(pedido) {
  if (!process.env.CASH_API_TOKEN) return null;

  try {
    const deposit = await cashApi.createPixDeposit({
      amount: pedido.amount_centavos,
      externalId: pedido.order_id,
      postbackUrl: postbackUrl(),
      payer: {
        name: pedido.nome,
        email: pedido.email,
        document: pedido.cpf,
      },
    });

    if (deposit?.id) {
      await supabase
        .from('pedidos')
        .update({ cash_deposit_id: deposit.id, updated_at: new Date().toISOString() })
        .eq('id', pedido.id);
    }

    return deposit;
  } catch (err) {
    console.error('[pedidos] createPixDeposit:', err.message);
    return null;
  }
}

router.post('/', async (req, res) => {
  const body = req.body;
  const cpf = String(body.cpf || '').replace(/\D/g, '');
  const campanhaSlug = body.campanhaSlug || 'iphone-17-pro';

  if (!body.nome || !cpf || !body.email || !body.pacote) {
    return res.status(400).json({ error: 'Preencha nome, CPF, e-mail e pacote.' });
  }
  if (cpf.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido.' });
  }

  const { data: campanha } = await supabase
    .from('campanhas')
    .select('*')
    .eq('slug', campanhaSlug)
    .eq('status', 'ativa')
    .maybeSingle();

  if (!campanha) return res.status(404).json({ error: 'Campanha não encontrada.' });

  const pkg = campanha.pacotes.find((p) => p.id === body.pacote);
  if (!pkg) return res.status(400).json({ error: 'Pacote inválido.' });
  if (!isPacoteVendavel(pkg)) {
    return res.status(400).json({ error: 'Este pacote não está disponível para compra online.' });
  }

  const amountCentavos = Math.round(pkg.valor * 100);
  const orderId = newOrderId();

  const { data: pedido, error: errPedido } = await supabase
    .from('pedidos')
    .insert({
      order_id: orderId,
      campanha_id: campanha.id,
      campanha_slug: campanha.slug,
      pacote_id: pkg.id,
      nome_pacote: pkg.nome,
      nome: body.nome.trim(),
      cpf,
      email: body.email.trim().toLowerCase(),
      tel: body.tel || '',
      amount_centavos: amountCentavos,
      status: 'aguardando_pix',
    })
    .select()
    .single();

  if (errPedido) return res.status(500).json({ error: errPedido.message });

  const siteUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:3000';
  const checkoutUrl = buildCheckoutUrl(pedido, pkg, campanha);

  if (checkoutUrl) {
    return res.status(201).json({
      orderId: pedido.order_id,
      amountCentavos,
      amountReais: pkg.valor,
      pacote: pkg.nome,
      campanha: campanha.titulo,
      checkoutUrl,
    });
  }

  const deposit = await createPixForPedido(pedido);

  if (deposit?.pix?.code) {
    return res.status(201).json({
      orderId: pedido.order_id,
      amountCentavos,
      amountReais: pkg.valor,
      pacote: pkg.nome,
      campanha: campanha.titulo,
      pixMode: true,
      pixUrl: `${siteUrl}/pix.html?orderId=${pedido.order_id}`,
      pix: {
        code: deposit.pix.code,
        imageBase64: deposit.pix.imageBase64 || null,
      },
    });
  }

  res.status(201).json({
    orderId: pedido.order_id,
    amountCentavos,
    amountReais: pkg.valor,
    pacote: pkg.nome,
    campanha: campanha.titulo,
    checkoutUrl: null,
    mockMode: true,
  });
});

router.post('/:orderId/sync', async (req, res) => {
  try {
    const result = await syncPedidoPayment(req.params.orderId);
    if (!result.ok) return res.status(404).json({ error: result.error });
    res.json(result);
  } catch (err) {
    console.error('[pedidos/sync]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:orderId', async (req, res) => {
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('order_id, status, pacote_id, nome_pacote, amount_centavos, cash_deposit_id')
    .eq('order_id', req.params.orderId)
    .maybeSingle();

  if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

  const out = {
    orderId: pedido.order_id,
    status: pedido.status,
    pacoteId: pedido.pacote_id,
    nomePacote: pedido.nome_pacote,
    amountCentavos: pedido.amount_centavos,
  };

  if (pedido.status === 'aguardando_pix' && pedido.cash_deposit_id && process.env.CASH_API_TOKEN) {
    try {
      const deposit = await cashApi.getDeposit(pedido.cash_deposit_id);
      if (deposit?.pix?.code) {
        out.pix = {
          code: deposit.pix.code,
          imageBase64: deposit.pix.imageBase64 || null,
        };
      }
    } catch (_) {}
  }

  res.json(out);
});

module.exports = router;
