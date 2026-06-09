const express = require('express');
const { processCashDeposit } = require('../services/paymentSync');

const router = express.Router();

router.post('/cash', async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.id) {
      return res.status(400).json({ error: 'Payload inválido.' });
    }

    console.log('[webhook/cash]', payload.status, payload.externalId || '-', payload.id);
    const result = await processCashDeposit(payload);
    res.status(200).json(result);
  } catch (err) {
    console.error('[webhook/cash]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
