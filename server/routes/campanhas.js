const express = require('express');
const supabase = require('../supabase');
const { gerarNumerosAleatorios, registrarNumerosUsados } = require('../gerarNumeros');

const router = express.Router();

function toCampanhaPublic(row) {
  return {
    id: row.id,
    slug: row.slug,
    titulo: row.titulo,
    subtitulo: row.subtitulo,
    descricao: row.descricao,
    premioNome: row.premio_nome,
    premioImagem: row.premio_imagem,
    heroDesktop: row.hero_desktop,
    heroMobile: row.hero_mobile,
    status: row.status,
    destaque: row.destaque,
    valorPremioEstimado: row.valor_premio_estimado,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    dataExtracao: row.data_extracao,
    totalSeries: row.total_series,
    elementosPorSerie: row.elementos_por_serie,
    serieInicial: row.serie_inicial,
    numerosVendidos: row.numeros_vendidos,
    totalNumerosDisplay: row.total_numeros_display,
    pacotes: row.pacotes,
    chavePix: row.chave_pix,
    whatsapp: row.whatsapp,
  };
}

router.get('/', async (_req, res) => {
  const { data } = await supabase
    .from('campanhas')
    .select('*')
    .eq('status', 'ativa')
    .order('ordem', { ascending: true });
  res.json((data || []).map(toCampanhaPublic));
});

router.get('/:slug', async (req, res) => {
  const { data: campanha } = await supabase
    .from('campanhas')
    .select('*')
    .eq('slug', req.params.slug)
    .eq('status', 'ativa')
    .maybeSingle();

  if (!campanha) {
    return res.status(404).json({ error: 'Campanha não encontrada ou encerrada.' });
  }

  const [{ count: vendidos }, { count: participantes }] = await Promise.all([
    supabase.from('numeros_usados').select('*', { count: 'exact', head: true }).eq('campanha_id', campanha.id),
    supabase.from('participantes').select('*', { count: 'exact', head: true }).eq('campanha_id', campanha.id).eq('status_pagamento', 'confirmado'),
  ]);

  const pub = toCampanhaPublic(campanha);
  pub.numerosVendidos = vendidos || campanha.numeros_vendidos;
  pub.participantesConfirmados = participantes || 0;

  res.json(pub);
});

router.post('/:slug/participar', async (req, res) => {
  if (process.env.ALLOW_PUBLIC_PARTICIPAR === 'false') {
    return res.status(403).json({ error: 'Participação pública desativada. Use o checkout com PIX.' });
  }

  const { data: campanha } = await supabase
    .from('campanhas')
    .select('*')
    .eq('slug', req.params.slug)
    .eq('status', 'ativa')
    .maybeSingle();

  if (!campanha) return res.status(404).json({ error: 'Campanha não encontrada.' });

  const body = req.body;
  const cpf = String(body.cpf || '').replace(/\D/g, '');

  if (!body.nome || !cpf || !body.email || !body.pacote) {
    return res.status(400).json({ error: 'Preencha nome, CPF, e-mail e pacote.' });
  }
  if (cpf.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido.' });
  }

  const { data: existente } = await supabase
    .from('participantes')
    .select('*')
    .eq('campanha_id', campanha.id)
    .eq('cpf', cpf)
    .maybeSingle();

  const pkg = campanha.pacotes.find((p) => p.id === body.pacote);
  if (!pkg) return res.status(400).json({ error: 'Pacote inválido.' });

  const cfg = { totalSeries: campanha.total_series, elementosPorSerie: campanha.elementos_por_serie, serieInicial: campanha.serie_inicial };
  const { numeros, erro } = await gerarNumerosAleatorios(pkg.numeros, cfg, campanha.id);
  if (erro || !numeros.length) {
    return res.status(400).json({ error: 'Não foi possível gerar os números. Tente outro pacote.' });
  }

  let participante;

  if (existente) {
    const numerosTotal = [...(existente.numeros_gerados || []), ...numeros];
    const valorPago = Number(existente.valor_pago || 0) + Number(pkg.valor);
    const { data } = await supabase
      .from('participantes')
      .update({
        nome: body.nome,
        email: body.email,
        tel: body.tel || existente.tel || '',
        pacote: pkg.id,
        nome_pacote: pkg.nome,
        pagamento: body.pagamento || 'pix',
        valor_pago: valorPago,
        numeros_gerados: numerosTotal,
        status_pagamento: body.statusPagamento || 'pendente',
        elegivel: body.statusPagamento === 'confirmado',
      })
      .eq('id', existente.id)
      .select()
      .single();
    participante = data;
  } else {
    const { data } = await supabase
      .from('participantes')
      .insert({
        campanha_id: campanha.id,
        campanha_slug: campanha.slug,
        nome: body.nome,
        cpf,
        email: body.email,
        tel: body.tel || '',
        pacote: pkg.id,
        nome_pacote: pkg.nome,
        pagamento: body.pagamento || 'pix',
        valor_pago: pkg.valor,
        multiplicador_tipo: 'padrao',
        multiplicador_fator: 1,
        multiplicador_bonus: 0,
        numeros_gerados: numeros,
        status_pagamento: body.statusPagamento || 'pendente',
        elegivel: body.statusPagamento === 'confirmado',
      })
      .select()
      .single();
    participante = data;
  }

  await registrarNumerosUsados(numeros, campanha.id);
  await supabase
    .from('campanhas')
    .update({ numeros_vendidos: (campanha.numeros_vendidos || 0) + numeros.length })
    .eq('id', campanha.id);

  res.status(201).json({
    ok: true,
    participante: {
      nome: participante.nome,
      campanha: campanha.titulo,
      pacote: pkg.nome,
      numeros,
      status: participante.status_pagamento,
      chavePix: campanha.chave_pix,
    },
  });
});

module.exports = router;
