const express = require('express');
const supabase = require('../supabase');

const router = express.Router();

const { PACOTES_PADRAO } = require('../pacotesCheckout');

// camelCase (API) -> snake_case (coluna do banco)
const FIELD_MAP = {
  slug: 'slug',
  titulo: 'titulo',
  subtitulo: 'subtitulo',
  descricao: 'descricao',
  premioNome: 'premio_nome',
  premioImagem: 'premio_imagem',
  valorPremioEstimado: 'valor_premio_estimado',
  heroDesktop: 'hero_desktop',
  heroMobile: 'hero_mobile',
  status: 'status',
  destaque: 'destaque',
  ordem: 'ordem',
  dataInicio: 'data_inicio',
  dataFim: 'data_fim',
  dataExtracao: 'data_extracao',
  totalSeries: 'total_series',
  elementosPorSerie: 'elementos_por_serie',
  serieInicial: 'serie_inicial',
  totalNumerosDisplay: 'total_numeros_display',
  pacotes: 'pacotes',
  chavePix: 'chave_pix',
  whatsapp: 'whatsapp',
};

function toRow(body) {
  const row = {};
  for (const [camel, snake] of Object.entries(FIELD_MAP)) {
    if (body[camel] !== undefined) row[snake] = body[camel];
  }
  return row;
}

function toCampanhaAdmin(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    titulo: row.titulo,
    subtitulo: row.subtitulo,
    descricao: row.descricao,
    premioNome: row.premio_nome,
    premioImagem: row.premio_imagem,
    valorPremioEstimado: row.valor_premio_estimado,
    heroDesktop: row.hero_desktop,
    heroMobile: row.hero_mobile,
    status: row.status,
    destaque: row.destaque,
    ordem: row.ordem,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    dataExtracao: row.data_extracao,
    totalSeries: row.total_series,
    elementosPorSerie: row.elementos_por_serie,
    serieInicial: row.serie_inicial,
    totalNumerosDisplay: row.total_numeros_display,
    numerosVendidos: row.numeros_vendidos,
    pacotes: row.pacotes || [],
    chavePix: row.chave_pix,
    whatsapp: row.whatsapp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('campanhas')
    .select('*')
    .order('ordem', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(toCampanhaAdmin));
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('campanhas')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Campanha não encontrada.' });
  res.json(toCampanhaAdmin(data));
});

router.post('/', async (req, res) => {
  const row = toRow(req.body);

  if (!row.titulo) return res.status(400).json({ error: 'Informe o título da campanha.' });
  if (!row.slug) row.slug = slugify(row.titulo);

  const { data: existente } = await supabase
    .from('campanhas')
    .select('id')
    .eq('slug', row.slug)
    .maybeSingle();
  if (existente) return res.status(409).json({ error: `Já existe uma campanha com o slug "${row.slug}".` });

  if (row.status === undefined) row.status = 'rascunho';
  if (!row.pacotes || !row.pacotes.length) row.pacotes = PACOTES_PADRAO;
  if (row.numeros_vendidos === undefined) row.numeros_vendidos = 0;

  const { data, error } = await supabase
    .from('campanhas')
    .insert(row)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(toCampanhaAdmin(data));
});

router.put('/:id', async (req, res) => {
  const row = toRow(req.body);
  row.updated_at = new Date().toISOString();

  if (row.slug) {
    const { data: outra } = await supabase
      .from('campanhas')
      .select('id')
      .eq('slug', row.slug)
      .neq('id', req.params.id)
      .maybeSingle();
    if (outra) return res.status(409).json({ error: `Outra campanha já usa o slug "${row.slug}".` });
  }

  const { data, error } = await supabase
    .from('campanhas')
    .update(row)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Campanha não encontrada.' });
  res.json(toCampanhaAdmin(data));
});

router.post('/:id/iniciar', async (req, res) => {
  const dias = Number(req.body.dias);
  if (!dias || dias <= 0) return res.status(400).json({ error: 'Informe a duração em dias.' });

  const agora = new Date();
  const fim = new Date(agora.getTime() + dias * 86400000);

  const { data, error } = await supabase
    .from('campanhas')
    .update({
      status: 'ativa',
      data_inicio: agora.toISOString().slice(0, 10),
      data_fim: fim.toISOString(),
      updated_at: agora.toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Campanha não encontrada.' });
  res.json(toCampanhaAdmin(data));
});

router.post('/:id/encerrar', async (req, res) => {
  const { data, error } = await supabase
    .from('campanhas')
    .update({ status: 'encerrada', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Campanha não encontrada.' });
  res.json(toCampanhaAdmin(data));
});

router.delete('/:id', async (req, res) => {
  const { count } = await supabase
    .from('participantes')
    .select('*', { count: 'exact', head: true })
    .eq('campanha_id', req.params.id);

  if (count && count > 0) {
    return res.status(409).json({
      error: `Esta campanha tem ${count} participante(s). Encerre-a em vez de excluir.`,
    });
  }

  await supabase.from('numeros_usados').delete().eq('campanha_id', req.params.id);
  const { error } = await supabase.from('campanhas').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;
