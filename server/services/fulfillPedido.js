const supabase = require('../supabase');
const { gerarNumerosAleatorios, registrarNumerosUsados } = require('../gerarNumeros');
const { sendNumerosEmail } = require('./email');

function cfgFromCampanha(c) {
  return {
    totalSeries: c.total_series,
    elementosPorSerie: c.elementos_por_serie,
    serieInicial: c.serie_inicial,
  };
}

async function fulfillPedido(pedido, cashDepositId, amountCentavos) {
  if (pedido.status === 'pago') {
    const { data: existing } = await supabase
      .from('participantes')
      .select('*')
      .eq('pedido_id', pedido.order_id)
      .maybeSingle();

    if (existing) {
      return { alreadyFulfilled: true, participante: existing, numeros: existing.numeros_gerados };
    }
  }

  const { data: campanha } = await supabase
    .from('campanhas')
    .select('*')
    .eq('id', pedido.campanha_id)
    .single();

  if (!campanha) {
    throw new Error('Campanha do pedido não encontrada.');
  }

  const pkg = campanha.pacotes.find((p) => p.id === pedido.pacote_id);
  if (!pkg) {
    throw new Error('Pacote do pedido inválido.');
  }

  if (amountCentavos != null && amountCentavos !== pedido.amount_centavos) {
    const diff = Math.abs(amountCentavos - pedido.amount_centavos);
    const tolerancia = Math.max(50, Math.round(pedido.amount_centavos * 0.05));
    if (diff > tolerancia) {
      throw new Error(
        `Valor do pagamento (${amountCentavos}) não confere com o pedido (${pedido.amount_centavos}).`
      );
    }
    console.warn(
      `[fulfill] valor divergente aceito (${amountCentavos} vs ${pedido.amount_centavos}) — checkout hospedado`
    );
  }

  const { data: existenteParticipante } = await supabase
    .from('participantes')
    .select('id, nome')
    .eq('campanha_id', campanha.id)
    .eq('cpf', pedido.cpf)
    .maybeSingle();

  if (existenteParticipante) {
    throw new Error(`CPF já participa desta campanha (${existenteParticipante.nome}).`);
  }

  if (cashDepositId) {
    const { data: existenteDeposito } = await supabase
      .from('participantes')
      .select('*')
      .eq('cash_deposit_id', cashDepositId)
      .maybeSingle();

    if (existenteDeposito) {
      return {
        alreadyFulfilled: true,
        participante: existenteDeposito,
        numeros: existenteDeposito.numeros_gerados,
      };
    }
  }

  const qtd = pkg.numeros;
  const { numeros, erro } = await gerarNumerosAleatorios(qtd, cfgFromCampanha(campanha), campanha.id);

  if (erro || !numeros.length) {
    throw new Error('Erro ao gerar números da sorte.');
  }

  const { data: participante, error: errP } = await supabase
    .from('participantes')
    .insert({
      campanha_id: campanha.id,
      campanha_slug: campanha.slug,
      pedido_id: pedido.order_id,
      cash_deposit_id: cashDepositId || null,
      nome: pedido.nome,
      cpf: pedido.cpf,
      email: pedido.email,
      tel: pedido.tel || '',
      pacote: pkg.id,
      nome_pacote: pkg.nome,
      pagamento: 'pix',
      valor_pago: pkg.valor,
      multiplicador_tipo: 'padrao',
      multiplicador_fator: 1,
      multiplicador_bonus: 0,
      numeros_gerados: numeros,
      status_pagamento: 'confirmado',
      elegivel: true,
    })
    .select()
    .single();

  if (errP) throw new Error(`Erro ao criar participante: ${errP.message}`);

  await registrarNumerosUsados(numeros, campanha.id);

  await supabase
    .from('campanhas')
    .update({ numeros_vendidos: (campanha.numeros_vendidos || 0) + numeros.length })
    .eq('id', campanha.id);

  await supabase
    .from('pedidos')
    .update({ status: 'pago', cash_deposit_id: cashDepositId || null })
    .eq('id', pedido.id);

  try {
    await sendNumerosEmail({
      to: pedido.email,
      nome: pedido.nome,
      campanhaTitulo: campanha.titulo,
      pacoteNome: pkg.nome,
      numeros,
    });
  } catch (emailErr) {
    console.error('[email] Falha ao enviar:', emailErr.message);
  }

  return { participante, numeros, campanha, pkg };
}

module.exports = { fulfillPedido, cfgFromCampanha };
