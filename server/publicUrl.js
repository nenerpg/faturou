function pickPublicUrl(...values) {
  for (const raw of values) {
    const url = String(raw || '').trim().replace(/\/$/, '');
    if (url && !/localhost|127\.0\.0\.1/i.test(url)) return url;
  }
  return '';
}

function resolvePublicUrl() {
  const fromEnv = pickPublicUrl(process.env.PUBLIC_SITE_URL, process.env.PUBLIC_API_URL);
  if (fromEnv) return fromEnv;

  const vercel = (process.env.VERCEL_URL || '').trim().replace(/^https?:\/\//, '');
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}
module.exports = { resolvePublicUrl };
