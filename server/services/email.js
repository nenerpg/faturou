const RESEND_API = 'https://api.resend.com/emails';

async function sendNumerosEmail({
  to,
  nome,
  campanhaTitulo,
  pacoteNome,
  numeros,
  compraAdicional = false,
  totalNumeros = null,
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const ebookUrl = process.env.EBOOK_URL || '';
  const ebookTitulo = process.env.EBOOK_TITULO || 'O Legado de Steve Jobs';
  const siteUrl = process.env.PUBLIC_SITE_URL || 'http://localhost:3000';

  const numerosHtml = numeros
    .map((n) => `<li style="font-family:monospace;font-size:1.1em;margin:4px 0">${n}</li>`)
    .join('');

  const tituloCompra = compraAdicional
    ? `Novos números confirmados — ${campanhaTitulo}`
    : `Seus números da sorte — ${campanhaTitulo}`;
  const intro = compraAdicional
    ? `Sua <strong>nova compra</strong> na promoção <strong>${campanhaTitulo}</strong> foi confirmada.`
    : `Seu pagamento foi confirmado na promoção <strong>${campanhaTitulo}</strong>.`;
  const totalInfo =
    compraAdicional && totalNumeros
      ? `<p style="font-size:13px;color:#444">Você agora possui <strong>${totalNumeros}</strong> número(s) nesta campanha.</p>`
      : '';

  const html = `
    <div style="font-family:sans-serif;max-width:560px;color:#111">
      <h2>Olá, ${nome}!</h2>
      <p>${intro}</p>
      <p>Pacote: <strong>${pacoteNome}</strong> — ${numeros.length} número(s) ${compraAdicional ? 'novos' : 'da sorte'}:</p>
      <ul>${numerosHtml}</ul>
      ${totalInfo}
      ${ebookUrl ? `
      <p style="margin-top:20px;padding:14px;background:#f5f5f5;border-radius:8px">
        <strong>🎁 Seu bônus digital</strong><br/>
        <a href="${ebookUrl}" style="color:#111;font-weight:600">Baixar: ${ebookTitulo} (PDF)</a>
      </p>` : ''}
      <p style="font-size:12px;color:#666">Guarde este e-mail. Apuração conforme resultado público da Loteria Federal da Caixa.</p>
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
      subject: tituloCompra,
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
