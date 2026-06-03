const express = require('express');
const supabase = require('../supabase');
const cashApi = require('../services/cashApi');
const { fulfillPedido } = require('../services/fulfillPedido');

const router = express.Router();

async function processCashDeposit(payload) {
  const depositId = payload.id;
  const externalId = payload.externalId;
  const status = payload.status;
  const amount = payload.amount;

  if (!externalId) {
    console.warn('[webhook/cash] externalId ausente', depositId);
    return { ok: true, skipped: 'no_external_id' };
  }

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('*')
    .eq('order_id', externalId)
    .maybeSingle();

  if (!pedido) {
    console.warn('[webhook/cash] pedido não encontrado:', externalId);
    return { ok: true, skipped: 'pedido_not_found' };
  }

  if (status === 'pending') {
    if (depositId && !pedido.cash_deposit_id) {
      await supabase.from('pedidos').update({ cash_deposit_id: depositId }).eq('id', pedido.id);
    }
    return { ok: true, action: 'pending' };
  }

  if (status === 'expired') {
    await supabase
      .from('pedidos')
      .update({ status: 'expirado', cash_deposit_id: depositId })
      .eq('id', pedido.id);
    return { ok: true, action: 'expired' };
  }

  if (status === 'refunded') {
    await supabase.from('pedidos').update({ status: 'reembolsado' }).eq('id', pedido.id);
    await supabase
      .from('participantes')
      .update({ status_pagamento: 'cancelado', elegivel: false })
      .eq('pedido_id', pedido.order_id);
    return { ok: true, action: 'refunded' };
  }

  if (status !== 'paid') {
    return { ok: true, action: 'ignored', status };
  }

  if (process.env.CASH_API_TOKEN && depositId) {
    const confirmed = await cashApi.getDeposit(depositId);
    if (confirmed.status !== 'paid') {
      console.warn('[webhook/cash] GET deposit não está paid:', confirmed.status);
      return { ok: true, skipped: 'not_confirmed_via_api' };
    }
    if (confirmed.externalId && confirmed.externalId !== externalId) {
      throw new Error('externalId não confere com a API Cash.');
    }
  }

  const result = await fulfillPedido(pedido, depositId, amount);
  return {
    ok: true,
    action: 'fulfilled',
    alreadyFulfilled: result.alreadyFulfilled || false,
    numerosCount: result.numeros?.length,
  };
}

router.post('/cash', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.id) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }
    const result = await processCashDeposit(payload);
    res.status(200).json(result);
  } catch (err) {
    console.error('[webhook/cash]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
