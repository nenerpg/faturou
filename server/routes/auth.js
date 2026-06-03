const express = require('express');
const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_TOKEN } = require('../adminAuth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, senha } = req.body || {};
  const emailOk = String(email || '').trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const senhaOk = String(senha || '') === ADMIN_PASSWORD;

  if (emailOk && senhaOk) {
    return res.json({ token: ADMIN_TOKEN, email: ADMIN_EMAIL });
  }
  return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
});

module.exports = router;
