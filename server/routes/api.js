const express = require('express');
const supabase = require('../supabase');
const CONFIG_PADRAO = require('../configPadrao');
const { gerarNumerosAleatorios, registrarNumerosUsados } = require('../gerarNumeros');
const { requireAdmin } = require('../adminAuth');
const { calcNumeroVencedor, executarApuracao } = require('../apuracao');

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
    dataApuracao: c.data_extracao,
  };
}

function configBodyToRow(body) {
  return {
    nome: body.nome,
    total_series: body.totalSeries,
    elementos_por_serie: body.elementosPorSerie,
    serie_inicial: body.serieInicial,
    data_inicio: body.dataInicio,
    data_fim: body.dataFim,
    data_extracao: body.dataExtracao,
    data_apuracao: body.dataApuracao,
  };
}

function configRowToApi(row) {
  if (!row) return { ...CONFIG_PADRAO };
  return {
    nome: row.nome,
    totalSeries: row.total_series,
    elementosPorSerie: row.elementos_por_serie,
    serieInicial: row.serie_inicial,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    dataExtracao: row.data_extracao,
    dataApuracao: row.data_apuracao,
  };
}

async function getConfigDoc() {
  const { data: cfg, error } = await supabase
    .from('configs')
    .select('*')
    .eq('key', 'campanha')
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (cfg) return configRowToApi(cfg);

  const row = { key: 'campanha', ...configBodyToRow(CONFIG_PADRAO) };
  const { data: created, error: errIns } = await supabase
    .from('configs')
    .insert(row)
    .select()
    .single();

  if (created) return configRowToApi(created);

  // Fallback: usa campanha ativa se configs falhar
  const campanha = await resolveCampanha();
  if (campanha) return cfgFromCampanha(campanha);

  if (errIns) throw new Error(errIns.message);
  return { ...CONFIG_PADRAO };
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
  try {
    const [configResult, participantesResult, numerosResult, apuracoesResult] = await Promise.all([
      getConfigDoc(),
      supabase.from('participantes').select('*').order('created_at', { ascending: false }),
      supabase.from('numeros_usados').select('numero'),
      supabase.from('apuracoes').select('*').order('created_at', { ascending: false }),
    ]);

    if (participantesResult.error) throw new Error(participantesResult.error.message);
    if (numerosResult.error) throw new Error(numerosResult.error.message);
    if (apuracoesResult.error) throw new Error(apuracoesResult.error.message);

    res.json({
      config: configResult,
      participantes: (participantesResult.data || []).map(toParticipanteJSON),
      numerosUsados: (numerosResult.data || []).map((n) => n.numero),
      apuracoes: (apuracoesResult.data || []).map((a) => ({
        ...a,
        dataApuracao: a.data_apuracao || a.created_at,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erro ao carregar dados do Supabase.' });
  }
});

router.get('/config', async (_req, res) => {
  res.json(await getConfigDoc());
});

router.put('/config', requireAdmin, async (req, res) => {
  const { data: cfg, error } = await supabase
    .from('configs')
    .upsert(
      { key: 'campanha', ...configBodyToRow(req.body), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    .select()
    .single();
  if (error || !cfg) return res.status(500).json({ error: error?.message || 'Erro ao salvar config.' });
  res.json(configRowToApi(cfg));
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
    .select('*')
    .eq('campanha_id', campanha.id)
    .eq('cpf', cpf)
    .maybeSingle();

  const cfg = cfgFromCampanha(campanha);
  const qtd = body.quantidadeNumeros;
  if (!qtd || qtd < 1) {
    return res.status(400).json({ error: 'quantidadeNumeros inválida.' });
  }

  const { numeros, log, erro } = await gerarNumerosAleatorios(qtd, cfg, campanha.id);
  if (erro || numeros.length === 0) {
    return res.status(400).json({ error: 'Erro na geração de números.', log });
  }

  let participante;
  let errP;

  if (existente) {
    const numerosTotal = [...(existente.numeros_gerados || []), ...numeros];
    const valorPago = Number(existente.valor_pago || 0) + Number(body.valorPago || 0);
    const resUp = await supabase
      .from('participantes')
      .update({
        nome: body.nome,
        email: body.email,
        tel: body.tel || existente.tel || '',
        pacote: body.pacote,
        nome_pacote: body.nomePacote,
        pagamento: body.pagamento,
        valor_pago: valorPago,
        multiplicador_tipo: body.multiplicadorTipo,
        multiplicador_fator: body.multiplicadorFator,
        multiplicador_bonus: body.multiplicadorBonus,
        numeros_gerados: numerosTotal,
        status_pagamento: body.statusPagamento,
        elegivel: body.elegivel,
      })
      .eq('id', existente.id)
      .select()
      .single();
    participante = resUp.data;
    errP = resUp.error;
  } else {
    const resIn = await supabase
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
    participante = resIn.data;
    errP = resIn.error;
  }

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

router.post('/apurar', requireAdmin, async (req, res) => {
  const premios = req.body.premios;
  if (!Array.isArray(premios) || premios.length !== 5) {
    return res.status(400).json({ error: 'Informe os 5 primeiros prêmios da Loteria Federal.' });
  }

  const campanha = await resolveCampanha(req.body.campanhaSlug);
  if (!campanha) return res.status(404).json({ error: 'Campanha não encontrada.' });

  const { data: participantes } = await supabase
    .from('participantes')
    .select('*')
    .eq('campanha_id', campanha.id)
    .eq('elegivel', true);

  const lista = (participantes || []).map(toParticipanteJSON);
  const resultado = executarApuracao(premios, lista, campanha.elementos_por_serie);

  let apuracaoSalva = null;
  if (resultado.ganhador) {
    const { data: ap } = await supabase
      .from('apuracoes')
      .insert({
        campanha_id: campanha.id,
        campanha_slug: campanha.slug,
        tipo: resultado.tipo,
        numero: resultado.numero,
        premios,
        data_apuracao: new Date().toISOString(),
        log: resultado.log,
        ganhador_nome: resultado.ganhador.nome,
        ganhador_email: resultado.ganhador.email,
        ganhador_cpf: resultado.ganhador.cpf,
      })
      .select()
      .single();
    apuracaoSalva = ap;
  }

  res.json({
    ...resultado,
    campanhaSlug: campanha.slug,
    apuracaoId: apuracaoSalva?.id || null,
    ganhador: resultado.ganhador
      ? { nome: resultado.ganhador.nome, email: resultado.ganhador.email, cpf: resultado.ganhador.cpf }
      : null,
  });
});

router.get('/apuracao/preview', requireAdmin, (req, res) => {
  try {
    const premios = String(req.query.premios || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (premios.length !== 5) {
      return res.status(400).json({ error: 'Informe 5 prêmios separados por vírgula.' });
    }
    res.json(calcNumeroVencedor(premios));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
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
