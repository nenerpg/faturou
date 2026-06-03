const supabase = require('./supabase');

async function gerarNumerosAleatorios(quantidade, cfg, campanhaId) {
  const { data: usadosDocs } = await supabase
    .from('numeros_usados')
    .select('numero')
    .eq('campanha_id', campanhaId);

  const usados = new Set((usadosDocs || []).map((d) => d.numero));
  const maxNumeros = cfg.totalSeries * cfg.elementosPorSerie;
  const gerados = [];
  const log = [];

  log.push(`Iniciando geração de ${quantidade} número(s)...`);
  log.push(
    `Série inicial: ${cfg.serieInicial} | Total séries: ${cfg.totalSeries} | Elementos/série: ${cfg.elementosPorSerie.toLocaleString('pt-BR')}`
  );
  log.push(
    `Números já usados na campanha: ${usados.size.toLocaleString('pt-BR')} / ${maxNumeros.toLocaleString('pt-BR')}`
  );

  if (usados.size + quantidade > maxNumeros) {
    log.push(`ERRO: Campanha lotada! Máximo: ${maxNumeros.toLocaleString('pt-BR')}`);
    return { numeros: [], log, erro: true };
  }

  let tentativas = 0;
  const batchSet = new Set();

  while (gerados.length < quantidade) {
    tentativas++;
    if (tentativas > quantidade * 100) {
      log.push('ERRO: Muitas tentativas. Campanha pode estar quase lotada.');
      break;
    }

    const serie = cfg.serieInicial + Math.floor(Math.random() * cfg.totalSeries);
    const elemento = Math.floor(Math.random() * cfg.elementosPorSerie);
    const numero = `${serie}.${String(elemento).padStart(5, '0')}`;

    if (!usados.has(numero) && !batchSet.has(numero)) {
      gerados.push(numero);
      usados.add(numero);
      batchSet.add(numero);
      log.push(`  Gerado: ${numero}  (série ${serie}, elemento ${String(elemento).padStart(5, '0')})`);
    }
  }

  log.push(`Geração concluída: ${gerados.length} número(s) em ${tentativas} tentativa(s).`);
  return { numeros: gerados, log, erro: gerados.length < quantidade };
}

async function registrarNumerosUsados(numeros, campanhaId) {
  if (!numeros.length) return;
  const rows = numeros.map((numero) => ({ campanha_id: campanhaId, numero }));
  await supabase.from('numeros_usados').upsert(rows, { ignoreDuplicates: true });
}

module.exports = { gerarNumerosAleatorios, registrarNumerosUsados };
