require('dotenv').config();
const path = require('path');
const express = require('express');
const apiRouter = require('./routes/api');
const campanhasRouter = require('./routes/campanhas');
const adminCampanhasRouter = require('./routes/adminCampanhas');
const pedidosRouter = require('./routes/pedidos');
const webhookRouter = require('./routes/webhook');
const { seedCampanhas } = require('./seedCampanhas');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json({ limit: '2mb' }));

app.use('/api', apiRouter);
app.use('/api/admin/campanhas', adminCampanhasRouter);
app.use('/api/campanhas', campanhasRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/webhooks', webhookRouter);

const siteDir = path.join(__dirname, '..', 'site');
app.use(express.static(siteDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(siteDir, 'index.html'));
});

async function start() {
  await seedCampanhas();
  app.listen(PORT, () => {
    console.log(`Home:     http://localhost:${PORT}/`);
    console.log(`Campanha: http://localhost:${PORT}/campanha.html?slug=iphone-17-pro`);
    console.log(`Checkout: http://localhost:${PORT}/checkout.html?campanha=iphone-17-pro&pacote=ouro`);
    console.log(`Webhook:  http://localhost:${PORT}/api/webhooks/cash`);
    console.log(`Admin:    http://localhost:${PORT}/admin.html`);
  });
}

start().catch((err) => {
  console.error('Falha ao iniciar:', err.message);
  process.exit(1);
});
