const RESEND_API = 'https://api.resend.com/emails';

async function sendNumerosEmail({ to, nome, campanhaTitulo, pacoteNome, numeros }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const ebookUrl = process.env.EBOOK_URL || '';
  const siteUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:3000';

  const numerosHtml = numeros
    .map((n) => `<li style="font-family:monospace;font-size:1.1em;margin:4px 0">${n}</li>`)
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:560px;color:#111">
      <h2>Olá, ${nome}!</h2>
      <p>Seu pagamento foi confirmado na promoção <strong>${campanhaTitulo}</strong>.</p>
      <p>Pacote: <strong>${pacoteNome}</strong> — ${numeros.length} número(s) da sorte:</p>
      <ul>${numerosHtml}</ul>
      ${ebookUrl ? `<p><a href="${ebookUrl}">Baixar seu ebook digital</a></p>` : ''}
      <p style="font-size:12px;color:#666">Guarde este e-mail. Apuração conforme Loteria Federal. Promoção autorizada SPA/ME.</p>
      <p style="font-size:12px"><a href="${siteUrl}">${siteUrl}</a></p>
    </div>
  `;

  if (!apiKey) {
    console.log('[email] RESEND_API_KEY ausente — simulação:');
    console.log(`  Para: ${to}`);
    console.log(`  Números: ${numeros.join(', ')}`);
    return { simulated: true };
  }

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Seus números da sorte — ${campanhaTitulo}`,
      html,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Resend ${res.status}`);
  }
  return data;
}

module.exports = { sendNumerosEmail };
