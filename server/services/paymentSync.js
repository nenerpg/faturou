const supabase = require('../supabase');
const cashApi = require('./cashApi');
const { fulfillPedido } = require('./fulfillPedido');

const PAID_STATUSES = new Set(['paid', 'pad_approved']);
const PENDING_STATUSES = new Set(['pending', 'waiting_payment', 'processing']);
const EXPIRED_STATUSES = new Set(['expired', 'abandoned', 'unpaid']);
const REFUND_STATUSES = new Set(['refunded', 'chargeback']);

function isPaidStatus(status) {
  return PAID_STATUSES.has(String(status || '').toLowerCase());
}

function isPendingStatus(status) {
  return PENDING_STATUSES.has(String(status || '').toLowerCase());
}

async function findPedido({ externalId, depositId }) {
  if (externalId) {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('order_id', externalId)
      .maybeSingle();
    if (data) return data;
  }

  if (depositId) {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cash_deposit_id', depositId)
      .maybeSingle();
    if (data) return data;
  }

  return null;
}

async function confirmDepositPaid(deposit) {
  if (!deposit?.id) return deposit;

  if (process.env.CASH_API_TOKEN) {
    const confirmed = await cashApi.getDeposit(deposit.id);
    if (!isPaidStatus(confirmed.status)) {
      return { ...deposit, status: confirmed.status, _apiConfirmed: false };
    }
    return { ...confirmed, _apiConfirmed: true };
  }

  return { ...deposit, _apiConfirmed: isPaidStatus(deposit.status) };
}

async function processCashDeposit(payload) {
  const depositId = payload.id;
  const externalId = payload.externalId;
  const status = String(payload.status || '').toLowerCase();
  const amount = payload.amount;

  let pedido = await findPedido({ externalId, depositId });

  if (!pedido && depositId && process.env.CASH_API_TOKEN) {
    try {
      const full = await cashApi.getDeposit(depositId);
      if (full?.externalId) {
        pedido = await findPedido({ externalId: full.externalId, depositId });
      }
    } catch (e) {
      console.warn('[payment] fallback getDeposit:', e.message);
    }
  }

  if (!pedido) {
    console.warn('[payment] pedido não encontrado', { externalId, depositId });
    return { ok: true, skipped: 'pedido_not_found' };
  }

  if (isPendingStatus(status)) {
    if (depositId) {
      await supabase
        .from('pedidos')
        .update({ cash_deposit_id: depositId, updated_at: new Date().toISOString() })
        .eq('id', pedido.id);
    }
    return { ok: true, action: 'pending', orderId: pedido.order_id };
  }

  if (EXPIRED_STATUSES.has(status)) {
    await supabase
      .from('pedidos')
      .update({ status: 'expirado', cash_deposit_id: depositId, updated_at: new Date().toISOString() })
      .eq('id', pedido.id);
    return { ok: true, action: 'expired', orderId: pedido.order_id };
  }

  if (REFUND_STATUSES.has(status)) {
    await supabase.from('pedidos').update({ status: 'reembolsado' }).eq('id', pedido.id);
    await supabase
      .from('participantes')
      .update({ status_pagamento: 'cancelado', elegivel: false })
      .eq('pedido_id', pedido.order_id);
    return { ok: true, action: 'refunded', orderId: pedido.order_id };
  }

  if (!isPaidStatus(status)) {
    return { ok: true, action: 'ignored', status, orderId: pedido.order_id };
  }

  const deposit = await confirmDepositPaid(payload);
  if (!deposit._apiConfirmed && process.env.CASH_API_TOKEN) {
    console.warn('[payment] API não confirmou paid:', deposit.status);
    return { ok: true, skipped: 'not_confirmed_via_api', orderId: pedido.order_id };
  }

  if (deposit.externalId && deposit.externalId !== pedido.order_id) {
    throw new Error('externalId do depósito não confere com o pedido.');
  }

  const result = await fulfillPedido(pedido, depositId, amount);
  return {
    ok: true,
    action: 'fulfilled',
    orderId: pedido.order_id,
    alreadyFulfilled: result.alreadyFulfilled || false,
    numerosCount: result.numeros?.length,
  };
}

async function syncPedidoPayment(orderId) {
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (!pedido) return { ok: false, error: 'Pedido não encontrado.' };
  if (pedido.status === 'pago') return { ok: true, status: 'pago', alreadyPaid: true };

  if (!process.env.CASH_API_TOKEN) {
    return { ok: true, status: pedido.status, synced: false, reason: 'no_api_token' };
  }

  let deposit = null;

  if (pedido.cash_deposit_id) {
    try {
      deposit = await cashApi.getDeposit(pedido.cash_deposit_id);
    } catch (e) {
      console.warn('[payment/sync] deposit por id falhou:', e.message);
    }
  }

  if (!deposit) {
    deposit = await cashApi.findDepositByExternalId(orderId);
  }

  if (!deposit) {
    return { ok: true, status: pedido.status, synced: false, reason: 'deposit_not_found' };
  }

  const result = await processCashDeposit(deposit);
  const { data: atualizado } = await supabase
    .from('pedidos')
    .select('status')
    .eq('order_id', orderId)
    .maybeSingle();

  return {
    ok: true,
    status: atualizado?.status || pedido.status,
    synced: true,
    result,
  };
}

module.exports = {
  isPaidStatus,
  processCashDeposit,
  syncPedidoPayment,
};
