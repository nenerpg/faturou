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
  if (data?.data && typeof data.data === 'object') return data.data;
  if (data?.id) return data;
  return data;
}

async function getDeposit(depositId) {
  const raw = await cashFetch(`/deposits/${encodeURIComponent(depositId)}`);
  return unwrapDeposit(raw);
}

module.exports = { getDeposit };
