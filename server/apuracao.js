/**
 * Apuração conforme regulamento (Loteria Federal):
 * - Série: algarismo simples da DEZENA do 1º prêmio
 * - Elemento: unidades dos 5 primeiros prêmios (de cima para baixo)
 * - Aproximação: superior → inferior → próxima série (9 → 0)
 */

function normalizarPremio(val) {
  const s = String(val || '').replace(/\D/g, '');
  if (s.length !== 5) return null;
  return s;
}

function calcSerie(premio1) {
  const s = normalizarPremio(premio1);
  if (!s) throw new Error('1º prêmio inválido (5 dígitos).');
  return parseInt(s.slice(-2, -1), 10);
}

function calcElemento(premios) {
  if (!Array.isArray(premios) || premios.length !== 5) {
    throw new Error('Informe os 5 primeiros prêmios da Loteria Federal.');
  }
  const norm = premios.map(normalizarPremio);
  if (norm.some((p) => !p)) {
    throw new Error('Todos os prêmios devem ter exatamente 5 dígitos.');
  }
  return norm.map((p) => p.slice(-1)).join('');
}

function calcNumeroVencedor(premios) {
  const serie = calcSerie(premios[0]);
  const elemento = calcElemento(premios);
  return { serie, elemento, numero: `${serie}.${elemento}` };
}

function montarBaseNumeros(participantes) {
  const base = {};
  for (const p of participantes) {
    if (!p.elegivel) continue;
    const nums = p.numerosGerados || p.numeros_gerados || [];
    for (const num of nums) {
      const [s, e] = String(num).split('.');
      if (!s || e === undefined) continue;
      base[num] = {
        ...p,
        nome: p.nome,
        email: p.email,
        cpf: p.cpf,
        serie: parseInt(s, 10),
        elemento: parseInt(e, 10),
        elegivel: true,
      };
    }
  }
  return base;
}

function apurarGanhador(serieInicial, elementoInicial, baseDados, elementosPorSerie, log = []) {
  let serie = serieInicial;
  let elemento = elementoInicial;
  const maxElem = Number(elementosPorSerie) || 100000;
  const seriesVisitadas = new Set();

  while (true) {
    if (seriesVisitadas.has(serie)) {
      log.push(`ERRO: Voltou à série ${serie}. Nenhum ganhador encontrado.`);
      return { ganhador: null, numero: null, tipo: 'sem_ganhador' };
    }
    seriesVisitadas.add(serie);

    const chaveExata = `${serie}.${String(elemento).padStart(5, '0')}`;
    if (baseDados[chaveExata]) {
      log.push(`✅ GANHADOR EXATO: ${chaveExata}`);
      return { ganhador: baseDados[chaveExata], numero: chaveExata, tipo: 'exato' };
    }
    log.push(`Número exato ${chaveExata} não distribuído ou inelegível.`);

    log.push(`Buscando superior na série ${serie} a partir do elemento ${elemento + 1}...`);
    for (let e = elemento + 1; e < maxElem; e++) {
      const chave = `${serie}.${String(e).padStart(5, '0')}`;
      if (baseDados[chave]) {
        log.push(`✅ GANHADOR por aproximação SUPERIOR: ${chave}`);
        return { ganhador: baseDados[chave], numero: chave, tipo: 'aproximacao_superior' };
      }
    }

    log.push(`Nenhum superior. Buscando inferior na série ${serie}...`);
    for (let e = elemento - 1; e >= 0; e--) {
      const chave = `${serie}.${String(e).padStart(5, '0')}`;
      if (baseDados[chave]) {
        log.push(`✅ GANHADOR por aproximação INFERIOR: ${chave}`);
        return { ganhador: baseDados[chave], numero: chave, tipo: 'aproximacao_inferior' };
      }
    }

    const proxima = (serie + 1) % 10;
    log.push(`Série ${serie} sem ganhador. Avançando para série ${proxima}.`);
    serie = proxima;
    elemento = 0;
  }
}

function executarApuracao(premios, participantes, elementosPorSerie = 100000) {
  const log = [];
  const { serie, elemento, numero } = calcNumeroVencedor(premios);

  log.push('=== APURAÇÃO INICIADA ===');
  log.push(`Prêmios: [${premios.join(', ')}]`);
  log.push(`Série calculada: ${serie} (dezena do 1º prêmio)`);
  log.push(`Elemento calculado: ${elemento} (unidades dos 5 prêmios)`);
  log.push(`Número vencedor calculado: ${numero}`);
  log.push('---');

  const baseDados = montarBaseNumeros(participantes);
  const totalNums = Object.keys(baseDados).length;
  log.push(`Participantes elegíveis: ${participantes.filter((p) => p.elegivel).length}`);
  log.push(`Números elegíveis na base: ${totalNums}`);
  log.push('---');

  if (totalNums === 0) {
    log.push('ERRO: Nenhum participante elegível com números.');
    return {
      tipo: 'sem_ganhador',
      numero: null,
      ganhador: null,
      serie,
      elemento,
      numeroCalculado: numero,
      log,
    };
  }

  const resultado = apurarGanhador(serie, parseInt(elemento, 10), baseDados, elementosPorSerie, log);
  return {
    ...resultado,
    serie,
    elemento,
    numeroCalculado: numero,
    log,
  };
}

module.exports = {
  calcSerie,
  calcElemento,
  calcNumeroVencedor,
  montarBaseNumeros,
  apurarGanhador,
  executarApuracao,
};
