/**
 * Mapeamento oficial pacote → checkout Animus Pay (iPhone 17 Pro)
 * numeros | id        | checkout
 * 5       | cobre     | pmifycsf6w
 * 12      | bronze    | mtpkc
 * 25      | prata     | ao7us
 * 45      | ouro      | iodnw
 * 80      | rubi      | mypye
 * 150     | esmeralda | ernzk
 * 300     | diamante  | 9lwtb
 */
const CHECKOUT_POR_ID = {
  cobre: 'https://go.animuspay.com.br/pmifycsf6w',
  bronze: 'https://go.animuspay.com.br/mtpkc',
  prata: 'https://go.animuspay.com.br/ao7us',
  ouro: 'https://go.animuspay.com.br/iodnw',
  rubi: 'https://go.animuspay.com.br/mypye',
  esmeralda: 'https://go.animuspay.com.br/ernzk',
  diamante: 'https://go.animuspay.com.br/9lwtb',
};

const CHECKOUT_POR_NUMEROS = {
  5: CHECKOUT_POR_ID.cobre,
  12: CHECKOUT_POR_ID.bronze,
  25: CHECKOUT_POR_ID.prata,
  45: CHECKOUT_POR_ID.ouro,
  80: CHECKOUT_POR_ID.rubi,
  150: CHECKOUT_POR_ID.esmeralda,
  300: CHECKOUT_POR_ID.diamante,
};

function isPacoteValido(pkg) {
  return !!(pkg && pkg.id && pkg.numeros > 0 && pkg.valor > 0);
}

function getCheckoutUrlForPacote(pkg) {
  if (!pkg) return null;
  if (pkg.checkoutUrl) return pkg.checkoutUrl;
  if (pkg.id && CHECKOUT_POR_ID[pkg.id]) return CHECKOUT_POR_ID[pkg.id];
  if (pkg.numeros && CHECKOUT_POR_NUMEROS[pkg.numeros]) return CHECKOUT_POR_NUMEROS[pkg.numeros];
  return null;
}

function aplicarCheckoutUrls(pacotes) {
  return (pacotes || []).map((p) => ({
    ...p,
    checkoutUrl: getCheckoutUrlForPacote(p) || null,
  }));
}

/** Pacotes exibidos no site — todos os planos válidos da campanha */
function filtrarPacotesVendaveis(pacotes) {
  return aplicarCheckoutUrls(pacotes).filter(isPacoteValido);
}

function isPacoteVendavel(pkg) {
  return isPacoteValido(pkg);
}

const PACOTES_PADRAO = aplicarCheckoutUrls([
  { id: 'cobre', nome: 'Cobre', numeros: 5, valor: 7.9, valorAnchor: 30, tag: 'Cobre' },
  { id: 'bronze', nome: 'Bronze', numeros: 12, valor: 14.9, valorAnchor: 60, tag: 'Bronze' },
  { id: 'prata', nome: 'Prata', numeros: 25, valor: 27.9, valorAnchor: 120, tag: 'Prata' },
  { id: 'ouro', nome: 'Ouro', numeros: 45, valor: 44.9, valorAnchor: 200, tag: 'Ouro', destaque: true },
  { id: 'rubi', nome: 'Rubi', numeros: 80, valor: 69.9, valorAnchor: 320, tag: 'Rubi' },
  { id: 'esmeralda', nome: 'Esmeralda', numeros: 150, valor: 114.9, valorAnchor: 500, tag: 'Esmeralda' },
  { id: 'diamante', nome: 'Diamante', numeros: 300, valor: 199.9, valorAnchor: 900, tag: 'Diamante' },
]);

async function syncCheckoutUrls(supabase) {
  const { data: campanha } = await supabase
    .from('campanhas')
    .select('id, slug, pacotes')
    .eq('slug', 'iphone-17-pro')
    .maybeSingle();

  if (!campanha?.pacotes?.length) return;

  const pacotes = aplicarCheckoutUrls(campanha.pacotes);
  const atual = JSON.stringify(campanha.pacotes);
  const novo = JSON.stringify(pacotes);
  if (atual === novo) return;

  await supabase
    .from('campanhas')
    .update({ pacotes, updated_at: new Date().toISOString() })
    .eq('id', campanha.id);
}

module.exports = {
  CHECKOUT_POR_ID,
  CHECKOUT_POR_NUMEROS,
  PACOTES_PADRAO,
  getCheckoutUrlForPacote,
  aplicarCheckoutUrls,
  filtrarPacotesVendaveis,
  isPacoteVendavel,
  syncCheckoutUrls,
};
