const express = require('express');
const supabase = require('../supabase');
const CONFIG_PADRAO = require('../configPadrao');
const { gerarNumerosAleatorios, registrarNumerosUsados } = require('../gerarNumeros');
const { requireAdmin } = require('../adminAuth');

const router = express.Router();

function toParticipanteJSON(row) {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    email: row.email,
    tel: row.tel,
    pacote: row.pacote,
    nomePacote: row.nome_pacote,
    pagamento: row.pagamento,
    valorPago: row.valor_pago,
    multiplicadorTipo: row.multiplicador_tipo,
    multiplicadorFator: row.multiplicador_fator,
    multiplicadorBonus: row.multiplicador_bonus,
    numerosGerados: row.numeros_gerados,
    statusPagamento: row.status_pagamento,
    elegivel: row.elegivel,
    campanhaSlug: row.campanha_slug,
    pedidoId: row.pedido_id,
    cashDepositId: row.cash_deposit_id,
    created_at: row.created_at,
  };
}

function cfgFromCampanha(c) {
  return {
    nome: c.titulo,
    totalSeries: c.total_series,
    elementosPorSerie: c.elementos_por_serie,
    serieInicial: c.serie_inicial,
    dataInicio: c.data_inicio,
    dataFim: c.data_fim,
    dataExtracao: c.data_extracao,
  };
}

async function getConfigDoc() {
  let { data: cfg } = await supabase
    .from('configs')
    .select('*')
    .eq('key', 'campanha')
    .maybeSingle();

  if (!cfg) {
    const { data: created } = await supabase
      .from('configs')
      .insert({ key: 'campanha', ...CONFIG_PADRAO })
      .select()
      .single();
    cfg = created;
  }

  const { id, key, created_at, updated_at, ...rest } = cfg;
  return rest;
}

async function resolveCampanha(slug) {
  if (slug) {
    const { data } = await supabase.from('campanhas').select('*').eq('slug', slug).maybeSingle();
    return data;
  }
  const { data } = await supabase
    .from('campanhas')
    .select('*')
    .eq('status', 'ativa')
    .order('ordem', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

router.get('/health', (_req, res) => {
  res.json({ ok: true, db: 'supabase' });
});

router.get('/bootstrap', requireAdmin, async (_req, res) => {
  const [configResult, participantesResult, numerosResult, apuracoesResult] = await Promise.all([
    getConfigDoc(),
    supabase.from('participantes').select('*').order('created_at', { ascending: false }),
    supabase.from('numeros_usados').select('numero'),
    supabase.from('apuracoes').select('*').order('created_at', { ascending: false }),
  ]);

  res.json({
    config: configResult,
    participantes: (participantesResult.data || []).map(toParticipanteJSON),
    numerosUsados: (numerosResult.data || []).map((n) => n.numero),
    apuracoes: (apuracoesResult.data || []).map((a) => ({
      ...a,
      dataApuracao: a.data_apuracao || a.created_at,
    })),
  });
});

router.get('/config', async (_req, res) => {
  res.json(await getConfigDoc());
});

router.put('/config', requireAdmin, async (req, res) => {
  const { data: cfg } = await supabase
    .from('configs')
    .upsert({ key: 'campanha', ...req.body, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single();
  const { id, key, created_at, updated_at, ...rest } = cfg;
  res.json(rest);
});

router.post('/participantes', requireAdmin, async (req, res) => {
  const body = req.body;
  const cpf = String(body.cpf || '').replace(/\D/g, '');

  if (!body.nome || !cpf || !body.email || !body.pacote) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, CPF, e-mail, pacote.' });
  }
  if (cpf.length !== 11) {
    return res.status(400).json({ error: 'CPF inválido.' });
  }

  const campanha = await resolveCampanha(body.campanhaSlug);
  if (!campanha) {
    return res.status(404).json({ error: 'Campanha não encontrada.' });
  }

  const { data: existente } = await supabase
    .from('participantes')
    .select('nome')
    .eq('campanha_id', campanha.id)
    .eq('cpf', cpf)
    .maybeSingle();

  if (existente) {
    return res.status(409).json({ error: `CPF já cadastrado nesta campanha! (${existente.nome})` });
  }

  const cfg = cfgFromCampanha(campanha);
  const qtd = body.quantidadeNumeros;
  if (!qtd || qtd < 1) {
    return res.status(400).json({ error: 'quantidadeNumeros inválida.' });
  }

  const { numeros, log, erro } = await gerarNumerosAleatorios(qtd, cfg, campanha.id);
  if (erro || numeros.length === 0) {
    return res.status(400).json({ error: 'Erro na geração de números.', log });
  }

  const { data: participante, error: errP } = await supabase
    .from('participantes')
    .insert({
      campanha_id: campanha.id,
      campanha_slug: campanha.slug,
      nome: body.nome,
      cpf,
      email: body.email,
      tel: body.tel || '',
      pacote: body.pacote,
      nome_pacote: body.nomePacote,
      pagamento: body.pagamento,
      valor_pago: body.valorPago,
      multiplicador_tipo: body.multiplicadorTipo,
      multiplicador_fator: body.multiplicadorFator,
      multiplicador_bonus: body.multiplicadorBonus,
      numeros_gerados: numeros,
      status_pagamento: body.statusPagamento,
      elegivel: body.elegivel,
    })
    .select()
    .single();

  if (errP) return res.status(500).json({ error: errP.message });

  await registrarNumerosUsados(numeros, campanha.id);
  await supabase
    .from('campanhas')
    .update({ numeros_vendidos: (campanha.numeros_vendidos || 0) + numeros.length })
    .eq('id', campanha.id);

  res.status(201).json({ participante: toParticipanteJSON(participante), log });
});

router.patch('/participantes/:id', requireAdmin, async (req, res) => {
  const updates = {};
  if (req.body.statusPagamento !== undefined) updates.status_pagamento = req.body.statusPagamento;
  if (req.body.elegivel !== undefined) updates.elegivel = req.body.elegivel;

  const { data: p, error } = await supabase
    .from('participantes')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !p) return res.status(404).json({ error: 'Participante não encontrado.' });
  res.json(toParticipanteJSON(p));
});

router.post('/participantes/cancelar-lote', requireAdmin, async (req, res) => {
  const ids = req.body.ids || [];
  if (!ids.length) return res.status(400).json({ error: 'Nenhum ID informado.' });

  await supabase
    .from('participantes')
    .update({ status_pagamento: 'cancelado', elegivel: false })
    .in('id', ids);

  const { data: lista } = await supabase
    .from('participantes')
    .select('*')
    .order('created_at', { ascending: false });

  res.json({ participantes: (lista || []).map(toParticipanteJSON) });
});

router.post('/apuracoes', requireAdmin, async (req, res) => {
  const body = req.body;
  const { data: ap, error } = await supabase
    .from('apuracoes')
    .insert({
      campanha_id: body.campanhaId || null,
      campanha_slug: body.campanhaSlug || null,
      tipo: body.tipo,
      numero: body.numero,
      premios: body.premios || [],
      data_apuracao: body.dataApuracao || new Date().toISOString(),
      log: body.log || [],
      ganhador_nome: body.ganhador?.nome || null,
      ganhador_email: body.ganhador?.email || null,
      ganhador_cpf: body.ganhador?.cpf || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(ap);
});

router.delete('/reset', requireAdmin, async (_req, res) => {
  await Promise.all([
    supabase.from('participantes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('numeros_usados').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('apuracoes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
  ]);
  res.json({ ok: true });
});

module.exports = router;
