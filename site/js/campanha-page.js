let CAMPANHA = null;

function getSlug() {
  return getQuery('slug') || 'iphone-17-pro';
}

function badgeClass(id) {
  const map = {
    cobre: 'badge-cobre',
    bronze: 'badge-bronze',
    prata: 'badge-prata',
    ouro: 'badge-ouro',
    rubi: 'badge-rubi',
    esmeralda: 'badge-esmeralda',
    diamante: 'badge-diamante',
  };
  return map[id] || 'badge-prata';
}

function renderPacotes(pacotes) {
  const grid = document.getElementById('pkgs-grid');
  if (!grid) return;
  grid.innerHTML = pacotes
    .map((p) => {
      const cardClass = p.destaque ? 'pkg-card destaque rv' : 'pkg-card rv';
      const per = p.valor / p.numeros;
      const btnCls = p.destaque ? 'pkg-btn pkg-btn-fire' : 'pkg-btn pkg-btn-ghost';
      const popular = p.destaque ? '<div class="pkg-badge-popular">MAIS POPULAR</div>' : '';
      return `
      <div class="${cardClass}" onclick="selectPkg('${p.id}')">
        ${popular}
        <span class="pkg-name-badge ${badgeClass(p.id)}">${p.nome}</span>
        <div class="pkg-nums-box">
          <span class="pkg-nums-lbl">números</span>
          <span class="pkg-nums-big">${p.numeros}</span>
        </div>
        <div class="pkg-price-area">
          <span class="pkg-anchor">R$ ${fmtMoney(p.valorAnchor)}</span>
          <span class="pkg-real"><small>R$</small> ${fmtMoney(p.valor).replace('.', ',')}</span>
          <span class="pkg-per">R$ ${per.toFixed(2).replace('.', ',')} por número</span>
        </div>
        <button type="button" class="${btnCls}">Participar →</button>
      </div>`;
    })
    .join('');
  document.querySelectorAll('#pkgs-grid .rv').forEach((el) => io.observe(el));
}

function initCountdownCampanha() {
  if (!CAMPANHA?.dataFim) return;
  const raw = CAMPANHA.dataFim;
  const fim = raw.includes('T') ? new Date(raw) : new Date(raw + 'T23:59:59');
  const ids = ['cd-d', 'cd-h', 'cd-m', 'cd-s'];
  function tick() {
    const diff = fim - new Date();
    if (diff <= 0) {
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const vals = [d, h, m, s].map((n) => String(n).padStart(2, '0'));
    ids.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.textContent = vals[i];
    });
  }
  tick();
  setInterval(tick, 1000);
}

async function carregarCampanha() {
  const slug = getSlug();
  CAMPANHA = await apiGet('/campanhas/' + slug);
  window.CAMPANHA = CAMPANHA;

  document.title = CAMPANHA.titulo + ' — Sorte Real';
  const heroH = document.querySelector('.hero-h');
  if (heroH) {
    heroH.innerHTML =
      'Concorra ao<br/><span class="gr">' +
      CAMPANHA.premioNome +
      '</span>';
  }
  const heroSub = document.querySelector('.hero-sub');
  if (heroSub) heroSub.innerHTML = CAMPANHA.descricao;

  const prizeTitle = document.querySelector('#premio .sh2, .prize-title-m .sh2');
  if (prizeTitle) prizeTitle.textContent = CAMPANHA.premioNome;

  const prizeImg = document.getElementById('prizeImg');
  if (prizeImg && CAMPANHA.premioImagem) prizeImg.src = CAMPANHA.premioImagem;

  const desk = document.querySelector('.hero-vid-desktop');
  const mob = document.querySelector('.hero-vid-mobile');
  if (desk && CAMPANHA.heroDesktop) desk.src = CAMPANHA.heroDesktop;
  if (mob && CAMPANHA.heroMobile) mob.src = CAMPANHA.heroMobile;

  const loading = document.getElementById('pkgs-loading');
  if (loading) loading.remove();
  renderPacotes(CAMPANHA.pacotes || []);
  initCountdownCampanha();
}

window.selectPkg = function (pkg) {
  const slug = getSlug();
  window.location.href = 'checkout.html?campanha=' + slug + '&pacote=' + pkg;
};

document.addEventListener('DOMContentLoaded', () => {
  carregarCampanha().catch((e) => {
    alert('Campanha não encontrada: ' + e.message + '\n\nVoltando à página inicial.');
    window.location.href = '/';
  });
});
