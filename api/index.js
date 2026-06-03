require('dotenv').config();
const path = require('path');
const express = require('express');
const apiRouter = require('../server/routes/api');
const campanhasRouter = require('../server/routes/campanhas');
const pedidosRouter = require('../server/routes/pedidos');
const webhookRouter = require('../server/routes/webhook');
const { seedCampanhas } = require('../server/seedCampanhas');

const app = express();

app.use(express.json({ limit: '2mb' }));

app.use('/api', apiRouter);
app.use('/api/campanhas', campanhasRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/webhooks', webhookRouter);

const siteDir = path.join(__dirname, '..', 'site');
app.use(express.static(siteDir));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(siteDir, 'index.html')));

let initialized = false;

module.exports = async (req, res) => {
  if (!initialized) {
    await seedCampanhas();
    initialized = true;
  }
  return app(req, res);
};
