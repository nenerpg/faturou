// Credenciais do painel admin. Podem ser sobrescritas por variaveis de ambiente.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'fenix@sortereal.com.br';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '258456';

// Token deterministico (estavel entre instancias serverless).
const ADMIN_TOKEN =
  process.env.ADMIN_TOKEN ||
  Buffer.from(`${ADMIN_EMAIL}:${ADMIN_PASSWORD}`).toString('base64');

function getToken(req) {
  const header = req.headers['x-admin-token'];
  if (header) return String(header);
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function requireAdmin(req, res, next) {
  if (getToken(req) === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: 'Não autorizado. Faça login no painel.' });
}

module.exports = { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_TOKEN, requireAdmin };
