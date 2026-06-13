function pickPublicUrl(...values) {
  for (const raw of values) {
    const url = String(raw || '').trim().replace(/\/$/, '');
    if (url && !/localhost|127\.0\.0\.1/i.test(url)) return url;
  }
  return '';
}

const DEFAULT_PUBLIC_URL = 'https://www.sortereal.org';

function resolvePublicUrl() {
  const fromEnv = pickPublicUrl(process.env.PUBLIC_SITE_URL, process.env.PUBLIC_API_URL);
  if (fromEnv) return fromEnv;

  const vercel = (process.env.VERCEL_URL || '').trim().replace(/^https?:\/\//, '');
  if (vercel) return `https://${vercel}`;

  if (process.env.NODE_ENV === 'production') {
    return DEFAULT_PUBLIC_URL;
  }

  return 'http://localhost:3000';
}

/** URLs em e-mails e entregáveis — nunca localhost. */
function resolveCustomerFacingUrl() {
  const fromEnv = pickPublicUrl(process.env.PUBLIC_SITE_URL, process.env.PUBLIC_API_URL);
  if (fromEnv) return fromEnv;

  const vercel = (process.env.VERCEL_URL || '').trim().replace(/^https?:\/\//, '');
  if (vercel) return `https://${vercel}`;

  return DEFAULT_PUBLIC_URL;
}

function resolveEbookUrl() {
  return pickPublicUrl(process.env.EBOOK_URL) || `${resolveCustomerFacingUrl()}/ebook.pdf`;
}

module.exports = {
  resolvePublicUrl,
  resolveCustomerFacingUrl,
  resolveEbookUrl,
  pickPublicUrl,
};
