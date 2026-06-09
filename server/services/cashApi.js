const BASE_URL =
  process.env.CASH_API_BASE_URL || 'https://api.animuspay.com.br/api/public/cash';

function getToken() {
  return process.env.CASH_API_TOKEN || '';
}

async function cashFetch(path, options = {}) {
  const token = getToken();
  if (!token) {
    throw new Error('CASH_API_TOKEN não configurado.');
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || data.error || JSON.stringify(data) || res.statusText;
    throw new Error(`Cash API ${res.status}: ${msg}`);
  }

  return data;
}

function unwrapDeposit(data) {
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  if (data?.id) return data;
  return data;
}

function unwrapDepositList(data) {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

async function getDeposit(depositId) {
  const raw = await cashFetch(`/deposits/${encodeURIComponent(depositId)}`);
  return unwrapDeposit(raw);
}

async function listDeposits(params = {}) {
  const qs = new URLSearchParams();
  if (params.perPage) qs.set('perPage', String(params.perPage));
  if (params.page) qs.set('page', String(params.page));
  if (params.status) qs.set('status', params.status);
  const query = qs.toString();
  const raw = await cashFetch(`/deposits${query ? `?${query}` : ''}`);
  return unwrapDepositList(raw);
}

async function createPixDeposit({ amount, externalId, postbackUrl, payer }) {
  const raw = await cashFetch('/deposits/pix', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      externalId,
      postbackUrl,
      method: 'pix',
      transactionOrigin: 'cashin',
      payer: {
        name: payer.name,
        email: payer.email,
        document: payer.document || null,
      },
    }),
  });
  return unwrapDeposit(raw);
}

async function findDepositByExternalId(externalId) {
  if (!externalId) return null;

  const statuses = ['paid', 'waiting_payment', 'processing', 'pad_approved'];
  for (const status of statuses) {
    const lista = await listDeposits({ perPage: 50, status });
    const found = lista.find((d) => d.externalId === externalId);
    if (found) return found;
  }

  const all = await listDeposits({ perPage: 100 });
  return all.find((d) => d.externalId === externalId) || null;
}

module.exports = { getDeposit, listDeposits, findDepositByExternalId, createPixDeposit };
