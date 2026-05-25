/* ============================================
   RIFATECH PRO — app.js
   iPhone 16 Pro Max Raffle Site
   ============================================ */

// ===== CONFIG =====
const CONFIG = {
  // Datas da campanha — ajuste conforme autorização SPA
  dataFimCampanha: new Date('2026-08-01T23:59:59'),
  dataLancamento: new Date('2026-05-25T00:00:00'),
  diasLancamento: 10,
  totalNumeros: 1000,
  numerosVendidos: 347,

  // Pacotes
  pacotes: {
    popular: { nome: 'Pacote Básico',  numeros: 5,  valor: 19.90, tag: 'Popular' },
    prata:   { nome: 'Pacote Prata',   numeros: 12, valor: 39.90, tag: 'Prata'   },
    ouro:    { nome: 'Pacote Ouro',    numeros: 20, valor: 59.90, tag: 'Ouro'    },
    elite:   { nome: 'Pacote Elite',   numeros: 50, valor: 99.90, tag: 'Elite'   },
  },

  // Multiplicadores
  multiplicadores: {
    lancamento10:  3,
    lancamento11:  5, // base + 5 bônus
    app:           3,
    prime:         6,
    assinante:     3,
    turbo:         2,
  },

  // Chave PIX (exemplo)
  chavePix: '11999999999',
  whatsapp: '5511999999999',
};

// ===== UTILITÁRIOS =====
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const fmt = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const pad = (n) => String(n).padStart(2, '0');

function calcMultiplicador(tag, pagamento, diasDesdeLancamento) {
  // Hierarquia: TURBO > LANÇAMENTO > APP/ASSINANTE
  if ((tag === 'Elite') && (pagamento === 'pix' || pagamento === 'cartao')) {
    return { fator: CONFIG.multiplicadores.turbo, tipo: 'TURBO' };
  }
  if (diasDesdeLancamento <= 10) {
    return { fator: CONFIG.multiplicadores.lancamento10, tipo: 'LANÇAMENTO 3x' };
  }
  if (diasDesdeLancamento <= 17) {
    return { fator: null, bonus: 5, tipo: 'LANÇAMENTO +5' };
  }
  return { fator: 1, tipo: 'padrão' };
}

function calcNumerosFinais(baseNumeros, pagamento, tag, diasDesdeLancamento) {
  const mult = calcMultiplicador(tag, pagamento, diasDesdeLancamento);
  if (mult.fator) return baseNumeros * mult.fator;
  if (mult.bonus) return baseNumeros + mult.bonus;
  return baseNumeros;
}

function diasDesdeLancamento() {
  const agora = new Date();
  const diff = agora - CONFIG.dataLancamento;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ===== COUNTDOWN PRINCIPAL =====
function initCountdown() {
  const els = {
    dias:  $('#cd-dias'),
    horas: $('#cd-horas'),
    min:   $('#cd-min'),
    seg:   $('#cd-seg'),
  };
  if (!els.dias) return;

  function tick() {
    const diff = CONFIG.dataFimCampanha - new Date();
    if (diff <= 0) {
      Object.values(els).forEach(el => { if (el) el.textContent = '00'; });
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (els.dias)  els.dias.textContent  = pad(d);
    if (els.horas) els.horas.textContent = pad(h);
    if (els.min)   els.min.textContent   = pad(m);
    if (els.seg)   els.seg.textContent   = pad(s);
  }
  tick();
  setInterval(tick, 1000);
}

// ===== COUNTDOWN LANÇAMENTO (banner) =====
function initLaunchCountdown() {
  const el = $('#launchCountdown');
  if (!el) return;

  const fimLancamento = new Date(CONFIG.dataLancamento);
  fimLancamento.setDate(fimLancamento.getDate() + CONFIG.diasLancamento);

  function tick() {
    const diff = fimLancamento - new Date();
    if (diff <= 0) {
      el.textContent = 'EXPIRADA';
      const banner = $('.launch-banner');
      if (banner) banner.style.opacity = '0.4';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = `${d}d ${pad(h)}h ${pad(m)}min`;
  }
  tick();
  setInterval(tick, 30000);
}

// ===== BARRA DE PROGRESSO ANIMADA =====
function initProgress() {
  const bar  = $('#progressBar');
  const num  = $('#numVendidos');
  const pct  = $('#progressPct');
  if (!bar) return;

  // Simula pequenas variações para parecer ao vivo
  let vendidos = CONFIG.numerosVendidos;

  function update() {
    const p = ((vendidos / CONFIG.totalNumeros) * 100).toFixed(1);
    if (bar) bar.style.width = p + '%';
    if (num) num.textContent = vendidos.toLocaleString('pt-BR');
    if (pct) pct.textContent = p.replace('.', ',') + '%';
  }
  update();

  // Incrementa aleatoriamente a cada 20-40s (simulação de venda ao vivo)
  function autoIncrement() {
    if (vendidos < CONFIG.totalNumeros) {
      const inc = Math.floor(Math.random() * 3) + 1;
      vendidos = Math.min(vendidos + inc, CONFIG.totalNumeros);
      update();
    }
    const next = (Math.random() * 20000) + 20000;
    setTimeout(autoIncrement, next);
  }
  setTimeout(autoIncrement, 25000);
}

// ===== MENU HAMBURGER =====
function initHamburger() {
  const btn  = $('#hamburger');
  const menu = $('#navMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    menu.classList.toggle('open');
    btn.classList.toggle('active');
  });

  // Fecha ao clicar em link
  $$('a', menu).forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      btn.classList.remove('active');
    });
  });
}

// ===== FAQ ACCORDION =====
function initFAQ() {
  $$('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      // Fecha todos
      $$('.faq-item').forEach(i => i.classList.remove('open'));
      // Abre clicado (se estava fechado)
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ===== SELEÇÃO DE PACOTE (botões na grade) =====
function initPackageButtons() {
  const select = $('#pacoteSelect');
  $$('.pkg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pkg = btn.dataset.pkg;
      if (select) {
        select.value = pkg;
        select.dispatchEvent(new Event('change'));
      }
      // Scroll suave para o checkout
      const target = $('#comprar');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ===== RESUMO DO PEDIDO (sidebar) =====
function initCheckoutSummary() {
  const select  = $('#pacoteSelect');
  const pmRadios = $$('input[name="pagamento"]');
  if (!select) return;

  function update() {
    const pkg  = select.value;
    const pago = ($$('input[name="pagamento"]').find(r => r.checked) || {}).value || 'pix';
    const dados = CONFIG.pacotes[pkg];
    const dias  = diasDesdeLancamento();

    const nameEl   = $('#summaryPkgName');
    const numEl    = $('#summaryNumeros');
    const valorEl  = $('#summaryValor');
    const pixEl    = $('#summaryPix');

    if (!dados) {
      if (nameEl)  nameEl.textContent  = 'Nenhum pacote selecionado';
      if (numEl)   numEl.textContent   = '—';
      if (valorEl) valorEl.textContent = '—';
      return;
    }

    const numerosFinais = calcNumerosFinais(dados.numeros, pago, dados.tag, dias);
    const mult = calcMultiplicador(dados.tag, pago, dias);

    let numTexto = `${numerosFinais}`;
    if (mult.tipo !== 'padrão') numTexto += ` 🔥 (${mult.tipo})`;

    if (nameEl)  nameEl.textContent  = dados.nome;
    if (numEl)   numEl.textContent   = numTexto;
    if (valorEl) valorEl.textContent = `R$ ${fmt(dados.valor)}`;

    if (pixEl) {
      if (pago === 'pix') {
        pixEl.innerHTML = `
          <p>💠 <strong>Chave PIX:</strong></p>
          <p style="font-size:1.1rem;font-weight:700;color:var(--primary-light);letter-spacing:1px">${CONFIG.chavePix}</p>
          <p style="color:var(--text-muted);font-size:0.78rem">Após o pagamento, seus números chegam automaticamente por e-mail.</p>
        `;
      } else {
        pixEl.innerHTML = `
          <p>💳 <strong>Pagamento por cartão</strong></p>
          <p style="color:var(--text-muted);font-size:0.78rem">Processamento seguro. Seus números chegam após aprovação.</p>
        `;
      }
    }
  }

  select.addEventListener('change', update);
  pmRadios.forEach(r => r.addEventListener('change', update));
  update();
}

// ===== MÁSCARA DE CPF =====
function maskCPF(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    input.value = v;
  });
}

// ===== MÁSCARA DE TELEFONE =====
function maskPhone(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (v.length > 6) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    input.value = v;
  });
}

// ===== VALIDAÇÃO DE CPF =====
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let r = 11 - (sum % 11);
  if (r >= 10) r = 0;
  if (r !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  r = 11 - (sum % 11);
  if (r >= 10) r = 0;
  return r === parseInt(cpf[10]);
}

// ===== FORM SUBMIT =====
function initCheckoutForm() {
  const form = $('#checkoutForm');
  if (!form) return;

  const cpfInput = form.querySelector('input[name="cpf"]');
  const telInput = form.querySelector('input[name="telefone"]');
  if (cpfInput) maskCPF(cpfInput);
  if (telInput) maskPhone(telInput);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form));

    // Validações
    if (!validarCPF(data.cpf)) {
      showToast('❌ CPF inválido. Verifique e tente novamente.', 'error');
      cpfInput && cpfInput.focus();
      return;
    }

    const nascimento = new Date(data.nascimento);
    const idade = (new Date() - nascimento) / (365.25 * 24 * 3600 * 1000);
    if (idade < 18) {
      showToast('❌ É necessário ter 18 anos ou mais para participar.', 'error');
      return;
    }

    if (!data.pacote) {
      showToast('❌ Selecione um pacote para continuar.', 'error');
      return;
    }

    // Calcula números finais
    const pkg    = CONFIG.pacotes[data.pacote];
    const dias   = diasDesdeLancamento();
    const numeros = calcNumerosFinais(pkg.numeros, data.pagamento, pkg.tag, dias);
    const mult   = calcMultiplicador(pkg.tag, data.pagamento, dias);

    // Mostra modal de confirmação
    showConfirmModal(data, pkg, numeros, mult);
  });
}

// ===== MODAL DE CONFIRMAÇÃO =====
function showConfirmModal(data, pkg, numerosFinais, mult) {
  const overlay = $('#modalOverlay');
  const content = $('#modalContent');
  if (!overlay || !content) return;

  const pixInfo = data.pagamento === 'pix'
    ? `<div class="pix-box">
        <p>💠 <strong>Chave PIX para pagamento:</strong></p>
        <p class="pix-key">${CONFIG.chavePix}</p>
        <p class="pix-hint">Copie a chave, realize o pagamento e aguarde a confirmação por e-mail.</p>
       </div>`
    : `<div class="pix-box">
        <p>💳 <strong>Pagamento por Cartão de Crédito</strong></p>
        <p class="pix-hint">Você será redirecionado para o gateway de pagamento seguro.</p>
       </div>`;

  content.innerHTML = `
    <h2 style="color:var(--white);margin-bottom:8px;font-size:1.4rem">✅ Confirme seu Pedido</h2>
    <p style="color:var(--text-muted);margin-bottom:24px;font-size:0.9rem">Revise os dados antes de finalizar</p>
    <div class="confirm-grid">
      <div class="confirm-row"><span>👤 Nome</span><strong>${data.nome}</strong></div>
      <div class="confirm-row"><span>📧 E-mail</span><strong>${data.email}</strong></div>
      <div class="confirm-row"><span>📦 Pacote</span><strong>${pkg.nome}</strong></div>
      <div class="confirm-row"><span>🎲 Números</span><strong style="color:var(--accent)">${numerosFinais} números${mult.tipo !== 'padrão' ? ' 🔥 ' + mult.tipo : ''}</strong></div>
      <div class="confirm-row"><span>💰 Valor</span><strong style="color:var(--gold)">R$ ${fmt(pkg.valor)}</strong></div>
      <div class="confirm-row"><span>💳 Pagamento</span><strong>${data.pagamento === 'pix' ? '💠 PIX' : '💳 Cartão'}</strong></div>
    </div>
    ${pixInfo}
    <div style="display:flex;gap:12px;margin-top:24px">
      <button onclick="closeModal()" class="btn btn-ghost" style="flex:1">Voltar</button>
      <button onclick="finalizarPedido()" class="btn btn-primary" style="flex:2">🎯 CONFIRMAR PAGAMENTO</button>
    </div>
    <p style="font-size:0.75rem;color:var(--text-muted);text-align:center;margin-top:12px">
      Seus números chegam por e-mail em até 5 minutos após confirmação do pagamento
    </p>
  `;

  // Estilos dinâmicos para o modal
  const style = document.createElement('style');
  style.textContent = `
    .confirm-grid { display:flex;flex-direction:column;gap:10px;margin-bottom:20px; }
    .confirm-row { display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.04);border-radius:8px;font-size:0.88rem; }
    .confirm-row span { color:var(--text-muted); }
    .confirm-row strong { color:var(--text); }
    .pix-box { background:rgba(108,99,255,0.1);border:1px solid var(--card-border);border-radius:10px;padding:18px;text-align:center; }
    .pix-key { font-size:1.4rem;font-weight:800;color:var(--primary-light);letter-spacing:2px;margin:10px 0;cursor:pointer; }
    .pix-key:hover { color:var(--white); }
    .pix-hint { font-size:0.8rem;color:var(--text-muted); }
  `;
  document.head.appendChild(style);

  overlay.classList.add('active');

  // Copiar chave PIX ao clicar
  const pixKey = content.querySelector('.pix-key');
  if (pixKey) {
    pixKey.title = 'Clique para copiar';
    pixKey.addEventListener('click', () => {
      navigator.clipboard.writeText(CONFIG.chavePix).then(() => {
        showToast('📋 Chave PIX copiada!', 'success');
      });
    });
  }
}

window.closeModal = function() {
  const overlay = $('#modalOverlay');
  if (overlay) overlay.classList.remove('active');
};

window.finalizarPedido = function() {
  closeModal();
  showToast('🎉 Pedido confirmado! Verifique seu e-mail para os próximos passos.', 'success');
  // Aqui: integrar com backend / gateway de pagamento
  console.log('[RifaTech] Pedido enviado para processamento');
};

// Fechar modal ao clicar fora
document.addEventListener('DOMContentLoaded', () => {
  const overlay = $('#modalOverlay');
  const closeBtn = $('#modalClose');
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
});

// ===== TOAST NOTIFICATIONS =====
function showToast(msg, type = 'info') {
  const existing = $('.toast-container');
  const container = existing || (() => {
    const c = document.createElement('div');
    c.className = 'toast-container';
    c.style.cssText = 'position:fixed;bottom:100px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(c);
    return c;
  })();

  const colors = { success: '#00D4AA', error: '#FF4757', info: '#6C63FF', warning: '#FFB347' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    background:var(--dark-2);
    border:1px solid ${colors[type]};
    border-left:4px solid ${colors[type]};
    color:var(--text);
    padding:14px 20px;
    border-radius:10px;
    font-size:0.88rem;
    max-width:320px;
    box-shadow:0 4px 20px rgba(0,0,0,0.4);
    animation:slideIn .3s ease;
  `;
  toast.textContent = msg;

  if (!document.querySelector('#toast-anim')) {
    const s = document.createElement('style');
    s.id = 'toast-anim';
    s.textContent = '@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}';
    document.head.appendChild(s);
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== ALGORITMO DE APURAÇÃO (demonstração / admin) =====
const Apuracao = {
  /**
   * Calcula a série vencedora a partir do 1º prêmio da Loteria Federal.
   * @param {string} premio1 - ex: "12595"
   * @returns {number} série 0-9
   */
  calcSerie(premio1) {
    // Dezena = penúltimo dígito
    return parseInt(String(premio1).padStart(5, '0').slice(-2, -1));
  },

  /**
   * Calcula o elemento vencedor (5 dígitos) a partir dos 5 prêmios.
   * @param {string[]} premios - array com os 5 prêmios
   * @returns {string} elemento com zero-padding ex: "57102"
   */
  calcElemento(premios) {
    return premios.map(p => String(p).slice(-1)).join('');
  },

  /**
   * Retorna o número vencedor no formato "S.EEEEE"
   * @param {string[]} premios
   * @returns {{ serie: number, elemento: string, numero: string }}
   */
  calcNumeroVencedor(premios) {
    const serie    = this.calcSerie(premios[0]);
    const elemento = this.calcElemento(premios);
    return {
      serie,
      elemento,
      numero: `${serie}.${elemento}`,
    };
  },

  /**
   * Algoritmo completo de apuração com regra de aproximação.
   * @param {string[]} premiosLoteria - 5 prêmios da Loteria Federal
   * @param {Object}   baseDados      - { "S.EEEEE": { nome, email, elegivel } }
   * @returns {{ ganhador: object|null, numero: string, tipo: string, log: string[] }}
   */
  apurar(premiosLoteria, baseDados) {
    const log = [];
    const { serie: serieInicial, elemento: elementoStr } = this.calcNumeroVencedor(premiosLoteria);
    let serie   = serieInicial;
    let elemento = parseInt(elementoStr);

    log.push(`Resultado da Loteria: [${premiosLoteria.join(', ')}]`);
    log.push(`Série calculada: ${serieInicial} | Elemento calculado: ${String(elemento).padStart(5,'0')}`);
    log.push(`Número vencedor calculado: ${serieInicial}.${String(elemento).padStart(5,'0')}`);

    const tentativasSeries = new Set();

    while (true) {
      if (tentativasSeries.has(serie) && serie === serieInicial) {
        log.push('ERRO: Voltou à série inicial sem encontrar ganhador.');
        return { ganhador: null, numero: null, tipo: 'sem_ganhador', log };
      }
      tentativasSeries.add(serie);

      // CASO 1: número exato
      const chaveExata = `${serie}.${String(elemento).padStart(5,'0')}`;
      if (baseDados[chaveExata]?.elegivel) {
        log.push(`✅ Número exato encontrado: ${chaveExata}`);
        return { ganhador: baseDados[chaveExata], numero: chaveExata, tipo: 'exato', log };
      }
      log.push(`Número exato ${chaveExata} não encontrado ou inelegível.`);

      // CASO 2: superior
      let achou = false;
      for (let e = elemento + 1; e < 100000; e++) {
        const chave = `${serie}.${String(e).padStart(5,'0')}`;
        if (baseDados[chave]?.elegivel) {
          log.push(`✅ Aproximação superior: ${chave}`);
          return { ganhador: baseDados[chave], numero: chave, tipo: 'aproximacao_superior', log };
        }
      }

      // CASO 3: inferior
      for (let e = elemento - 1; e >= 0; e--) {
        const chave = `${serie}.${String(e).padStart(5,'0')}`;
        if (baseDados[chave]?.elegivel) {
          log.push(`✅ Aproximação inferior: ${chave}`);
          return { ganhador: baseDados[chave], numero: chave, tipo: 'aproximacao_inferior', log };
        }
      }

      // CASO 4: troca de série
      const proximaSerie = (serie + 1) % 10;
      log.push(`Série ${serie} vazia. Avançando para série ${proximaSerie}.`);
      serie = proximaSerie;
      elemento = 0;

      if (serie === serieInicial) {
        log.push('Todas as séries verificadas. Nenhum ganhador elegível.');
        return { ganhador: null, numero: null, tipo: 'sem_ganhador', log };
      }
    }
  },

  /**
   * Gera CSV no formato SCPC/SPA.
   * @param {Array} participantes
   * @returns {string} conteúdo do CSV
   */
  gerarCSV(participantes) {
    const cabecalho = 'CPF/CNPJ,Nome,Numero_Serie,Elemento_Sorteavel,Data,Horario,Email,Telefone';
    const linhas = participantes.map(p => {
      const dt = new Date(p.created_at);
      const data   = dt.toISOString().split('T')[0];
      const hora   = dt.toTimeString().slice(0,8);
      const elem   = String(p.elemento).padStart(5, '0'); // zero-padding obrigatório
      return [p.cpf, p.nome, p.serie, elem, data, hora, p.email, p.telefone].join(',');
    });
    return [cabecalho, ...linhas].join('\n');
  },
};

// Expõe globalmente para uso no painel admin
window.Apuracao = Apuracao;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initCountdown();
  initLaunchCountdown();
  initProgress();
  initHamburger();
  initFAQ();
  initPackageButtons();
  initCheckoutSummary();
  initCheckoutForm();

  // Header scroll effect
  const header = $('.header');
  window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 60);
  });

  // Smooth scroll para âncoras
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  console.log('%c🎯 RifaTechPro', 'color:#6C63FF;font-size:1.5rem;font-weight:800');
  console.log('%cSistema de Promoção Comercial | SPA/ME Autorizado', 'color:#9090AA');
  console.log('%cAlgoritmo de Apuração disponível em: window.Apuracao', 'color:#00D4AA');
});
